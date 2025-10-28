import { Request, Response } from 'express';
import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { EnrollmentsService } from '../../src/services/enrollments.service';
import { EnrollmentValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/enrollments.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/modules/notifications/publisher', () => ({
  publish: jest.fn(),
  isNotificationsEnabled: jest.fn(() => false)
}));

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockEnrollmentValidator = EnrollmentValidator as jest.Mocked<typeof EnrollmentValidator>;

describe('enrollmentsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    it('should create enrollment successfully', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 2,
        status: 'active' as const,
        created_at: new Date()
      };

      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentValidator.validateCreateEnrollment).toHaveBeenCalledWith(mockReq.body);
      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(1, 2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: expect.any(String)
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 'invalid' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data',
          fields: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 for non-student users', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.body = { courseId: 2 };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

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
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 999 };

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

    it('should return 400 when course not published', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };

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
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };

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
  });

  describe('getMyEnrollments', () => {
    it('should return user enrollments', async () => {
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 1,
            course_id: 2,
            status: 'active' as const,
            created_at: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { page: '1', limit: '10' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = undefined;

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

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
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments for authorized user', async () => {
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 2,
            course_id: 1,
            status: 'active' as const,
            created_at: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.query = { page: '1', limit: '10' };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
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

    it('should return 403 when user cannot view course enrollments', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '2' };

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
  });

  describe('updateStatus', () => {
    it('should update enrollment status successfully', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 2,
        course_id: 3,
        status: 'completed' as const,
        created_at: new Date()
      };

      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'completed' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockEnrollment);

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(1, 'completed');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: expect.any(String)
      });
    });

    it('should return 403 for non-admin users', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'completed' };

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
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: 'invalid' };
      mockReq.body = { status: 'completed' };

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

    it('should return 404 when enrollment not found', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'completed' };

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
  });
});
