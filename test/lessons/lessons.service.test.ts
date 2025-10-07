import { lessonsService } from '../../src/services/lessons.service';
import { db } from '../../src/db';
import { mockQueryResult, mockPoolClient } from '../helpers/db-mocks';
import { createMockLesson, createMockCourse, mockUsers } from '../helpers/test-data';

jest.mock('../../src/db');

describe('LessonsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLesson', () => {
    it('should create lesson with automatic position', async () => {
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };
      const mockMaxPosition = { max_position: 2 };
      const mockLesson = createMockLesson({ ...lessonData, position: 3 });

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult([mockMaxPosition])) // Max position
        .mockResolvedValueOnce(mockQueryResult([mockLesson])) // Insert
        .mockResolvedValueOnce(mockQueryResult([])); // COMMIT

      const result = await lessonsService.createLesson(
        lessonData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(mockLesson);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create lesson with specified position and shift existing', async () => {
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content',
        position: 2
      };
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };
      const mockLesson = createMockLesson({ ...lessonData });

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult([])) // Shift positions
        .mockResolvedValueOnce(mockQueryResult([mockLesson])) // Insert
        .mockResolvedValueOnce(mockQueryResult([])); // COMMIT

      const result = await lessonsService.createLesson(
        lessonData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(mockLesson);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET position = position + 1'),
        [1, 2]
      );
    });

    it('should throw error if course not found', async () => {
      const lessonData = {
        course_id: 999,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([])); // Course not found

      await expect(
        lessonsService.createLesson(lessonData, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 404, message: 'Course not found' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if user lacks permission', async () => {
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };

      const mockCourse = { id: 1, instructor_id: mockUsers.instructor2.id, published: false };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])); // Course check

      await expect(
        lessonsService.createLesson(lessonData, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to add lessons to this course' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to create lessons for any course', async () => {
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };
      const mockMaxPosition = { max_position: 0 };
      const mockLesson = createMockLesson({ ...lessonData, position: 1 });

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult([mockMaxPosition])) // Max position
        .mockResolvedValueOnce(mockQueryResult([mockLesson])) // Insert
        .mockResolvedValueOnce(mockQueryResult([])); // COMMIT

      const result = await lessonsService.createLesson(
        lessonData,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toEqual(mockLesson);
    });

    it('should rollback transaction on error', async () => {
      const lessonData = {
        course_id: 1,
        title: 'New Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Content'
      };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        lessonsService.createLesson(lessonData, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    it('should list lessons for published course without authentication', async () => {
      const mockLessons = [createMockLesson({ id: 1 }), createMockLesson({ id: 2 })];
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: true };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCourse]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(1);

      expect(result).toEqual(mockLessons);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM lessons'),
        [1]
      );
    });

    it('should list lessons for unpublished course if user is owner', async () => {
      const mockLessons = [createMockLesson()];
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCourse]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for unpublished course if user is admin', async () => {
      const mockLessons = [createMockLesson()];
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCourse]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(
        1,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toEqual(mockLessons);
    });

    it('should throw error if course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await expect(lessonsService.listLessons(999)).rejects.toEqual({ status: 404, message: 'Course not found' });
    });

    it('should throw error if student tries to view unpublished course lessons', async () => {
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id, published: false };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      await expect(
        lessonsService.listLessons(1, mockUsers.student.id, mockUsers.student.role)
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to view lessons for this course' });
    });
  });

  describe('getLessonById', () => {
    it('should get lesson for published course', async () => {
      const mockLessonWithCourseData = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id,
        published: true
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockLessonWithCourseData]));

      const result = await lessonsService.getLessonById(1);

      expect(result).toEqual(createMockLesson());
      expect(result).not.toHaveProperty('instructor_id');
      expect(result).not.toHaveProperty('published');
    });

    it('should get lesson for unpublished course if user is owner', async () => {
      const mockLessonWithCourseData = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id,
        published: false
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockLessonWithCourseData]));

      const result = await lessonsService.getLessonById(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(createMockLesson());
    });

    it('should get lesson for unpublished course if user is admin', async () => {
      const mockLessonWithCourseData = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id,
        published: false
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockLessonWithCourseData]));

      const result = await lessonsService.getLessonById(
        1,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toEqual(createMockLesson());
    });

    it('should throw error if lesson not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await expect(lessonsService.getLessonById(999)).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should throw error if student tries to view unpublished course lesson', async () => {
      const mockLessonWithCourseData = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id,
        published: false
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockLessonWithCourseData]));

      await expect(
        lessonsService.getLessonById(1, mockUsers.student.id, mockUsers.student.role)
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to view this lesson' });
    });
  });

  describe('updateLesson', () => {
    it('should update lesson with partial data', async () => {
      const updateData = { title: 'Updated Title' };
      const mockLessonWithInstructor = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id
      };
      const updatedLesson = createMockLesson({ title: 'Updated Title' });

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockLessonWithInstructor]))
        .mockResolvedValueOnce(mockQueryResult([updatedLesson]));

      const result = await lessonsService.updateLesson(
        1,
        updateData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(updatedLesson);
    });

    it('should update multiple fields', async () => {
      const updateData = {
        title: 'Updated Title',
        video_url: 'https://example.com/updated.mp4',
        content_md: '# Updated Content'
      };
      const mockLessonWithInstructor = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id
      };
      const updatedLesson = createMockLesson(updateData);

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockLessonWithInstructor]))
        .mockResolvedValueOnce(mockQueryResult([updatedLesson]));

      const result = await lessonsService.updateLesson(
        1,
        updateData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(updatedLesson);
    });

    it('should return current lesson when no fields to update', async () => {
      const mockLessonWithInstructor = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor1.id
      };

      (db.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([mockLessonWithInstructor]));

      const result = await lessonsService.updateLesson(
        1,
        {},
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(mockLessonWithInstructor);
    });

    it('should throw error if lesson not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      await expect(
        lessonsService.updateLesson(999, { title: 'Updated' }, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
    });

    it('should throw error if user lacks permission', async () => {
      const mockLessonWithInstructor = {
        ...createMockLesson(),
        instructor_id: mockUsers.instructor2.id
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockLessonWithInstructor]));

      await expect(
        lessonsService.updateLesson(1, { title: 'Updated' }, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to update this lesson' });
    });
  });

  describe('reorderLessons', () => {
    it('should reorder lessons successfully', async () => {
      const lessonIds = [3, 1, 2];
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id };
      const existingLessons = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];
      const reorderedLessons = [
        createMockLesson({ id: 3, position: 1 }),
        createMockLesson({ id: 1, position: 2 }),
        createMockLesson({ id: 2, position: 3 })
      ];

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult(existingLessons)) // Get current lessons
        .mockResolvedValueOnce(mockQueryResult([])) // Update position 1
        .mockResolvedValueOnce(mockQueryResult([])) // Update position 2
        .mockResolvedValueOnce(mockQueryResult([])) // Update position 3
        .mockResolvedValueOnce(mockQueryResult(reorderedLessons)) // Get reordered
        .mockResolvedValueOnce(mockQueryResult([])); // COMMIT

      const result = await lessonsService.reorderLessons(
        1,
        lessonIds,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(reorderedLessons);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if lesson count does not match', async () => {
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id };
      const existingLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const lessonIds = [1, 2]; // Missing lesson 3

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult(existingLessons)); // Get current lessons

      await expect(
        lessonsService.reorderLessons(1, lessonIds, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons'
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when missing lesson ID from reorder list', async () => {
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id };
      const existingLessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const lessonIds = [1, 2, 4]; // Has 4 instead of 3

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult(existingLessons)); // Get current lessons

      await expect(
        lessonsService.reorderLessons(1, lessonIds, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list'
      });
    });

    it('should throw error when extra lesson ID provided', async () => {
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id };
      const existingLessons = [{ id: 1 }, { id: 2 }];
      const lessonIds = [1, 2, 3]; // Has extra ID 3

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult(existingLessons)); // Get current lessons

      await expect(
        lessonsService.reorderLessons(1, lessonIds, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({
        status: 400,
        message: 'Invalid lesson IDs: count mismatch. Expected 2 lessons'
      });
    });

    it('should rollback transaction on error', async () => {
      const mockCourse = { id: 1, instructor_id: mockUsers.instructor1.id };
      const existingLessons = [{ id: 1 }, { id: 2 }];
      const lessonIds = [2, 1];

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockCourse])) // Course check
        .mockResolvedValueOnce(mockQueryResult(existingLessons)) // Get current lessons
        .mockRejectedValueOnce(new Error('Update failed')); // Update fails

      await expect(
        lessonsService.reorderLessons(1, lessonIds, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and compact positions', async () => {
      const mockLessonWithCourse = {
        ...createMockLesson({ position: 2, course_id: 1 }),
        instructor_id: mockUsers.instructor1.id
      };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockLessonWithCourse])) // Lesson check
        .mockResolvedValueOnce(mockQueryResult([])) // DELETE
        .mockResolvedValueOnce(mockQueryResult([])) // Compact positions
        .mockResolvedValueOnce(mockQueryResult([])); // COMMIT

      await lessonsService.deleteLesson(1, mockUsers.instructor1.id, mockUsers.instructor1.role);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM lessons WHERE id'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET position = position - 1'),
        [1, 2]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when lesson not found', async () => {
      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([])); // Lesson not found

      await expect(
        lessonsService.deleteLesson(999, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 404, message: 'Lesson not found' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if user lacks permission', async () => {
      const mockLessonWithCourse = {
        ...createMockLesson({ position: 2, course_id: 1 }),
        instructor_id: mockUsers.instructor2.id
      };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockLessonWithCourse])); // Lesson check

      await expect(
        lessonsService.deleteLesson(1, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toEqual({ status: 403, message: 'You do not have permission to delete this lesson' });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockLessonWithCourse = {
        ...createMockLesson({ position: 2, course_id: 1 }),
        instructor_id: mockUsers.instructor1.id
      };

      const mockClient = mockPoolClient();
      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      mockClient.query
        .mockResolvedValueOnce(mockQueryResult([])) // BEGIN
        .mockResolvedValueOnce(mockQueryResult([mockLessonWithCourse])) // Lesson check
        .mockRejectedValueOnce(new Error('Delete failed'));

      await expect(
        lessonsService.deleteLesson(1, mockUsers.instructor1.id, mockUsers.instructor1.role)
      ).rejects.toThrow('Delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should allow admin to modify any course lessons without DB query', async () => {
      const canModify = await lessonsService.canModifyCourseLessons(
        1,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(canModify).toBe(true);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify their own course lessons', async () => {
      const mockCourse = { instructor_id: mockUsers.instructor1.id };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const canModify = await lessonsService.canModifyCourseLessons(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(canModify).toBe(true);
    });

    it('should deny instructor from modifying another instructor course lessons', async () => {
      const mockCourse = { instructor_id: mockUsers.instructor1.id };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const canModify = await lessonsService.canModifyCourseLessons(
        1,
        mockUsers.instructor2.id,
        mockUsers.instructor2.role
      );

      expect(canModify).toBe(false);
    });

    it('should deny student from modifying course lessons', async () => {
      const mockCourse = { instructor_id: mockUsers.instructor1.id };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const canModify = await lessonsService.canModifyCourseLessons(
        1,
        mockUsers.student.id,
        mockUsers.student.role
      );

      expect(canModify).toBe(false);
    });

    it('should return false when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const canModify = await lessonsService.canModifyCourseLessons(
        999,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(canModify).toBe(false);
    });
  });
});
