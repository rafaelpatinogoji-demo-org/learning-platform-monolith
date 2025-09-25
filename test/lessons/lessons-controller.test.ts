/**
 * Tests for lessonsController
 * 
 * Integration tests for lesson controller endpoints with mocked services
 */

import { Request, Response, NextFunction } from 'express';
import { lessonsController } from '../../src/controllers/lessons.controller';
import { lessonsService } from '../../src/services/lessons.service';
import { LessonValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/lessons.service');
jest.mock('../../src/utils/validation');

const mockLessonsService = lessonsService as jest.Mocked<typeof lessonsService>;
const mockLessonValidator = LessonValidator as jest.Mocked<typeof LessonValidator>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('lessonsController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
  });

  describe('create', () => {
    const mockLessonData = {
      title: 'New Lesson',
      content_md: '# Lesson Content',
      video_url: 'https://youtube.com/watch?v=example',
      position: 1
    };

    const mockCreatedLesson = {
      id: 1,
      course_id: 1,
      title: 'New Lesson',
      content_md: '# Lesson Content',
      video_url: 'https://youtube.com/watch?v=example',
      position: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });
    });

    it('should create lesson for instructor', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      mockLessonsService.createLesson.mockResolvedValue(mockCreatedLesson);

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonValidator.validateCreateLesson).toHaveBeenCalledWith(mockLessonData);
      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        {
          course_id: 1,
          title: 'New Lesson',
          video_url: 'https://youtube.com/watch?v=example',
          content_md: '# Lesson Content',
          position: 1
        },
        5,
        'instructor'
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockCreatedLesson,
        version: 'v0.8'
      });
    });

    it('should create lesson for admin', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      mockLessonsService.createLesson.mockResolvedValue(mockCreatedLesson);

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        expect.any(Object),
        10,
        'admin'
      );
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: 'invalid' };
      mockReq.body = mockLessonData;

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: '' };

      mockLessonValidator.validateCreateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v0.8'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
    });

    it('should return 403 for student role', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can create lessons',
        role: 'student',
        version: 'v0.8'
      });
    });

    it('should handle service errors with status', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      mockLessonsService.createLesson.mockRejectedValue({
        status: 404,
        message: 'Course not found'
      });

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v0.8'
      });
    });

    it('should call next for unexpected errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = mockLessonData;

      const unexpectedError = new Error('Unexpected error');
      mockLessonsService.createLesson.mockRejectedValue(unexpectedError);

      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('listByCourse', () => {
    const mockLessons = [
      {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        content_md: '# Lesson 1',
        position: 1,
        created_at: new Date()
      },
      {
        id: 2,
        course_id: 1,
        title: 'Lesson 2',
        content_md: '# Lesson 2',
        position: 2,
        created_at: new Date()
      }
    ];

    it('should list lessons for course', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };

      mockLessonsService.listLessons.mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, 5, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 2,
        version: 'v0.8'
      });
    });

    it('should list lessons for public access (no user)', async () => {
      mockReq.params = { courseId: '1' };

      mockLessonsService.listLessons.mockResolvedValue(mockLessons);

      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { courseId: 'invalid' };

      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
    });

    it('should handle service errors with status', async () => {
      mockReq.params = { courseId: '1' };

      mockLessonsService.listLessons.mockRejectedValue({
        status: 403,
        message: 'You do not have permission to view lessons for this course'
      });

      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'You do not have permission to view lessons for this course',
        version: 'v0.8'
      });
    });
  });

  describe('show', () => {
    const mockLesson = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      content_md: '# Test Content',
      video_url: 'https://youtube.com/example',
      position: 1,
      created_at: new Date()
    };

    it('should get lesson by ID', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockLessonsService.getLessonById.mockResolvedValue(mockLesson);

      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, 5, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v0.8'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockReq.params = { id: 'invalid' };

      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
    });

    it('should handle service errors with status', async () => {
      mockReq.params = { id: '1' };

      mockLessonsService.getLessonById.mockRejectedValue({
        status: 404,
        message: 'Lesson not found'
      });

      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v0.8'
      });
    });
  });

  describe('update', () => {
    const mockUpdatedLesson = {
      id: 1,
      course_id: 1,
      title: 'Updated Lesson',
      content_md: '# Updated Content',
      video_url: 'https://vimeo.com/123',
      position: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: true,
        errors: []
      });
    });

    it('should update lesson for instructor', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: 'Updated Lesson',
        content_md: '# Updated Content',
        video_url: 'https://vimeo.com/123'
      };

      mockLessonsService.updateLesson.mockResolvedValue(mockUpdatedLesson);

      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonValidator.validateUpdateLesson).toHaveBeenCalledWith(mockReq.body);
      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(
        1,
        {
          title: 'Updated Lesson',
          video_url: 'https://vimeo.com/123',
          content_md: '# Updated Content'
        },
        5,
        'instructor'
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockUpdatedLesson,
        version: 'v0.8'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: 'invalid' };
      mockReq.body = { title: 'Updated Lesson' };

      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: '' };

      mockLessonValidator.validateUpdateLesson.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'title', message: 'Title cannot be empty' }],
        version: 'v0.8'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };

      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for student role', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Lesson' };

      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can update lessons',
        role: 'student',
        version: 'v0.8'
      });
    });
  });

  describe('reorder', () => {
    const mockReorderedLessons = [
      {
        id: 3,
        course_id: 1,
        title: 'Lesson 3',
        position: 1,
        created_at: new Date()
      },
      {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        position: 2,
        created_at: new Date()
      },
      {
        id: 2,
        course_id: 1,
        title: 'Lesson 2',
        position: 3,
        created_at: new Date()
      }
    ];

    beforeEach(() => {
      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: true,
        errors: []
      });
    });

    it('should reorder lessons for instructor', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [3, 1, 2] };

      mockLessonsService.reorderLessons.mockResolvedValue(mockReorderedLessons);

      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonValidator.validateReorder).toHaveBeenCalledWith(mockReq.body);
      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(
        1,
        [3, 1, 2],
        5,
        'instructor'
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockReorderedLessons,
        count: 3,
        version: 'v0.8'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: 'invalid' };
      mockReq.body = { lessonIds: [3, 1, 2] };

      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [] };

      mockLessonValidator.validateReorder.mockReturnValue({
        isValid: false,
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }]
      });

      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' }],
        version: 'v0.8'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [3, 1, 2] };

      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for student role', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { lessonIds: [3, 1, 2] };

      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can reorder lessons',
        role: 'student',
        version: 'v0.8'
      });
    });
  });

  describe('remove', () => {
    it('should delete lesson for instructor', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(1, 5, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
    });

    it('should return 400 for invalid lesson ID', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: 'invalid' };

      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { id: '1' };

      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for student role', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.params = { id: '1' };

      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can delete lessons',
        role: 'student',
        version: 'v0.8'
      });
    });

    it('should handle service errors with status', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockLessonsService.deleteLesson.mockRejectedValue({
        status: 404,
        message: 'Lesson not found'
      });

      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v0.8'
      });
    });
  });
});
