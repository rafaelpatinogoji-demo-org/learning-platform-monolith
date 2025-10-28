import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { enrollmentsController } from '../src/controllers/enrollments.controller';
import { EnrollmentsService, Enrollment } from '../src/services/enrollments.service';
import { EnrollmentValidator } from '../src/utils/validation';
import { config } from '../src/config';
import { publish, isNotificationsEnabled } from '../src/modules/notifications/publisher';

jest.mock('../src/services/enrollments.service');
jest.mock('../src/utils/validation');
jest.mock('../src/config');
jest.mock('../src/modules/notifications/publisher');

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockEnrollmentValidator = EnrollmentValidator as jest.Mocked<typeof EnrollmentValidator>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
  requestId: string;
}

describe('enrollmentsController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock })) as any;

    mockRequest = {
      body: {},
      params: {},
      query: {},
      requestId: 'test-request-id',
    };

    mockResponse = {
      status: statusMock as any,
      json: jsonMock as any,
    };

    mockConfig.version = 'v1.9';

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('enroll', () => {
    it('should successfully create enrollment with valid data and student role', async () => {
      const mockEnrollment: Enrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'active',
        created_at: new Date(),
      };

      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: 'v1.9',
      });
      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(10, 5);
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 10,
        courseId: 5,
      });
    });

    it('should return 400 with validation errors for invalid courseId', async () => {
      mockRequest.body = { courseId: 'invalid' };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
      });

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data',
          fields: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 403 when user is not a student', async () => {
      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'instructor@example.com', role: 'instructor' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only students can enroll in courses',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.body = { courseId: 999 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Course not found'));

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 when course not published', async () => {
      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockRejectedValue(
        new Error('Cannot enroll in unpublished course')
      );

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_PUBLISHED',
          message: 'Cannot enroll in unpublished course',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 409 when already enrolled', async () => {
      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockRejectedValue(
        new Error('Already enrolled in this course')
      );

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: 'Already enrolled in this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create enrollment',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should publish notification event when notifications enabled', async () => {
      const mockEnrollment: Enrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'active',
        created_at: new Date(),
      };

      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 10,
        courseId: 5,
      });
    });

    it('should not publish event when notifications disabled', async () => {
      const mockEnrollment: Enrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'active',
        created_at: new Date(),
      };

      mockRequest.body = { courseId: 5 };
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(false);

      await enrollmentsController.enroll(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('getMyEnrollments', () => {
    it('should successfully return user enrollments with pagination', async () => {
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 10,
            course_id: 5,
            status: 'active' as const,
            created_at: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };
      mockRequest.query = { page: '1', limit: '10' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getMyEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: 'v1.9',
      });
      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(10, { page: 1, limit: 10 });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await enrollmentsController.getMyEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle pagination query parameters', async () => {
      const mockResult = {
        enrollments: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };
      mockRequest.query = { page: '2', limit: '20' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 2, limit: 20 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getMyEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockEnrollmentValidator.validatePagination).toHaveBeenCalledWith({ page: '2', limit: '20' });
      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(10, { page: 2, limit: 20 });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };
      mockRequest.query = {};

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.getMyEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch enrollments',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('getCourseEnrollments', () => {
    it('should successfully return course enrollments for authorized instructor', async () => {
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 10,
            course_id: 5,
            status: 'active' as const,
            created_at: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockRequest.params = { courseId: '5' };
      mockRequest.query = { page: '1', limit: '10' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: 'v1.9',
      });
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(5, 2, 'instructor');
    });

    it('should successfully return course enrollments for admin', async () => {
      const mockResult = {
        enrollments: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { courseId: '5' };
      mockRequest.query = {};

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalled();
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(5, 1, 'admin');
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { courseId: '5' };

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 for invalid courseId parameter', async () => {
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockRequest.params = { courseId: 'invalid' };

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_COURSE_ID',
          message: 'Invalid course ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 403 when user lacks permission', async () => {
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockRequest.params = { courseId: '5' };
      mockRequest.query = {};

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(false);

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view enrollments for this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle pagination query parameters', async () => {
      const mockResult = {
        enrollments: [],
        pagination: {
          page: 3,
          limit: 5,
          total: 0,
          totalPages: 0,
        },
      };

      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { courseId: '5' };
      mockRequest.query = { page: '3', limit: '5' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 3, limit: 5 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(5, { page: 3, limit: 5 });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { courseId: '5' };
      mockRequest.query = {};

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.getCourseEnrollments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch course enrollments',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('should successfully update status for admin user', async () => {
      const mockEnrollment: Enrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'completed',
        created_at: new Date(),
      };

      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'completed' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockEnrollment);

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: 'v1.9',
      });
      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(1, 'completed');
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: '1' };

      await enrollmentsController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 403 when user is not admin', async () => {
      mockRequest.user = { id: 10, email: 'student@example.com', role: 'student' };
      mockRequest.params = { id: '1' };

      await enrollmentsController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can update enrollment status',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 for invalid enrollmentId parameter', async () => {
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { id: 'invalid' };

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_ENROLLMENT_ID',
          message: 'Invalid enrollment ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 with validation errors for invalid status', async () => {
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'invalid' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'status', message: 'Status must be one of: active, completed, refunded' }],
      });

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update data',
          fields: [{ field: 'status', message: 'Status must be one of: active, completed, refunded' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { id: '999' };
      mockRequest.body = { status: 'completed' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(null);

      await enrollmentsController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'Enrollment not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'completed' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockEnrollmentsService.updateEnrollmentStatus.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.updateStatus(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update enrollment status',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });
  });
});
