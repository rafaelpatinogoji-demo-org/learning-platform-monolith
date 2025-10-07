import { progressController } from '../../src/controllers/progress.controller';
import { progressService } from '../../src/services/progress.service';
import { ProgressValidator } from '../../src/utils/validation';
import { mockRequest, mockResponse } from '../utils/test-helpers';

jest.mock('../../src/services/progress.service');
jest.mock('../../src/utils/validation');

const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockValidator = ProgressValidator as jest.Mocked<typeof ProgressValidator>;

describe('progressController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should successfully mark lesson complete', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 1, lessonId: 1, completed: true },
      });
      const res = mockResponse();

      const progressResult = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockValidator.validateMarkProgress.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockResolvedValue(progressResult);

      await progressController.markComplete(req as any, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            id: 1,
            enrollmentId: 1,
            lessonId: 1,
            completed: true,
          }),
        })
      );
      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 1, true);
    });

    it('should successfully mark lesson incomplete', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 1, lessonId: 1, completed: false },
      });
      const res = mockResponse();

      const progressResult = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockValidator.validateMarkProgress.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockResolvedValue(progressResult);

      await progressController.markComplete(req as any, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 1, false);
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 'invalid' },
      });
      const res = mockResponse();

      mockValidator.validateMarkProgress.mockReturnValue({
        isValid: false,
        errors: [{ field: 'enrollmentId', message: 'Invalid enrollment ID' }],
      });

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Validation failed',
        })
      );
    });

    it('should return 404 when enrollment not found', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 999, lessonId: 1, completed: true },
      });
      const res = mockResponse();

      mockValidator.validateMarkProgress.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(
        new Error('Enrollment not found')
      );

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Enrollment not found',
        })
      );
    });

    it('should return 404 when lesson not found', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 1, lessonId: 999, completed: true },
      });
      const res = mockResponse();

      mockValidator.validateMarkProgress.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(
        new Error('Lesson not found in this course')
      );

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when marking progress for another user enrollment', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 1, lessonId: 1, completed: true },
      });
      const res = mockResponse();

      mockValidator.validateMarkProgress.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(
        new Error('You can only mark progress for your own enrollments')
      );

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'You can only mark progress for your own enrollments',
        })
      );
    });
  });

  describe('getMyProgress', () => {
    it('should return user course progress', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: '1' },
      });
      const res = mockResponse();

      const progressSummary = {
        lessons: [
          {
            lessonId: 1,
            lessonTitle: 'Lesson 1',
            position: 1,
            completed: true,
            completed_at: new Date(),
          },
        ],
        percent: 100,
        lessonsCompleted: 1,
        totalLessons: 1,
      };

      mockValidator.validateCourseIdQuery.mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.getUserCourseProgress.mockResolvedValue(progressSummary);

      await progressController.getMyProgress(req as any, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: progressSummary,
        })
      );
      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 1);
    });

    it('should return 400 for missing courseId', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: {},
      });
      const res = mockResponse();

      mockValidator.validateCourseIdQuery.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required' }],
      });

      await progressController.getMyProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Validation failed',
        })
      );
    });

    it('should return 400 for invalid courseId', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: 'invalid' },
      });
      const res = mockResponse();

      mockValidator.validateCourseIdQuery.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Invalid course ID' }],
      });

      await progressController.getMyProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress for admin', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { courseId: '1' },
      });
      const res = mockResponse();

      const courseProgress = [
        {
          user: {
            id: 2,
            name: 'Student 1',
            email: 'student1@test.com',
          },
          completedCount: 3,
          totalLessons: 4,
          percent: 75,
        },
      ];

      mockProgressService.getCourseProgress.mockResolvedValue(courseProgress);

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: courseProgress,
          count: 1,
        })
      );
      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 1, 'admin');
    });

    it('should return course progress for instructor', async () => {
      const req = mockRequest({
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' },
      });
      const res = mockResponse();

      const courseProgress: any[] = [];

      mockProgressService.getCourseProgress.mockResolvedValue(courseProgress);

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).not.toHaveBeenCalled();
      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(
        1,
        2,
        'instructor'
      );
    });

    it('should return 403 for instructor of different course', async () => {
      const req = mockRequest({
        user: { id: 3, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' },
      });
      const res = mockResponse();

      mockProgressService.getCourseProgress.mockRejectedValue(
        new Error('You can only view progress for your own courses')
      );

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'You can only view progress for your own courses',
        })
      );
    });

    it('should return 404 when course not found', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { courseId: '999' },
      });
      const res = mockResponse();

      mockProgressService.getCourseProgress.mockRejectedValue(
        new Error('Course not found')
      );

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        user: { id: 1, email: 'admin@test.com', role: 'admin' },
        params: { courseId: 'invalid' },
      });
      const res = mockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Invalid course ID',
        })
      );
    });
  });
});
