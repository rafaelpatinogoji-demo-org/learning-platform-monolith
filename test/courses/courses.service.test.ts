import { CoursesService } from '../../src/services/courses.service';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn()
  }
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course for an instructor', async () => {
      const courseData = {
        title: 'Introduction to TypeScript',
        description: 'Learn TypeScript basics',
        price_cents: 9999
      };

      const mockCourse = {
        id: 1,
        ...courseData,
        instructor_id: 1,
        published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.createCourse(courseData, 1, 'instructor');

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, 1]
      );
    });

    it('should create a course when admin specifies instructor_id', async () => {
      const courseData = {
        title: 'Advanced TypeScript',
        description: 'Advanced concepts',
        price_cents: 19999,
        instructor_id: 5
      };

      const mockCourse = {
        id: 2,
        ...courseData,
        published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.createCourse(courseData, 1, 'admin');

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, 5]
      );
    });

    it('should handle database errors', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: 5000
      };

      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(CoursesService.createCourse(courseData, 1, 'instructor')).rejects.toThrow('Database error');
    });
  });

  describe('getCourseById', () => {
    it('should return a course with instructor info', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test description',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        instructor_name: 'John Doe',
        instructor_email: 'john@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.getCourseById(1);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return null for non-existent course', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCourse', () => {
    it('should update course with dynamic query building', async () => {
      const updateData = {
        title: 'Updated Title',
        price_cents: 12999
      };

      const mockCourse = {
        id: 1,
        title: 'Updated Title',
        description: 'Original description',
        price_cents: 12999,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        expect.arrayContaining([updateData.title, updateData.price_cents, 1])
      );
    });

    it('should handle empty update data', async () => {
      const updateData = {};

      const mockCourse = {
        id: 1,
        title: 'Original Title',
        description: 'Original description',
        price_cents: 9999,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result).toEqual(mockCourse);
    });

    it('should return null for non-existent course', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.updateCourse(999, updateData);

      expect(result).toBeNull();
    });
  });

  describe('togglePublished', () => {
    it('should publish a course', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test description',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.togglePublished(1, true);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
    });

    it('should unpublish a course', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test description',
        price_cents: 9999,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.togglePublished(1, false);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [false, 1]
      );
    });

    it('should return null for non-existent course', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.togglePublished(999, true);

      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    it('should list courses with pagination', async () => {
      const mockCourseRows = [
        {
          id: 1,
          title: 'Course 1',
          description: 'Description 1',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John Doe',
          created_at: new Date()
        },
        {
          id: 2,
          title: 'Course 2',
          description: 'Description 2',
          price_cents: 14999,
          published: true,
          instructor_id: 2,
          instructor_name: 'Jane Smith',
          created_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total: '2' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockCourseRows,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await CoursesService.listCourses({ page: 1, limit: 20 });

      expect(result).toEqual({
        courses: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Course 1',
            instructor: { id: 1, name: 'John Doe' }
          }),
          expect.objectContaining({
            id: 2,
            title: 'Course 2',
            instructor: { id: 2, name: 'Jane Smith' }
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should filter by published status', async () => {
      const mockCourseRows = [
        {
          id: 1,
          title: 'Published Course',
          description: 'Description',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John Doe',
          created_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockCourseRows,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await CoursesService.listCourses({ page: 1, limit: 20, published_only: true });

      expect(result).toEqual({
        courses: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Published Course',
            published: true
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.published = true'),
        expect.any(Array)
      );
    });

    it('should filter by instructor_id', async () => {
      const mockCourseRows = [
        {
          id: 1,
          title: 'Instructor Course',
          description: 'Description',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John Doe',
          created_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockCourseRows,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await CoursesService.listCourses({ page: 1, limit: 20, instructor_id: 1 });

      expect(result).toEqual({
        courses: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'Instructor Course',
            instructor_id: 1
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('c.instructor_id = $'),
        expect.any(Array)
      );
    });

    it('should search by title', async () => {
      const mockCourseRows = [
        {
          id: 1,
          title: 'TypeScript Course',
          description: 'Description',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John Doe',
          created_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockCourseRows,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await CoursesService.listCourses({ page: 1, limit: 20, search: 'TypeScript' });

      expect(result).toEqual({
        courses: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: 'TypeScript Course'
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });
  });

  describe('canModifyCourse', () => {
    it('should return true for admin', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'admin');
      expect(result).toBe(true);
    });

    it('should return true for course owner instructor', async () => {
      const mockCourse = {
        id: 1,
        instructor_id: 1
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(result).toBe(true);
    });

    it('should return false for non-owner instructor', async () => {
      const mockCourse = {
        id: 1,
        instructor_id: 2
      };

      mockQuery.mockResolvedValue({
        rows: [mockCourse],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'student');
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

      const result = await CoursesService.canModifyCourse(999, 1, 'instructor');

      expect(result).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should delete a course successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM courses'),
        [1]
      );
    });

    it('should return false for non-existent course', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });
  });

  describe('getCourseOverview', () => {
    it('should return course overview with statistics', async () => {
      const now = new Date();
      const mockCourseRow = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 1,
        instructor_name: 'John Doe',
        created_at: now
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [mockCourseRow],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ total: '10' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ active: '30', completed: '20' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ average_progress: '75.5' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ total_quizzes: '5', total_questions: '25' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ total: '15' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        published: true,
        instructor: {
          id: 1,
          name: 'John Doe'
        },
        totalLessons: 10,
        enrollments: {
          active: 30,
          completed: 20
        },
        averageProgress: 76,
        quizzes: {
          total: 5,
          totalQuestions: 25
        },
        certificatesIssued: 15,
        updatedAt: now
      });
      expect(mockQuery).toHaveBeenCalledTimes(6);
    });

    it('should return null for non-existent course', async () => {
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await CoursesService.getCourseOverview(999);

      expect(result).toBeNull();
    });
  });
});
