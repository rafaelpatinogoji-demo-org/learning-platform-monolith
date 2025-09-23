/**
 * Tests for LessonsService
 * 
 * Tests business logic for lesson CRUD operations, position management,
 * and atomic reordering with database mocking.
 */

import { LessonsService } from '../../src/services/lessons.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('LessonsService', () => {
  let lessonsService: LessonsService;
  let mockClient: any;

  beforeEach(() => {
    lessonsService = new LessonsService();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    mockDb.getClient = jest.fn().mockResolvedValue(mockClient);
    mockDb.query = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('createLesson', () => {
    const validLessonData = {
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://example.com/video.mp4',
      content_md: 'Test content'
    };

    it('should create lesson with auto-generated position when position not provided', async () => {
      // Arrange
      const userId = 1;
      const userRole = 'instructor';
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1, published: false }] } as any) // Course check
        .mockResolvedValueOnce({ rows: [{ max_position: 2 }] } as any) // Max position query
        .mockResolvedValueOnce({ rows: [{ id: 1, ...validLessonData, position: 3 }] } as any) // Insert result
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      const result = await lessonsService.createLesson(validLessonData, userId, userRole);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO lessons (course_id, title, video_url, content_md, position)\n         VALUES ($1, $2, $3, $4, $5)\n         RETURNING *',
        [1, 'Test Lesson', 'https://example.com/video.mp4', 'Test content', 3]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, ...validLessonData, position: 3 });
    });

    it('should create lesson with specified position and shift existing lessons', async () => {
      // Arrange
      const lessonDataWithPosition = { ...validLessonData, position: 2 };
      const userId = 1;
      const userRole = 'instructor';
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1, published: false }] } as any) // Course check
        .mockResolvedValueOnce({ rows: [] } as any) // Position shift update
        .mockResolvedValueOnce({ rows: [{ id: 1, ...lessonDataWithPosition }] } as any) // Insert result
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      const result = await lessonsService.createLesson(lessonDataWithPosition, userId, userRole);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
        [1, 2]
      );
      expect(result).toEqual({ id: 1, ...lessonDataWithPosition });
    });

    it('should throw 404 error when course not found', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Course not found
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.createLesson(validLessonData, 1, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 403 error when instructor does not own course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2, published: false }] } as any) // Course owned by different instructor
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.createLesson(validLessonData, 1, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to add lessons to this course' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to create lesson for any course', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2, published: false }] } as any) // Course owned by different user
        .mockResolvedValueOnce({ rows: [{ max_position: 0 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, ...validLessonData, position: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      const result = await lessonsService.createLesson(validLessonData, 1, 'admin');

      // Assert
      expect(result).toEqual({ id: 1, ...validLessonData, position: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle database errors and rollback transaction', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockRejectedValueOnce(dbError); // Course check fails

      // Act & Assert
      await expect(
        lessonsService.createLesson(validLessonData, 1, 'instructor')
      ).rejects.toThrow('Database connection failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should return lessons for published course without authentication', async () => {
      // Arrange
      const courseId = 1;
      const mockLessons = [
        { id: 1, course_id: 1, title: 'Lesson 1', position: 1 },
        { id: 2, course_id: 1, title: 'Lesson 2', position: 2 }
      ];
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2, published: true }] } as any) // Course check
        .mockResolvedValueOnce({ rows: mockLessons } as any); // Lessons query

      // Act
      const result = await lessonsService.listLessons(courseId);

      // Assert
      expect(result).toEqual(mockLessons);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
        [courseId]
      );
    });

    it('should allow instructor to view lessons for their unpublished course', async () => {
      // Arrange
      const courseId = 1;
      const userId = 2;
      const userRole = 'instructor';
      const mockLessons = [{ id: 1, course_id: 1, title: 'Lesson 1', position: 1 }];
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2, published: false }] } as any)
        .mockResolvedValueOnce({ rows: mockLessons } as any);

      // Act
      const result = await lessonsService.listLessons(courseId, userId, userRole);

      // Assert
      expect(result).toEqual(mockLessons);
    });

    it('should allow admin to view lessons for any course', async () => {
      // Arrange
      const courseId = 1;
      const userId = 1;
      const userRole = 'admin';
      const mockLessons = [{ id: 1, course_id: 1, title: 'Lesson 1', position: 1 }];
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2, published: false }] } as any)
        .mockResolvedValueOnce({ rows: mockLessons } as any);

      // Act
      const result = await lessonsService.listLessons(courseId, userId, userRole);

      // Assert
      expect(result).toEqual(mockLessons);
    });

    it('should throw 403 error when student tries to view unpublished course lessons', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, instructor_id: 2, published: false }] 
      } as any);

      // Act & Assert
      await expect(
        lessonsService.listLessons(1, 3, 'student')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view lessons for this course' 
      });
    });

    it('should throw 404 error when course not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(
        lessonsService.listLessons(999)
      ).rejects.toEqual({ status: 404, message: 'Course not found' });
    });
  });

  describe('getLessonById', () => {
    it('should return lesson for published course', async () => {
      // Arrange
      const lessonId = 1;
      const mockLesson = { 
        id: 1, 
        course_id: 1, 
        title: 'Test Lesson', 
        instructor_id: 2, 
        published: true 
      };
      
      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson] } as any);

      // Act
      const result = await lessonsService.getLessonById(lessonId);

      // Assert
      expect(result).toEqual({ 
        id: 1, 
        course_id: 1, 
        title: 'Test Lesson' 
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT l.*, c.instructor_id, c.published \n       FROM lessons l\n       JOIN courses c ON l.course_id = c.id\n       WHERE l.id = $1',
        [lessonId]
      );
    });

    it('should allow instructor to view lesson from their unpublished course', async () => {
      // Arrange
      const lessonId = 1;
      const userId = 2;
      const userRole = 'instructor';
      const mockLesson = { 
        id: 1, 
        course_id: 1, 
        title: 'Test Lesson', 
        instructor_id: 2, 
        published: false 
      };
      
      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson] } as any);

      // Act
      const result = await lessonsService.getLessonById(lessonId, userId, userRole);

      // Assert
      expect(result).toEqual({ 
        id: 1, 
        course_id: 1, 
        title: 'Test Lesson' 
      });
    });

    it('should throw 404 error when lesson not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(
        lessonsService.getLessonById(999)
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should throw 403 error when student tries to view lesson from unpublished course', async () => {
      // Arrange
      const mockLesson = { 
        id: 1, 
        course_id: 1, 
        title: 'Test Lesson', 
        instructor_id: 2, 
        published: false 
      };
      
      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson] } as any);

      // Act & Assert
      await expect(
        lessonsService.getLessonById(1, 3, 'student')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to view this lesson' 
      });
    });
  });

  describe('updateLesson', () => {
    const updateData = {
      title: 'Updated Lesson',
      video_url: 'https://example.com/new-video.mp4',
      content_md: 'Updated content'
    };

    it('should update lesson when instructor owns the course', async () => {
      // Arrange
      const lessonId = 1;
      const userId = 2;
      const userRole = 'instructor';
      const mockLesson = { id: 1, course_id: 1, instructor_id: 2 };
      const updatedLesson = { id: 1, ...updateData };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLesson] } as any) // Lesson check
        .mockResolvedValueOnce({ rows: [updatedLesson] } as any); // Update result

      // Act
      const result = await lessonsService.updateLesson(lessonId, updateData, userId, userRole);

      // Assert
      expect(result).toEqual(updatedLesson);
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET title = $1, video_url = $2, content_md = $3 WHERE id = $4 RETURNING *',
        ['Updated Lesson', 'https://example.com/new-video.mp4', 'Updated content', lessonId]
      );
    });

    it('should update only provided fields', async () => {
      // Arrange
      const partialUpdate = { title: 'New Title' };
      const mockLesson = { id: 1, course_id: 1, instructor_id: 2 };
      const updatedLesson = { id: 1, title: 'New Title' };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [updatedLesson] } as any);

      // Act
      const result = await lessonsService.updateLesson(1, partialUpdate, 2, 'instructor');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE lessons SET title = $1 WHERE id = $2 RETURNING *',
        ['New Title', 1]
      );
    });

    it('should return original lesson when no updates provided', async () => {
      // Arrange
      const mockLesson = { id: 1, course_id: 1, instructor_id: 2, title: 'Original' };
      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson] } as any);

      // Act
      const result = await lessonsService.updateLesson(1, {}, 2, 'instructor');

      // Assert
      expect(result).toEqual(mockLesson);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only the lesson check query
    });

    it('should allow admin to update any lesson', async () => {
      // Arrange
      const mockLesson = { id: 1, course_id: 1, instructor_id: 3 }; // Different instructor
      const updatedLesson = { id: 1, ...updateData };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [updatedLesson] } as any);

      // Act
      const result = await lessonsService.updateLesson(1, updateData, 1, 'admin');

      // Assert
      expect(result).toEqual(updatedLesson);
    });

    it('should throw 403 error when instructor tries to update lesson they do not own', async () => {
      // Arrange
      const mockLesson = { id: 1, course_id: 1, instructor_id: 3 }; // Different instructor
      mockDb.query.mockResolvedValueOnce({ rows: [mockLesson] } as any);

      // Act & Assert
      await expect(
        lessonsService.updateLesson(1, updateData, 2, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to update this lesson' 
      });
    });

    it('should throw 404 error when lesson not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(
        lessonsService.updateLesson(999, updateData, 1, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons atomically when user owns course', async () => {
      // Arrange
      const courseId = 1;
      const lessonIds = [3, 1, 2];
      const userId = 2;
      const userRole = 'instructor';
      const mockCourse = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const reorderedLessons = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any) // Course check
        .mockResolvedValueOnce({ rows: currentLessons } as any) // Current lessons
        .mockResolvedValueOnce({ rows: [] } as any) // Position update 1
        .mockResolvedValueOnce({ rows: [] } as any) // Position update 2
        .mockResolvedValueOnce({ rows: [] } as any) // Position update 3
        .mockResolvedValueOnce({ rows: reorderedLessons } as any) // Final result
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      const result = await lessonsService.reorderLessons(courseId, lessonIds, userId, userRole);

      // Assert
      expect(result).toEqual(reorderedLessons);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [1, 3, courseId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [2, 1, courseId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [3, 2, courseId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 400 error when lesson count mismatch', async () => {
      // Arrange
      const courseId = 1;
      const lessonIds = [1, 2]; // Only 2 lessons
      const mockCourse = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }]; // 3 lessons exist
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.reorderLessons(courseId, lessonIds, 2, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 400 error when lesson ID is missing from reorder list', async () => {
      // Arrange
      const courseId = 1;
      const lessonIds = [1, 2, 4]; // ID 4 doesn't exist, missing ID 3
      const mockCourse = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.reorderLessons(courseId, lessonIds, 2, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list' 
      });
    });

    it('should throw 400 error when lesson count mismatch', async () => {
      // Arrange
      const courseId = 1;
      const lessonIds = [1, 2, 3, 4]; // 4 IDs provided but only 3 lessons exist
      const mockCourse = { id: 1, instructor_id: 2 };
      const currentLessons = [{ id: 1 }, { id: 2 }, { id: 3 }]; // 3 lessons exist: 1, 2, 3
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.reorderLessons(courseId, lessonIds, 2, 'instructor')
      ).rejects.toEqual({ 
        status: 400, 
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons' 
      });
    });

    it('should allow admin to reorder lessons for any course', async () => {
      // Arrange
      const courseId = 1;
      const lessonIds = [1, 2];
      const mockCourse = { id: 1, instructor_id: 3 }; // Different instructor
      const currentLessons = [{ id: 1 }, { id: 2 }];
      const reorderedLessons = [{ id: 1, position: 1 }, { id: 2, position: 2 }];
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: currentLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: reorderedLessons } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      const result = await lessonsService.reorderLessons(courseId, lessonIds, 1, 'admin');

      // Assert
      expect(result).toEqual(reorderedLessons);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw 403 error when instructor tries to reorder lessons for course they do not own', async () => {
      // Arrange
      const mockCourse = { id: 1, instructor_id: 3 }; // Different instructor
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.reorderLessons(1, [1, 2], 2, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to reorder lessons for this course' 
      });
    });

    it('should throw 404 error when course not found', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Course not found
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.reorderLessons(999, [1, 2], 1, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Course not found' });
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and compact positions when instructor owns course', async () => {
      // Arrange
      const lessonId = 2;
      const userId = 1;
      const userRole = 'instructor';
      const mockLesson = { 
        id: 2, 
        course_id: 1, 
        position: 2, 
        instructor_id: 1 
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLesson] } as any) // Lesson check
        .mockResolvedValueOnce({ rows: [] } as any) // Delete lesson
        .mockResolvedValueOnce({ rows: [] } as any) // Compact positions
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      await lessonsService.deleteLesson(lessonId, userId, userRole);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM lessons WHERE id = $1', 
        [lessonId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [1, 2]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to delete any lesson', async () => {
      // Arrange
      const mockLesson = { 
        id: 1, 
        course_id: 1, 
        position: 1, 
        instructor_id: 2 // Different instructor
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      // Act
      await lessonsService.deleteLesson(1, 1, 'admin');

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw 403 error when instructor tries to delete lesson they do not own', async () => {
      // Arrange
      const mockLesson = { 
        id: 1, 
        course_id: 1, 
        position: 1, 
        instructor_id: 2 // Different instructor
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.deleteLesson(1, 1, 'instructor')
      ).rejects.toEqual({ 
        status: 403, 
        message: 'You do not have permission to delete this lesson' 
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw 404 error when lesson not found', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any) // Lesson not found
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      // Act & Assert
      await expect(
        lessonsService.deleteLesson(999, 1, 'instructor')
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should handle database errors and rollback transaction', async () => {
      // Arrange
      const mockLesson = { id: 1, course_id: 1, position: 1, instructor_id: 1 };
      const dbError = new Error('Delete failed');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        lessonsService.deleteLesson(1, 1, 'instructor')
      ).rejects.toThrow('Delete failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should return true for admin users', async () => {
      // Act
      const result = await lessonsService.canModifyCourseLessons(1, 1, 'admin');

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true when instructor owns the course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ instructor_id: 2 }] 
      } as any);

      // Act
      const result = await lessonsService.canModifyCourseLessons(1, 2, 'instructor');

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [1]
      );
    });

    it('should return false when instructor does not own the course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ instructor_id: 3 }] 
      } as any);

      // Act
      const result = await lessonsService.canModifyCourseLessons(1, 2, 'instructor');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when course not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await lessonsService.canModifyCourseLessons(999, 1, 'instructor');

      // Assert
      expect(result).toBe(false);
    });
  });
});
