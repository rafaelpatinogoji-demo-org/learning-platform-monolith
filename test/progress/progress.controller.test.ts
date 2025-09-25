/**
 * Tests for ProgressController
 * 
 * Tests HTTP request handling for progress endpoints with mocked service dependencies.
 */

import { progressController } from '../../src/controllers/progress.controller';
import { progressService } from '../../src/services/progress.service';
import { testUtils } from '../setup';

jest.mock('../../src/services/progress.service');
const mockProgressService = progressService as jest.Mocked<typeof progressService>;

describe('progressController', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should mark lesson as complete successfully', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { enrollmentId: 1, lessonId: 2, completed: true };

      const mockProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: true,
        completed_at: new Date('2023-01-01T10:00:00Z'),
        created_at: new Date('2023-01-01T09:00:00Z'),
        updated_at: new Date('2023-01-01T10:00:00Z')
      };

      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq, mockRes);

      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 2, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          enrollmentId: 1,
          lessonId: 2,
          completed: true,
          completedAt: mockProgress.completed_at,
          createdAt: mockProgress.created_at,
          updatedAt: mockProgress.updated_at
        },
        version: expect.any(String)
      });
    });

    it('should mark lesson as incomplete successfully', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { enrollmentId: 1, lessonId: 2, completed: false };

      const mockProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: false,
        completed_at: null,
        created_at: new Date('2023-01-01T09:00:00Z'),
        updated_at: new Date('2023-01-01T10:00:00Z')
      };

      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq, mockRes);

      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 2, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          enrollmentId: 1,
          lessonId: 2,
          completed: false,
          completedAt: null,
          createdAt: mockProgress.created_at,
          updatedAt: mockProgress.updated_at
        },
        version: expect.any(String)
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing enrollmentId', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { lessonId: 2, completed: true };

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'enrollmentId', message: 'Enrollment ID is required' }
          ]),
          version: expect.any(String)
        });
        expect(mockProgressService.markLessonProgress).not.toHaveBeenCalled();
      });

      it('should return 400 for missing lessonId', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 1, completed: true };

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'lessonId', message: 'Lesson ID is required' }
          ]),
          version: expect.any(String)
        });
      });

      it('should return 400 for missing completed field', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 1, lessonId: 2 };

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'completed', message: 'Completed status is required' }
          ]),
          version: expect.any(String)
        });
      });

      it('should return 400 for invalid data types', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 'invalid', lessonId: -1, completed: 'true' };

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'enrollmentId', message: 'Enrollment ID must be a positive integer' },
            { field: 'lessonId', message: 'Lesson ID must be a positive integer' },
            { field: 'completed', message: 'Completed must be a boolean value' }
          ]),
          version: expect.any(String)
        });
      });
    });

    describe('service errors', () => {
      it('should return 404 when enrollment not found', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 999, lessonId: 2, completed: true };

        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Enrollment not found')
        );

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Enrollment not found',
          version: expect.any(String)
        });
      });

      it('should return 404 when lesson not found', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 1, lessonId: 999, completed: true };

        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Lesson not found in this course')
        );

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Lesson not found in this course',
          version: expect.any(String)
        });
      });

      it('should return 403 when user tries to mark progress for other user enrollment', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 2, lessonId: 1, completed: true };

        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('You can only mark progress for your own enrollments')
        );

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'You can only mark progress for your own enrollments',
          version: expect.any(String)
        });
      });

      it('should return 500 for unexpected service errors', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.body = { enrollmentId: 1, lessonId: 2, completed: true };

        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.markComplete(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to mark lesson progress',
          version: expect.any(String)
        });
      });
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress successfully', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { courseId: '1' };

      const mockProgress = {
        lessonsCompleted: 2,
        totalLessons: 5,
        percent: 40,
        lessons: [
          {
            lessonId: 1,
            lessonTitle: 'Introduction',
            position: 1,
            completed: true,
            completed_at: new Date('2023-01-01T10:00:00Z')
          },
          {
            lessonId: 2,
            lessonTitle: 'Basics',
            position: 2,
            completed: true,
            completed_at: new Date('2023-01-01T11:00:00Z')
          },
          {
            lessonId: 3,
            lessonTitle: 'Advanced',
            position: 3,
            completed: false,
            completed_at: null
          }
        ]
      };

      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        version: expect.any(String)
      });
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { courseId: '2' };

      const mockProgress = {
        lessonsCompleted: 0,
        totalLessons: 3,
        percent: 0,
        lessons: []
      };

      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockReq, mockRes);

      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        version: expect.any(String)
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing courseId', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.query = {};

        await progressController.getMyProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'courseId', message: 'Course ID is required in query parameters' }
          ]),
          version: expect.any(String)
        });
        expect(mockProgressService.getUserCourseProgress).not.toHaveBeenCalled();
      });

      it('should return 400 for invalid courseId', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.query = { courseId: 'invalid' };

        await progressController.getMyProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'courseId', message: 'Course ID must be a positive integer' }
          ]),
          version: expect.any(String)
        });
      });

      it('should return 400 for zero courseId', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.query = { courseId: '0' };

        await progressController.getMyProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            { field: 'courseId', message: 'Course ID must be a positive integer' }
          ]),
          version: expect.any(String)
        });
      });
    });

    describe('service errors', () => {
      it('should return 500 for service errors', async () => {
        mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
        mockReq.query = { courseId: '1' };

        mockProgressService.getUserCourseProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.getMyProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get progress',
          version: expect.any(String)
        });
      });
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress for instructor', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };

      const mockProgress = [
        {
          user: {
            id: 1,
            name: 'Student One',
            email: 'student1@example.com'
          },
          completedCount: 3,
          totalLessons: 5,
          percent: 60
        },
        {
          user: {
            id: 3,
            name: 'Student Two',
            email: 'student2@example.com'
          },
          completedCount: 1,
          totalLessons: 5,
          percent: 20
        }
      ];

      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        count: 2,
        version: expect.any(String)
      });
    });

    it('should return course progress for admin', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { courseId: '1' };

      const mockProgress = [
        {
          user: {
            id: 2,
            name: 'Student One',
            email: 'student1@example.com'
          },
          completedCount: 5,
          totalLessons: 5,
          percent: 100
        }
      ];

      mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 1, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        count: 1,
        version: expect.any(String)
      });
    });

    it('should return empty array for course with no enrollments', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };

      mockProgressService.getCourseProgress.mockResolvedValue([]);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: expect.any(String)
      });
    });

    describe('validation errors', () => {
      it('should return 400 for invalid courseId', async () => {
        mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: 'invalid' };

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: expect.any(String)
        });
        expect(mockProgressService.getCourseProgress).not.toHaveBeenCalled();
      });

      it('should return 400 for zero courseId', async () => {
        mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: '0' };

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: expect.any(String)
        });
      });

      it('should return 400 for negative courseId', async () => {
        mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: '-1' };

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: expect.any(String)
        });
      });
    });

    describe('service errors', () => {
      it('should return 404 when course not found', async () => {
        mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: '999' };

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('Course not found')
        );

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Course not found',
          version: expect.any(String)
        });
      });

      it('should return 403 when user cannot view course progress', async () => {
        mockReq.user = { id: 3, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: '1' };

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('You can only view progress for your own courses')
        );

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'You can only view progress for your own courses',
          version: expect.any(String)
        });
      });

      it('should return 500 for unexpected service errors', async () => {
        mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
        mockReq.params = { courseId: '1' };

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.getCourseProgress(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get course progress',
          version: expect.any(String)
        });
      });
    });
  });

  describe('authentication context', () => {
    it('should use authenticated user ID from request', async () => {
      const userId = 42;
      mockReq.user = { id: userId, email: 'test@example.com', role: 'student' };
      mockReq.body = { enrollmentId: 1, lessonId: 2, completed: true };

      const mockProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

      await progressController.markComplete(mockReq, mockRes);

      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(
        userId, 1, 2, true
      );
    });

    it('should use authenticated user role for authorization', async () => {
      const userRole = 'admin';
      mockReq.user = { id: 1, email: 'admin@example.com', role: userRole };
      mockReq.params = { courseId: '1' };

      mockProgressService.getCourseProgress.mockResolvedValue([]);

      await progressController.getCourseProgress(mockReq, mockRes);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(
        1, 1, userRole
      );
    });
  });
});
