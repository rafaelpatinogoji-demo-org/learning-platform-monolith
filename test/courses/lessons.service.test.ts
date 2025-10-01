import { lessonsService } from '../../src/services/lessons.service';
import { db } from '../../src/db';
import { PoolClient } from 'pg';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn()
  }
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockGetClient = db.getClient as jest.MockedFunction<typeof db.getClient>;

describe('LessonsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLesson', () => {
    it('should create a lesson with auto-position', async () => {
      const lessonData = {
        title: 'Introduction to Variables',
        video_url: 'https://youtube.com/watch?v=example',
        content_md: '# Introduction',
        course_id: 1
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 1, published: false }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ max_position: 5 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            ...lessonData,
            position: 6,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] });

      const result = await lessonsService.createLesson(lessonData, 1, 'instructor');

      expect(result.position).toBe(6);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create a lesson with manual position and shift others', async () => {
      const lessonData = {
        title: 'New Lesson',
        video_url: 'https://youtube.com/watch?v=example',
        content_md: '# Content',
        position: 3,
        course_id: 1
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 1, published: false }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'UPDATE',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            ...lessonData,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] });

      const result = await lessonsService.createLesson(lessonData, 1, 'instructor');

      expect(result.position).toBe(3);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create first lesson with position 1', async () => {
      const lessonData = {
        title: 'First Lesson',
        course_id: 1
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 1, published: false }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ max_position: 0 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            ...lessonData,
            position: 1,
            video_url: null,
            content_md: null,
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] });

      const result = await lessonsService.createLesson(lessonData, 1, 'instructor');

      expect(result.position).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for non-existent course', async () => {
      const lessonData = {
        title: 'Test Lesson',
        course_id: 999
      };

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] });

      await expect(lessonsService.createLesson(lessonData, 1, 'instructor')).rejects.toMatchObject({
        status: 404,
        message: 'Course not found'
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should list lessons for published course without auth', async () => {
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

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ published: true, instructor_id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockLessons,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await lessonsService.listLessons(1);

      expect(result).toEqual(mockLessons);
      expect(result.length).toBe(2);
    });

    it('should deny access to unpublished course for non-owner', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ published: false, instructor_id: 2 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(lessonsService.listLessons(1, 1, 'student')).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to view lessons for this course'
      });
    });

    it('should allow instructor owner to see unpublished course lessons', async () => {
      const mockLessons = [
        {
          id: 1,
          title: 'Lesson 1',
          video_url: null,
          content_md: 'Content',
          position: 1,
          course_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ published: false, instructor_id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockLessons,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await lessonsService.listLessons(1, 1, 'instructor');

      expect(result).toEqual(mockLessons);
    });

    it('should allow admin to see all lessons', async () => {
      const mockLessons = [
        {
          id: 1,
          title: 'Lesson 1',
          video_url: null,
          content_md: 'Content',
          position: 1,
          course_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ published: false, instructor_id: 2 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockLessons,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await lessonsService.listLessons(1, 1, 'admin');

      expect(result).toEqual(mockLessons);
    });

    it('should return empty array for course with no lessons', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ published: true, instructor_id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await lessonsService.listLessons(1);

      expect(result).toEqual([]);
    });
  });

  describe('getLessonById', () => {
    it('should get lesson for published course', async () => {
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

      mockQuery.mockResolvedValue({
        rows: [{ ...mockLesson }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await lessonsService.getLessonById(1);

      expect(result).toEqual(expect.objectContaining({
        id: 1,
        title: 'Lesson 1'
      }));
      expect(result).not.toHaveProperty('instructor_id');
      expect(result).not.toHaveProperty('published');
    });

    it('should throw error for non-existent lesson', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(lessonsService.getLessonById(999)).rejects.toMatchObject({
        status: 404,
        message: 'Lesson not found'
      });
    });

    it('should deny access to unpublished course lesson for non-owner', async () => {
      const mockLesson = {
        id: 1,
        title: 'Lesson 1',
        video_url: 'https://example.com/video',
        content_md: 'Content',
        position: 1,
        course_id: 1,
        published: false,
        instructor_id: 2,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [{ ...mockLesson }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(lessonsService.getLessonById(1, 1, 'student')).rejects.toMatchObject({
        status: 403,
        message: 'You do not have permission to view this lesson'
      });
    });
  });

  describe('updateLesson', () => {
    it('should update lesson with dynamic fields', async () => {
      const updateData = {
        title: 'Updated Title',
        video_url: 'https://example.com/new-video'
      };

      const mockLesson = {
        id: 1,
        title: 'Updated Title',
        video_url: 'https://example.com/new-video',
        content_md: 'Original Content',
        position: 1,
        course_id: 1,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [mockLesson],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [mockLesson],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: []
        });

      const result = await lessonsService.updateLesson(1, updateData, 1, 'instructor');

      expect(result).toEqual(mockLesson);
    });

    it('should throw error for non-existent lesson', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(lessonsService.updateLesson(999, updateData, 1, 'instructor')).rejects.toMatchObject({
        status: 404,
        message: 'Lesson not found'
      });
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons atomically', async () => {
      const lessonIds = [3, 1, 2];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }], rowCount: 3, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 3, course_id: 1, title: 'L3', position: 1 }, { id: 1, course_id: 1, title: 'L1', position: 2 }, { id: 2, course_id: 1, title: 'L2', position: 3 }], rowCount: 3, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] });

      await lessonsService.reorderLessons(1, lessonIds, 1, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const lessonIds = [1, 2, 3];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }], rowCount: 3, command: 'SELECT', oid: 0, fields: [] })
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(lessonsService.reorderLessons(1, lessonIds, 1, 'instructor')).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for count mismatch', async () => {
      const lessonIds = [1, 2];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }], rowCount: 5, command: 'SELECT', oid: 0, fields: [] });

      await expect(lessonsService.reorderLessons(1, lessonIds, 1, 'instructor')).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('count mismatch')
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid lesson IDs', async () => {
      const lessonIds = [1, 999];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2, command: 'SELECT', oid: 0, fields: [] });

      await expect(lessonsService.reorderLessons(1, lessonIds, 1, 'instructor')).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('missing from the reorder list')
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and recompact positions', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: []})
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, position: 3, instructor_id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'DELETE',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'UPDATE',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] });

      await lessonsService.deleteLesson(1, 1, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for non-existent lesson', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      } as unknown as PoolClient;

      mockGetClient.mockResolvedValue(mockClient);

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] });

      await expect(lessonsService.deleteLesson(999, 1, 'instructor')).rejects.toMatchObject({
        status: 404,
        message: 'Lesson not found'
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should return true for admin', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 1, 'admin');
      expect(result).toBe(true);
    });

    it('should return true for course owner instructor', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ instructor_id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await lessonsService.canModifyCourseLessons(1, 1, 'instructor');

      expect(result).toBe(true);
    });

    it('should return false for non-owner instructor', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ instructor_id: 2 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await lessonsService.canModifyCourseLessons(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 1, 'student');
      expect(result).toBe(false);
    });

    it('should return false for non-existent course', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await lessonsService.canModifyCourseLessons(999, 1, 'instructor');

      expect(result).toBe(false);
    });
  });
});
