import { Request, Response, NextFunction } from 'express';
import { lessonsController } from '../lessons.controller';
import { lessonsService } from '../../services/lessons.service';
import { LessonValidator } from '../../utils/validation';

jest.mock('../../services/lessons.service');
jest.mock('../../utils/validation');

describe('lessonsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const mockLessonsService = lessonsService as jest.Mocked<typeof lessonsService>;
  const mockValidator = LessonValidator as jest.Mocked<typeof LessonValidator>;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: undefined,
      requestId: 'test-request-id'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('create', () => {
    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = {
        title: 'Test Lesson',
        content_md: 'Test content',
        video_url: 'https://example.com/video'
      };
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;
      mockValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should deny student from creating lesson', async () => {
      mockReq.user = { id: 4, email: 'student@example.com', role: 'student' };
      mockValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return validation errors', async () => {
      mockValidator.validateCreateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title is required' }]
      });

      await lessonsController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title is required' }],
        version: 'v1.9'
      });
    });

    it('should create lesson successfully', async () => {
      mockValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      const mockLesson = { id: 1, title: 'Test Lesson', course_id: 1, position: 1, created_at: new Date() };
      mockLessonsService.createLesson.mockResolvedValue(mockLesson);

      await lessonsController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        expect.objectContaining({ course_id: 1, title: 'Test Lesson' }),
        2,
        'instructor'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      const error = new Error('Course not found');
      (error as any).status = 404;
      mockLessonsService.createLesson.mockRejectedValue(error);

      await lessonsController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });
  });

  describe('listByCourse', () => {
    beforeEach(() => {
      mockReq.params = { courseId: '1' };
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { courseId: 'invalid' };

      await lessonsController.listByCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should list lessons without authentication', async () => {
      const mockLessons = [
        { id: 1, title: 'Lesson 1', course_id: 1, position: 1, created_at: new Date() },
        { id: 2, title: 'Lesson 2', course_id: 1, position: 2, created_at: new Date() }
      ];
      mockLessonsService.listLessons.mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 2,
        version: 'v1.9'
      });
    });

    it('should list lessons with authentication', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const mockLessons = [{ id: 1, title: 'Lesson 1', course_id: 1, position: 1, created_at: new Date() }];
      mockLessonsService.listLessons.mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, 2, 'instructor');
    });

    it('should handle service errors', async () => {
      const error = new Error('Course not found');
      (error as any).status = 404;
      mockLessonsService.listLessons.mockRejectedValue(error);

      await lessonsController.listByCourse(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });
  });

  describe('show', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockReq.params = { id: 'invalid' };

      await lessonsController.show(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return lesson without authentication', async () => {
      const mockLesson = { id: 1, title: 'Test Lesson', course_id: 1, position: 1, created_at: new Date() };
      mockLessonsService.getLessonById.mockResolvedValue(mockLesson);

      await lessonsController.show(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should return lesson with authentication', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const mockLesson = { id: 1, title: 'Test Lesson', course_id: 1, position: 1, created_at: new Date() };
      mockLessonsService.getLessonById.mockResolvedValue(mockLesson);

      await lessonsController.show(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, 2, 'instructor');
    });

    it('should handle not found error', async () => {
      const error = new Error('Lesson not found or not accessible');
      (error as any).status = 404;
      mockLessonsService.getLessonById.mockRejectedValue(error);

      await lessonsController.show(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found or not accessible',
        version: 'v1.9'
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;
      mockValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should deny student from updating lesson', async () => {
      mockReq.user = { id: 4, email: 'student@example.com', role: 'student' };
      mockValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return validation errors', async () => {
      mockValidator.validateUpdateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Invalid title' }]
      });

      await lessonsController.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should update lesson successfully', async () => {
      mockValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      const mockLesson = { id: 1, title: 'Updated Lesson', course_id: 1, position: 1, created_at: new Date() };
      mockLessonsService.updateLesson.mockResolvedValue(mockLesson);

      await lessonsController.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(1, { title: 'Updated Lesson' }, 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      const error = new Error('Permission denied');
      (error as any).status = 403;
      mockLessonsService.updateLesson.mockRejectedValue(error);

      await lessonsController.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Permission denied',
        version: 'v1.9'
      });
    });
  });

  describe('reorder', () => {
    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [3, 1, 2] };
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;
      mockValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.reorder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should deny student from reordering lessons', async () => {
      mockReq.user = { id: 4, email: 'student@example.com', role: 'student' };
      mockValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.reorder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return validation errors', async () => {
      mockValidator.validateReorder.mockReturnValue({
        isValid: false,
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array is required' }]
      });

      await lessonsController.reorder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reorder lessons successfully', async () => {
      mockValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      const mockLessons = [
        { id: 3, title: 'Lesson 3', course_id: 1, position: 1, created_at: new Date() },
        { id: 1, title: 'Lesson 1', course_id: 1, position: 2, created_at: new Date() },
        { id: 2, title: 'Lesson 2', course_id: 1, position: 3, created_at: new Date() }
      ];
      mockLessonsService.reorderLessons.mockResolvedValue(mockLessons);

      await lessonsController.reorder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(1, [3, 1, 2], 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 3,
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      mockValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      const error = new Error('Lesson count mismatch');
      (error as any).status = 400;
      mockLessonsService.reorderLessons.mockRejectedValue(error);

      await lessonsController.reorder(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson count mismatch',
        version: 'v1.9'
      });
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await lessonsController.remove(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should deny student from deleting lesson', async () => {
      mockReq.user = { id: 4, email: 'student@example.com', role: 'student' };

      await lessonsController.remove(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when lesson not found', async () => {
      const error = new Error('Lesson not found');
      (error as any).status = 404;
      mockLessonsService.deleteLesson.mockRejectedValue(error);

      await lessonsController.remove(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });

    it('should delete lesson successfully', async () => {
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      await lessonsController.remove(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Permission denied');
      (error as any).status = 403;
      mockLessonsService.deleteLesson.mockRejectedValue(error);

      await lessonsController.remove(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Permission denied',
        version: 'v1.9'
      });
    });
  });
});
