import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import { progressController } from '../progress.controller';
import { progressService } from '../../services/progress.service';
import { ProgressValidator } from '../../utils/validation';

jest.mock('../../services/progress.service');
jest.mock('../../utils/validation');

const mockProgressService = progressService as jest.Mocked<typeof progressService>;

describe('progressController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should successfully mark lesson complete with valid data', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: true }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = {
        id: 1,
        enrollment_id: 10,
        lesson_id: 100,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq, mockRes);

      expect(ProgressValidator.validateMarkProgress).toHaveBeenCalledWith(mockReq.body);
      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 10, 100, true);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          id: 1,
          enrollmentId: 10,
          lessonId: 100,
          completed: true
        })
      }));
    });

    it('should successfully mark lesson incomplete', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: false }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = {
        id: 1,
        enrollment_id: 10,
        lesson_id: 100,
        completed: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq, mockRes);

      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 10, 100, false);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: expect.objectContaining({ completed: false })
      }));
    });

    it('should return 400 for validation errors', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { lessonId: 100 }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'enrollmentId', message: 'Enrollment ID is required' }]
      });

      await progressController.markComplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Validation failed'
      }));
    });

    it('should return 404 when enrollment is not found', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: true }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('Enrollment not found'));

      await progressController.markComplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Enrollment not found'
      }));
    });

    it('should return 403 when user does not own enrollment', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: true }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('You can only mark progress for your own enrollments'));

      await progressController.markComplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'You can only mark progress for your own enrollments'
      }));
    });

    it('should return 404 when lesson is not in course', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: true }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('Lesson not found in this course'));

      await progressController.markComplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Lesson not found in this course'
      }));
    });

    it('should return 500 for internal errors', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        body: { enrollmentId: 10, lessonId: 100, completed: true }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.markLessonProgress.mockRejectedValue(new Error('Database error'));

      await progressController.markComplete(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to mark lesson progress'
      }));
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress for valid courseId', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: '20' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = {
        lessonsCompleted: 2,
        totalLessons: 3,
        percent: 67,
        lessons: [
          { lessonId: 1, lessonTitle: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
          { lessonId: 2, lessonTitle: 'Lesson 2', position: 2, completed: false, completed_at: null },
          { lessonId: 3, lessonTitle: 'Lesson 3', position: 3, completed: true, completed_at: new Date() }
        ]
      };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockReq, mockRes);

      expect(ProgressValidator.validateCourseIdQuery).toHaveBeenCalledWith(mockReq.query);
      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress
      }));
    });

    it('should return 400 for missing courseId', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required in query parameters' }]
      });

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Validation failed'
      }));
    });

    it('should return 400 for invalid courseId', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: 'invalid' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Validation failed'
      }));
    });

    it('should return empty progress for non-enrolled user', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: '20' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = {
        lessonsCompleted: 0,
        totalLessons: 5,
        percent: 0,
        lessons: []
      };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress
      }));
    });

    it('should return 500 for internal errors', async () => {
      const mockReq: any = {
        user: { id: 1, email: 'student@test.com', role: 'student' },
        query: { courseId: '20' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      mockProgressService.getUserCourseProgress.mockRejectedValue(new Error('Database error'));

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to get progress'
      }));
    });
  });

  describe('getCourseProgress', () => {
    it('should allow admin to view course progress', async () => {
      const mockReq: any = {
        user: { id: 99, email: 'admin@test.com', role: 'admin' },
        params: { courseId: '1' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = [
        { user: { id: 1, name: 'Student 1', email: 'student1@test.com' }, completedCount: 2, totalLessons: 3, percent: 67 },
        { user: { id: 2, name: 'Student 2', email: 'student2@test.com' }, completedCount: 3, totalLessons: 3, percent: 100 }
      ];

      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 99, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress,
        count: 2
      }));
    });

    it('should allow instructor to view own course progress', async () => {
      const mockReq: any = {
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      const mockProgress = [
        { user: { id: 1, name: 'Student 1', email: 'student1@test.com' }, completedCount: 2, totalLessons: 3, percent: 67 }
      ];

      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress
      }));
    });

    it('should return 400 for invalid courseId param', async () => {
      const mockReq: any = {
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: 'invalid' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Invalid course ID'
      }));
    });

    it('should return 400 for zero or negative courseId', async () => {
      const mockReq: any = {
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '0' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Invalid course ID'
      }));
    });

    it('should return 404 when course is not found', async () => {
      const mockReq: any = {
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '999' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Course not found'));

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Course not found'
      }));
    });

    it('should return 403 when non-owner instructor tries to view progress', async () => {
      const mockReq: any = {
        user: { id: 3, email: 'other@test.com', role: 'instructor' },
        params: { courseId: '1' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      mockProgressService.getCourseProgress.mockRejectedValue(new Error('You can only view progress for your own courses'));

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'You can only view progress for your own courses'
      }));
    });

    it('should return 500 for internal errors', async () => {
      const mockReq: any = {
        user: { id: 2, email: 'instructor@test.com', role: 'instructor' },
        params: { courseId: '1' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Database error'));

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to get course progress'
      }));
    });
  });
});
