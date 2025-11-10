import { CoursesService } from '../src/services/courses.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createCourse', () => {
      it('should create a course for an instructor', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: false,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.createCourse(
          {
            title: 'Test Course',
            description: 'Test Description',
            price_cents: 1999
          },
          10,
          'instructor'
        );

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO courses'),
          ['Test Course', 'Test Description', 1999, 10]
        );
      });

      it('should create a course for an admin with specified instructor_id', async () => {
        const mockCourse = {
          id: 1,
          title: 'Admin Course',
          description: 'Admin Description',
          price_cents: 2999,
          published: false,
          instructor_id: 5,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.createCourse(
          {
            title: 'Admin Course',
            description: 'Admin Description',
            price_cents: 2999,
            instructor_id: 5
          },
          1,
          'admin'
        );

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO courses'),
          ['Admin Course', 'Admin Description', 2999, 5]
        );
      });

      it('should use admin id as instructor when admin does not specify instructor_id', async () => {
        const mockCourse = {
          id: 1,
          title: 'Admin Course',
          description: 'Admin Description',
          price_cents: 2999,
          published: false,
          instructor_id: 1,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.createCourse(
          {
            title: 'Admin Course',
            description: 'Admin Description',
            price_cents: 2999
          },
          1,
          'admin'
        );

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO courses'),
          ['Admin Course', 'Admin Description', 2999, 1]
        );
      });

      it('should throw error when student tries to create course', async () => {
        await expect(
          CoursesService.createCourse(
            {
              title: 'Student Course',
              description: 'Student Description',
              price_cents: 1999
            },
            20,
            'student'
          )
        ).rejects.toThrow('Insufficient permissions to create course');
      });

      it('should ignore instructor_id when instructor creates course', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: false,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        await CoursesService.createCourse(
          {
            title: 'Test Course',
            description: 'Test Description',
            price_cents: 1999,
            instructor_id: 99
          },
          10,
          'instructor'
        );

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO courses'),
          ['Test Course', 'Test Description', 1999, 10]
        );
      });
    });

    describe('getCourseById', () => {
      it('should get course by id without instructor info', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.getCourseById(1, false);

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT c.id'),
          [1]
        );
      });

      it('should get course by id with instructor info', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 10,
          created_at: new Date(),
          instructor_name: 'John Doe'
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.getCourseById(1, true);

        expect(result).toHaveProperty('instructor');
        expect(result?.instructor).toEqual({
          id: 10,
          name: 'John Doe'
        });
        expect(result).not.toHaveProperty('instructor_name');
      });

      it('should return null when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await CoursesService.getCourseById(999, false);

        expect(result).toBeNull();
      });
    });

    describe('updateCourse', () => {
      it('should update course title', async () => {
        const mockCourse = {
          id: 1,
          title: 'Updated Title',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.updateCourse(1, { title: 'Updated Title' });

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE courses'),
          ['Updated Title', 1]
        );
      });

      it('should update multiple fields', async () => {
        const mockCourse = {
          id: 1,
          title: 'Updated Title',
          description: 'Updated Description',
          price_cents: 2999,
          published: true,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.updateCourse(1, {
          title: 'Updated Title',
          description: 'Updated Description',
          price_cents: 2999
        });

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE courses'),
          ['Updated Title', 'Updated Description', 2999, 1]
        );
      });

      it('should return current course when no updates provided', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.updateCourse(1, {});

        expect(result).toEqual(mockCourse);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT c.id'),
          [1]
        );
      });

      it('should return null when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await CoursesService.updateCourse(999, { title: 'Updated' });

        expect(result).toBeNull();
      });
    });

    describe('deleteCourse', () => {
      it('should delete course successfully', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

        const result = await CoursesService.deleteCourse(1);

        expect(result).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
          'DELETE FROM courses WHERE id = $1',
          [1]
        );
      });

      it('should return false when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

        const result = await CoursesService.deleteCourse(999);

        expect(result).toBe(false);
      });
    });
  });

  describe('Publish/Unpublish Workflow', () => {
    describe('togglePublished', () => {
      it('should publish a course', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.togglePublished(1, true);

        expect(result).toEqual(mockCourse);
        expect(result?.published).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE courses'),
          [true, 1]
        );
      });

      it('should unpublish a course', async () => {
        const mockCourse = {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: false,
          instructor_id: 10,
          created_at: new Date()
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.togglePublished(1, false);

        expect(result).toEqual(mockCourse);
        expect(result?.published).toBe(false);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE courses'),
          [false, 1]
        );
      });

      it('should return null when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await CoursesService.togglePublished(999, true);

        expect(result).toBeNull();
      });
    });
  });

  describe('Role-Based Ownership Checks', () => {
    describe('canModifyCourse', () => {
      it('should allow admin to modify any course', async () => {
        const result = await CoursesService.canModifyCourse(1, 5, 'admin');

        expect(result).toBe(true);
        expect(db.query).not.toHaveBeenCalled();
      });

      it('should allow instructor to modify their own course', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.canModifyCourse(1, 10, 'instructor');

        expect(result).toBe(true);
      });

      it('should deny instructor from modifying another instructor course', async () => {
        const mockCourse = {
          id: 1,
          instructor_id: 10
        };

        (db.query as jest.Mock).mockResolvedValue({ rows: [mockCourse] });

        const result = await CoursesService.canModifyCourse(1, 20, 'instructor');

        expect(result).toBe(false);
      });

      it('should deny student from modifying any course', async () => {
        const result = await CoursesService.canModifyCourse(1, 30, 'student');

        expect(result).toBe(false);
        expect(db.query).not.toHaveBeenCalled();
      });

      it('should return false when course not found', async () => {
        (db.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await CoursesService.canModifyCourse(999, 10, 'instructor');

        expect(result).toBe(false);
      });
    });
  });

  describe('Pagination and Filtering', () => {
    describe('listCourses', () => {
      it('should list courses with default pagination', async () => {
        const mockCourses = [
          {
            id: 1,
            title: 'Course 1',
            description: 'Description 1',
            price_cents: 1999,
            published: true,
            instructor_id: 10,
            created_at: new Date(),
            instructor_name: 'John Doe'
          },
          {
            id: 2,
            title: 'Course 2',
            description: 'Description 2',
            price_cents: 2999,
            published: true,
            instructor_id: 10,
            created_at: new Date(),
            instructor_name: 'John Doe'
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '2' }] })
          .mockResolvedValueOnce({ rows: mockCourses });

        const result = await CoursesService.listCourses();

        expect(result.courses).toHaveLength(2);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        });
      });

      it('should filter by published_only', async () => {
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        await CoursesService.listCourses({ published_only: true });

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE c.published = true'),
          [10, 0]
        );
      });

      it('should filter by instructor_id', async () => {
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        await CoursesService.listCourses({ instructor_id: 10 });

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE c.instructor_id = $1'),
          [10, 10, 0]
        );
      });

      it('should filter by search query', async () => {
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        await CoursesService.listCourses({ search: 'JavaScript' });

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('ILIKE'),
          ['%JavaScript%', 10, 0]
        );
      });

      it('should combine multiple filters', async () => {
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: [] });

        await CoursesService.listCourses({
          published_only: true,
          instructor_id: 10,
          search: 'JavaScript'
        });

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE c.published = true AND c.instructor_id = $1'),
          [10, '%JavaScript%', 10, 0]
        );
      });

      it('should handle custom pagination', async () => {
        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '50' }] })
          .mockResolvedValueOnce({ rows: [] });

        const result = await CoursesService.listCourses({ page: 2, limit: 20 });

        expect(result.pagination).toEqual({
          page: 2,
          limit: 20,
          total: 50,
          totalPages: 3
        });
        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          [20, 20]
        );
      });

      it('should include instructor info in course list', async () => {
        const mockCourses = [
          {
            id: 1,
            title: 'Course 1',
            description: 'Description 1',
            price_cents: 1999,
            published: true,
            instructor_id: 10,
            created_at: new Date(),
            instructor_name: 'John Doe'
          }
        ];

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [{ total: '1' }] })
          .mockResolvedValueOnce({ rows: mockCourses });

        const result = await CoursesService.listCourses();

        expect(result.courses[0]).toHaveProperty('instructor');
        expect(result.courses[0].instructor).toEqual({
          id: 10,
          name: 'John Doe'
        });
        expect(result.courses[0]).not.toHaveProperty('instructor_name');
      });
    });
  });

  describe('getCourseOverview', () => {
    it('should return comprehensive course overview', async () => {
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

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        published: true,
        instructor: {
          id: 10,
          name: 'John Doe'
        },
        totalLessons: 5,
        enrollments: {
          active: 10,
          completed: 3
        },
        averageProgress: 66,
        quizzes: {
          total: 2,
          totalQuestions: 10
        },
        certificatesIssued: 3,
        updatedAt: mockCourse.created_at
      });
    });

    it('should return null when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await CoursesService.getCourseOverview(999);

      expect(result).toBeNull();
    });

    it('should handle courses with no data', async () => {
      const mockCourse = {
        id: 1,
        title: 'Empty Course',
        published: true,
        instructor_id: 10,
        created_at: new Date(),
        instructor_name: 'John Doe'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockCourse] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ active: '0', completed: '0' }] })
        .mockResolvedValueOnce({ rows: [{ average_progress: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_quizzes: '0', total_questions: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toEqual({
        id: 1,
        title: 'Empty Course',
        published: true,
        instructor: {
          id: 10,
          name: 'John Doe'
        },
        totalLessons: 0,
        enrollments: {
          active: 0,
          completed: 0
        },
        averageProgress: 0,
        quizzes: {
          total: 0,
          totalQuestions: 0
        },
        certificatesIssued: 0,
        updatedAt: mockCourse.created_at
      });
    });
  });
});
