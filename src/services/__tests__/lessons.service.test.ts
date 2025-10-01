import { LessonsService } from '../lessons.service';
import { db } from '../../db';
import type { QueryResult, PoolClient } from 'pg';

jest.mock('../../db');

describe('LessonsService', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  let service: LessonsService;

  beforeEach(() => {
    service = new LessonsService();
    jest.clearAllMocks();
  });

  const createMockClient = () => {
    return {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      addListener: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      listenerCount: jest.fn(),
      eventNames: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      removeAllListeners: jest.fn(),
      copyWithin: jest.fn(),
      escapeIdentifier: jest.fn(),
      escapeLiteral: jest.fn()
    } as any as jest.Mocked<PoolClient>;
  };

  describe('createLesson', () => {
    const validLessonData = {
      course_id: 1,
      title: 'Test Lesson',
      content_md: 'Test content',
      video_url: 'https://example.com/video'
    };

    it('should create lesson with auto-assigned position', async () => {
      const mockClient = createMockClient();
      const mockCourse = { id: 1, instructor_id: 2, published: false };
      const mockMaxPos = { max_position: 3 };
      const mockLesson = { id: 1, ...validLessonData, position: 4 };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockMaxPos], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] } as any);

      const result = await service.createLesson(validLessonData, 2, 'instructor');

      expect(result).toEqual(mockLesson);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create lesson with explicit position and shift others', async () => {
      const mockClient = createMockClient();
      const mockCourse = { id: 1, instructor_id: 2, published: false };
      const lessonWithPosition = { ...validLessonData, position: 2 };
      const mockLesson = { id: 1, ...lessonWithPosition };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] } as any);

      const result = await service.createLesson(lessonWithPosition, 2, 'instructor');

      expect(result).toEqual(mockLesson);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to create lesson for any course', async () => {
      const mockClient = createMockClient();
      const mockCourse = { id: 1, instructor_id: 2, published: false };
      const mockMaxPos = { max_position: 0 };
      const mockLesson = { id: 1, ...validLessonData, position: 1 };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockMaxPos], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] } as any);

      const result = await service.createLesson(validLessonData, 1, 'admin');

      expect(result).toEqual(mockLesson);
    });

    it('should throw error when instructor tries to modify other instructor course', async () => {
      const mockClient = createMockClient();
      const mockCourse = { id: 1, instructor_id: 3, published: false };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.createLesson(validLessonData, 2, 'instructor')).rejects.toMatchObject({
        status: 403
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when course not found', async () => {
      const mockClient = createMockClient();

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.createLesson({ ...validLessonData, course_id: 999 }, 2, 'instructor')).rejects.toMatchObject({
        status: 404
      });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should list lessons for published course without auth', async () => {
      const mockCourse = { id: 1, published: true, instructor_id: 2 };
      const mockLessons = [
        { id: 1, title: 'Lesson 1', position: 1 },
        { id: 2, title: 'Lesson 2', position: 2 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, rowCount: 2, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.listLessons(1);

      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for unpublished course when owner', async () => {
      const mockCourse = { id: 1, published: false, instructor_id: 2 };
      const mockLessons = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.listLessons(1, 2, 'instructor');

      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for unpublished course when admin', async () => {
      const mockCourse = { id: 1, published: false, instructor_id: 2 };
      const mockLessons = [{ id: 1, title: 'Lesson 1', position: 1 }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.listLessons(1, 1, 'admin');

      expect(result).toEqual(mockLessons);
    });

    it('should throw error for unpublished course when not owner', async () => {
      const mockCourse = { id: 1, published: false, instructor_id: 2 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.listLessons(1, 3, 'instructor')).rejects.toMatchObject({
        status: 403
      });
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.listLessons(999)).rejects.toMatchObject({
        status: 404
      });
    });
  });

  describe('getLessonById', () => {
    it('should return lesson from published course', async () => {
      const mockLesson = {
        id: 1,
        title: 'Test Lesson',
        course_id: 1,
        published: true,
        instructor_id: 2
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.getLessonById(1);

      expect(result.id).toBe(1);
      expect(result).not.toHaveProperty('instructor_id');
    });

    it('should return lesson from unpublished course when owner', async () => {
      const mockLesson = {
        id: 1,
        title: 'Test Lesson',
        course_id: 1,
        published: false,
        instructor_id: 2
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.getLessonById(1, 2, 'instructor');

      expect(result.id).toBe(1);
    });

    it('should throw error for unpublished course when not owner', async () => {
      const mockLesson = {
        id: 1,
        title: 'Test Lesson',
        course_id: 1,
        published: false,
        instructor_id: 2
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.getLessonById(1, 3, 'student')).rejects.toMatchObject({
        status: 403
      });
    });

    it('should throw error when lesson not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.getLessonById(999)).rejects.toMatchObject({
        status: 404
      });
    });
  });

  describe('updateLesson', () => {
    it('should update all fields when provided', async () => {
      const updates = {
        title: 'Updated Title',
        content_md: 'Updated content',
        video_url: 'https://example.com/new'
      };
      const mockLesson = { id: 1, course_id: 1, title: 'Old', instructor_id: 2 };
      const mockUpdated = { id: 1, ...updates, course_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await service.updateLesson(1, updates, 2, 'instructor');

      expect(result).toEqual(mockUpdated);
    });

    it('should update only provided fields', async () => {
      const updates = { title: 'New Title' };
      const mockLesson = { id: 1, course_id: 1, title: 'Old', instructor_id: 2 };
      const mockUpdated = { id: 1, title: 'New Title', course_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] });

      const result = await service.updateLesson(1, updates, 2, 'instructor');

      expect(result).toEqual(mockUpdated);
      const query = mockDb.query.mock.calls[1][0] as string;
      expect(query).toContain('title = $');
      expect(query).not.toContain('content_md = $');
    });

    it('should return lesson when no updates provided', async () => {
      const mockLesson = { id: 1, course_id: 1, title: 'Test', instructor_id: 2 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.updateLesson(1, {}, 2, 'instructor');

      expect(result.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when not owner', async () => {
      const mockLesson = { id: 1, course_id: 1, title: 'Test', instructor_id: 3 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.updateLesson(1, { title: 'New' }, 2, 'instructor')).rejects.toMatchObject({
        status: 403
      });
    });

    it('should throw error when lesson not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      await expect(service.updateLesson(999, { title: 'New' }, 2, 'instructor')).rejects.toMatchObject({
        status: 404
      });
    });
  });

  describe('reorderLessons', () => {
    let mockClient: jest.Mocked<PoolClient>;

    beforeEach(() => {
      mockClient = createMockClient();
      mockDb.getClient.mockResolvedValue(mockClient);
    });

    it('should reorder lessons atomically', async () => {
      const lessonIds = [3, 1, 2];
      const mockCourse = { id: 1, instructor_id: 2 };
      const mockCurrentLessons = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];
      const mockReordered = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: mockCurrentLessons, rowCount: 3, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: mockReordered, rowCount: 3, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] } as any);

      const result = await service.reorderLessons(1, lessonIds, 2, 'instructor');

      expect(result).toEqual(mockReordered);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on count mismatch error', async () => {
      const lessonIds = [1, 2];
      const mockCourse = { id: 1, instructor_id: 2 };
      const mockCurrentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: mockCurrentLessons, rowCount: 3, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.reorderLessons(1, lessonIds, 2, 'instructor')).rejects.toMatchObject({
        status: 400
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback when lesson from wrong course', async () => {
      const lessonIds = [1, 2, 3];
      const mockCourse = { id: 1, instructor_id: 2 };
      const mockCurrentLessons = [{ id: 1 }, { id: 2 }];

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: mockCurrentLessons, rowCount: 2, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.reorderLessons(1, lessonIds, 2, 'instructor')).rejects.toMatchObject({
        status: 400
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when not owner', async () => {
      const lessonIds = [1, 2];
      const mockCourse = { id: 1, instructor_id: 3 };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.reorderLessons(1, lessonIds, 2, 'instructor')).rejects.toMatchObject({
        status: 403
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and recompact positions', async () => {
      const mockClient = createMockClient();
      const mockLesson = { id: 1, course_id: 1, position: 2, instructor_id: 2 };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 2, command: 'UPDATE', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'COMMIT', oid: 0, fields: [] } as any);

      await service.deleteLesson(1, 2, 'instructor');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when lesson not found', async () => {
      const mockClient = createMockClient();

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.deleteLesson(999, 2, 'instructor')).rejects.toMatchObject({
        status: 404
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when not owner', async () => {
      const mockClient = createMockClient();
      const mockLesson = { id: 1, course_id: 1, position: 2, instructor_id: 3 };

      mockDb.getClient.mockResolvedValue(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'ROLLBACK', oid: 0, fields: [] } as any);

      await expect(service.deleteLesson(1, 2, 'instructor')).rejects.toMatchObject({
        status: 403
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should allow admin to modify any course', async () => {
      const result = await service.canModifyCourseLessons(1, 1, 'admin');

      expect(result).toBe(true);
    });

    it('should allow instructor to modify own course', async () => {
      const mockCourse = { instructor_id: 2 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.canModifyCourseLessons(1, 2, 'instructor');

      expect(result).toBe(true);
    });

    it('should deny instructor from modifying other course', async () => {
      const mockCourse = { instructor_id: 2 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.canModifyCourseLessons(1, 3, 'instructor');

      expect(result).toBe(false);
    });

    it('should return true for admin even when course not found', async () => {
      const result = await service.canModifyCourseLessons(999, 2, 'admin');

      expect(result).toBe(true);
    });

    it('should return false for instructor when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await service.canModifyCourseLessons(999, 2, 'instructor');

      expect(result).toBe(false);
    });
  });
});
