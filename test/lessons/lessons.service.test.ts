/**
 * Tests for lessons service
 * 
 * Tests business logic, content validation, and database interactions
 * with mocked database layer.
 */

import { db } from '../../src/db';
import { lessonsService } from '../../src/services/lessons.service';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

const VALID_LESSON = {
  id: 1,
  course_id: 1,
  title: 'Test Lesson',
  video_url: 'https://example.com/video.mp4',
  content_md: '# Test Content',
  position: 1,
  created_at: new Date()
};

const VALID_COURSE = {
  id: 1,
  instructor_id: 1,
  title: 'Test Course',
  published: true
};

const UNPUBLISHED_COURSE = {
  id: 2,
  instructor_id: 1,
  title: 'Unpublished Course',
  published: false
};

describe('LessonsService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb.query = jest.fn();
    mockDb.getClient = jest.fn().mockResolvedValue(mockClient);
    
    mockClient.query = jest.fn();
    mockClient.release = jest.fn();
  });

  describe('createLesson method', () => {
    it('should throw 404 when course does not exist', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Course not found
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      const lessonData = {
        course_id: 999,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# New Content'
      };
      
      // Act & Assert
      await expect(lessonsService.createLesson(
        lessonData,
        1, // user ID
        'instructor'
      )).rejects.toEqual({ status: 404, message: 'Course not found' });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [999]
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 403 when instructor does not own the course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 2, published: true }] 
        } as any) // Course exists but belongs to another instructor
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# New Content'
      };
      
      // Act & Assert
      await expect(lessonsService.createLesson(
        lessonData,
        1, // user ID (different from instructor_id)
        'instructor'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to add lessons to this course' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to create lesson for any course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 2, published: true }] 
        } as any) // Course exists but belongs to another instructor
        .mockResolvedValueOnce({ 
          rows: [{ max_position: 3 }] 
        } as any) // Max position query
        .mockResolvedValueOnce({ 
          rows: [VALID_LESSON] 
        } as any) // Insert query
        .mockResolvedValueOnce({} as any); // COMMIT
      
      const lessonData = {
        course_id: 1,
        title: 'Admin Created Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Admin Content'
      };
      
      // Act
      const result = await lessonsService.createLesson(
        lessonData,
        3, // admin user ID (different from instructor_id)
        'admin'
      );
      
      // Assert
      expect(result).toEqual(VALID_LESSON);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lessons'),
        expect.arrayContaining([1, 'Admin Created Lesson'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create lesson with auto-assigned position when not provided', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1, published: true }] 
        } as any) // Course exists and belongs to instructor
        .mockResolvedValueOnce({ 
          rows: [{ max_position: 3 }] 
        } as any) // Max position query
        .mockResolvedValueOnce({ 
          rows: [{ ...VALID_LESSON, position: 4 }] 
        } as any) // Insert query
        .mockResolvedValueOnce({} as any); // COMMIT
      
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# New Content'
      };
      
      // Act
      const result = await lessonsService.createLesson(
        lessonData,
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual({ ...VALID_LESSON, position: 4 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lessons'),
        expect.arrayContaining([1, 'New Lesson', 'https://example.com/video.mp4', '# New Content', 4])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should shift existing lessons when inserting at specific position', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1, published: true }] 
        } as any) // Course exists and belongs to instructor
        .mockResolvedValueOnce({ 
          rows: [{ affected: 2 }] 
        } as any) // Update positions query
        .mockResolvedValueOnce({ 
          rows: [{ ...VALID_LESSON, position: 2 }] 
        } as any) // Insert query
        .mockResolvedValueOnce({} as any); // COMMIT
      
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# New Content',
        position: 2 // Insert at position 2
      };
      
      // Act
      const result = await lessonsService.createLesson(
        lessonData,
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual({ ...VALID_LESSON, position: 2 });
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
        [1, 2]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lessons'),
        expect.arrayContaining([1, 'New Lesson', 'https://example.com/video.mp4', '# New Content', 2])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle database errors and rollback transaction', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 1, published: true }] 
      } as any); // Course exists and belongs to instructor
      
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ max_position: 3 }] 
      } as any); // Max position query
      
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(dbError); // Insert query fails
      
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# New Content'
      };
      
      // Act & Assert
      await expect(lessonsService.createLesson(
        lessonData,
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual(dbError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons method', () => {
    it('should throw 404 when course does not exist', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Course not found
      
      // Act & Assert
      await expect(lessonsService.listLessons(999)).rejects.toEqual({ 
        status: 404, 
        message: 'Course not found' 
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [999]
      );
    });

    it('should throw 403 when course is unpublished and user is not authorized', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: false }] 
      } as any); // Unpublished course
      
      // Act & Assert
      await expect(lessonsService.listLessons(
        1, // course ID
        3, // user ID (not the instructor)
        'student'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view lessons for this course' 
      });
    });

    it('should allow instructor to view their own unpublished course lessons', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: false }] 
      } as any); // Unpublished course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }] 
      } as any); // Lessons query
      
      // Act
      const result = await lessonsService.listLessons(
        1, // course ID
        2, // user ID (the instructor)
        'instructor'
      );
      
      // Assert
      expect(result).toEqual([VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
        [1]
      );
    });

    it('should allow admin to view any course lessons regardless of published status', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: false }] 
      } as any); // Unpublished course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }] 
      } as any); // Lessons query
      
      // Act
      const result = await lessonsService.listLessons(
        1, // course ID
        3, // user ID (not the instructor)
        'admin'
      );
      
      // Assert
      expect(result).toEqual([VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }]);
    });

    it('should allow any user to view published course lessons', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: true }] 
      } as any); // Published course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }] 
      } as any); // Lessons query
      
      // Act
      const result = await lessonsService.listLessons(
        1, // course ID
        3, // user ID (not the instructor)
        'student'
      );
      
      // Assert
      expect(result).toEqual([VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }]);
    });

    it('should allow unauthenticated users to view published course lessons', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: true }] 
      } as any); // Published course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }] 
      } as any); // Lessons query
      
      // Act
      const result = await lessonsService.listLessons(
        1 // course ID (no user ID or role)
      );
      
      // Assert
      expect(result).toEqual([VALID_LESSON, { ...VALID_LESSON, id: 2, position: 2 }]);
    });

    it('should return empty array when course has no lessons', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: true }] 
      } as any); // Published course
      
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // No lessons
      
      // Act
      const result = await lessonsService.listLessons(1);
      
      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getLessonById method', () => {
    it('should throw 404 when lesson does not exist', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Lesson not found
      
      // Act & Assert
      await expect(lessonsService.getLessonById(999)).rejects.toEqual({ 
        status: 404, 
        message: 'Lesson not found' 
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM lessons l'),
        [999]
      );
    });

    it('should throw 403 when course is unpublished and user is not authorized', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          ...VALID_LESSON, 
          instructor_id: 2, 
          published: false 
        }] 
      } as any); // Lesson from unpublished course
      
      // Act & Assert
      await expect(lessonsService.getLessonById(
        1, // lesson ID
        3, // user ID (not the instructor)
        'student'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view this lesson' 
      });
    });

    it('should allow instructor to view their own unpublished course lesson', async () => {
      // Arrange
      const lessonWithCourseData = { 
        ...VALID_LESSON, 
        instructor_id: 2, 
        published: false 
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [lessonWithCourseData] 
      } as any);// Lesson from unpublished course
      
      // Act
      const result = await lessonsService.getLessonById(
        1, // lesson ID
        2, // user ID (the instructor)
        'instructor'
      );
      
      // Assert
      expect(result).toEqual(VALID_LESSON); // Course metadata removed
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM lessons l'),
        [1]
      );
    });

    it('should allow admin to view any lesson regardless of published status', async () => {
      // Arrange
      const lessonWithCourseData = { 
        ...VALID_LESSON, 
        instructor_id: 2, 
        published: false 
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [lessonWithCourseData] 
      } as any);// Lesson from unpublished course
      
      // Act
      const result = await lessonsService.getLessonById(
        1, // lesson ID
        3, // user ID (not the instructor)
        'admin'
      );
      
      // Assert
      expect(result).toEqual(VALID_LESSON); // Course metadata removed
    });

    it('should allow any user to view published course lesson', async () => {
      // Arrange
      const lessonWithCourseData = { 
        ...VALID_LESSON, 
        instructor_id: 2, 
        published: true 
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [lessonWithCourseData] 
      } as any);// Lesson from published course
      
      // Act
      const result = await lessonsService.getLessonById(
        1, // lesson ID
        3, // user ID (not the instructor)
        'student'
      );
      
      // Assert
      expect(result).toEqual(VALID_LESSON); // Course metadata removed
    });

    it('should allow unauthenticated users to view published course lesson', async () => {
      // Arrange
      const lessonWithCourseData = { 
        ...VALID_LESSON, 
        instructor_id: 2, 
        published: true 
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [lessonWithCourseData] 
      } as any);// Lesson from published course
      
      // Act
      const result = await lessonsService.getLessonById(
        1 // lesson ID (no user ID or role)
      );
      
      // Assert
      expect(result).toEqual(VALID_LESSON); // Course metadata removed
    });

    it('should remove course metadata from response', async () => {
      // Arrange
      const lessonWithCourseData = { 
        ...VALID_LESSON, 
        instructor_id: 2, 
        published: true,
        extra_field: 'should be kept' 
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [lessonWithCourseData] 
      } as any);
      
      // Act
      const result = await lessonsService.getLessonById(1);
      
      // Assert
      expect(result).toEqual({
        ...VALID_LESSON,
        extra_field: 'should be kept'
      });
      expect(result).not.toHaveProperty('instructor_id');
      expect(result).not.toHaveProperty('published');
    });
  });

  describe('updateLesson method', () => {
    it('should throw 404 when lesson does not exist', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Lesson not found
      
      // Act & Assert
      await expect(lessonsService.updateLesson(
        999, // lesson ID
        { title: 'Updated Title' },
        1,
        'instructor'
      )).rejects.toEqual({ 
        status: 404, 
        message: 'Lesson not found' 
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM lessons l'),
        [999]
      );
    });

    it('should throw 403 when instructor does not own the course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 2 }] 
      } as any); // Lesson exists but belongs to another instructor's course
      
      // Act & Assert
      await expect(lessonsService.updateLesson(
        1, // lesson ID
        { title: 'Updated Title' },
        1, // user ID (different from instructor_id)
        'instructor'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to update this lesson' 
      });
    });

    it('should allow admin to update any lesson', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 2 }] 
      } as any); // Lesson exists but belongs to another instructor's course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, title: 'Admin Updated Title' }] 
      } as any); // Update query
      
      // Act
      const result = await lessonsService.updateLesson(
        1, // lesson ID
        { title: 'Admin Updated Title' },
        3, // admin user ID (different from instructor_id)
        'admin'
      );
      
      // Assert
      expect(result).toEqual({ ...VALID_LESSON, title: 'Admin Updated Title' });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET'),
        expect.arrayContaining(['Admin Updated Title', 1])
      );
    });

    it('should update only provided fields', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 1 }] 
      } as any); // Lesson exists and belongs to instructor's course
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, title: 'Updated Title' }] 
      } as any); // Update query
      
      // Act
      const result = await lessonsService.updateLesson(
        1, // lesson ID
        { title: 'Updated Title' }, // Only update title
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual({ ...VALID_LESSON, title: 'Updated Title' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET title = $1 WHERE id = $2 RETURNING *',
        ['Updated Title', 1]
      );
    });

    it('should handle multiple field updates', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 1 }] 
      } as any); // Lesson exists and belongs to instructor's course
      
      const updatedLesson = { 
        ...VALID_LESSON, 
        title: 'Updated Title', 
        video_url: 'https://example.com/updated.mp4',
        content_md: '# Updated Content'
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [updatedLesson] 
      } as any); // Update query
      
      // Act
      const result = await lessonsService.updateLesson(
        1, // lesson ID
        { 
          title: 'Updated Title',
          video_url: 'https://example.com/updated.mp4',
          content_md: '# Updated Content'
        },
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual(updatedLesson);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET'),
        expect.arrayContaining([
          'Updated Title', 
          'https://example.com/updated.mp4', 
          '# Updated Content',
          1
        ])
      );
    });

    it('should handle null values for optional fields', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 1 }] 
      } as any); // Lesson exists and belongs to instructor's course
      
      const updatedLesson = { 
        ...VALID_LESSON, 
        video_url: "https://example.com/video.mp4",
        content_md: "# Test Content",
        instructor_id: 1
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [updatedLesson] 
      } as any); // Update query
      
      // Act
      const result = await lessonsService.updateLesson(
        1, // lesson ID
        { 
          video_url: undefined,
          content_md: undefined
        },
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual(updatedLesson);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only the first query to get lesson, no update needed
    });

    it('should return existing lesson when no updates provided', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...VALID_LESSON, instructor_id: 1 }] 
      } as any); // Lesson exists and belongs to instructor's course
      
      // Act
      const result = await lessonsService.updateLesson(
        1, // lesson ID
        {}, // Empty update data
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual({ ...VALID_LESSON, instructor_id: 1 });
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only the first query to get lesson
    });
  });

  describe('reorderLessons method', () => {
    it('should throw 404 when course does not exist', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Course not found
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        999, // course ID
        [1, 2, 3], // lesson IDs
        1,
        'instructor'
      )).rejects.toEqual({ 
        status: 404, 
        message: 'Course not found' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id FROM courses WHERE id = $1',
        [999]
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 403 when instructor does not own the course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 2 }] 
        } as any) // Course exists but belongs to another instructor
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        1, // course ID
        [1, 2, 3], // lesson IDs
        1, // user ID (different from instructor_id)
        'instructor'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to reorder lessons for this course' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to reorder lessons for any course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 2 }] 
        } as any) // Course exists but belongs to another instructor
        .mockResolvedValueOnce({ 
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
        } as any); // Current lessons query
      
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 } as any);
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 } as any);
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 } as any);
      
      mockClient.query.mockResolvedValueOnce({ 
        rows: [
          { ...VALID_LESSON, id: 3, position: 1 },
          { ...VALID_LESSON, id: 1, position: 2 },
          { ...VALID_LESSON, id: 2, position: 3 }
        ] 
      } as any); // Final query to get reordered lessons
      
      // Act
      const result = await lessonsService.reorderLessons(
        1, // course ID
        [3, 1, 2], // lesson IDs in new order
        3, // admin user ID (different from instructor_id)
        'admin'
      );
      
      // Assert
      expect(result).toEqual([
        { ...VALID_LESSON, id: 3, position: 1 },
        { ...VALID_LESSON, id: 1, position: 2 },
        { ...VALID_LESSON, id: 2, position: 3 }
      ]);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
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
    });

    it('should throw 400 when lesson count mismatch', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1 }] 
        } as any) // Course exists and belongs to instructor
      
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
        } as any) // Current lessons query (3 lessons)
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        1, // course ID
        [1, 2], // lesson IDs (only 2 provided)
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 400 when lesson ID is missing', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1 }] 
        } as any) // Course exists and belongs to instructor
      
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
        } as any) // Current lessons query
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        1, // course ID
        [1, 2, 4], // lesson IDs (4 is not in the course, 3 is missing)
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 400 when lesson ID is not from this course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1 }] 
        } as any) // Course exists and belongs to instructor
      
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
        } as any) // Current lessons query
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        1, // course ID
        [1, 2, 5], // lesson IDs (5 is not in the current lessons, 3 is missing)
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should successfully reorder lessons', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, instructor_id: 1 }] 
        } as any) // Course exists and belongs to instructor
      
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
        } as any) // Current lessons query
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any)
        .mockResolvedValueOnce({ 
          rows: [
            { ...VALID_LESSON, id: 2, position: 1 },
            { ...VALID_LESSON, id: 3, position: 2 },
            { ...VALID_LESSON, id: 1, position: 3 }
          ] 
        } as any) // Final query to get reordered lessons
        .mockResolvedValueOnce({} as any); // COMMIT
      
      // Act
      const result = await lessonsService.reorderLessons(
        1, // course ID
        [2, 3, 1], // lesson IDs in new order
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toEqual([
        { ...VALID_LESSON, id: 2, position: 1 },
        { ...VALID_LESSON, id: 3, position: 2 },
        { ...VALID_LESSON, id: 1, position: 3 }
      ]);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle database errors and rollback transaction', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 1 }] 
      } as any); // Course exists and belongs to instructor
      
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }] 
      } as any); // Current lessons query
      
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(dbError); // Update query fails
      
      // Act & Assert
      await expect(lessonsService.reorderLessons(
        1, // course ID
        [2, 3, 1], // lesson IDs
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual(dbError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson method', () => {
    it('should throw 404 when lesson does not exist', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Lesson not found
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.deleteLesson(
        999, // lesson ID
        1,
        'instructor'
      )).rejects.toEqual({ 
        status: 404, 
        message: 'Lesson not found' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM lessons l'),
        [999]
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 403 when instructor does not own the course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...VALID_LESSON, 
            instructor_id: 2,
            position: 2
          }] 
        } as any) // Lesson exists but belongs to another instructor's course
        .mockResolvedValueOnce({} as any); // ROLLBACK
      
      // Act & Assert
      await expect(lessonsService.deleteLesson(
        1, // lesson ID
        1, // user ID (different from instructor_id)
        'instructor'
      )).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to delete this lesson' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to delete any lesson', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...VALID_LESSON, 
            instructor_id: 2,
            position: 2
          }] 
        } as any) // Lesson exists but belongs to another instructor's course
        .mockResolvedValueOnce({ rowCount: 1 } as any) // Delete query
        .mockResolvedValueOnce({ rowCount: 2 } as any) // Re-compact positions query
        .mockResolvedValueOnce({} as any); // COMMIT
      
      // Act
      await lessonsService.deleteLesson(
        1, // lesson ID
        3, // admin user ID (different from instructor_id)
        'admin'
      );
      
      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM lessons WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [1, 2] // course_id and position from the lesson
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should delete lesson and re-compact positions', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...VALID_LESSON, 
            instructor_id: 1,
            position: 2,
            course_id: 1
          }] 
        } as any) // Lesson exists and belongs to instructor's course
        .mockResolvedValueOnce({ rowCount: 1 } as any) // Delete query
        .mockResolvedValueOnce({ rowCount: 2 } as any) // Re-compact positions query
        .mockResolvedValueOnce({} as any); // COMMIT
      
      // Act
      await lessonsService.deleteLesson(
        1, // lesson ID
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM lessons WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [1, 2] // course_id and position from the lesson
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle database errors and rollback transaction', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ 
          ...VALID_LESSON, 
          instructor_id: 1,
          position: 2
        }] 
      } as any); // Lesson exists and belongs to instructor's course
      
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValueOnce(dbError); // Delete query fails
      
      // Act & Assert
      await expect(lessonsService.deleteLesson(
        1, // lesson ID
        1, // instructor user ID
        'instructor'
      )).rejects.toEqual(dbError);
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons method', () => {
    it('should return true for admin regardless of course ownership', async () => {
      // Act
      const result = await lessonsService.canModifyCourseLessons(
        1, // course ID
        999, // admin user ID (not the instructor)
        'admin'
      );
      
      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled(); // No need to check DB for admin
    });

    it('should return false when course does not exist', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Course not found
      
      // Act
      const result = await lessonsService.canModifyCourseLessons(
        999, // course ID
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toBe(false);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [999]
      );
    });

    it('should return true when instructor owns the course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ instructor_id: 1 }] 
      } as any); // Course exists and belongs to instructor
      
      // Act
      const result = await lessonsService.canModifyCourseLessons(
        1, // course ID
        1, // instructor user ID
        'instructor'
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return false when instructor does not own the course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ instructor_id: 2 }] 
      } as any); // Course exists but belongs to another instructor
      
      // Act
      const result = await lessonsService.canModifyCourseLessons(
        1, // course ID
        1, // instructor user ID (different from instructor_id)
        'instructor'
      );
      
      // Assert
      expect(result).toBe(false);
    });

    it('should return false for student regardless of course ownership', async () => {
      // Arrange - mock the DB call that will happen even for students
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ instructor_id: 2 }] 
      } as any);
      
      // Act
      const result = await lessonsService.canModifyCourseLessons(
        1, // course ID
        1, // student user ID
        'student'
      );
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
