import { CoursesService } from '../src/services/courses.service';
import { LessonsService, lessonsService } from '../src/services/lessons.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('Courses and Lessons Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Nested Route Operations', () => {
    describe('Course with Lessons Lifecycle', () => {
      it('should create course and add multiple lessons', async () => {
        const mockCourse = {
          id: 1,
          title: 'Full Stack Course',
          description: 'Complete course',
          price_cents: 4999,
          published: false,
          instructor_id: 10,
          created_at: new Date()
        };

        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });
        (db.getClient as jest.Mock).mockResolvedValue(mockClient);

        const course = await CoursesService.createCourse(
          {
            title: 'Full Stack Course',
            description: 'Complete course',
            price_cents: 4999
          },
          10,
          'instructor'
        );

        expect(course.id).toBe(1);

        const mockLesson1 = {
          id: 1,
          course_id: 1,
          title: 'Introduction',
          video_url: 'https://example.com/intro',
          content_md: 'Intro content',
          position: 1,
          created_at: new Date()
        };

        const mockLesson2 = {
          id: 2,
          course_id: 1,
          title: 'Advanced Topics',
          video_url: 'https://example.com/advanced',
          content_md: 'Advanced content',
          position: 2,
          created_at: new Date()
        };

        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 10, published: false }] })
          .mockResolvedValueOnce({ rows: [{ max_position: 0 }] })
          .mockResolvedValueOnce({ rows: [mockLesson1] })
          .mockResolvedValueOnce(undefined);

        const lesson1 = await lessonsService.createLesson(
          {
            course_id: 1,
            title: 'Introduction',
            video_url: 'https://example.com/intro',
            content_md: 'Intro content'
          },
          10,
          'instructor'
        );

        expect(lesson1.position).toBe(1);

        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 10, published: false }] })
          .mockResolvedValueOnce({ rows: [{ max_position: 1 }] })
          .mockResolvedValueOnce({ rows: [mockLesson2] })
          .mockResolvedValueOnce(undefined);

        const lesson2 = await lessonsService.createLesson(
          {
            course_id: 1,
            title: 'Advanced Topics',
            video_url: 'https://example.com/advanced',
            content_md: 'Advanced content'
          },
          10,
          'instructor'
        );

        expect(lesson2.position).toBe(2);
      });

      it('should publish course and make lessons visible', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          published: false,
          instructor_id: 10,
          created_at: new Date()
        };

        const mockPublishedCourse = {
          ...mockCourse,
          published: true
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: [mockPublishedCourse] });

        const course = await CoursesService.getCourseById(1);
        expect(course?.published).toBe(false);

        const publishedCourse = await CoursesService.togglePublished(1, true);
        expect(publishedCourse?.published).toBe(true);

        const mockLessons = [
          { id: 1, course_id: 1, title: 'Lesson 1', position: 1, created_at: new Date() },
          { id: 2, course_id: 1, title: 'Lesson 2', position: 2, created_at: new Date() }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 10, published: true }] })
          .mockResolvedValueOnce({ rows: mockLessons });

        const lessons = await lessonsService.listLessons(1);
        expect(lessons).toHaveLength(2);
      });

      it('should enforce visibility rules for unpublished courses', async () => {
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

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockCourse] })
          .mockResolvedValueOnce({ rows: [] });

        const lessons = await lessonsService.listLessons(1, 10, 'instructor');
        expect(lessons).toBeDefined();
      });
    });

    describe('Nested CRUD Operations', () => {
      it('should update lesson within course context', async () => {
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
          video_url: 'https://example.com/new'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce({ rows: [updatedLesson] });

        const result = await lessonsService.updateLesson(
          1,
          { title: 'New Title', video_url: 'https://example.com/new' },
          10,
          'instructor'
        );

        expect(result.title).toBe('New Title');
        expect(result.video_url).toBe('https://example.com/new');
      });

      it('should delete lesson and maintain course integrity', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockLesson = {
          id: 2,
          course_id: 1,
          title: 'Lesson to Delete',
          position: 2,
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined);

        await lessonsService.deleteLesson(2, 10, 'instructor');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM lessons WHERE id = $1', [2]);
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
          [1, 2]
        );
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('Course Filtering with Lesson Context', () => {
      it('should filter courses by instructor and list their lessons', async () => {
        const mockCourses = [
          {
            id: 1,
            title: 'Course 1',
            instructor_id: 10,
            published: true,
            created_at: new Date(),
            instructor_name: 'John Doe'
          },
          {
            id: 2,
            title: 'Course 2',
            instructor_id: 10,
            published: false,
            created_at: new Date(),
            instructor_name: 'John Doe'
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          .mockResolvedValueOnce({ rows: mockCourses });

        const result = await CoursesService.listCourses({ instructor_id: 10 });

        expect(result.courses).toHaveLength(2);
        expect(result.courses[0].instructor_id).toBe(10);
        expect(result.courses[1].instructor_id).toBe(10);

        const mockLessons1 = [
          { id: 1, course_id: 1, title: 'Lesson 1-1', position: 1, created_at: new Date() },
          { id: 2, course_id: 1, title: 'Lesson 1-2', position: 2, created_at: new Date() }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 10, published: true }] })
          .mockResolvedValueOnce({ rows: mockLessons1 });

        const lessons1 = await lessonsService.listLessons(1, 10, 'instructor');
        expect(lessons1).toHaveLength(2);
      });
    });
  });

  describe('Atomic Operations', () => {
    describe('Lesson Reordering Atomicity', () => {
      it('should reorder lessons atomically with transaction', async () => {
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
        expect(result[0].position).toBe(1);
        expect(result[1].id).toBe(1);
        expect(result[1].position).toBe(2);
        expect(result[2].id).toBe(2);
        expect(result[2].position).toBe(3);

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should rollback reorder on validation error', async () => {
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

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should rollback reorder on missing lesson ID', async () => {
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

      it('should rollback reorder on invalid lesson ID', async () => {
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
    });

    describe('Lesson Creation with Position Shifting', () => {
      it('should atomically insert lesson at specific position', async () => {
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
          id: 4,
          course_id: 1,
          title: 'New Lesson',
          video_url: null,
          content_md: 'New content',
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
            title: 'New Lesson',
            content_md: 'New content',
            position: 2
          },
          10,
          'instructor'
        );

        expect(result.position).toBe(2);
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
          [1, 2]
        );
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should rollback lesson creation on error', async () => {
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
              title: 'New Lesson'
            },
            10,
            'instructor'
          )
        ).rejects.toEqual({ status: 404, message: 'Course not found' });

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('Lesson Deletion with Position Compaction', () => {
      it('should atomically delete lesson and compact positions', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockLesson = {
          id: 2,
          course_id: 1,
          title: 'Lesson to Delete',
          position: 2,
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined);

        await lessonsService.deleteLesson(2, 10, 'instructor');

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM lessons WHERE id = $1', [2]);
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
          [1, 2]
        );
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should rollback deletion on permission error', async () => {
        const mockClient = {
          query: jest.fn(),
          release: jest.fn()
        };

        const mockLesson = {
          id: 2,
          course_id: 1,
          title: 'Lesson',
          position: 2,
          instructor_id: 10
        };

        (db.getClient as jest.Mock).mockResolvedValue(mockClient);
        mockClient.query
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [mockLesson] })
          .mockResolvedValueOnce(undefined);

        await expect(
          lessonsService.deleteLesson(2, 20, 'instructor')
        ).rejects.toEqual({
          status: 403,
          message: 'You do not have permission to delete this lesson'
        });

        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  describe('Role-Based Access Control Integration', () => {
    it('should enforce instructor ownership across course and lesson operations', async () => {
      const mockCourse = {
        id: 1,
        title: 'Instructor Course',
        instructor_id: 10,
        published: false,
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

      const canModify = await CoursesService.canModifyCourse(1, 10, 'instructor');
      expect(canModify).toBe(true);

      const cannotModify = await CoursesService.canModifyCourse(1, 20, 'instructor');
      expect(cannotModify).toBe(false);

      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ instructor_id: 10 }]
      });

      const canModifyLessons = await lessonsService.canModifyCourseLessons(1, 10, 'instructor');
      expect(canModifyLessons).toBe(true);

      const cannotModifyLessons = await lessonsService.canModifyCourseLessons(1, 20, 'instructor');
      expect(cannotModifyLessons).toBe(false);
    });

    it('should allow admin full access to all courses and lessons', async () => {
      const canModifyCourse = await CoursesService.canModifyCourse(1, 5, 'admin');
      expect(canModifyCourse).toBe(true);

      const canModifyLessons = await lessonsService.canModifyCourseLessons(1, 5, 'admin');
      expect(canModifyLessons).toBe(true);
    });

    it('should deny student access to modify courses and lessons', async () => {
      const canModifyCourse = await CoursesService.canModifyCourse(1, 30, 'student');
      expect(canModifyCourse).toBe(false);
    });
  });

  describe('Course Overview with Lessons Statistics', () => {
    it('should get comprehensive course overview including lesson count', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 10,
        created_at: new Date(),
        instructor_name: 'John Doe'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockCourse] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: [{ active: '10', completed: '3' }] })
        .mockResolvedValueOnce({ rows: [{ average_progress: '65.5' }] })
        .mockResolvedValueOnce({ rows: [{ total_quizzes: '2', total_questions: '10' }] })
        .mockResolvedValueOnce({ rows: [{ total: '3' }] });

      const overview = await CoursesService.getCourseOverview(1);

      expect(overview).toBeDefined();
      expect(overview?.totalLessons).toBe(5);
      expect(overview?.enrollments.active).toBe(10);
      expect(overview?.enrollments.completed).toBe(3);
      expect(overview?.averageProgress).toBe(66);
    });
  });
});
