/**
 * Tests for LessonsService
 * 
 * Unit tests for lesson service methods with mocked database operations
 */

import { lessonsService } from '../../src/services/lessons.service';
import { db } from '../../src/db';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('LessonsService', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockDb.getClient = jest.fn().mockResolvedValue(mockClient);
    mockDb.query = jest.fn();
  });

  describe('createLesson', () => {
    const mockCourse = {
      id: 1,
      instructor_id: 5,
      published: true
    };

    const mockLessonData = {
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://youtube.com/watch?v=example',
      content_md: '# Test Content',
      position: 2
    };

    const mockCreatedLesson = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://youtube.com/watch?v=example',
      content_md: '# Test Content',
      position: 2,
      created_at: new Date()
    };

    it('should create lesson for instructor who owns the course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rowCount: 1 }) // position shift (if needed)
        .mockResolvedValueOnce({ rows: [mockCreatedLesson] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await lessonsService.createLesson(mockLessonData, 5, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual(mockCreatedLesson);
    });

    it('should create lesson for admin on any course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rowCount: 1 }) // position shift
        .mockResolvedValueOnce({ rows: [mockCreatedLesson] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await lessonsService.createLesson(mockLessonData, 10, 'admin');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual(mockCreatedLesson);
    });

    it('should auto-assign position when not provided', async () => {
      const dataWithoutPosition = { ...mockLessonData };
      delete (dataWithoutPosition as any).position;

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: [{ max_position: 3 }] }) // max position query
        .mockResolvedValueOnce({ rows: [{ ...mockCreatedLesson, position: 4 }] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await lessonsService.createLesson(dataWithoutPosition, 5, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
        [1]
      );
      expect(result.position).toBe(4);
    });

    it('should shift existing lessons when position is provided', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rowCount: 1 }) // position shift
        .mockResolvedValueOnce({ rows: [mockCreatedLesson] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      await lessonsService.createLesson(mockLessonData, 5, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
        [1, 2]
      );
    });

    it('should throw error for non-existent course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // course check - empty result
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.createLesson({ ...mockLessonData, course_id: 999 }, 5, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when instructor does not own course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check - instructor_id: 5, but user is 6
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.createLesson(mockLessonData, 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to add lessons to this course' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      await expect(
        lessonsService.createLesson(mockLessonData, 5, 'instructor')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    const mockCourse = {
      id: 1,
      instructor_id: 5,
      published: true
    };

    const mockLessons = [
      {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        video_url: 'https://youtube.com/1',
        content_md: '# Lesson 1',
        position: 1,
        created_at: new Date()
      },
      {
        id: 2,
        course_id: 1,
        title: 'Lesson 2',
        video_url: 'https://youtube.com/2',
        content_md: '# Lesson 2',
        position: 2,
        created_at: new Date()
      }
    ];

    it('should list lessons for published course (public access)', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: mockLessons } as any);

      const result = await lessonsService.listLessons(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
        [1]
      );
      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for admin on any course', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query
        .mockResolvedValueOnce({ rows: [unpublishedCourse] } as any)
        .mockResolvedValueOnce({ rows: mockLessons } as any);

      const result = await lessonsService.listLessons(1, 10, 'admin');

      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for instructor who owns the course', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query
        .mockResolvedValueOnce({ rows: [unpublishedCourse] } as any)
        .mockResolvedValueOnce({ rows: mockLessons } as any);

      const result = await lessonsService.listLessons(1, 5, 'instructor');

      expect(result).toEqual(mockLessons);
    });

    it('should throw error for non-existent course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.listLessons(999)
      ).rejects.toEqual({ status: 404, message: 'Course not found' });
    });

    it('should throw error for unpublished course without permission', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedCourse] } as any);

      await expect(
        lessonsService.listLessons(1, 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view lessons for this course' 
      });
    });
  });

  describe('getLessonById', () => {
    const mockLessonWithCourse = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://youtube.com/example',
      content_md: '# Test Content',
      position: 1,
      created_at: new Date(),
      instructor_id: 5,
      published: true
    };

    it('should get lesson for published course (public access)', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any);

      const result = await lessonsService.getLessonById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT l.*, c.instructor_id, c.published'),
        [1]
      );
      
      const expectedLesson = { ...mockLessonWithCourse };
      delete (expectedLesson as any).instructor_id;
      delete (expectedLesson as any).published;
      
      expect(result).toEqual(expectedLesson);
    });

    it('should get lesson for admin on any course', async () => {
      const unpublishedLesson = { ...mockLessonWithCourse, published: false };
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedLesson] } as any);

      const result = await lessonsService.getLessonById(1, 10, 'admin');

      const expectedLesson = { ...unpublishedLesson };
      delete (expectedLesson as any).instructor_id;
      delete (expectedLesson as any).published;
      
      expect(result).toEqual(expectedLesson);
    });

    it('should get lesson for instructor who owns the course', async () => {
      const unpublishedLesson = { ...mockLessonWithCourse, published: false, instructor_id: 5 };
      mockDb.query.mockReset();
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedLesson] } as any);

      const result = await lessonsService.getLessonById(1, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT l.*, c.instructor_id, c.published'),
        [1]
      );

      const expectedLesson = { ...unpublishedLesson };
      delete (expectedLesson as any).instructor_id;
      delete (expectedLesson as any).published;
      
      expect(result).toEqual(expectedLesson);
    });

    it('should throw error for non-existent lesson', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.getLessonById(999)
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should throw error for unpublished lesson without permission', async () => {
      const unpublishedLesson = { ...mockLessonWithCourse, published: false };
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedLesson] } as any);

      await expect(
        lessonsService.getLessonById(1, 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view this lesson' 
      });
    });
  });

  describe('updateLesson', () => {
    const mockLessonWithCourse = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://youtube.com/example',
      content_md: '# Test Content',
      position: 1,
      created_at: new Date(),
      instructor_id: 5
    };

    const mockUpdatedLesson = {
      ...mockLessonWithCourse,
      title: 'Updated Lesson',
      content_md: '# Updated Content'
    };

    it('should update lesson for instructor who owns the course', async () => {
      const updateData = {
        title: 'Updated Lesson',
        content_md: '# Updated Content'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedLesson] } as any);

      const result = await lessonsService.updateLesson(1, updateData, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT l.*, c.instructor_id'),
        [1]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET title = $1, content_md = $2 WHERE id = $3 RETURNING *',
        ['Updated Lesson', '# Updated Content', 1]
      );
      expect(result).toEqual(mockUpdatedLesson);
    });

    it('should update lesson for admin on any course', async () => {
      const updateData = { title: 'Updated Lesson' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedLesson] } as any);

      const result = await lessonsService.updateLesson(1, updateData, 10, 'admin');

      expect(result).toEqual(mockUpdatedLesson);
    });

    it('should handle partial updates', async () => {
      const updateData = { video_url: 'https://vimeo.com/123' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockUpdatedLesson, video_url: 'https://vimeo.com/123' }] } as any);

      const result = await lessonsService.updateLesson(1, updateData, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET video_url = $1 WHERE id = $2 RETURNING *',
        ['https://vimeo.com/123', 1]
      );
    });

    it('should handle null values in updates', async () => {
      const updateData = { video_url: null as any };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ ...mockUpdatedLesson, video_url: null }] } as any);

      await lessonsService.updateLesson(1, updateData, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET video_url = $1 WHERE id = $2 RETURNING *',
        [null, 1]
      );
    });

    it('should return lesson unchanged when no updates provided', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any);

      const result = await lessonsService.updateLesson(1, {}, 5, 'instructor');

      expect(result).toEqual(mockLessonWithCourse);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent lesson', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        lessonsService.updateLesson(999, { title: 'Updated' }, 5, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should throw error when instructor does not own course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockLessonWithCourse] } as any);

      await expect(
        lessonsService.updateLesson(1, { title: 'Updated' }, 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to update this lesson' 
      });
    });
  });

  describe('reorderLessons', () => {
    const mockCourse = {
      id: 1,
      instructor_id: 5
    };

    const mockCurrentLessons = [
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ];

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

    it('should reorder lessons for instructor who owns the course', async () => {
      const lessonIds = [3, 1, 2];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: mockCurrentLessons }) // lessons check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 3
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 1
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 2
        .mockResolvedValueOnce({ rows: mockReorderedLessons }) // final SELECT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await lessonsService.reorderLessons(1, lessonIds, 5, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id FROM courses WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM lessons WHERE course_id = $1 ORDER BY position',
        [1]
      );
      
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [1, 3, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [2, 1, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [3, 2, 1]
      );

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockReorderedLessons);
    });

    it('should reorder lessons for admin on any course', async () => {
      const lessonIds = [3, 1, 2];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: mockCurrentLessons }) // lessons check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 3
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 1
        .mockResolvedValueOnce({ rows: [] }) // UPDATE lesson 2
        .mockResolvedValueOnce({ rows: mockReorderedLessons }) // final SELECT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await lessonsService.reorderLessons(1, lessonIds, 10, 'admin');

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockReorderedLessons);
    });

    it('should throw error for non-existent course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // course check - empty result
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.reorderLessons(999, [1, 2, 3], 5, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when instructor does not own course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check - instructor_id: 5, but user is 6
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.reorderLessons(1, [1, 2, 3], 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to reorder lessons for this course' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for count mismatch', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: mockCurrentLessons }) // lessons check
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.reorderLessons(1, [1, 2], 5, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for missing lesson ID', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: mockCurrentLessons }) // lessons check
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.reorderLessons(1, [1, 2, 4], 5, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid lesson ID', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] }) // course check
        .mockResolvedValueOnce({ rows: mockCurrentLessons }) // lessons check
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.reorderLessons(1, [1, 2, 5], 5, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson', () => {
    const mockLessonWithCourse = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      position: 2,
      instructor_id: 5
    };

    it('should delete lesson for instructor who owns the course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] }) // lesson check
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE positions
        .mockResolvedValueOnce(undefined); // COMMIT

      await lessonsService.deleteLesson(1, 5, 'instructor');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT l.*, c.instructor_id'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM lessons WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [1, 2]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should delete lesson for admin on any course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] }) // lesson check
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }) // UPDATE positions
        .mockResolvedValueOnce(undefined); // COMMIT

      await lessonsService.deleteLesson(1, 10, 'admin');

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for non-existent lesson', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // lesson check - empty result
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.deleteLesson(999, 5, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when instructor does not own course', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] }) // lesson check - instructor_id: 5, but user is 6
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await expect(
        lessonsService.deleteLesson(1, 6, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to delete this lesson' 
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLessonWithCourse] }) // lesson check
        .mockRejectedValueOnce(new Error('Database error')); // DELETE fails

      await expect(
        lessonsService.deleteLesson(1, 5, 'instructor')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should allow admin to modify lessons for any course', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 10, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify lessons for their own course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ instructor_id: 5 }] } as any);

      const result = await lessonsService.canModifyCourseLessons(1, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should not allow instructor to modify lessons for other instructor course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ instructor_id: 5 }] } as any);

      const result = await lessonsService.canModifyCourseLessons(1, 6, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for non-existent course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await lessonsService.canModifyCourseLessons(999, 5, 'instructor');

      expect(result).toBe(false);
    });
  });
});
