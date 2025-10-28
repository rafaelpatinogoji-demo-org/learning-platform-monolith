import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { lessonsController } from '../src/controllers/lessons.controller';
import { lessonsService } from '../src/services/lessons.service';
import { LessonValidator } from '../src/utils/validation';
import { mockRequest, mockResponse, mockNext } from './setup';

jest.mock('../src/services/lessons.service');
jest.mock('../src/utils/validation');

describe('LessonsController', () => {
  let mockedService: jest.Mocked<typeof lessonsService>;
  let mockedValidator: jest.Mocked<typeof LessonValidator>;

  beforeEach(() => {
    mockedService = lessonsService as jest.Mocked<typeof lessonsService>;
    mockedValidator = LessonValidator as jest.Mocked<typeof LessonValidator>;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create lesson and return 201', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Lesson', video_url: 'https://example.com/video.mp4' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const lesson = { id: 10, title: 'New Lesson', course_id: 1, position: 1 };

      mockedValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.createLesson.mockResolvedValue(lesson as any);

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        params: { courseId: 'invalid' },
        body: { title: 'New Lesson' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation failure', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: '' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateCreateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Lesson' }
      });
      const res = mockResponse();

      mockedValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 when user is not instructor or admin', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Lesson' },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();

      mockedValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can create lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Lesson' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.createLesson.mockRejectedValue({ status: 404, message: 'Course not found' });

      await lessonsController.create(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Lesson' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.createLesson.mockRejectedValue(error);

      await lessonsController.create(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listByCourse', () => {
    it('should return lessons with count', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();
      const lessons = [
        { id: 1, title: 'Lesson 1', position: 1 },
        { id: 2, title: 'Lesson 2', position: 2 }
      ];

      mockedService.listLessons.mockResolvedValue(lessons as any);

      await lessonsController.listByCourse(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lessons,
        count: 2,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        params: { courseId: 'invalid' }
      });
      const res = mockResponse();

      await lessonsController.listByCourse(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should work without authentication', async () => {
      const req = mockRequest({
        params: { courseId: '1' }
      });
      const res = mockResponse();
      const lessons = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockedService.listLessons.mockResolvedValue(lessons as any);

      await lessonsController.listByCourse(req, res, mockNext);

      expect(mockedService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { courseId: '1' }
      });
      const res = mockResponse();

      mockedService.listLessons.mockRejectedValue({ status: 404, message: 'Course not found' });

      await lessonsController.listByCourse(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { courseId: '1' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedService.listLessons.mockRejectedValue(error);

      await lessonsController.listByCourse(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('show', () => {
    it('should return lesson', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();
      const lesson = { id: 1, title: 'Lesson 1', course_id: 1, position: 1 };

      mockedService.getLessonById.mockResolvedValue(lesson as any);

      await lessonsController.show(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      const req = mockRequest({
        params: { id: 'invalid' }
      });
      const res = mockResponse();

      await lessonsController.show(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should work without authentication', async () => {
      const req = mockRequest({
        params: { id: '1' }
      });
      const res = mockResponse();
      const lesson = { id: 1, title: 'Lesson 1', course_id: 1, position: 1 };

      mockedService.getLessonById.mockResolvedValue(lesson as any);

      await lessonsController.show(req, res, mockNext);

      expect(mockedService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { id: '1' }
      });
      const res = mockResponse();

      mockedService.getLessonById.mockRejectedValue({ status: 404, message: 'Lesson not found' });

      await lessonsController.show(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { id: '1' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedService.getLessonById.mockRejectedValue(error);

      await lessonsController.show(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update lesson and return 200', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const lesson = { id: 1, title: 'Updated Title', course_id: 1, position: 1 };

      mockedValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.updateLesson.mockResolvedValue(lesson as any);

      await lessonsController.update(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      const req = mockRequest({
        params: { id: 'invalid' },
        body: { title: 'Updated Title' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      await lessonsController.update(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation failure', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: '' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateUpdateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.update(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' }
      });
      const res = mockResponse();

      mockedValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.update(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 when user is not instructor or admin', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();

      mockedValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.update(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can update lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.updateLesson.mockRejectedValue({ status: 404, message: 'Lesson not found' });

      await lessonsController.update(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { title: 'Updated Title' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockedService.updateLesson.mockRejectedValue(error);

      await lessonsController.update(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reorder', () => {
    it('should reorder lessons and return 200', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [3, 1, 2] },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const lessons = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];

      mockedValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockedService.reorderLessons.mockResolvedValue(lessons as any);

      await lessonsController.reorder(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lessons,
        count: 3,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        params: { courseId: 'invalid' },
        body: { lessonIds: [1, 2] },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      await lessonsController.reorder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 for validation failure', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [] },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateReorder.mockReturnValue({
        isValid: false,
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }]
      });

      await lessonsController.reorder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }],
        version: 'v1.9'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [1, 2] }
      });
      const res = mockResponse();

      mockedValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.reorder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 when user is not instructor or admin', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [1, 2] },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();

      mockedValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      await lessonsController.reorder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can reorder lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [1, 2] },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockedService.reorderLessons.mockRejectedValue({ status: 404, message: 'Course not found' });

      await lessonsController.reorder(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { lessonIds: [1, 2] },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockedService.reorderLessons.mockRejectedValue(error);

      await lessonsController.reorder(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('remove', () => {
    it('should delete lesson and return 200', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedService.deleteLesson.mockResolvedValue(undefined);

      await lessonsController.remove(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      const req = mockRequest({
        params: { id: 'invalid' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      await lessonsController.remove(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v1.9'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockRequest({
        params: { id: '1' }
      });
      const res = mockResponse();

      await lessonsController.remove(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 when user is not instructor or admin', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'student@example.com', role: 'student' }
      });
      const res = mockResponse();

      await lessonsController.remove(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can delete lessons',
        role: 'student',
        version: 'v1.9'
      });
    });

    it('should return error status when service throws error with status', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();

      mockedService.deleteLesson.mockRejectedValue({ status: 404, message: 'Lesson not found' });

      await lessonsController.remove(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });

    it('should call next when service throws error without status', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' }
      });
      const res = mockResponse();
      const error = new Error('Unexpected error');

      mockedService.deleteLesson.mockRejectedValue(error);

      await lessonsController.remove(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
