import { mockQuery, mockGetClient, mockClient, mockQuerySuccess, resetDbMocks } from '../mocks/db.mock';

jest.mock('../../src/db', () => ({
  db: {
    query: require('../mocks/db.mock').mockQuery,
    getClient: require('../mocks/db.mock').mockGetClient,
    connect: require('../mocks/db.mock').mockConnect,
    disconnect: require('../mocks/db.mock').mockDisconnect,
    healthCheck: jest.fn().mockResolvedValue(true),
    smokeTest: jest.fn().mockResolvedValue({ success: true, userCount: 1 }),
    getConnectionStatus: jest.fn().mockReturnValue(true),
    getPoolStats: jest.fn().mockReturnValue({ totalCount: 1, idleCount: 0, waitingCount: 0 }),
  },
}));

import { LessonsService } from '../../src/services/lessons.service';

describe('LessonsService', () => {
  let lessonsService: LessonsService;

  beforeEach(() => {
    resetDbMocks();
    lessonsService = new LessonsService();
  });

  describe('createLesson', () => {
    it('should create a lesson with auto-generated position', async () => {
      const lessonData = {
        course_id: 1,
        title: 'Lesson 1',
        content_md: 'Content',
      };
      const userId = 1;
      const userRole = 'instructor';

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 1,
        published: false,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        max_position: 2,
      }]));

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        video_url: null,
        content_md: 'Content',
        position: 3,
        created_at: new Date(),
      };
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await lessonsService.createLesson(lessonData, userId, userRole);

      expect(result.position).toBe(3);
      expect(mockGetClient).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create lesson with specified position', async () => {
      const lessonData = {
        course_id: 1,
        title: 'Lesson 1',
        position: 2,
      };
      const userId = 1;
      const userRole = 'instructor';

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 1,
        published: false,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        video_url: null,
        content_md: null,
        position: 2,
        created_at: new Date(),
      };
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await lessonsService.createLesson(lessonData, userId, userRole);

      expect(result.position).toBe(2);
    });

    it('should allow admin to create lesson for any course', async () => {
      const lessonData = {
        course_id: 1,
        title: 'Lesson 1',
      };

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 2,
        published: false,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        max_position: 0,
      }]));

      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        position: 1,
        created_at: new Date(),
      };
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await lessonsService.createLesson(lessonData, 1, 'admin');

      expect(result).toBeDefined();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject if user is not instructor of the course', async () => {
      const lessonData = {
        course_id: 1,
        title: 'Lesson 1',
      };

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 2,
        published: false,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.createLesson(lessonData, 1, 'instructor')
      ).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to add lessons to this course',
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject if course not found', async () => {
      const lessonData = {
        course_id: 999,
        title: 'Lesson 1',
      };

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.createLesson(lessonData, 1, 'instructor')
      ).rejects.toMatchObject({
        status: 404,
        message: 'Course not found',
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should list lessons for published course', async () => {
      const mockCourse = {
        id: 1,
        instructor_id: 1,
        published: true,
      };

      const mockLessons = [
        { id: 1, title: 'Lesson 1', position: 1, course_id: 1 },
        { id: 2, title: 'Lesson 2', position: 2, course_id: 1 },
      ];

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess(mockLessons));

      const result = await lessonsService.listLessons(1);

      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(2);
    });

    it('should allow instructor to view their unpublished course lessons', async () => {
      const mockCourse = {
        id: 1,
        instructor_id: 1,
        published: false,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await lessonsService.listLessons(1, 1, 'instructor');

      expect(result).toBeDefined();
    });

    it('should reject student viewing unpublished course', async () => {
      const mockCourse = {
        id: 1,
        instructor_id: 1,
        published: false,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      await expect(
        lessonsService.listLessons(1, 2, 'student')
      ).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to view lessons for this course',
      });
    });

    it('should reject if course not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.listLessons(999)
      ).rejects.toMatchObject({
        status: 404,
        message: 'Course not found',
      });
    });
  });

  describe('getLessonById', () => {
    it('should get lesson from published course', async () => {
      const mockLesson = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        position: 1,
        instructor_id: 1,
        published: true,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      const result = await lessonsService.getLessonById(1);

      expect(result.id).toBe(1);
      expect(result).not.toHaveProperty('instructor_id');
      expect(result).not.toHaveProperty('published');
    });

    it('should reject if lesson not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.getLessonById(999)
      ).rejects.toMatchObject({
        status: 404,
        message: 'Lesson not found',
      });
    });
  });

  describe('updateLesson', () => {
    it('should update lesson title', async () => {
      const mockLesson = {
        id: 1,
        title: 'Old Title',
        course_id: 1,
        instructor_id: 1,
      };

      const updatedLesson = {
        id: 1,
        title: 'New Title',
        course_id: 1,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([updatedLesson]));

      const result = await lessonsService.updateLesson(1, { title: 'New Title' }, 1, 'instructor');

      expect(result.title).toBe('New Title');
    });

    it('should reject if user is not instructor', async () => {
      const mockLesson = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 2,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      await expect(
        lessonsService.updateLesson(1, { title: 'New Title' }, 1, 'instructor')
      ).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to update this lesson',
      });
    });

    it('should handle empty update data', async () => {
      const mockLesson = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 1,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      const result = await lessonsService.updateLesson(1, {}, 1, 'instructor');

      expect(result).toEqual(mockLesson);
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons atomically', async () => {
      const courseId = 1;
      const lessonIds = [3, 1, 2];
      const userId = 1;
      const userRole = 'instructor';

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 1,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const reorderedLessons = [
        { id: 3, position: 1, title: 'Lesson 3' },
        { id: 1, position: 2, title: 'Lesson 1' },
        { id: 2, position: 3, title: 'Lesson 2' },
      ];
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess(reorderedLessons));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await lessonsService.reorderLessons(courseId, lessonIds, userId, userRole);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(3);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject mismatched lesson count', async () => {
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 1,
      }]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.reorderLessons(1, [1, 2], 1, 'instructor')
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('count mismatch'),
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and recompact positions', async () => {
      const mockLesson = {
        id: 2,
        title: 'Lesson 2',
        course_id: 1,
        position: 2,
        instructor_id: 1,
      };

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([mockLesson]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      await lessonsService.deleteLesson(2, 1, 'instructor');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject if lesson not found', async () => {
      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      mockClient.query.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        lessonsService.deleteLesson(999, 1, 'instructor')
      ).rejects.toMatchObject({
        status: 404,
        message: 'Lesson not found',
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
