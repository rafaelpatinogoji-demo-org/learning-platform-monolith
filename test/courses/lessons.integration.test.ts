import { Request, Response } from 'express';
import { lessonsController } from '../../src/controllers/lessons.controller';
import { lessonsService } from '../../src/services/lessons.service';

jest.mock('../../src/services/lessons.service');

describe('Lessons Controller Integration Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      user: undefined,
      params: {},
      body: {},
      query: {},
      requestId: 'test-request-id'
    };

    res = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('POST /courses/:courseId/lessons', () => {
    it('should return 401 without authentication', async () => {
      req.params = { courseId: '1' };
      req.body = {
        title: 'New Lesson',
        video_url: 'https://example.com/video',
        content_md: '# Content'
      };

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v1.9'
      });
    });

    it('should return 403 for student role', async () => {
      req.user = { id: 1, email: 'student@example.com', role: 'student' };
      req.params = { courseId: '1' };
      req.body = {
        title: 'New Lesson',
        content_md: '# Content'
      };

      (lessonsService.canModifyCourseLessons as jest.Mock) = jest.fn().mockResolvedValue(false);

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should create lesson for instructor owner', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = {
        title: 'New Lesson',
        video_url: 'https://example.com/video',
        content_md: '# Content'
      };

      const mockLesson = {
        id: 1,
        ...req.body,
        position: 1,
        course_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (lessonsService.canModifyCourseLessons as jest.Mock) = jest.fn().mockResolvedValue(true);
      (lessonsService.createLesson as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(lessonsService.createLesson).toHaveBeenCalledWith(
        { ...req.body, course_id: 1 },
        1,
        'instructor'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should create lesson for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { courseId: '1' };
      req.body = {
        title: 'New Lesson',
        content_md: '# Content'
      };

      const mockLesson = {
        id: 1,
        ...req.body,
        video_url: null,
        position: 1,
        course_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (lessonsService.canModifyCourseLessons as jest.Mock) = jest.fn().mockResolvedValue(true);
      (lessonsService.createLesson as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for validation errors', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = {
        title: '',
        video_url: 'not-a-valid-url'
      };

      (lessonsService.canModifyCourseLessons as jest.Mock) = jest.fn().mockResolvedValue(true);

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.any(Array),
        version: 'v1.9'
      });
    });

    it('should handle course not found', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '999' };
      req.body = {
        title: 'New Lesson',
        content_md: '# Content'
      };

      const error = new Error('Course not found');
      (error as any).status = 404;
      (lessonsService.createLesson as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.create(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });
  });

  describe('GET /courses/:courseId/lessons', () => {
    it('should list lessons for published course without auth', async () => {
      req.params = { courseId: '1' };

      const mockLessons = [
        {
          id: 1,
          title: 'Lesson 1',
          video_url: 'https://example.com/video1',
          content_md: 'Content 1',
          position: 1,
          course_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          title: 'Lesson 2',
          video_url: 'https://example.com/video2',
          content_md: 'Content 2',
          position: 2,
          course_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (lessonsService.listLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(req as Request, res as Response, () => {});

      expect(lessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 2,
        version: 'v1.9'
      });
    });

    it('should list lessons with user context when authenticated', async () => {
      req.user = { id: 1, email: 'student@example.com', role: 'student' };
      req.params = { courseId: '1' };

      const mockLessons = [
        {
          id: 1,
          title: 'Lesson 1',
          video_url: 'https://example.com/video1',
          content_md: 'Content 1',
          position: 1,
          course_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (lessonsService.listLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(req as Request, res as Response, () => {});

      expect(lessonsService.listLessons).toHaveBeenCalledWith(1, 1, 'student');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 1,
        version: 'v1.9'
      });
    });

    it('should return 403 for unpublished course when not authorized', async () => {
      req.user = { id: 1, email: 'student@example.com', role: 'student' };
      req.params = { courseId: '1' };

      const error = new Error('You do not have permission to view lessons for this course');
      (error as any).status = 403;
      (lessonsService.listLessons as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.listByCourse(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to view lessons for this course',
        version: 'v1.9'
      });
    });

    it('should return empty array for course with no lessons', async () => {
      req.params = { courseId: '1' };

      (lessonsService.listLessons as jest.Mock) = jest.fn().mockResolvedValue([]);

      await lessonsController.listByCourse(req as Request, res as Response, () => {});

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: [],
        count: 0,
        version: 'v1.9'
      });
    });
  });

  describe('GET /lessons/:id', () => {
    it('should get lesson for published course', async () => {
      req.params = { id: '1' };

      const mockLesson = {
        id: 1,
        title: 'Lesson 1',
        video_url: 'https://example.com/video',
        content_md: 'Content',
        position: 1,
        course_id: 1,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (lessonsService.getLessonById as jest.Mock) = jest.fn().mockResolvedValue(mockLesson);

      await lessonsController.show(req as Request, res as Response, () => {});

      expect(lessonsService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent lesson', async () => {
      req.params = { id: '999' };

      const error = new Error('Lesson not found');
      (error as any).status = 404;
      (lessonsService.getLessonById as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.show(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });

    it('should return 403 for unpublished course lesson when not authorized', async () => {
      req.user = { id: 1, email: 'student@example.com', role: 'student' };
      req.params = { id: '1' };

      const error = new Error('You do not have permission to view this lesson');
      (error as any).status = 403;
      (lessonsService.getLessonById as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.show(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to view this lesson',
        version: 'v1.9'
      });
    });
  });

  describe('PUT /lessons/:id', () => {
    it('should return 401 without authentication', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const error = new Error('You do not have permission to modify this lesson');
      (error as any).status = 403;
      (lessonsService.updateLesson as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to modify this lesson',
        version: 'v1.9'
      });
    });

    it('should update lesson for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const mockUpdatedLesson = {
        id: 1,
        title: 'Updated Title',
        video_url: null,
        content_md: 'Content',
        position: 1,
        course_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (lessonsService.updateLesson as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedLesson);

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(lessonsService.updateLesson).toHaveBeenCalledWith(1, req.body, 1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockUpdatedLesson,
        version: 'v1.9'
      });
    });

    it('should update lesson for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const mockUpdatedLesson = {
        id: 1,
        title: 'Updated Title',
        video_url: null,
        content_md: 'Content',
        position: 1,
        course_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (lessonsService.updateLesson as jest.Mock) = jest.fn().mockResolvedValue(mockUpdatedLesson);

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lesson: mockUpdatedLesson,
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: '', video_url: 'not-a-valid-url' };

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.any(Array),
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent lesson', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '999' };
      req.body = { title: 'Updated Title' };

      const error = new Error('Lesson not found');
      (error as any).status = 404;
      (lessonsService.updateLesson as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.update(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });
  });

  describe('PATCH /courses/:courseId/lessons/reorder', () => {
    it('should return 401 without authentication', async () => {
      req.params = { courseId: '1' };
      req.body = { lessonIds: [1, 2, 3] };

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = { lessonIds: [1, 2, 3] };

      const error = new Error('You do not have permission to reorder lessons for this course');
      (error as any).status = 403;
      (lessonsService.reorderLessons as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to reorder lessons for this course',
        version: 'v1.9'
      });
    });

    it('should reorder lessons for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = { lessonIds: [3, 1, 2] };

      const mockLessons = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];

      (lessonsService.reorderLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(lessonsService.reorderLessons).toHaveBeenCalledWith(1, [3, 1, 2], 1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 3,
        version: 'v1.9'
      });
    });

    it('should reorder lessons for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { courseId: '1' };
      req.body = { lessonIds: [2, 3, 1] };

      const mockLessons = [
        { id: 2, position: 1 },
        { id: 3, position: 2 },
        { id: 1, position: 3 }
      ];

      (lessonsService.reorderLessons as jest.Mock) = jest.fn().mockResolvedValue(mockLessons);

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 3,
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = { lessonIds: [] };

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.any(Array),
        version: 'v1.9'
      });
    });

    it('should return 400 for duplicate lesson IDs', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { courseId: '1' };
      req.body = { lessonIds: [1, 2, 2, 3] };

      await lessonsController.reorder(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: expect.any(Array),
        version: 'v1.9'
      });
    });
  });

  describe('DELETE /lessons/:id', () => {
    it('should return 401 without authentication', async () => {
      req.params = { id: '1' };

      await lessonsController.remove(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      const error = new Error('You do not have permission to delete this lesson');
      (error as any).status = 403;
      (lessonsService.deleteLesson as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.remove(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to delete this lesson',
        version: 'v1.9'
      });
    });

    it('should delete lesson for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      (lessonsService.deleteLesson as jest.Mock) = jest.fn().mockResolvedValue(true);

      await lessonsController.remove(req as Request, res as Response, () => {});

      expect(lessonsService.deleteLesson).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });

    it('should delete lesson for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { id: '1' };

      (lessonsService.deleteLesson as jest.Mock) = jest.fn().mockResolvedValue(true);

      await lessonsController.remove(req as Request, res as Response, () => {});

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent lesson', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '999' };

      const error = new Error('Lesson not found');
      (error as any).status = 404;
      (lessonsService.deleteLesson as jest.Mock) = jest.fn().mockRejectedValue(error);

      await lessonsController.remove(req as Request, res as Response, () => {});

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v1.9'
      });
    });
  });
});
