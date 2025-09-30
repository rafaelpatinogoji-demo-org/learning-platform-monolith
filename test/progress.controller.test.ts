import { Request, Response } from 'express';
import { progressController } from '../src/controllers/progress.controller';
import { progressService } from '../src/services/progress.service';
import { config } from '../src/config';

jest.mock('../src/services/progress.service');
jest.mock('../src/config', () => ({
  config: {
    version: 'v1.1'
  }
}));

const mockProgressService = progressService as jest.Mocked<typeof progressService>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('ProgressController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'student'
      },
      body: {},
      query: {},
      params: {}
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should mark lesson as complete successfully', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      const mockProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: true,
        completed_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      mockProgressService.markLessonProgress.mockResolvedValueOnce(mockProgress);

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 1, true);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          enrollmentId: 1,
          lessonId: 1,
          completed: true,
          completedAt: mockProgress.completed_at,
          createdAt: mockProgress.created_at,
          updatedAt: mockProgress.updated_at
        },
        version: 'v1.1'
      });
    });

    it('should return 400 when enrollmentId is missing', async () => {
      mockRequest.body = {
        lessonId: 1,
        completed: true
      };

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'enrollmentId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when lessonId is missing', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        completed: true
      };

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'lessonId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when completed is missing', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1
      };

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'completed' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when enrollmentId is not a positive integer', async () => {
      mockRequest.body = {
        enrollmentId: -1,
        lessonId: 1,
        completed: true
      };

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'enrollmentId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when completed is not a boolean', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: 'true'
      };

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'completed' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      mockProgressService.markLessonProgress.mockRejectedValueOnce(
        new Error('Enrollment not found')
      );

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Enrollment not found',
        version: 'v1.1'
      });
    });

    it('should return 404 when lesson not found', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      mockProgressService.markLessonProgress.mockRejectedValueOnce(
        new Error('Lesson not found in this course')
      );

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found in this course',
        version: 'v1.1'
      });
    });

    it('should return 403 when user does not own enrollment', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      mockProgressService.markLessonProgress.mockRejectedValueOnce(
        new Error('You can only mark progress for your own enrollments')
      );

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You can only mark progress for your own enrollments',
        version: 'v1.1'
      });
    });

    it('should return 500 for internal server error', async () => {
      mockRequest.body = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      mockProgressService.markLessonProgress.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await progressController.markComplete(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to mark lesson progress',
        version: 'v1.1'
      });
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress successfully', async () => {
      mockRequest.query = {
        courseId: '1'
      };

      const mockProgress = {
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: [
          { lessonId: 1, lessonTitle: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
          { lessonId: 2, lessonTitle: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
          { lessonId: 3, lessonTitle: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
          { lessonId: 4, lessonTitle: 'Lesson 4', position: 4, completed: false, completed_at: null },
          { lessonId: 5, lessonTitle: 'Lesson 5', position: 5, completed: false, completed_at: null }
        ]
      };

      mockProgressService.getUserCourseProgress.mockResolvedValueOnce(mockProgress);

      await progressController.getMyProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 1);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is missing', async () => {
      mockRequest.query = {};

      await progressController.getMyProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'courseId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is not a number', async () => {
      mockRequest.query = {
        courseId: 'abc'
      };

      await progressController.getMyProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'courseId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is negative', async () => {
      mockRequest.query = {
        courseId: '-1'
      };

      await progressController.getMyProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'courseId' })
        ]),
        version: 'v1.1'
      });
    });

    it('should return 500 for internal server error', async () => {
      mockRequest.query = {
        courseId: '1'
      };

      mockProgressService.getUserCourseProgress.mockRejectedValueOnce(
        new Error('Database error')
      );

      await progressController.getMyProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get progress',
        version: 'v1.1'
      });
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress for instructor', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = {
        id: 1,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      const mockProgress = [
        {
          user: { id: 1, name: 'Student 1', email: 'student1@example.com' },
          completedCount: 3,
          totalLessons: 5,
          percent: 60
        },
        {
          user: { id: 2, name: 'Student 2', email: 'student2@example.com' },
          completedCount: 5,
          totalLessons: 5,
          percent: 100
        }
      ];

      mockProgressService.getCourseProgress.mockResolvedValueOnce(mockProgress);

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        count: 2,
        version: 'v1.1'
      });
    });

    it('should return course progress for admin', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = {
        id: 2,
        email: 'admin@example.com',
        role: 'admin'
      };

      const mockProgress = [
        {
          user: { id: 1, name: 'Student 1', email: 'student1@example.com' },
          completedCount: 2,
          totalLessons: 4,
          percent: 50
        }
      ];

      mockProgressService.getCourseProgress.mockResolvedValueOnce(mockProgress);

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 2, 'admin');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockProgress,
        count: 1,
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is invalid', async () => {
      mockRequest.params = { courseId: 'abc' };

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is zero', async () => {
      mockRequest.params = { courseId: '0' };

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.1'
      });
    });

    it('should return 400 when courseId is negative', async () => {
      mockRequest.params = { courseId: '-1' };

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.1'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.params = { courseId: '1' };

      mockProgressService.getCourseProgress.mockRejectedValueOnce(
        new Error('Course not found')
      );

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.1'
      });
    });

    it('should return 403 when user does not have permission', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = {
        id: 3,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      mockProgressService.getCourseProgress.mockRejectedValueOnce(
        new Error('You can only view progress for your own courses')
      );

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You can only view progress for your own courses',
        version: 'v1.1'
      });
    });

    it('should return 500 for internal server error', async () => {
      mockRequest.params = { courseId: '1' };

      mockProgressService.getCourseProgress.mockRejectedValueOnce(
        new Error('Database error')
      );

      await progressController.getCourseProgress(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course progress',
        version: 'v1.1'
      });
    });
  });
});
