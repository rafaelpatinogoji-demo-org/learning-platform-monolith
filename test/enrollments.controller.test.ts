import { Request, Response } from 'express';
import { enrollmentsController } from '../src/controllers/enrollments.controller';
import { EnrollmentsService } from '../src/services/enrollments.service';
import { EnrollmentValidator } from '../src/utils/validation';
import * as notificationPublisher from '../src/modules/notifications/publisher';

jest.mock('../src/services/enrollments.service');
jest.mock('../src/utils/validation');
jest.mock('../src/modules/notifications/publisher');

describe('EnrollmentsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: undefined,
      requestId: 'test-request-id'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('enroll', () => {
    it('should create enrollment for valid student request', async () => {
      const courseId = 100;
      const userId = 1;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockRequest.body = { courseId };
      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.createEnrollment as jest.Mock).mockResolvedValue(mockEnrollment);
      (notificationPublisher.isNotificationsEnabled as jest.Mock).mockReturnValue(true);
      (notificationPublisher.publish as jest.Mock).mockResolvedValue(undefined);

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockEnrollment
      }));
      expect(EnrollmentsService.createEnrollment).toHaveBeenCalledWith(userId, courseId);
      expect(notificationPublisher.publish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: mockEnrollment.id,
        userId,
        courseId
      });
    });

    it('should return 400 for invalid enrollment data', async () => {
      mockRequest.body = { courseId: 'invalid' };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data'
        })
      }));
    });

    it('should return 403 if user is not a student', async () => {
      mockRequest.body = { courseId: 100 };
      mockRequest.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Only students can enroll in courses'
        })
      }));
    });

    it('should return 404 if course not found', async () => {
      mockRequest.body = { courseId: 999 };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.createEnrollment as jest.Mock).mockRejectedValue(new Error('Course not found'));

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_FOUND'
        })
      }));
    });

    it('should return 400 if course is not published', async () => {
      mockRequest.body = { courseId: 100 };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.createEnrollment as jest.Mock).mockRejectedValue(
        new Error('Cannot enroll in unpublished course')
      );

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_PUBLISHED'
        })
      }));
    });

    it('should return 409 if already enrolled', async () => {
      mockRequest.body = { courseId: 100 };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.createEnrollment as jest.Mock).mockRejectedValue(
        new Error('Already enrolled in this course')
      );

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'ALREADY_ENROLLED'
        })
      }));
    });

    it('should not publish notification if notifications disabled', async () => {
      const courseId = 100;
      const userId = 1;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockRequest.body = { courseId };
      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };

      (EnrollmentValidator.validateCreateEnrollment as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.createEnrollment as jest.Mock).mockResolvedValue(mockEnrollment);
      (notificationPublisher.isNotificationsEnabled as jest.Mock).mockReturnValue(false);

      await enrollmentsController.enroll(mockRequest as Request, mockResponse as Response);

      expect(notificationPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('getMyEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
      const userId = 1;
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: userId,
            course_id: 100,
            status: 'active',
            created_at: new Date(),
            course: {
              id: 100,
              title: 'Test Course',
              description: 'Test Description',
              published: true,
              price_cents: 1999,
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

      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };
      mockRequest.query = { page: '1', limit: '10' };

      (EnrollmentValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (EnrollmentsService.getUserEnrollments as jest.Mock).mockResolvedValue(mockResult);

      await enrollmentsController.getMyEnrollments(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination
      }));
      expect(EnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(userId, { page: 1, limit: 10 });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await enrollmentsController.getMyEnrollments(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      }));
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments for authorized instructor', async () => {
      const courseId = 100;
      const instructorId = 2;
      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 1,
            course_id: courseId,
            status: 'active',
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

      mockRequest.params = { courseId: '100' };
      mockRequest.query = { page: '1', limit: '10' };
      mockRequest.user = { id: instructorId, email: 'instructor@example.com', role: 'instructor' };

      (EnrollmentValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (EnrollmentsService.canViewCourseEnrollments as jest.Mock).mockResolvedValue(true);
      (EnrollmentsService.getCourseEnrollments as jest.Mock).mockResolvedValue(mockResult);

      await enrollmentsController.getCourseEnrollments(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination
      }));
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await enrollmentsController.getCourseEnrollments(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_COURSE_ID'
        })
      }));
    });

    it('should return 403 if user cannot view course enrollments', async () => {
      mockRequest.params = { courseId: '100' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      (EnrollmentsService.canViewCourseEnrollments as jest.Mock).mockResolvedValue(false);

      await enrollmentsController.getCourseEnrollments(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN'
        })
      }));
    });
  });

  describe('updateStatus', () => {
    it('should update enrollment status for admin', async () => {
      const enrollmentId = 1;
      const newStatus = 'completed';
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 100,
        status: newStatus,
        created_at: new Date()
      };

      mockRequest.params = { id: '1' };
      mockRequest.body = { status: newStatus };
      mockRequest.user = { id: 999, email: 'admin@example.com', role: 'admin' };

      (EnrollmentValidator.validateStatusUpdate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.updateEnrollmentStatus as jest.Mock).mockResolvedValue(mockUpdatedEnrollment);

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockUpdatedEnrollment
      }));
      expect(EnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(enrollmentId, newStatus);
    });

    it('should return 403 if user is not admin', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'completed' };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Only administrators can update enrollment status'
        })
      }));
    });

    it('should return 400 for invalid enrollment ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { status: 'completed' };
      mockRequest.user = { id: 999, email: 'admin@example.com', role: 'admin' };

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_ENROLLMENT_ID'
        })
      }));
    });

    it('should return 400 for invalid status data', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { status: 'invalid' };
      mockRequest.user = { id: 999, email: 'admin@example.com', role: 'admin' };

      (EnrollmentValidator.validateStatusUpdate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'status', message: 'Status must be one of: active, completed, refunded' }]
      });

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      }));
    });

    it('should return 404 if enrollment not found', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.body = { status: 'completed' };
      mockRequest.user = { id: 999, email: 'admin@example.com', role: 'admin' };

      (EnrollmentValidator.validateStatusUpdate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (EnrollmentsService.updateEnrollmentStatus as jest.Mock).mockResolvedValue(null);

      await enrollmentsController.updateStatus(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'ENROLLMENT_NOT_FOUND'
        })
      }));
    });
  });
});
