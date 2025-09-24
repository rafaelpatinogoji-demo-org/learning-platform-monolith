/**
 * Tests for enrollments controller
 * 
 * Tests enrollment CRUD operations, status updates, role-based access,
 * and error handling without database dependencies.
 */

import { Request, Response } from 'express';
import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { EnrollmentsService } from '../../src/services/enrollments.service';
import { EnrollmentValidator } from '../../src/utils/validation';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { testUtils } from '../setup';

jest.mock('../../src/services/enrollments.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/modules/notifications/publisher');

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockEnrollmentValidator = EnrollmentValidator as jest.Mocked<typeof EnrollmentValidator>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('enrollmentsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    const validEnrollmentData = { courseId: 1 };
    const mockEnrollment = {
      id: 1,
      user_id: 1,
      course_id: 1,
      status: 'active' as const,
      created_at: new Date()
    };

    beforeEach(() => {
      mockReq.body = validEnrollmentData;
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
    });

    it('should create enrollment successfully for valid student request', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentValidator.validateCreateEnrollment).toHaveBeenCalledWith(validEnrollmentData);
      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(1, 1);
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 1,
        courseId: 1
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: expect.any(String)
      });
    });

    it('should create enrollment without publishing notification when notifications disabled', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(false);

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(1, 1);
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for validation errors', async () => {
      const validationErrors = [{ field: 'courseId', message: 'Course ID is required' }];
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: false,
        errors: validationErrors
      });

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.createEnrollment).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data',
          fields: validationErrors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user is not a student', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.createEnrollment).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only students can enroll in courses',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.createEnrollment).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when course not found', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Course not found'));

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when course is not published', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Cannot enroll in unpublished course'));

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_PUBLISHED',
          message: 'Cannot enroll in unpublished course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 409 when already enrolled', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Already enrolled in this course'));

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'ALREADY_ENROLLED',
          message: 'Already enrolled in this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Database connection failed'));

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create enrollment',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getMyEnrollments', () => {
    const mockEnrollmentsResult = {
      enrollments: [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          status: 'active' as const,
          created_at: new Date(),
          course: {
            id: 1,
            title: 'Test Course',
            description: 'Test Description',
            published: true,
            price_cents: 1000,
            instructor_id: 2
          }
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };

    beforeEach(() => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = {};
    });

    it('should return user enrollments successfully', async () => {
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockEnrollmentsResult);

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentValidator.validatePagination).toHaveBeenCalledWith({});
      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollmentsResult.enrollments,
        pagination: mockEnrollmentsResult.pagination,
        version: expect.any(String)
      });
    });

    it('should handle pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '5' };
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 2, limit: 5 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockEnrollmentsResult);

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentValidator.validatePagination).toHaveBeenCalledWith({ page: '2', limit: '5' });
      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(1, { page: 2, limit: 5 });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.getUserEnrollments).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for service errors', async () => {
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch enrollments',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getCourseEnrollments', () => {
    const mockCourseEnrollmentsResult = {
      enrollments: [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          status: 'active' as const,
          created_at: new Date(),
          student: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };

    beforeEach(() => {
      mockReq.params = { courseId: '1' };
      mockReq.query = {};
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
    });

    it('should return course enrollments for authorized user', async () => {
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockCourseEnrollmentsResult);

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourseEnrollmentsResult.enrollments,
        pagination: mockCourseEnrollmentsResult.pagination,
        version: expect.any(String)
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.canViewCourseEnrollments).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { courseId: 'invalid' };

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_COURSE_ID',
          message: 'Invalid course ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for negative course ID', async () => {
      mockReq.params = { courseId: '-1' };

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when user cannot view course enrollments', async () => {
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(false);

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view enrollments for this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for service errors', async () => {
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateStatus', () => {
    const mockUpdatedEnrollment = {
      id: 1,
      user_id: 1,
      course_id: 1,
      status: 'completed' as const,
      created_at: new Date()
    };

    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'completed' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
    });

    it('should update enrollment status successfully for admin', async () => {
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockUpdatedEnrollment);

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentValidator.validateStatusUpdate).toHaveBeenCalledWith({ status: 'completed' });
      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(1, 'completed');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockUpdatedEnrollment,
        version: expect.any(String)
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.updateEnrollmentStatus).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user is not admin', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can update enrollment status',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for invalid enrollment ID', async () => {
      mockReq.params = { id: 'invalid' };

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_ENROLLMENT_ID',
          message: 'Invalid enrollment ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for validation errors', async () => {
      const validationErrors = [{ field: 'status', message: 'Invalid status' }];
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: false,
        errors: validationErrors
      });

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update data',
          fields: validationErrors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(null);

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'Enrollment not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for service errors', async () => {
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockRejectedValue(new Error('Database error'));

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
