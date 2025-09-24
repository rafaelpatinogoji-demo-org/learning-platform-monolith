/**
 * Tests for lessons controller
 * 
 * Tests lesson CRUD operations, content management, and authorization
 * without any database dependencies.
 */

import { Request, Response, NextFunction } from 'express';
import { lessonsController } from '../../src/controllers/lessons.controller';
import { lessonsService } from '../../src/services/lessons.service';
import { LessonValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/lessons.service');
const mockLessonsService = lessonsService as jest.Mocked<typeof lessonsService>;

jest.mock('../../src/utils/validation', () => {
  const originalModule = jest.requireActual('../../src/utils/validation');
  return {
    ...originalModule,
    LessonValidator: {
      validateCreateLesson: jest.fn(),
      validateUpdateLesson: jest.fn(),
      validateReorder: jest.fn()
    }
  };
});
const mockLessonValidator = LessonValidator as jest.Mocked<typeof LessonValidator>;

const VALID_LESSON = {
  id: 1,
  course_id: 1,
  title: 'Test Lesson',
  video_url: 'https://example.com/video.mp4',
  content_md: '# Test Content',
  position: 1,
  created_at: new Date()
};

const VALID_LESSON_INPUT = {
  title: 'Test Lesson',
  video_url: 'https://example.com/video.mp4',
  content_md: '# Test Content',
  position: 1
};

const VALID_COURSE = {
  id: 1,
  instructor_id: 1,
  title: 'Test Course',
  published: true
};

describe('lessonsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    
    // Ensure clean environment
    jest.clearAllMocks();
  });

  describe('create method', () => {
    it('should return 400 when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'not-a-number' };
      mockReq.body = VALID_LESSON_INPUT;

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: '' }; // Invalid input
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateCreateLesson).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = undefined;
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not instructor or admin', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can create lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should create lesson successfully as instructor', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockLessonsService.createLesson.mockResolvedValue(VALID_LESSON);

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        {
          course_id: 1,
          title: VALID_LESSON_INPUT.title,
          video_url: VALID_LESSON_INPUT.video_url,
          content_md: VALID_LESSON_INPUT.content_md,
          position: VALID_LESSON_INPUT.position
        },
        1, // user ID
        'instructor' // role
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: VALID_LESSON,
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should create lesson successfully as admin', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = { id: 2, email: 'admin@example.com', role: 'admin' };
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockLessonsService.createLesson.mockResolvedValue(VALID_LESSON);

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        {
          course_id: 1,
          title: VALID_LESSON_INPUT.title,
          video_url: VALID_LESSON_INPUT.video_url,
          content_md: VALID_LESSON_INPUT.content_md,
          position: VALID_LESSON_INPUT.position
        },
        2, // user ID
        'admin' // role
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: VALID_LESSON,
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const serviceError = { status: 403, message: 'You do not have permission to add lessons to this course' };
      mockLessonsService.createLesson.mockRejectedValue(serviceError);

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to add lessons to this course',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = VALID_LESSON_INPUT;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.createLesson.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.create(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('listByCourse method', () => {
    it('should return 400 when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'not-a-number' };

      // Act
      await lessonsController.listByCourse(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should list lessons successfully for authenticated user', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      const lessons = [VALID_LESSON, { ...VALID_LESSON, id: 2, title: 'Lesson 2', position: 2 }];
      mockLessonsService.listLessons.mockResolvedValue(lessons);

      // Act
      await lessonsController.listByCourse(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, 1, 'student');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons,
        count: 2,
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should list lessons successfully for unauthenticated user (public course)', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = undefined;
      
      const lessons = [VALID_LESSON, { ...VALID_LESSON, id: 2, title: 'Lesson 2', position: 2 }];
      mockLessonsService.listLessons.mockResolvedValue(lessons);

      // Act
      await lessonsController.listByCourse(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons,
        count: 2,
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      const serviceError = { status: 404, message: 'Course not found' };
      mockLessonsService.listLessons.mockRejectedValue(serviceError);

      // Act
      await lessonsController.listByCourse(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.listLessons.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.listByCourse(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('show method', () => {
    it('should return 400 when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'not-a-number' };

      // Act
      await lessonsController.show(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should show lesson successfully for authenticated user', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      mockLessonsService.getLessonById.mockResolvedValue(VALID_LESSON);

      // Act
      await lessonsController.show(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, 1, 'student');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: VALID_LESSON,
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should show lesson successfully for unauthenticated user (public course)', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = undefined;
      
      mockLessonsService.getLessonById.mockResolvedValue(VALID_LESSON);

      // Act
      await lessonsController.show(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: VALID_LESSON,
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      const serviceError = { status: 404, message: 'Lesson not found' };
      mockLessonsService.getLessonById.mockRejectedValue(serviceError);

      // Act
      await lessonsController.show(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.getLessonById.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.show(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('update method', () => {
    it('should return 400 when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'not-a-number' };
      mockReq.body = { title: 'Updated Lesson' };

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: '' }; // Invalid input
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateUpdateLesson).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };
      mockReq.user = undefined;
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not instructor or admin', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can update lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should update lesson successfully as instructor', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson', content_md: '# Updated Content' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const updatedLesson = { 
        ...VALID_LESSON, 
        title: 'Updated Lesson', 
        content_md: '# Updated Content' 
      };
      mockLessonsService.updateLesson.mockResolvedValue(updatedLesson);

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(
        1, // lesson ID
        {
          title: 'Updated Lesson',
          content_md: '# Updated Content',
          video_url: undefined
        },
        1, // user ID
        'instructor' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: updatedLesson,
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should update lesson successfully as admin', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Admin Updated Lesson' };
      mockReq.user = { id: 2, email: 'admin@example.com', role: 'admin' };
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const updatedLesson = { ...VALID_LESSON, title: 'Admin Updated Lesson' };
      mockLessonsService.updateLesson.mockResolvedValue(updatedLesson);

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(
        1, // lesson ID
        {
          title: 'Admin Updated Lesson',
          video_url: undefined,
          content_md: undefined
        },
        2, // user ID
        'admin' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: updatedLesson,
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const serviceError = { status: 403, message: 'You do not have permission to update this lesson' };
      mockLessonsService.updateLesson.mockRejectedValue(serviceError);

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to update this lesson',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });

      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.updateLesson.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.update(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('reorder method', () => {
    it('should return 400 when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'not-a-number' };
      mockReq.body = { lessonIds: [1, 2, 3] };

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [] }; // Invalid input (empty array)
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: false,
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }]
      });

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateReorder).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }],
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [1, 2, 3] };
      mockReq.user = undefined;
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not instructor or admin', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [1, 2, 3] };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can reorder lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reorder lessons successfully as instructor', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [3, 1, 2] };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      const reorderedLessons = [
        { ...VALID_LESSON, id: 3, position: 1 },
        { ...VALID_LESSON, id: 1, position: 2 },
        { ...VALID_LESSON, id: 2, position: 3 }
      ];
      mockLessonsService.reorderLessons.mockResolvedValue(reorderedLessons);

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(
        1, // course ID
        [3, 1, 2], // lesson IDs
        1, // user ID
        'instructor' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: reorderedLessons,
        count: 3,
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reorder lessons successfully as admin', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [2, 3, 1] };
      mockReq.user = { id: 2, email: 'admin@example.com', role: 'admin' };
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      const reorderedLessons = [
        { ...VALID_LESSON, id: 2, position: 1 },
        { ...VALID_LESSON, id: 3, position: 2 },
        { ...VALID_LESSON, id: 1, position: 3 }
      ];
      mockLessonsService.reorderLessons.mockResolvedValue(reorderedLessons);

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(
        1, // course ID
        [2, 3, 1], // lesson IDs
        2, // user ID
        'admin' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: reorderedLessons,
        count: 3,
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [1, 2, 3] };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      const serviceError = { 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 does not belong to this course' 
      };
      mockLessonsService.reorderLessons.mockRejectedValue(serviceError);

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson IDs: lesson 3 does not belong to this course',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [1, 2, 3] };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });

      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.reorderLessons.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.reorder(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('remove method', () => {
    it('should return 400 when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'not-a-number' };

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = undefined;

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not instructor or admin', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can delete lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should delete lesson successfully as instructor', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(
        1, // lesson ID
        1, // user ID
        'instructor' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should delete lesson successfully as admin', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'admin@example.com', role: 'admin' };
      
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(
        1, // lesson ID
        2, // user ID
        'admin' // role
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
    });

    it('should handle service errors with status code', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      const serviceError = { status: 403, message: 'You do not have permission to delete this lesson' };
      mockLessonsService.deleteLesson.mockRejectedValue(serviceError);

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to delete this lesson',
        version: 'v0.8'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass unexpected errors to next middleware', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      
      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.deleteLesson.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.remove(mockReq as any, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});
