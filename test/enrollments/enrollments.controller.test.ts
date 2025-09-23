/**
 * Tests for enrollments controller
 * 
 * Tests HTTP request handling, validation, authentication, and error responses
 * without any database dependencies using mocked services and validators.
 */

import { Request, Response } from 'express';
import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { EnrollmentsService } from '../../src/services/enrollments.service';
import { EnrollmentValidator } from '../../src/utils/validation';
import { config } from '../../src/config';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { testUtils } from '../setup';

interface TestRequest extends Request {
  requestId: string;
}

jest.mock('../../src/services/enrollments.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/modules/notifications/publisher');
jest.mock('../../src/config', () => ({
  config: {
    version: 'v1.0.0'
  }
}));

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockEnrollmentValidator = EnrollmentValidator as jest.Mocked<typeof EnrollmentValidator>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('enrollmentsController', () => {
  let mockReq: Partial<TestRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    beforeEach(() => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };
    });

    it('should create enrollment successfully for valid student request', async () => {
      // Arrange
      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 2,
        status: 'active' as const,
        created_at: new Date()
      };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentValidator.validateCreateEnrollment).toHaveBeenCalledWith(mockReq.body);
      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(1, 2);
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 1,
        courseId: 2
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: 'v1.0.0'
      });
    });

    it('should return 400 for invalid enrollment data', async () => {
      // Arrange
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required' }]
      });

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data',
          fields: [{ field: 'courseId', message: 'Course ID is required' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockEnrollmentsService.createEnrollment).not.toHaveBeenCalled();
    });

    it('should return 403 for non-student users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.user = undefined;
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should return 404 when course not found', async () => {
      // Arrange
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Course not found'));

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Cannot enroll in unpublished course'));

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Already enrolled in this course'));

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should not publish notification when notifications disabled', async () => {
      // Arrange
      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 2,
        status: 'active' as const,
        created_at: new Date()
      };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(false);

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockPublish).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
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
    beforeEach(() => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { page: '1', limit: '10' };
    });

    it('should return user enrollments successfully', async () => {
      // Arrange
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 1,
            course_id: 2,
            status: 'active' as const,
            created_at: new Date(),
            course: {
              id: 2,
              title: 'Test Course',
              description: 'Test Description',
              published: true,
              price_cents: 1000,
              instructor_id: 3
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

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentValidator.validatePagination).toHaveBeenCalledWith(mockReq.query);
      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: 'v1.0.0'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockRejectedValue(new Error('Database error'));

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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
    beforeEach(() => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '2' };
      mockReq.query = { page: '1', limit: '10' };
    });

    it('should return course enrollments for authorized instructor', async () => {
      // Arrange
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 3,
            course_id: 2,
            status: 'active' as const,
            created_at: new Date(),
            student: {
              id: 3,
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

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(2, 1, 'instructor');
      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(2, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: 'v1.0.0'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.params = { courseId: 'invalid' };

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.params = { courseId: '-1' };

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should return 403 when user cannot view course enrollments', async () => {
      // Arrange
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(false);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should work for admin users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      const mockResult = {
        enrollments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(2, 1, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        pagination: mockResult.pagination,
        version: 'v1.0.0'
      });
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'completed' };
    });

    it('should update enrollment status successfully for admin', async () => {
      // Arrange
      const mockUpdatedEnrollment = {
        id: 1,
        user_id: 2,
        course_id: 3,
        status: 'completed' as const,
        created_at: new Date()
      };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockUpdatedEnrollment);

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentValidator.validateStatusUpdate).toHaveBeenCalledWith(mockReq.body);
      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(1, 'completed');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockUpdatedEnrollment,
        version: 'v1.0.0'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
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

    it('should return 400 for invalid status data', async () => {
      // Arrange
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'status', message: 'Status must be one of: active, completed, refunded' }]
      });

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status update data',
          fields: [{ field: 'status', message: 'Status must be one of: active, completed, refunded' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when enrollment not found', async () => {
      // Arrange
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(null);

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
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
      // Arrange
      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockRejectedValue(new Error('Database error'));

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update enrollment status',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });
});
