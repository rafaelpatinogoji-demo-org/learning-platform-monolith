import { Request, Response } from 'express';
import { progressController } from '../src/controllers/progress.controller';
import { progressService } from '../src/services/progress.service';
import { ProgressValidator } from '../src/utils/validation';

jest.mock('../src/services/progress.service');
jest.mock('../src/utils/validation');

describe('ProgressController', () => {
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
      user: undefined
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    it('should mark lesson as complete successfully', async () => {
      const userId = 1;
      const enrollmentId = 10;
      const lessonId = 100;
      const mockProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequest.body = { enrollmentId, lessonId, completed: true };
      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockResolvedValue(mockProgress);

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          id: mockProgress.id,
          enrollmentId: mockProgress.enrollment_id,
          lessonId: mockProgress.lesson_id,
          completed: mockProgress.completed
        })
      }));
      expect(progressService.markLessonProgress).toHaveBeenCalledWith(userId, enrollmentId, lessonId, true);
    });

    it('should mark lesson as incomplete successfully', async () => {
      const userId = 1;
      const enrollmentId = 10;
      const lessonId = 100;
      const mockProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequest.body = { enrollmentId, lessonId, completed: false };
      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockResolvedValue(mockProgress);

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          completed: false,
          completedAt: null
        })
      }));
    });

    it('should return 400 for invalid request data', async () => {
      mockRequest.body = { enrollmentId: 'invalid', lessonId: 100, completed: true };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'enrollmentId', message: 'Enrollment ID must be a positive integer' }]
      });

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Validation failed',
        errors: expect.any(Array)
      }));
    });

    it('should return 404 if enrollment not found', async () => {
      mockRequest.body = { enrollmentId: 999, lessonId: 100, completed: true };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockRejectedValue(
        new Error('Enrollment not found')
      );

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Enrollment not found'
      }));
    });

    it('should return 404 if lesson not found', async () => {
      mockRequest.body = { enrollmentId: 10, lessonId: 999, completed: true };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockRejectedValue(
        new Error('Lesson not found in this course')
      );

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Lesson not found in this course'
      }));
    });

    it('should return 403 if user tries to mark progress for another user enrollment', async () => {
      mockRequest.body = { enrollmentId: 10, lessonId: 100, completed: true };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockRejectedValue(
        new Error('You can only mark progress for your own enrollments')
      );

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'You can only mark progress for your own enrollments'
      }));
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { enrollmentId: 10, lessonId: 100, completed: true };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateMarkProgress as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.markLessonProgress as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await progressController.markComplete(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to mark lesson progress'
      }));
    });
  });

  describe('getMyProgress', () => {
    it('should return user progress for a course', async () => {
      const userId = 1;
      const courseId = 50;
      const mockProgress = {
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: [
          {
            lessonId: 100,
            lessonTitle: 'Lesson 1',
            position: 1,
            completed: true,
            completed_at: new Date()
          },
          {
            lessonId: 101,
            lessonTitle: 'Lesson 2',
            position: 2,
            completed: true,
            completed_at: new Date()
          },
          {
            lessonId: 102,
            lessonTitle: 'Lesson 3',
            position: 3,
            completed: true,
            completed_at: new Date()
          },
          {
            lessonId: 103,
            lessonTitle: 'Lesson 4',
            position: 4,
            completed: false,
            completed_at: null
          },
          {
            lessonId: 104,
            lessonTitle: 'Lesson 5',
            position: 5,
            completed: false,
            completed_at: null
          }
        ]
      };

      mockRequest.query = { courseId: '50' };
      mockRequest.user = { id: userId, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.getUserCourseProgress as jest.Mock).mockResolvedValue(mockProgress);

      await progressController.getMyProgress(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress
      }));
      expect(progressService.getUserCourseProgress).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.query = { courseId: 'invalid' };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await progressController.getMyProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Validation failed'
      }));
    });

    it('should return 400 for missing course ID', async () => {
      mockRequest.query = {};
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required in query parameters' }]
      });

      await progressController.getMyProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.query = { courseId: '50' };
      mockRequest.user = { id: 1, email: 'student@example.com', role: 'student' };

      (ProgressValidator.validateCourseIdQuery as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (progressService.getUserCourseProgress as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await progressController.getMyProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to get progress'
      }));
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress for instructor', async () => {
      const courseId = 50;
      const instructorId = 2;
      const mockProgress = [
        {
          user: {
            id: 1,
            name: 'Student 1',
            email: 'student1@example.com'
          },
          completedCount: 3,
          totalLessons: 5,
          percent: 60
        },
        {
          user: {
            id: 2,
            name: 'Student 2',
            email: 'student2@example.com'
          },
          completedCount: 5,
          totalLessons: 5,
          percent: 100
        }
      ];

      mockRequest.params = { courseId: '50' };
      mockRequest.user = { id: instructorId, email: 'instructor@example.com', role: 'instructor' };

      (progressService.getCourseProgress as jest.Mock).mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress,
        count: 2
      }));
      expect(progressService.getCourseProgress).toHaveBeenCalledWith(courseId, instructorId, 'instructor');
    });

    it('should return course progress for admin', async () => {
      const courseId = 50;
      const adminId = 999;
      const mockProgress = [
        {
          user: {
            id: 1,
            name: 'Student 1',
            email: 'student1@example.com'
          },
          completedCount: 2,
          totalLessons: 5,
          percent: 40
        }
      ];

      mockRequest.params = { courseId: '50' };
      mockRequest.user = { id: adminId, email: 'admin@example.com', role: 'admin' };

      (progressService.getCourseProgress as jest.Mock).mockResolvedValue(mockProgress);

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockProgress,
        count: 1
      }));
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Invalid course ID'
      }));
    });

    it('should return 400 for negative course ID', async () => {
      mockRequest.params = { courseId: '-1' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 if course not found', async () => {
      mockRequest.params = { courseId: '999' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      (progressService.getCourseProgress as jest.Mock).mockRejectedValue(
        new Error('Course not found')
      );

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Course not found'
      }));
    });

    it('should return 403 if instructor tries to view other instructor course', async () => {
      mockRequest.params = { courseId: '50' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      (progressService.getCourseProgress as jest.Mock).mockRejectedValue(
        new Error('You can only view progress for your own courses')
      );

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'You can only view progress for your own courses'
      }));
    });

    it('should return empty array for course with no enrollments', async () => {
      mockRequest.params = { courseId: '50' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      (progressService.getCourseProgress as jest.Mock).mockResolvedValue([]);

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: [],
        count: 0
      }));
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.params = { courseId: '50' };
      mockRequest.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      (progressService.getCourseProgress as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await progressController.getCourseProgress(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: 'Failed to get course progress'
      }));
    });
  });
});
