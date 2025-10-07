import { lessonsController } from '../../src/controllers/lessons.controller';
import { lessonsService } from '../../src/services/lessons.service';
import { createMockRequest, createMockResponse, createMockLesson, mockUsers } from '../helpers/test-data';

jest.mock('../../src/services/lessons.service');

describe('LessonsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { courseId: '1' }, {
        title: 'Test Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should validate lesson data', async () => {
      const req = createMockRequest(mockUsers.instructor1, { courseId: '1' }, { title: '' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create lesson successfully', async () => {
      const lessonData = {
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };
      const mockLesson = createMockLesson({ ...lessonData, course_id: 1 });

      (lessonsService.createLesson as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      const req = createMockRequest(mockUsers.instructor1, { courseId: '1' }, lessonData);
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.create(req, res, next);

      expect(lessonsService.createLesson).toHaveBeenCalledWith(
        { ...lessonData, course_id: 1 },
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });
  });

  describe('listByCourse', () => {
    it('should list lessons for public course', async () => {
      const mockLessons = [createMockLesson({ id: 1 }), createMockLesson({ id: 2 })];

      (lessonsService.listLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      const req = createMockRequest(undefined, { courseId: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.listByCourse(req, res, next);

      expect(lessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: mockLessons.length,
        version: 'v1.9'
      });
    });

    it('should list lessons with authentication', async () => {
      const mockLessons = [createMockLesson()];

      (lessonsService.listLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      const req = createMockRequest(mockUsers.instructor1, { courseId: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.listByCourse(req, res, next);

      expect(lessonsService.listLessons).toHaveBeenCalledWith(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
    });

    it('should handle access denied error', async () => {
      const error: any = new Error('Access denied');
      error.status = 403;
      (lessonsService.listLessons as jest.Mock) = jest.fn().mockRejectedValue(error);

      const req = createMockRequest(mockUsers.student, { courseId: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.listByCourse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('show', () => {
    it('should show lesson for public course', async () => {
      const mockLesson = createMockLesson();

      (lessonsService.getLessonById as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.show(req, res, next);

      expect(lessonsService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should show lesson with authentication', async () => {
      const mockLesson = createMockLesson();

      (lessonsService.getLessonById as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.show(req, res, next);

      expect(lessonsService.getLessonById).toHaveBeenCalledWith(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
    });
  });

  describe('update', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should validate update data', async () => {
      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, { title: '' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update lesson successfully', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedLesson = createMockLesson({ ...updateData });

      (lessonsService.updateLesson as jest.Mock) = jest.fn().mockResolvedValue(updatedLesson);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, updateData);
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.update(req, res, next);

      expect(lessonsService.updateLesson).toHaveBeenCalledWith(
        1,
        updateData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lesson: updatedLesson,
        version: 'v1.9'
      });
    });
  });

  describe('reorder', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { courseId: '1' }, { lessonIds: [1, 2, 3] });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.reorder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should validate lessonIds', async () => {
      const req = createMockRequest(mockUsers.instructor1, { courseId: '1' }, { lessonIds: 'invalid' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.reorder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reorder lessons successfully', async () => {
      const reorderedLessons = [
        createMockLesson({ id: 3, position: 1 }),
        createMockLesson({ id: 1, position: 2 }),
        createMockLesson({ id: 2, position: 3 })
      ];

      (lessonsService.reorderLessons as jest.Mock) = jest.fn().mockResolvedValue(reorderedLessons);

      const req = createMockRequest(
        mockUsers.instructor1,
        { courseId: '1' },
        { lessonIds: [3, 1, 2] }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.reorder(req, res, next);

      expect(lessonsService.reorderLessons).toHaveBeenCalledWith(
        1,
        [3, 1, 2],
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        lessons: reorderedLessons,
        count: reorderedLessons.length,
        version: 'v1.9'
      });
    });

    it('should handle validation errors from service', async () => {
      const error: any = new Error('Lesson count mismatch');
      error.status = 400;
      (lessonsService.reorderLessons as jest.Mock) = jest.fn().mockRejectedValue(error);

      const req = createMockRequest(
        mockUsers.instructor1,
        { courseId: '1' },
        { lessonIds: [1, 2] }
      );
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.reorder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('remove', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.remove(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should delete lesson successfully', async () => {
      (lessonsService.deleteLesson as jest.Mock) = jest.fn().mockResolvedValue(true);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' });
      const res = createMockResponse();
      const next = jest.fn();

      await lessonsController.remove(req, res, next);

      expect(lessonsService.deleteLesson).toHaveBeenCalledWith(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });
  });
});
