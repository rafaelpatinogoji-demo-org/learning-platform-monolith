/**
 * Tests for progress controller
 * 
 * Tests progress tracking endpoints, completion updates, and authorization
 * without any database dependencies.
 */

import { Request, Response } from 'express';
import { progressController } from '../../src/controllers/progress.controller';
import { progressService } from '../../src/services/progress.service';
import { ProgressValidator } from '../../src/utils/validation';
import { config } from '../../src/config';
import { testUtils } from '../setup';

jest.mock('../../src/services/progress.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/config', () => ({
  config: {
    version: 'v1.1'
  }
}));

const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockProgressValidator = ProgressValidator as jest.Mocked<typeof ProgressValidator>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('Progress Controller', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    
    jest.clearAllMocks();
  });

  describe('markComplete', () => {
    const validUser = { id: 1, email: 'student@test.com', role: 'student' };
    const validRequestBody = {
      enrollmentId: 1,
      lessonId: 2,
      completed: true
    };

    beforeEach(() => {
      mockReq.user = validUser;
      mockReq.body = validRequestBody;
    });

    describe('Validation Scenarios', () => {
      it('should return 400 when validation fails', async () => {
        mockProgressValidator.validateMarkProgress.mockReturnValue({
          isValid: false,
          errors: [
            { field: 'enrollmentId', message: 'Enrollment ID is required' },
            { field: 'lessonId', message: 'Lesson ID must be a positive integer' }
          ]
        });

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: [
            { field: 'enrollmentId', message: 'Enrollment ID is required' },
            { field: 'lessonId', message: 'Lesson ID must be a positive integer' }
          ],
          version: 'v1.1'
        });
        expect(mockProgressService.markLessonProgress).not.toHaveBeenCalled();
      });

      it('should proceed when validation passes', async () => {
        mockProgressValidator.validateMarkProgress.mockReturnValue({
          isValid: true,
          errors: []
        });

        const mockProgress = {
          id: 1,
          enrollment_id: 1,
          lesson_id: 2,
          completed: true,
          completed_at: new Date('2024-01-15T10:00:00Z'),
          created_at: new Date('2024-01-15T09:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z')
        };

        mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockProgressValidator.validateMarkProgress).toHaveBeenCalledWith(validRequestBody);
        expect(mockProgressService.markLessonProgress).toHaveBeenCalledWith(1, 1, 2, true);
      });
    });

    describe('Success Scenarios', () => {
      beforeEach(() => {
        mockProgressValidator.validateMarkProgress.mockReturnValue({
          isValid: true,
          errors: []
        });
      });

      it('should mark lesson as complete successfully', async () => {
        const mockProgress = {
          id: 1,
          enrollment_id: 1,
          lesson_id: 2,
          completed: true,
          completed_at: new Date('2024-01-15T10:00:00Z'),
          created_at: new Date('2024-01-15T09:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z')
        };

        mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

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
          version: 'v1.1'
        });
      });

      it('should mark lesson as incomplete successfully', async () => {
        mockReq.body = { ...validRequestBody, completed: false };

        const mockProgress = {
          id: 1,
          enrollment_id: 1,
          lesson_id: 2,
          completed: false,
          completed_at: null,
          created_at: new Date('2024-01-15T09:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z')
        };

        mockProgressService.markLessonProgress.mockResolvedValue(mockProgress);

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

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
          version: 'v1.1'
        });
      });
    });

    describe('Error Scenarios', () => {
      beforeEach(() => {
        mockProgressValidator.validateMarkProgress.mockReturnValue({
          isValid: true,
          errors: []
        });
      });

      it('should return 404 when enrollment not found', async () => {
        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Enrollment not found')
        );

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Enrollment not found',
          version: 'v1.1'
        });
      });

      it('should return 404 when lesson not found', async () => {
        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Lesson not found in this course')
        );

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Lesson not found in this course',
          version: 'v1.1'
        });
      });

      it('should return 403 when user tries to mark progress for another user', async () => {
        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('You can only mark progress for your own enrollments')
        );

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'You can only mark progress for your own enrollments',
          version: 'v1.1'
        });
      });

      it('should return 500 for unexpected errors', async () => {
        mockProgressService.markLessonProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.markComplete(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to mark lesson progress',
          version: 'v1.1'
        });
      });
    });
  });

  describe('getMyProgress', () => {
    const validUser = { id: 1, email: 'student@test.com', role: 'student' };

    beforeEach(() => {
      mockReq.user = validUser;
      mockReq.query = { courseId: '1' };
    });

    describe('Validation Scenarios', () => {
      it('should return 400 when courseId validation fails', async () => {
        mockProgressValidator.validateCourseIdQuery.mockReturnValue({
          isValid: false,
          errors: [
            { field: 'courseId', message: 'Course ID is required in query parameters' }
          ]
        });

        await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Validation failed',
          errors: [
            { field: 'courseId', message: 'Course ID is required in query parameters' }
          ],
          version: 'v1.1'
        });
        expect(mockProgressService.getUserCourseProgress).not.toHaveBeenCalled();
      });

      it('should proceed when validation passes', async () => {
        mockProgressValidator.validateCourseIdQuery.mockReturnValue({
          isValid: true,
          errors: []
        });

        const mockProgress = {
          lessonsCompleted: 2,
          totalLessons: 3,
          percent: 67,
          lessons: []
        };

        mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

        await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockProgressValidator.validateCourseIdQuery).toHaveBeenCalledWith({ courseId: '1' });
        expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(1, 1);
      });
    });

    describe('Success Scenarios', () => {
      beforeEach(() => {
        mockProgressValidator.validateCourseIdQuery.mockReturnValue({
          isValid: true,
          errors: []
        });
      });

      it('should return user progress successfully', async () => {
        const mockProgress = {
          lessonsCompleted: 2,
          totalLessons: 3,
          percent: 67,
          lessons: [
            {
              lessonId: 1,
              lessonTitle: 'HTML Basics',
              position: 1,
              completed: true,
              completed_at: new Date('2024-01-14T10:00:00Z')
            },
            {
              lessonId: 2,
              lessonTitle: 'CSS Styling',
              position: 2,
              completed: true,
              completed_at: new Date('2024-01-15T10:00:00Z')
            },
            {
              lessonId: 3,
              lessonTitle: 'JavaScript Fundamentals',
              position: 3,
              completed: false,
              completed_at: null
            }
          ]
        };

        mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

        await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          ok: true,
          data: mockProgress,
          version: 'v1.1'
        });
      });

      it('should return empty progress for non-enrolled user', async () => {
        const mockProgress = {
          lessonsCompleted: 0,
          totalLessons: 3,
          percent: 0,
          lessons: []
        };

        mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgress);

        await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          ok: true,
          data: mockProgress,
          version: 'v1.1'
        });
      });
    });

    describe('Error Scenarios', () => {
      beforeEach(() => {
        mockProgressValidator.validateCourseIdQuery.mockReturnValue({
          isValid: true,
          errors: []
        });
      });

      it('should return 500 for service errors', async () => {
        mockProgressService.getUserCourseProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.getMyProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get progress',
          version: 'v1.1'
        });
      });
    });
  });

  describe('getCourseProgress', () => {
    const instructorUser = { id: 2, email: 'instructor@test.com', role: 'instructor' };
    const adminUser = { id: 3, email: 'admin@test.com', role: 'admin' };

    beforeEach(() => {
      mockReq.params = { courseId: '1' };
    });

    describe('Validation Scenarios', () => {
      it('should return 400 for invalid course ID', async () => {
        mockReq.params = { courseId: 'invalid' };
        mockReq.user = instructorUser;

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: 'v1.1'
        });
        expect(mockProgressService.getCourseProgress).not.toHaveBeenCalled();
      });

      it('should return 400 for negative course ID', async () => {
        mockReq.params = { courseId: '-1' };
        mockReq.user = instructorUser;

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: 'v1.1'
        });
      });

      it('should return 400 for zero course ID', async () => {
        mockReq.params = { courseId: '0' };
        mockReq.user = instructorUser;

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Invalid course ID',
          version: 'v1.1'
        });
      });
    });

    describe('Success Scenarios', () => {
      it('should return course progress for instructor', async () => {
        mockReq.user = instructorUser;

        const mockProgress = [
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 2,
            totalLessons: 3,
            percent: 67
          },
          {
            user: { id: 4, name: 'Bob Learner', email: 'bob@test.com' },
            completedCount: 1,
            totalLessons: 3,
            percent: 33
          }
        ];

        mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 2, 'instructor');
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: true,
          data: mockProgress,
          count: 2,
          version: 'v1.1'
        });
      });

      it('should return course progress for admin', async () => {
        mockReq.user = adminUser;

        const mockProgress = [
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 3,
            totalLessons: 3,
            percent: 100
          }
        ];

        mockProgressService.getCourseProgress.mockResolvedValue(mockProgress);

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockProgressService.getCourseProgress).toHaveBeenCalledWith(1, 3, 'admin');
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: true,
          data: mockProgress,
          count: 1,
          version: 'v1.1'
        });
      });

      it('should return empty array when no enrollments exist', async () => {
        mockReq.user = instructorUser;

        mockProgressService.getCourseProgress.mockResolvedValue([]);

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          ok: true,
          data: [],
          count: 0,
          version: 'v1.1'
        });
      });
    });

    describe('Error Scenarios', () => {
      it('should return 404 when course not found', async () => {
        mockReq.user = instructorUser;

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('Course not found')
        );

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Course not found',
          version: 'v1.1'
        });
      });

      it('should return 403 when user cannot view course progress', async () => {
        const studentUser = { id: 1, email: 'student@test.com', role: 'student' };
        mockReq.user = studentUser;

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('You can only view progress for your own courses')
        );

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'You can only view progress for your own courses',
          version: 'v1.1'
        });
      });

      it('should return 500 for unexpected errors', async () => {
        mockReq.user = instructorUser;

        mockProgressService.getCourseProgress.mockRejectedValue(
          new Error('Database connection failed')
        );

        await progressController.getCourseProgress(mockReq as AuthRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get course progress',
          version: 'v1.1'
        });
      });
    });
  });
});
