import { Request, Response } from 'express';
import { progressController } from '../../src/controllers/progress.controller';
import { progressService } from '../../src/services/progress.service';
import { ProgressValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/progress.service', () => ({
  progressService: {
    markLessonProgress: jest.fn(),
    getUserCourseProgress: jest.fn(),
    getCourseProgress: jest.fn()
  }
}));
jest.mock('../../src/utils/validation');

const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockProgressValidator = ProgressValidator as jest.Mocked<typeof ProgressValidator>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('progressController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should mark lesson progress successfully', async () => {
      const mockProgress = {
        id: 1,
        enrollment_id: 2,
        lesson_id: 3,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {
        enrollmentId: 2,
        lessonId: 3,
        completed: true
      };

      mockProgressValidator.validateMarkProgress.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

      expect(mockProgressValidator.validateMarkProgress).toHaveBeenCalledWith(mockReq.body);
      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 2, 3, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: mockProgress.id,
          enrollmentId: mockProgress.enrollment_id,
          lessonId: mockProgress.lesson_id,
          completed: mockProgress.completed,
          completedAt: mockProgress.completed_at,
          createdAt: mockProgress.created_at,
          updatedAt: mockProgress.updated_at
        },
        version: expect.any(String)
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {
        enrollmentId: 'invalid',
        lessonId: 3,
        completed: true
      };

      mockProgressValidator.validateMarkProgress.mockReturnValue({
        isValid: false,
        errors: [{ field: 'enrollmentId', message: 'Enrollment ID must be a positive integer' }]
      });

      await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'enrollmentId', message: 'Enrollment ID must be a positive integer' }],
        version: expect.any(String)
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {
        enrollmentId: 999,
        lessonId: 3,
        completed: true
      };

      mockProgressValidator.validateMarkProgress.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('Enrollment not found'));

      await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Enrollment not found',
        version: expect.any(String)
      });
    });

    it('should return 403 when user cannot mark progress for enrollment', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {
        enrollmentId: 2,
        lessonId: 3,
        completed: true
      };

      mockProgressValidator.validateMarkProgress.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.markLessonProgress.mockRejectedValue(
        new Error('You can only mark progress for your own enrollments')
      );

      await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You can only mark progress for your own enrollments',
        version: expect.any(String)
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {
        enrollmentId: 2,
        lessonId: 3,
        completed: true
      };

      mockProgressValidator.validateMarkProgress.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('Database connection failed'));

      await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to mark lesson progress',
        version: expect.any(String)
      });
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress for course', async () => {
      const mockProgress = {
        lessonsCompleted: 2,
        totalLessons: 5,
        percent: 40,
        lessons: [
          {
            lessonId: 1,
            lessonTitle: 'Lesson 1',
            position: 1,
            completed: true,
            completed_at: new Date()
          },
          {
            lessonId: 2,
            lessonTitle: 'Lesson 2',
            position: 2,
            completed: false,
            completed_at: null
          }
        ]
      };

      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { courseId: '2' };

      mockProgressValidator.validateCourseIdQuery.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockProgressValidator.validateCourseIdQuery).toHaveBeenCalledWith(mockReq.query);
      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        version: expect.any(String)
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { courseId: 'invalid' };

      mockProgressValidator.validateCourseIdQuery.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
        version: expect.any(String)
      });
    });

    it('should return 500 for service errors', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { courseId: '2' };

      mockProgressValidator.validateCourseIdQuery.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockProgressService.getUserCourseProgress.mockRejectedValue(new Error('Database error'));

      await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get progress',
        version: expect.any(String)
      });
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress for authorized user', async () => {
      const mockProgress = [
        {
          user: {
            id: 2,
            name: 'John Doe',
            email: 'john@example.com'
          },
          completedCount: 3,
          totalLessons: 5,
          percent: 60
        }
      ];

      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '2' };

      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(2, 1, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        count: 1,
        version: expect.any(String)
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: 'invalid' };

      await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: expect.any(String)
      });
    });

    it('should return 404 when course not found', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '999' };

      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Course not found'));

      await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: expect.any(String)
      });
    });

    it('should return 403 when user cannot view course progress', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '2' };

      mockProgressService.getCourseProgress.mockRejectedValue(
        new Error('You can only view progress for your own courses')
      );

      await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You can only view progress for your own courses',
        version: expect.any(String)
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '2' };

      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Database connection failed'));

      await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course progress',
        version: expect.any(String)
      });
    });
  });
});
