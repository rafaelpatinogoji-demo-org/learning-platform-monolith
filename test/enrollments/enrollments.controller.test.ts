import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { EnrollmentsService } from '../../src/services/enrollments.service';
import { EnrollmentValidator } from '../../src/utils/validation';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { mockRequest, mockResponse, mockEnrollment } from '../utils/test-helpers';

jest.mock('../../src/services/enrollments.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/modules/notifications/publisher');

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockValidator = EnrollmentValidator as jest.Mocked<typeof EnrollmentValidator>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<
  typeof isNotificationsEnabled
>;

describe('enrollmentsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enroll', () => {
    it('should successfully enroll student with 201 status', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment());
      mockIsNotificationsEnabled.mockReturnValue(false);

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment(),
        version: 'v1.9',
      });
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: {},
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required' }],
      });

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      });
    });

    it('should return 403 when user is not a student', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      });
    });

    it('should return 404 when course not found', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 999 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(
        new Error('Course not found')
      );

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_FOUND',
        }),
      });
    });

    it('should return 400 when course not published', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(
        new Error('Cannot enroll in unpublished course')
      );

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_PUBLISHED',
        }),
      });
    });

    it('should return 409 when already enrolled', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockRejectedValue(
        new Error('Already enrolled in this course')
      );

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'ALREADY_ENROLLED',
        }),
      });
    });

    it('should publish enrollment.created event when notifications enabled', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment());
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      await enrollmentsController.enroll(req as any, res as any);

      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 1,
        courseId: 1,
      });
    });

    it('should not publish event when notifications disabled', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { courseId: 1 },
      });
      const res = mockResponse();

      mockValidator.validateCreateEnrollment.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment());
      mockIsNotificationsEnabled.mockReturnValue(false);

      await enrollmentsController.enroll(req as any, res as any);

      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('getMyEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { page: '1', limit: '10' },
      });
      const res = mockResponse();

      const enrollmentsResult = {
        enrollments: [mockEnrollment()],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(enrollmentsResult);

      await enrollmentsController.getMyEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: enrollmentsResult.enrollments,
        pagination: enrollmentsResult.pagination,
        version: 'v1.9',
      });
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await enrollmentsController.getMyEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
        }),
      });
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments for admin', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { courseId: '1' },
        query: { page: '1', limit: '10' },
      });
      const res = mockResponse();

      const enrollmentsResult = {
        enrollments: [mockEnrollment()],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(enrollmentsResult);

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: enrollmentsResult.enrollments,
        pagination: enrollmentsResult.pagination,
        version: 'v1.9',
      });
    });

    it('should return course enrollments for course instructor', async () => {
      const req = mockRequest({
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' },
      });
      const res = mockResponse();

      const enrollmentsResult = {
        enrollments: [mockEnrollment()],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(enrollmentsResult);

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: enrollmentsResult.enrollments,
        pagination: enrollmentsResult.pagination,
        version: 'v1.9',
      });
    });

    it('should return 403 for instructor of different course', async () => {
      const req = mockRequest({
        user: { id: 3, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' },
      });
      const res = mockResponse();

      mockValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(false);

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      });
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({
        user: undefined,
        params: { courseId: '1' },
      });
      const res = mockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { courseId: 'invalid' },
      });
      const res = mockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_COURSE_ID',
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should successfully update status for admin', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { id: '1' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      mockValidator.validateStatusUpdate.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(
        mockEnrollment({ status: 'completed' })
      );

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({ status: 'completed' }),
        version: 'v1.9',
      });
    });

    it('should return 403 when user is not admin', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        params: { id: '1' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      });
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({
        user: undefined,
        params: { id: '1' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { id: '1' },
        body: { status: 'invalid' },
      });
      const res = mockResponse();

      mockValidator.validateStatusUpdate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'status', message: 'Invalid status' }],
      });

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when enrollment not found', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { id: '999' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      mockValidator.validateStatusUpdate.mockReturnValue({ isValid: true, errors: [] });
      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(null);

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'ENROLLMENT_NOT_FOUND',
        }),
      });
    });

    it('should return 400 for invalid enrollment ID', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { id: 'invalid' },
        body: { status: 'completed' },
      });
      const res = mockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_ENROLLMENT_ID',
        }),
      });
    });
  });
});
