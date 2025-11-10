import { Request, Response, NextFunction } from 'express';
import { lessonsController } from '../src/controllers/lessons.controller';
import { lessonsService } from '../src/services/lessons.service';
import { LessonValidator } from '../src/utils/validation';

jest.mock('../src/services/lessons.service');
jest.mock('../src/utils/validation');

describe('LessonsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();
    
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: undefined
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('create - Create lesson', () => {
    it('should create lesson for instructor', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = {
        title: 'New Lesson',
        video_url: 'https://example.com/video',
        content_md: 'Lesson content'
      };

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video',
        content_md: 'Lesson content',
        position: 1,
        created_at: new Date()
      };

      (LessonValidator.validateCreateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (lessonsService.createLesson as jest.Mock).mockResolvedValue(mockLesson);

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: '' };

      (LessonValidator.validateCreateLesson as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.body = { title: 'New Lesson' };

      (LessonValidator.validateCreateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 for student role', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 30, email: 'student@test.com', role: 'student' };
      mockRequest.body = { title: 'New Lesson' };

      (LessonValidator.validateCreateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can create lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: 'New Lesson' };

      (LessonValidator.validateCreateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (lessonsService.createLesson as jest.Mock).mockRejectedValue({
        status: 404,
        message: 'Course not found'
      });

      await lessonsController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });
  });

  describe('listByCourse - List lessons for a course', () => {
    it('should list lessons for published course', async () => {
      mockRequest.params = { courseId: '1' };

      const mockLessons = [
        {
          id: 1,
          course_id: 1,
          title: 'Lesson 1',
          video_url: 'https://example.com/video1',
          content_md: 'Content 1',
          position: 1,
          created_at: new Date()
        },
        {
          id: 2,
          course_id: 1,
          title: 'Lesson 2',
          video_url: 'https://example.com/video2',
          content_md: 'Content 2',
          position: 2,
          created_at: new Date()
        }
      ];

      (lessonsService.listLessons as jest.Mock).mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 2,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };

      await lessonsController.listByCourse(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { courseId: '1' };

      (lessonsService.listLessons as jest.Mock).mockRejectedValue({
        status: 404,
        message: 'Course not found'
      });

      await lessonsController.listByCourse(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should pass user info to service for visibility checks', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      (lessonsService.listLessons as jest.Mock).mockResolvedValue([]);

      await lessonsController.listByCourse(mockRequest as Request, mockResponse as Response, mockNext);

      expect(lessonsService.listLessons).toHaveBeenCalledWith(1, 10, 'instructor');
    });
  });

  describe('show - Get lesson by ID', () => {
    it('should get lesson by id', async () => {
      mockRequest.params = { id: '1' };

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Test Lesson',
        video_url: 'https://example.com/video',
        content_md: 'Test content',
        position: 1,
        created_at: new Date()
      };

      (lessonsService.getLessonById as jest.Mock).mockResolvedValue(mockLesson);

      await lessonsController.show(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await lessonsController.show(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: '999' };

      (lessonsService.getLessonById as jest.Mock).mockRejectedValue({
        status: 404,
        message: 'Lesson not found'
      });

      await lessonsController.show(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });
  });

  describe('update - Update lesson', () => {
    it('should update lesson for instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: 'Updated Title' };

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Updated Title',
        video_url: 'https://example.com/video',
        content_md: 'Test content',
        position: 1,
        created_at: new Date()
      };

      (LessonValidator.validateUpdateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (lessonsService.updateLesson as jest.Mock).mockResolvedValue(mockLesson);

      await lessonsController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      await lessonsController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: '' };

      (LessonValidator.validateUpdateLesson as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Title' };

      (LessonValidator.validateUpdateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 for student role', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 30, email: 'student@test.com', role: 'student' };
      mockRequest.body = { title: 'Updated Title' };

      (LessonValidator.validateUpdateLesson as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.update(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can update lessons',
        role: 'student',
        version: 'v1.9'
      });
    });
  });

  describe('reorder - Reorder lessons', () => {
    it('should reorder lessons for instructor', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { lessonIds: [3, 1, 2] };

      const mockLessons = [
        { id: 3, course_id: 1, title: 'Lesson 3', position: 1, created_at: new Date() },
        { id: 1, course_id: 1, title: 'Lesson 1', position: 2, created_at: new Date() },
        { id: 2, course_id: 1, title: 'Lesson 2', position: 3, created_at: new Date() }
      ];

      (LessonValidator.validateReorder as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (lessonsService.reorderLessons as jest.Mock).mockResolvedValue(mockLessons);

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 3,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { lessonIds: [] };

      (LessonValidator.validateReorder as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }]
      });

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.body = { lessonIds: [1, 2, 3] };

      (LessonValidator.validateReorder as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 for student role', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 30, email: 'student@test.com', role: 'student' };
      mockRequest.body = { lessonIds: [1, 2, 3] };

      (LessonValidator.validateReorder as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can reorder lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { courseId: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { lessonIds: [1, 2, 99] };

      (LessonValidator.validateReorder as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (lessonsService.reorderLessons as jest.Mock).mockRejectedValue({
        status: 400,
        message: 'Invalid lesson IDs: lesson 99 does not belong to this course'
      });

      await lessonsController.reorder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson IDs: lesson 99 does not belong to this course',
        version: 'v1.9'
      });
    });
  });

  describe('remove - Delete lesson', () => {
    it('should delete lesson for instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      (lessonsService.deleteLesson as jest.Mock).mockResolvedValue(undefined);

      await lessonsController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      await lessonsController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.params = { id: '1' };

      await lessonsController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 for student role', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 30, email: 'student@test.com', role: 'student' };

      await lessonsController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can delete lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      (lessonsService.deleteLesson as jest.Mock).mockRejectedValue({
        status: 404,
        message: 'Lesson not found'
      });

      await lessonsController.remove(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });
  });
});
