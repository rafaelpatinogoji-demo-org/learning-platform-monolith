jest.mock('../../src/db');

import { mockDb, mockQueryResult, mockClient } from '../mocks/db.mock';
import { lessonsService } from '../../src/services/lessons.service';

describe('LessonsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getClient.mockResolvedValue(mockClient);
    (mockClient.query as jest.Mock).mockClear();
    (mockClient.release as jest.Mock).mockClear();
  });

  describe('createLesson', () => {
    const mockUser = { id: 1, role: 'instructor' };
    const lessonData = {
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://example.com/video.mp4',
      content_md: '# Test Content',
      position: 1
    };

    it('should create lesson successfully with transaction', async () => {
      const mockLesson = {
        id: 1,
        course_id: 1,
        title: 'Test Lesson',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Test Content',
        position: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([mockLesson]));

      const result = await lessonsService.createLesson(lessonData, mockUser.id, mockUser.role);

      expect(mockDb.getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT instructor_id FROM courses'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lessons'),
        expect.arrayContaining([1, 'Test Lesson', 'https://example.com/video.mp4', '# Test Content', 1])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockLesson);
    });

    it('should auto-assign position when not provided', async () => {
      const lessonDataWithoutPosition: any = { ...lessonData };
      delete lessonDataWithoutPosition.position;

      const mockLesson = { ...lessonData, id: 1, position: 3 };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([{ max_position: 2 }]))
        .mockResolvedValueOnce(mockQueryResult([mockLesson]));

      const result = await lessonsService.createLesson(lessonDataWithoutPosition, mockUser.id, mockUser.role);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(MAX(position), 0)'),
        [1]
      );
      expect(result.position).toBe(3);
    });

    it('should allow admin to create lesson for any course', async () => {
      const adminUser = { id: 2, role: 'admin' };
      const mockLesson = { ...lessonData, id: 1 };

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 3 }]))
        .mockResolvedValueOnce(mockQueryResult([mockLesson]));

      const result = await lessonsService.createLesson(lessonData, adminUser.id, adminUser.role);

      expect(result).toEqual(mockLesson);
    });

    it('should throw error when course not found', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([]));

      await expect(
        lessonsService.createLesson(lessonData, mockUser.id, mockUser.role)
      ).rejects.toThrow('Course not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when instructor tries to create lesson for other instructor course', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]));

      await expect(
        lessonsService.createLesson(lessonData, mockUser.id, mockUser.role)
      ).rejects.toThrow('You can only create lessons for your own courses');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for student role', async () => {
      const studentUser = { id: 3, role: 'student' };

      await expect(
        lessonsService.createLesson(lessonData, studentUser.id, studentUser.role)
      ).rejects.toThrow('Only instructors and admins can create lessons');
    });

    it('should handle database errors with rollback', async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        lessonsService.createLesson(lessonData, mockUser.id, mockUser.role)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listLessons', () => {
    const mockLessons = [
      {
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
        video_url: 'https://example.com/video1.mp4',
        content_md: '# Lesson 1 Content',
        position: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        course_id: 1,
        title: 'Lesson 2',
        video_url: 'https://example.com/video2.mp4',
        content_md: '# Lesson 2 Content',
        position: 2,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should list lessons for published course (public access)', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ is_published: true, instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT is_published, instructor_id FROM courses'),
        [1]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM lessons WHERE course_id = $1 ORDER BY position'),
        [1]
      );
      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for instructor own course (unpublished)', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ is_published: false, instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(1, 1, 'instructor');

      expect(result).toEqual(mockLessons);
    });

    it('should list lessons for admin (any course)', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ is_published: false, instructor_id: 2 }]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      const result = await lessonsService.listLessons(1, 1, 'admin');

      expect(result).toEqual(mockLessons);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      await expect(lessonsService.listLessons(999)).rejects.toThrow('Course not found');
    });

    it('should throw error when student tries to access unpublished course', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([{ is_published: false, instructor_id: 2 }]));

      await expect(lessonsService.listLessons(1, 1, 'student')).rejects.toThrow('Course not published');
    });

    it('should throw error when instructor tries to access other instructor unpublished course', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([{ is_published: false, instructor_id: 2 }]));

      await expect(lessonsService.listLessons(1, 1, 'instructor')).rejects.toThrow('You can only view lessons for your own courses');
    });
  });

  describe('getLessonById', () => {
    const mockLesson = {
      id: 1,
      course_id: 1,
      title: 'Test Lesson',
      video_url: 'https://example.com/video.mp4',
      content_md: '# Test Content',
      position: 1,
      created_at: new Date(),
      updated_at: new Date(),
      is_published: true,
      instructor_id: 1
    };

    it('should get lesson for published course (public access)', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockLesson]));

      const result = await lessonsService.getLessonById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN courses'),
        [1]
      );
      expect(result).toEqual(mockLesson);
    });

    it('should get lesson for instructor own course', async () => {
      const unpublishedLesson = { ...mockLesson, is_published: false };
      mockDb.query.mockResolvedValueOnce(mockQueryResult([unpublishedLesson]));

      const result = await lessonsService.getLessonById(1, 1, 'instructor');

      expect(result).toEqual(unpublishedLesson);
    });

    it('should get lesson for admin', async () => {
      const unpublishedLesson = { ...mockLesson, is_published: false, instructor_id: 2 };
      mockDb.query.mockResolvedValueOnce(mockQueryResult([unpublishedLesson]));

      const result = await lessonsService.getLessonById(1, 1, 'admin');

      expect(result).toEqual(unpublishedLesson);
    });

    it('should throw error when lesson not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      await expect(lessonsService.getLessonById(999)).rejects.toThrow('Lesson not found');
    });

    it('should throw error when student tries to access unpublished lesson', async () => {
      const unpublishedLesson = { ...mockLesson, is_published: false };
      mockDb.query.mockResolvedValueOnce(mockQueryResult([unpublishedLesson]));

      await expect(lessonsService.getLessonById(1, 1, 'student')).rejects.toThrow('Lesson not accessible');
    });
  });

  describe('updateLesson', () => {
    const updateData = {
      title: 'Updated Lesson',
      video_url: 'https://example.com/updated-video.mp4',
      content_md: '# Updated Content'
    };

    it('should update lesson successfully', async () => {
      const mockUpdatedLesson = {
        id: 1,
        course_id: 1,
        title: 'Updated Lesson',
        video_url: 'https://example.com/updated-video.mp4',
        content_md: '# Updated Content',
        position: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([mockUpdatedLesson]));

      const result = await lessonsService.updateLesson(1, updateData, 1, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.instructor_id FROM lessons l'),
        [1]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET'),
        expect.arrayContaining(['Updated Lesson', 'https://example.com/updated-video.mp4', '# Updated Content', 1])
      );
      expect(result).toEqual(mockUpdatedLesson);
    });

    it('should allow admin to update any lesson', async () => {
      const mockUpdatedLesson = { id: 1, ...updateData };
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(mockQueryResult([mockUpdatedLesson]));

      const result = await lessonsService.updateLesson(1, updateData, 1, 'admin');

      expect(result).toEqual(mockUpdatedLesson);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { title: 'New Title Only' };
      const mockUpdatedLesson = {
        id: 1,
        title: 'New Title Only',
        video_url: 'https://example.com/original-video.mp4',
        content_md: '# Original Content'
      };

      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([mockUpdatedLesson]));

      const result = await lessonsService.updateLesson(1, partialUpdate, 1, 'instructor');

      expect(result.title).toBe('New Title Only');
    });

    it('should throw error when lesson not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      await expect(
        lessonsService.updateLesson(999, updateData, 1, 'instructor')
      ).rejects.toThrow('Lesson not found');
    });

    it('should throw error when instructor tries to update other instructor lesson', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]));

      await expect(
        lessonsService.updateLesson(1, updateData, 1, 'instructor')
      ).rejects.toThrow('You can only update lessons for your own courses');
    });

    it('should throw error for student role', async () => {
      await expect(
        lessonsService.updateLesson(1, updateData, 1, 'student')
      ).rejects.toThrow('Only instructors and admins can update lessons');
    });
  });

  describe('reorderLessons', () => {
    const lessonIds = [3, 1, 2];

    it('should reorder lessons successfully with transaction', async () => {
      const mockReorderedLessons = [
        { id: 3, position: 1, title: 'Lesson 3' },
        { id: 1, position: 2, title: 'Lesson 1' },
        { id: 2, position: 3, title: 'Lesson 2' }
      ];

      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '3' }]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult(mockReorderedLessons));

      const result = await lessonsService.reorderLessons(1, lessonIds, 1, 'instructor');

      expect(mockDb.getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT instructor_id FROM courses'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM lessons'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockReorderedLessons);
    });

    it('should allow admin to reorder any course lessons', async () => {
      const mockReorderedLessons = [{ id: 1, position: 1 }];
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '3' }]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult(mockReorderedLessons));

      const result = await lessonsService.reorderLessons(1, lessonIds, 1, 'admin');

      expect(result).toEqual(mockReorderedLessons);
    });

    it('should throw error when course not found', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([]));

      await expect(
        lessonsService.reorderLessons(999, lessonIds, 1, 'instructor')
      ).rejects.toThrow('Course not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when lesson count mismatch', async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '5' }]));

      await expect(
        lessonsService.reorderLessons(1, lessonIds, 1, 'instructor')
      ).rejects.toThrow('Lesson count mismatch');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when instructor tries to reorder other instructor lessons', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]));

      await expect(
        lessonsService.reorderLessons(1, lessonIds, 1, 'instructor')
      ).rejects.toThrow('You can only reorder lessons for your own courses');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for student role', async () => {
      await expect(
        lessonsService.reorderLessons(1, lessonIds, 1, 'student')
      ).rejects.toThrow('Only instructors and admins can reorder lessons');
    });
  });

  describe('deleteLesson', () => {
    it('should delete lesson and recompact positions with transaction', async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1, course_id: 1, position: 2 }]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]));

      await lessonsService.deleteLesson(1, 1, 'instructor');

      expect(mockDb.getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.instructor_id, l.course_id, l.position FROM lessons l'),
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM lessons WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lessons SET position = position - 1'),
        [1, 2]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow admin to delete any lesson', async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2, course_id: 1, position: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]));

      await lessonsService.deleteLesson(1, 1, 'admin');

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error when lesson not found', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([]));

      await expect(
        lessonsService.deleteLesson(999, 1, 'instructor')
      ).rejects.toThrow('Lesson not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when instructor tries to delete other instructor lesson', async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2, course_id: 1, position: 1 }]));

      await expect(
        lessonsService.deleteLesson(1, 1, 'instructor')
      ).rejects.toThrow('You can only delete lessons for your own courses');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for student role', async () => {
      await expect(
        lessonsService.deleteLesson(1, 1, 'student')
      ).rejects.toThrow('Only instructors and admins can delete lessons');
    });
  });

  describe('canModifyCourseLessons', () => {
    it('should allow admin to modify any course lessons', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 1, 'admin');
      expect(result).toBe(true);
    });

    it('should allow instructor to modify their own course lessons', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]));

      const result = await lessonsService.canModifyCourseLessons(1, 1, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should not allow instructor to modify other instructor course lessons', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([{ instructor_id: 2 }]));

      const result = await lessonsService.canModifyCourseLessons(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should not allow student to modify any course lessons', async () => {
      const result = await lessonsService.canModifyCourseLessons(1, 1, 'student');
      expect(result).toBe(false);
    });

    it('should return false when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      const result = await lessonsService.canModifyCourseLessons(999, 1, 'instructor');

      expect(result).toBe(false);
    });
  });
});
