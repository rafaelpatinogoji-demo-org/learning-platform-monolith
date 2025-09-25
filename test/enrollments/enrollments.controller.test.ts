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
    it('should create enrollment successfully', async () => {
      const courseId = 1;
      const userId = 2;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active' as const,
        created_at: new Date()
      };

      mockReq.body = { courseId };
      mockReq.user = { id: userId, email: 'student@example.com', role: 'student' };

      mockEnrollmentValidator.validateCreateEnrollment.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);

      await enrollmentsController.enroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: expect.any(String)
      });
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: mockEnrollment.id,
        userId,
        courseId
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.body = { courseId: 'invalid' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

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
      mockReq.body = { courseId: 1 };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };

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
      mockReq.body = { courseId: 999 };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

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

    it('should return 409 when already enrolled', async () => {
      mockReq.body = { courseId: 1 };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

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
      const userId = 1;
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: userId,
            course_id: 2,
            status: 'active' as const,
            created_at: new Date(),
            course: {
              id: 2,
              title: 'Test Course',
              description: 'Test Description',
              published: true,
              price_cents: 5000,
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

      mockReq.user = { id: userId, email: 'student@example.com', role: 'student' };
      mockReq.query = { page: '1', limit: '10' };

      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getMyEnrollments(mockReq as Request, mockRes as Response);

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
      const courseId = 1;
      const userId = 2;
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 3,
            course_id: courseId,
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

      mockReq.params = { courseId: courseId.toString() };
      mockReq.user = { id: userId, email: 'instructor@example.com', role: 'instructor' };
      mockReq.query = { page: '1', limit: '10' };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { courseId: 'invalid' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };

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
      const courseId = 1;
      const userId = 2;

      mockReq.params = { courseId: courseId.toString() };
      mockReq.user = { id: userId, email: 'student@example.com', role: 'student' };

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
    it('should update enrollment status for admin', async () => {
      const enrollmentId = 1;
      const newStatus = 'completed';
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 2,
        course_id: 3,
        status: newStatus as 'completed',
        created_at: new Date()
      };

      mockReq.params = { id: enrollmentId.toString() };
      mockReq.body = { status: newStatus };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockEnrollmentValidator.validateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockUpdatedEnrollment);

      await enrollmentsController.updateStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockUpdatedEnrollment,
        version: expect.any(String)
      });
    });

    it('should return 403 for non-admin users', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'completed' };
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

    it('should return 404 when enrollment not found', async () => {
      const enrollmentId = 999;

      mockReq.params = { id: enrollmentId.toString() };
      mockReq.body = { status: 'completed' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

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
