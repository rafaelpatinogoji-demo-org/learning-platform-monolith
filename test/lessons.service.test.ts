import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockClient } from './setup';

jest.mock('../src/db', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn(),
  },
}));

import { LessonsService } from '../src/services/lessons.service';
import { db } from '../src/db';

describe('LessonsService', () => {
  let lessonsService: LessonsService;
  let mockedDb: jest.Mocked<typeof db>;

  beforeEach(() => {
    lessonsService = new LessonsService();
    mockedDb = db as jest.Mocked<typeof db>;
    mockedDb.query.mockReset();
    mockedDb.getClient.mockReset();
  });

  describe('createLesson', () => {
    it('should create lesson with auto position when position not provided', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2, published: false };
      const maxPositionData = { max_position: 3 };
      const lessonData = { id: 10, title: 'New Lesson', course_id: 1, position: 4 };

      mockedDb.getClient.mockResolvedValue(client as any);
      mockedDb.query.mockResolvedValueOnce({ rows: [{ instructor_id: 2 }] } as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: [maxPositionData] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 1, title: 'New Lesson' };
      const result = await lessonsService.createLesson(data, 2, 'instructor');

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(client.query).toHaveBeenCalledWith(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
        [1]
      );
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
      expect(result).toEqual(lessonData);
    });

    it('should create lesson with explicit position and shift existing lessons', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2, published: false };
      const lessonData = { id: 10, title: 'New Lesson', course_id: 1, position: 2 };

      mockedDb.getClient.mockResolvedValue(client as any);
      mockedDb.query.mockResolvedValueOnce({ rows: [{ instructor_id: 2 }] } as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 1, title: 'New Lesson', position: 2 };
      const result = await lessonsService.createLesson(data, 2, 'instructor');

      expect(client.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
        [1, 2]
      );
      expect(result).toEqual(lessonData);
    });

    it('should throw 404 when course not found', async () => {
      const client = mockClient();
      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 999, title: 'New Lesson' };

      await expect(
        lessonsService.createLesson(data, 2, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('should throw 403 when non-admin user does not own course', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2, published: false };

      mockedDb.getClient.mockResolvedValue(client as any);
      mockedDb.query.mockResolvedValueOnce({ rows: [{ instructor_id: 2 }] } as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 1, title: 'New Lesson' };

      await expect(
        lessonsService.createLesson(data, 3, 'instructor')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to add lessons to this course' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should allow admin to create lesson for any course', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2, published: false };
      const maxPositionData = { max_position: 0 };
      const lessonData = { id: 10, title: 'New Lesson', course_id: 1, position: 1 };

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: [maxPositionData] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 1, title: 'New Lesson' };
      const result = await lessonsService.createLesson(data, 999, 'admin');

      expect(result).toEqual(lessonData);
    });

    it('should rollback transaction on error', async () => {
      const client = mockClient();
      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce(undefined as any)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(undefined as any);

      const data = { course_id: 1, title: 'New Lesson' };

      await expect(
        lessonsService.createLesson(data, 2, 'instructor')
      ).rejects.toThrow('Database error');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should return lessons ordered by position for published course', async () => {
      const courseData = { id: 1, instructor_id: 2, published: true };
      const lessonsData = [
        { id: 1, title: 'Lesson 1', position: 1 },
        { id: 2, title: 'Lesson 2', position: 2 }
      ];

      mockedDb.query
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: lessonsData } as any);

      const result = await lessonsService.listLessons(1);

      expect(mockedDb.query).toHaveBeenCalledWith(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
        [1]
      );
      expect(result).toEqual(lessonsData);
    });

    it('should allow unauthenticated users to view published course lessons', async () => {
      const courseData = { id: 1, instructor_id: 2, published: true };
      const lessonsData = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockedDb.query
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: lessonsData } as any);

      const result = await lessonsService.listLessons(1, undefined, undefined);

      expect(result).toEqual(lessonsData);
    });

    it('should allow admin to view unpublished course lessons', async () => {
      const courseData = { id: 1, instructor_id: 2, published: false };
      const lessonsData = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockedDb.query
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: lessonsData } as any);

      const result = await lessonsService.listLessons(1, 999, 'admin');

      expect(result).toEqual(lessonsData);
    });

    it('should allow instructor owner to view unpublished course lessons', async () => {
      const courseData = { id: 1, instructor_id: 2, published: false };
      const lessonsData = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockedDb.query
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: lessonsData } as any);

      const result = await lessonsService.listLessons(1, 2, 'instructor');

      expect(result).toEqual(lessonsData);
    });

    it('should throw 403 when non-owner tries to view unpublished course', async () => {
      const courseData = { id: 1, instructor_id: 2, published: false };

      mockedDb.query.mockResolvedValueOnce({ rows: [courseData] } as any);

      await expect(
        lessonsService.listLessons(1, 3, 'student')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to view lessons for this course' });
    });

    it('should throw 404 when course not found', async () => {
      mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.listLessons(999)
      ).rejects.toEqual({ status: 404, message: 'Course not found' });
    });
  });

  describe('getLessonById', () => {
    it('should return lesson for published course', async () => {
      const lessonData = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 2,
        published: true
      };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      const result = await lessonsService.getLessonById(1);

      expect(result).toEqual({
        id: 1,
        title: 'Lesson 1',
        course_id: 1
      });
      expect(result).not.toHaveProperty('instructor_id');
      expect(result).not.toHaveProperty('published');
    });

    it('should allow admin to view lesson from unpublished course', async () => {
      const lessonData = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 2,
        published: false
      };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      const result = await lessonsService.getLessonById(1, 999, 'admin');

      expect(result.id).toBe(1);
    });

    it('should allow instructor owner to view lesson from unpublished course', async () => {
      const lessonData = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 2,
        published: false
      };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      const result = await lessonsService.getLessonById(1, 2, 'instructor');

      expect(result.id).toBe(1);
    });

    it('should throw 403 when non-owner tries to view lesson from unpublished course', async () => {
      const lessonData = {
        id: 1,
        title: 'Lesson 1',
        course_id: 1,
        instructor_id: 2,
        published: false
      };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      await expect(
        lessonsService.getLessonById(1, 3, 'student')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to view this lesson' });
    });

    it('should throw 404 when lesson not found', async () => {
      mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.getLessonById(999)
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });
  });

  describe('updateLesson', () => {
    it('should update single field', async () => {
      const lessonData = { id: 1, title: 'Old Title', course_id: 1, instructor_id: 2 };
      const updatedData = { id: 1, title: 'New Title', course_id: 1, instructor_id: 2 };

      mockedDb.query
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [updatedData] } as any);

      const result = await lessonsService.updateLesson(1, { title: 'New Title' }, 2, 'instructor');

      expect(mockedDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET title = $1 WHERE id = $2 RETURNING *',
        ['New Title', 1]
      );
      expect(result).toEqual(updatedData);
    });

    it('should update multiple fields', async () => {
      const lessonData = { id: 1, title: 'Old Title', course_id: 1, instructor_id: 2 };
      const updatedData = { id: 1, title: 'New Title', video_url: 'https://example.com/video.mp4', course_id: 1, instructor_id: 2 };

      mockedDb.query
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [updatedData] } as any);

      const result = await lessonsService.updateLesson(
        1,
        { title: 'New Title', video_url: 'https://example.com/video.mp4' },
        2,
        'instructor'
      );

      expect(result).toEqual(updatedData);
    });

    it('should handle clearing optional fields with empty string', async () => {
      const lessonData = { id: 1, title: 'Title', video_url: 'old-url', course_id: 1, instructor_id: 2 };
      const updatedData = { id: 1, title: 'Title', video_url: null, course_id: 1, instructor_id: 2 };

      mockedDb.query
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [updatedData] } as any);

      const result = await lessonsService.updateLesson(1, { video_url: '' }, 2, 'instructor');

      expect(result.video_url).toBeNull();
    });

    it('should return unchanged lesson when no fields provided', async () => {
      const lessonData = { id: 1, title: 'Title', course_id: 1, instructor_id: 2 };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      const result = await lessonsService.updateLesson(1, {}, 2, 'instructor');

      expect(result).toEqual(lessonData);
      expect(mockedDb.query).toHaveBeenCalledTimes(1);
    });

    it('should allow admin to update any lesson', async () => {
      const lessonData = { id: 1, title: 'Old Title', course_id: 1, instructor_id: 2 };
      const updatedData = { id: 1, title: 'New Title', course_id: 1, instructor_id: 2 };

      mockedDb.query
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [updatedData] } as any);

      const result = await lessonsService.updateLesson(1, { title: 'New Title' }, 999, 'admin');

      expect(result).toEqual(updatedData);
    });

    it('should throw 403 when non-owner tries to update lesson', async () => {
      const lessonData = { id: 1, title: 'Title', course_id: 1, instructor_id: 2 };

      mockedDb.query.mockResolvedValueOnce({ rows: [lessonData] } as any);

      await expect(
        lessonsService.updateLesson(1, { title: 'New Title' }, 3, 'instructor')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to update this lesson' });
    });

    it('should throw 404 when lesson not found', async () => {
      mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.updateLesson(999, { title: 'New Title' }, 2, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });
  });

  describe('reorderLessons', () => {
    it('should successfully reorder lessons atomically', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const reorderedLessons = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: reorderedLessons } as any);

      const result = await lessonsService.reorderLessons(1, [3, 1, 2], 2, 'instructor');

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual(reorderedLessons);
    });

    it('should allow admin to reorder lessons', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }];
      const reorderedLessons = [{ id: 2, position: 1 }, { id: 1, position: 2 }];

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: reorderedLessons } as any);

      const result = await lessonsService.reorderLessons(1, [2, 1], 999, 'admin');

      expect(result).toEqual(reorderedLessons);
    });

    it('should throw 403 when non-owner tries to reorder', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any);

      await expect(
        lessonsService.reorderLessons(1, [1, 2], 3, 'instructor')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to reorder lessons for this course' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw 404 when course not found', async () => {
      const client = mockClient();

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.reorderLessons(999, [1, 2], 2, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw 400 when count mismatch', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any);

      await expect(
        lessonsService.reorderLessons(1, [1, 2], 2, 'instructor')
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons'
      });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw 400 when lesson ID is missing', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any);

      await expect(
        lessonsService.reorderLessons(1, [1, 2, 4], 2, 'instructor')
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list'
      });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw 400 when invalid lesson ID provided', async () => {
      const client = mockClient();
      const courseData = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }];

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [courseData] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any);

      await expect(
        lessonsService.reorderLessons(1, [1, 2, 999], 2, 'instructor')
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: count mismatch. Expected 2 lessons'
      });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      const client = mockClient();
      mockedDb.getClient.mockResolvedValue(client as any);
      client.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        lessonsService.reorderLessons(1, [1, 2], 2, 'instructor')
      ).rejects.toThrow('Database error');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and re-compact positions', async () => {
      const client = mockClient();
      const lessonData = { id: 1, course_id: 1, position: 2, instructor_id: 2 };

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await lessonsService.deleteLesson(1, 2, 'instructor');

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('DELETE FROM lessons WHERE id = $1', [1]);
      expect(client.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [1, 2]
      );
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });

    it('should allow admin to delete any lesson', async () => {
      const client = mockClient();
      const lessonData = { id: 1, course_id: 1, position: 1, instructor_id: 2 };

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await lessonsService.deleteLesson(1, 999, 'admin');

      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw 403 when non-owner tries to delete', async () => {
      const client = mockClient();
      const lessonData = { id: 1, course_id: 1, position: 1, instructor_id: 2 };

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [lessonData] } as any);

      await expect(
        lessonsService.deleteLesson(1, 3, 'instructor')
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to delete this lesson' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw 404 when lesson not found', async () => {
      const client = mockClient();

      mockedDb.getClient.mockResolvedValue(client as any);
      client.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.deleteLesson(999, 2, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      const client = mockClient();
      mockedDb.getClient.mockResolvedValue(client as any);
      client.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        lessonsService.deleteLesson(1, 2, 'instructor')
      ).rejects.toThrow('Database error');

      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should return true for admin', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 999, 'admin');

      expect(result).toBe(true);
      expect(mockedDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor owner', async () => {
      const courseData = { instructor_id: 2 };
      mockedDb.query.mockResolvedValueOnce({ rows: [courseData] } as any);

      const result = await lessonsService.canModifyCourseLessons(1, 2, 'instructor');

      expect(result).toBe(true);
      expect(mockedDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [1]
      );
    });

    it('should return false for non-owner', async () => {
      const courseData = { instructor_id: 2 };
      mockedDb.query.mockResolvedValueOnce({ rows: [courseData] } as any);

      const result = await lessonsService.canModifyCourseLessons(1, 3, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false when course not found', async () => {
      mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await lessonsService.canModifyCourseLessons(999, 2, 'instructor');

      expect(result).toBe(false);
    });
  });
});
