import { LessonsService } from '../src/services/lessons.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('LessonsService', () => {
  let lessonsService: LessonsService;

  beforeEach(() => {
    jest.clearAllMocks();
    lessonsService = new LessonsService();
  });

  describe('CRUD Operations', () => {
    describe('createLesson', () => {
      it('should create a lesson for instructor who owns the course', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: [{ max_position: 0 }] })
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined);

        const result = await lessonsService.createLesson(
          {
            course_id: 1,
            title: 'Test Lesson',
            video_url: 'https://example.com/video',
            content_md: 'Test content'
          },
          10,
          'instructor'
        );

        expect(result).toEqual(mockLesson);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should create a lesson for admin regardless of course ownership', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Admin Lesson',
          video_url: null,
          content_md: 'Admin content',
          position: 1,
          created_at: new Date()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: [{ max_position: 0 }] })
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined);

        const result = await lessonsService.createLesson(
          {
            course_id: 1,
            title: 'Admin Lesson',
            content_md: 'Admin content'
          },
          5,
          'admin'
        );

        expect(result).toEqual(mockLesson);
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when course not found', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.createLesson(
            {
              course_id: 999,
              title: 'Test Lesson'
            },
            10,
            'instructor'
          )
        ).rejects.toEqual({ status: 404, message: 'Course not found' });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when instructor does not own the course', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.createLesson(
            {
              course_id: 1,
              title: 'Test Lesson'
            },
            20,
            'instructor'
          )
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to add lessons to this course'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should create lesson with custom position', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: null,
          content_md: null,
          position: 2,
          created_at: new Date()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined);

        const result = await lessonsService.createLesson(
          {
            course_id: 1,
            title: 'Test Lesson',
            position: 2
          },
          10,
          'instructor'
        );

        expect(result.position).toBe(2);
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
          [1, 2]
        );
      });
    });

    describe('getLessonById', () => {
      it('should get lesson by id for published course', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10,
          published: true
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        const result = await lessonsService.getLessonById(1);

        expect(result).not.toHaveProperty('instructor_id');
        expect(result).not.toHaveProperty('published');
        expect(result.title).toBe('Test Lesson');
      });

      it('should get lesson for instructor who owns the course', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10,
          published: false
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        const result = await lessonsService.getLessonById(1, 10, 'instructor');

        expect(result.title).toBe('Test Lesson');
      });

      it('should get lesson for admin regardless of published status', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10,
          published: false
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        const result = await lessonsService.getLessonById(1, 5, 'admin');

        expect(result.title).toBe('Test Lesson');
      });

      it('should throw error when lesson not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        await expect(
          lessonsService.getLessonById(999)
        ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
      });

      it('should throw error when user cannot view unpublished lesson', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10,
          published: false
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        await expect(
          lessonsService.getLessonById(1, 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to view this lesson'
        });
      });
    });

    describe('updateLesson', () => {
      it('should update lesson for instructor who owns the course', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Old Title',
          video_url: 'https://example.com/video',
          content_md: 'Old content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10
        };

        const updatedLesson = {
          ...mockLesson,
          title: 'Updated Title'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce({ rows: [updatedLesson] });

        const result = await lessonsService.updateLesson(
          1,
          { title: 'Updated Title' },
          10,
          'instructor'
        );

        expect(result.title).toBe('Updated Title');
      });

      it('should update lesson for admin regardless of ownership', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Old Title',
          video_url: 'https://example.com/video',
          content_md: 'Old content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10
        };

        const updatedLesson = {
          ...mockLesson,
          title: 'Admin Updated'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce({ rows: [updatedLesson] });

        const result = await lessonsService.updateLesson(
          1,
          { title: 'Admin Updated' },
          5,
          'admin'
        );

        expect(result.title).toBe('Admin Updated');
      });

      it('should throw error when lesson not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        await expect(
          lessonsService.updateLesson(999, { title: 'Updated' }, 10, 'instructor')
        ).rejects.toEqual({ status: 404, message: 'Lesson not found' });
      });

      it('should throw error when instructor does not own the course', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        await expect(
          lessonsService.updateLesson(1, { title: 'Updated' }, 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to update this lesson'
        });
      });

      it('should update multiple fields', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Old Title',
          video_url: 'https://example.com/old',
          content_md: 'Old content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10
        };

        const updatedLesson = {
          ...mockLesson,
          title: 'New Title',
          video_url: 'https://example.com/new',
          content_md: 'New content'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce({ rows: [updatedLesson] });

        const result = await lessonsService.updateLesson(
          1,
          {
            title: 'New Title',
            video_url: 'https://example.com/new',
            content_md: 'New content'
          },
          10,
          'instructor'
        );

        expect(result.title).toBe('New Title');
        expect(result.video_url).toBe('https://example.com/new');
        expect(result.content_md).toBe('New content');
      });

      it('should return lesson unchanged when no updates provided', async () => {
        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 1,
          created_at: new Date(),
          instructor_id: 10
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockLesson] });

        const result = await lessonsService.updateLesson(1, {}, 10, 'instructor');

        expect(result).toEqual(mockLesson);
      });
    });

    describe('deleteLesson', () => {
      it('should delete lesson and re-compact positions', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          video_url: 'https://example.com/video',
          content_md: 'Test content',
          position: 2,
          created_at: new Date(),
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined);

        await lessonsService.deleteLesson(1, 10, 'instructor');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM lessons WHERE id = $1', [1]);
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
          [1, 2]
        );
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when lesson not found', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.deleteLesson(999, 10, 'instructor')
        ).rejects.toEqual({ status: 404, message: 'Lesson not found' });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when instructor does not own the course', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockLesson = {
          id: 1,
          course_id: 1,
          title: 'Test Lesson',
          position: 1,
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.deleteLesson(1, 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to delete this lesson'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  describe('Visibility Logic', () => {
    describe('listLessons', () => {
      it('should list lessons for published course without authentication', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: true
        };

        const mockLessons = [
          {
            id: 1,
            course_id: 1,
            title: 'Lesson 1',
            video_url: 'https://example.com/video1',
            content_md: 'Content 1',
            position: 1,
            created_at: new Date()
          },
          {
            id: 2,
            course_id: 1,
            title: 'Lesson 2',
            video_url: 'https://example.com/video2',
            content_md: 'Content 2',
            position: 2,
            created_at: new Date()
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: mockLessons });

        const result = await lessonsService.listLessons(1);

        expect(result).toHaveLength(2);
        expect(result[0].position).toBe(1);
        expect(result[1].position).toBe(2);
      });

      it('should list lessons for instructor who owns unpublished course', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        const mockLessons = [
          {
            id: 1,
            course_id: 1,
            title: 'Lesson 1',
            video_url: null,
            content_md: 'Content 1',
            position: 1,
            created_at: new Date()
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: mockLessons });

        const result = await lessonsService.listLessons(1, 10, 'instructor');

        expect(result).toHaveLength(1);
      });

      it('should list lessons for admin regardless of published status', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        const mockLessons = [
          {
            id: 1,
            course_id: 1,
            title: 'Lesson 1',
            video_url: null,
            content_md: 'Content 1',
            position: 1,
            created_at: new Date()
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: mockLessons });

        const result = await lessonsService.listLessons(1, 5, 'admin');

        expect(result).toHaveLength(1);
      });

      it('should throw error when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        await expect(
          lessonsService.listLessons(999)
        ).rejects.toEqual({ status: 404, message: 'Course not found' });
      });

      it('should throw error when user cannot view unpublished course', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: false
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        await expect(
          lessonsService.listLessons(1, 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to view lessons for this course'
        });
      });

      it('should return lessons ordered by position', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10,
          published: true
        };

        const mockLessons = [
          { id: 3, course_id: 1, title: 'Lesson 3', position: 3, created_at: new Date() },
          { id: 1, course_id: 1, title: 'Lesson 1', position: 1, created_at: new Date() },
          { id: 2, course_id: 1, title: 'Lesson 2', position: 2, created_at: new Date() }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: mockLessons });

        const result = await lessonsService.listLessons(1);

        expect(db.query).toHaveBeenCalledWith(
          'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
          [1]
        );
      });
    });
  });

  describe('Lesson Ordering and Reordering', () => {
    describe('reorderLessons', () => {
      it('should reorder lessons atomically', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        const currentLessons = [
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ];

        const reorderedLessons = [
          { id: 3, course_id: 1, title: 'Lesson 3', position: 1, created_at: new Date() },
          { id: 1, course_id: 1, title: 'Lesson 1', position: 2, created_at: new Date() },
          { id: 2, course_id: 1, title: 'Lesson 2', position: 3, created_at: new Date() }
        ];

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: currentLessons })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: reorderedLessons })
          .mockResolvedValueOnce(undefined);

        const result = await lessonsService.reorderLessons(1, [3, 1, 2], 10, 'instructor');

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe(3);
        expect(result[1].id).toBe(1);
        expect(result[2].id).toBe(2);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when course not found', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.reorderLessons(999, [1, 2], 10, 'instructor')
        ).rejects.toEqual({ status: 404, message: 'Course not found' });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when instructor does not own the course', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.reorderLessons(1, [1, 2], 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to reorder lessons for this course'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when lesson count mismatch', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        const currentLessons = [
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ];

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: currentLessons })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.reorderLessons(1, [1, 2], 10, 'instructor')
        ).rejects.toEqual({
          status: 400,
          message: 'Invalid lesson IDs: count mismatch. Expected 3 lessons'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when lesson ID is missing', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        const currentLessons = [
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ];

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: currentLessons })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.reorderLessons(1, [1, 2, 4], 10, 'instructor')
        ).rejects.toEqual({
          status: 400,
          message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error when lesson ID does not belong to course', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        const currentLessons = [
          { id: 1 },
          { id: 2 },
          { id: 3 }
        ];

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: currentLessons })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.reorderLessons(1, [1, 2, 99], 10, 'instructor')
        ).rejects.toEqual({
          status: 400,
          message: 'Invalid lesson IDs: lesson 3 is missing from the reorder list'
        });

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should allow admin to reorder lessons regardless of ownership', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        const currentLessons = [
          { id: 1 },
          { id: 2 }
        ];

        const reorderedLessons = [
          { id: 2, course_id: 1, title: 'Lesson 2', position: 1, created_at: new Date() },
          { id: 1, course_id: 1, title: 'Lesson 1', position: 2, created_at: new Date() }
        ];

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: currentLessons })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: reorderedLessons })
          .mockResolvedValueOnce(undefined);

        const result = await lessonsService.reorderLessons(1, [2, 1], 5, 'admin');

        expect(result).toHaveLength(2);
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('canModifyCourseLessons', () => {
      it('should allow admin to modify any course lessons', async () => {
        const result = await lessonsService.canModifyCourseLessons(1, 5, 'admin');

        expect(result).toBe(true);
        expect(db.query).not.toHaveBeenCalled();
      });

      it('should allow instructor to modify their own course lessons', async () => {
        (db.query as jest.Mock).mockResolvedValue({
          rows: [{ instructor_id: 10 }]
        });

        const result = await lessonsService.canModifyCourseLessons(1, 10, 'instructor');

        expect(result).toBe(true);
      });

      it('should deny instructor from modifying another instructor course lessons', async () => {
        (db.query as jest.Mock).mockResolvedValue({
          rows: [{ instructor_id: 10 }]
        });

        const result = await lessonsService.canModifyCourseLessons(1, 20, 'instructor');

        expect(result).toBe(false);
      });

      it('should return false when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await lessonsService.canModifyCourseLessons(999, 10, 'instructor');

        expect(result).toBe(false);
      });
    });
  });
});
