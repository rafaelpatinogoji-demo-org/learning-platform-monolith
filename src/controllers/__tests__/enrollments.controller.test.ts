import { Request, Response } from 'express';
import { enrollmentsController } from '../enrollments.controller';
import { EnrollmentsService } from '../../services/enrollments.service';
import { EnrollmentValidator } from '../../utils/validation';
import { publish, isNotificationsEnabled } from '../../modules/notifications/publisher';

jest.mock('../../services/enrollments.service');
jest.mock('../../modules/notifications/publisher');

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

interface MockRequest extends Partial<Request> {
  user?: {
    id: number;
    email: string;
    role: string;
  };
  body?: any;
  params?: any;
  query?: any;
  requestId?: string;
}

interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
}

const createMockRequest = (overrides: MockRequest = {}): MockRequest => {
  return {
    user: undefined,
    body: {},
    params: {},
    query: {},
    requestId: 'test-request-id',
    ...overrides
  };
};

const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
};

describe('enrollmentsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    it('should successfully enroll a student in a published course', async () => {
      const mockUser = { id: 1, email: 'student@example.com', role: 'student' };
      const courseId = 10;
      const enrollment = {
        id: 1,
        user_id: mockUser.id,
        course_id: courseId,
        status: 'active' as const,
        created_at: new Date()
      };

      const req = createMockRequest({
        user: mockUser,
        body: { courseId }
      });
      const res = createMockResponse();

      mockEnrollmentsService.createEnrollment.mockResolvedValueOnce(enrollment);
      mockIsNotificationsEnabled.mockReturnValueOnce(true);
      mockPublish.mockResolvedValueOnce(1);

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(mockUser.id, courseId);
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: enrollment.id,
        userId: mockUser.id,
        courseId
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: enrollment
        })
      );
    });

    it('should return validation error when courseId is missing', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: {}
      });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should return forbidden when user is not a student', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'instructor@example.com', role: 'instructor' },
        body: { courseId: 10 }
      });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Only students can enroll in courses'
          })
        })
      );
    });

    it('should return 404 when course is not found', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: { courseId: 999 }
      });
      const res = createMockResponse();

      mockEnrollmentsService.createEnrollment.mockRejectedValueOnce(new Error('Course not found'));

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'COURSE_NOT_FOUND'
          })
        })
      );
    });

    it('should return 400 when course is not published', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: { courseId: 10 }
      });
      const res = createMockResponse();

      mockEnrollmentsService.createEnrollment.mockRejectedValueOnce(
        new Error('Cannot enroll in unpublished course')
      );

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'COURSE_NOT_PUBLISHED'
          })
        })
      );
    });

    it('should return 409 when already enrolled', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: { courseId: 10 }
      });
      const res = createMockResponse();

      mockEnrollmentsService.createEnrollment.mockRejectedValueOnce(
        new Error('Already enrolled in this course')
      );

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'ALREADY_ENROLLED'
          })
        })
      );
    });

    it('should not publish notification when notifications are disabled', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: { courseId: 10 }
      });
      const res = createMockResponse();

      mockEnrollmentsService.createEnrollment.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        course_id: 10,
        status: 'active',
        created_at: new Date()
      });
      mockIsNotificationsEnabled.mockReturnValueOnce(false);

      await enrollmentsController.enroll(req as Request, res as Response);

      expect(mockPublish).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getMyEnrollments', () => {
    it('should return user enrollments with default pagination', async () => {
      const mockUser = { id: 1, email: 'student@example.com', role: 'student' };
      const enrollmentsResult = {
        enrollments: [
          {
            id: 1,
            user_id: mockUser.id,
            course_id: 10,
            status: 'active' as const,
            created_at: new Date(),
            course: {
              id: 10,
              title: 'Test Course',
              description: 'Test Description',
              published: true,
              price_cents: 5000,
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

      const req = createMockRequest({
        user: mockUser,
        query: {}
      });
      const res = createMockResponse();

      mockEnrollmentsService.getUserEnrollments.mockResolvedValueOnce(enrollmentsResult);

      await enrollmentsController.getMyEnrollments(req as Request, res as Response);

      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(
        mockUser.id,
        { page: 1, limit: 10 }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: enrollmentsResult.enrollments,
          pagination: enrollmentsResult.pagination
        })
      );
    });

    it('should handle custom pagination parameters', async () => {
      const mockUser = { id: 1, email: 'student@example.com', role: 'student' };
      const req = createMockRequest({
        user: mockUser,
        query: { page: '2', limit: '5' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.getUserEnrollments.mockResolvedValueOnce({
        enrollments: [],
        pagination: { page: 2, limit: 5, total: 10, totalPages: 2 }
      });

      await enrollmentsController.getMyEnrollments(req as Request, res as Response);

      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(
        mockUser.id,
        { page: 2, limit: 5 }
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({
        user: undefined
      });
      const res = createMockResponse();

      await enrollmentsController.getMyEnrollments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
    });

    it('should return 500 on service error', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.getUserEnrollments.mockRejectedValueOnce(
        new Error('Database error')
      );

      await enrollmentsController.getMyEnrollments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 10;

    it('should allow instructor to view their own course enrollments', async () => {
      const mockUser = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const enrollmentsResult = {
        enrollments: [
          {
            id: 1,
            user_id: 1,
            course_id: courseId,
            status: 'active' as const,
            created_at: new Date(),
            student: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com'
            }
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      const req = createMockRequest({
        user: mockUser,
        params: { courseId: courseId.toString() },
        query: {}
      });
      const res = createMockResponse();

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValueOnce(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValueOnce(enrollmentsResult);

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(
        courseId,
        mockUser.id,
        mockUser.role
      );
      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(
        courseId,
        { page: 1, limit: 10 }
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: enrollmentsResult.enrollments
        })
      );
    });

    it('should allow admin to view any course enrollments', async () => {
      const mockUser = { id: 5, email: 'admin@example.com', role: 'admin' };
      const req = createMockRequest({
        user: mockUser,
        params: { courseId: courseId.toString() },
        query: {}
      });
      const res = createMockResponse();

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValueOnce(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValueOnce({
        enrollments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(
        courseId,
        mockUser.id,
        'admin'
      );
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest({
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' },
        params: { courseId: 'invalid' }
      });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_COURSE_ID'
          })
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({
        user: undefined,
        params: { courseId: courseId.toString() }
      });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
    });

    it('should return 403 when instructor tries to view another instructor course', async () => {
      const mockUser = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const req = createMockRequest({
        user: mockUser,
        params: { courseId: courseId.toString() }
      });
      const res = createMockResponse();

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValueOnce(false);

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      );
    });

    it('should handle custom pagination parameters', async () => {
      const mockUser = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const req = createMockRequest({
        user: mockUser,
        params: { courseId: courseId.toString() },
        query: { page: '3', limit: '20' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValueOnce(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValueOnce({
        enrollments: [],
        pagination: { page: 3, limit: 20, total: 50, totalPages: 3 }
      });

      await enrollmentsController.getCourseEnrollments(req as Request, res as Response);

      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(
        courseId,
        { page: 3, limit: 20 }
      );
    });
  });

  describe('updateStatus', () => {
    const enrollmentId = 1;

    it('should allow admin to update status to completed', async () => {
      const mockUser = { id: 5, email: 'admin@example.com', role: 'admin' };
      const updatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 10,
        status: 'completed' as const,
        created_at: new Date()
      };

      const req = createMockRequest({
        user: mockUser,
        params: { id: enrollmentId.toString() },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValueOnce(updatedEnrollment);

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(
        enrollmentId,
        'completed'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: updatedEnrollment
        })
      );
    });

    it('should allow admin to update status to refunded', async () => {
      const mockUser = { id: 5, email: 'admin@example.com', role: 'admin' };
      const updatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 10,
        status: 'refunded' as const,
        created_at: new Date()
      };

      const req = createMockRequest({
        user: mockUser,
        params: { id: enrollmentId.toString() },
        body: { status: 'refunded' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValueOnce(updatedEnrollment);

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(
        enrollmentId,
        'refunded'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: updatedEnrollment
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockRequest({
        user: undefined,
        params: { id: enrollmentId.toString() },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
    });

    it('should return 403 when non-admin tries to update status', async () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' },
        params: { id: enrollmentId.toString() },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Only administrators can update enrollment status'
          })
        })
      );
    });

    it('should return 400 for invalid enrollmentId', async () => {
      const req = createMockRequest({
        user: { id: 5, email: 'admin@example.com', role: 'admin' },
        params: { id: 'invalid' },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_ENROLLMENT_ID'
          })
        })
      );
    });

    it('should return 400 for invalid status value', async () => {
      const req = createMockRequest({
        user: { id: 5, email: 'admin@example.com', role: 'admin' },
        params: { id: enrollmentId.toString() },
        body: { status: 'invalid_status' }
      });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should return 404 when enrollment not found', async () => {
      const req = createMockRequest({
        user: { id: 5, email: 'admin@example.com', role: 'admin' },
        params: { id: '999' },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValueOnce(null);

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'ENROLLMENT_NOT_FOUND'
          })
        })
      );
    });

    it('should return 500 on service error', async () => {
      const req = createMockRequest({
        user: { id: 5, email: 'admin@example.com', role: 'admin' },
        params: { id: enrollmentId.toString() },
        body: { status: 'completed' }
      });
      const res = createMockResponse();

      mockEnrollmentsService.updateEnrollmentStatus.mockRejectedValueOnce(
        new Error('Database error')
      );

      await enrollmentsController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });
  });
});
