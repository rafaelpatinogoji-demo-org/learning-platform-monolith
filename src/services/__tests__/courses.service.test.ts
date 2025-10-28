import { CoursesService } from '../courses.service';
import { db } from '../../db';
import type { QueryResult } from 'pg';

jest.mock('../../db');

describe('CoursesService', () => {
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    const validCourseData = {
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      instructor_id: 2
    };

    it('should create course for instructor creating for self', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, ...validCourseData, published: false }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.createCourse(validCourseData, 2, 'instructor');

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([validCourseData.title, validCourseData.description, validCourseData.price_cents, 2])
      );
    });

    it('should allow admin to create course for another instructor', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, ...validCourseData, published: false }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.createCourse(validCourseData, 1, 'admin');

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([validCourseData.title, validCourseData.description, validCourseData.price_cents, 2])
      );
    });

    it('should allow admin to create course for self', async () => {
      const courseData = { ...validCourseData, instructor_id: 1 };
      const mockResult: QueryResult = {
        rows: [{ id: 1, ...courseData, published: false }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.createCourse(courseData, 1, 'admin');

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([courseData.title, courseData.description, courseData.price_cents, 1])
      );
    });

    it('should force instructor_id to user.id for non-admin instructors', async () => {
      const courseData = { ...validCourseData, instructor_id: 999 };
      const mockResult: QueryResult = {
        rows: [{ id: 1, ...validCourseData, instructor_id: 3, published: false }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.createCourse(courseData, 3, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([courseData.title, courseData.description, courseData.price_cents, 3])
      );
    });

    it('should throw error for student role', async () => {
      await expect(CoursesService.createCourse(validCourseData, 4, 'student')).rejects.toThrow(
        'Insufficient permissions to create course'
      );
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('getCourseById', () => {
    it('should return course with instructor info', async () => {
      const mockResult: QueryResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 9999,
          instructor_id: 2,
          published: true,
          instructor_name: 'John Instructor'
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.getCourseById(1, true);

      expect(result).toHaveProperty('instructor');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users'),
        [1]
      );
    });

    it('should return null when course not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCourse', () => {
    it('should update all fields when provided', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
        price_cents: 5000,
        instructor_id: 3
      };
      const mockResult: QueryResult = {
        rows: [{ id: 1, ...updates, published: false }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.updateCourse(1, updates);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Updated Title', 'Updated Description', 5000, 3, 1]
      );
    });

    it('should update only title when other fields undefined', async () => {
      const updates = { title: 'New Title' };
      const mockResult: QueryResult = {
        rows: [{ id: 1, title: 'New Title', description: 'Old Desc', price_cents: 9999, instructor_id: 2, published: true }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.updateCourse(1, updates);

      expect(result).toEqual(mockResult.rows[0]);
      const query = mockDb.query.mock.calls[0][0] as string;
      expect(query).toContain('title = $');
      expect(query).not.toContain('description = $');
    });

    it('should return course when no updates provided', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, title: 'Existing', description: 'Desc', price_cents: 9999, instructor_id: 2, published: true }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.updateCourse(1, {});

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when course not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.updateCourse(999, { title: 'New Title' });

      expect(result).toBeNull();
    });
  });

  describe('togglePublished', () => {
    it('should publish unpublished course', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, title: 'Test', published: true }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.togglePublished(1, true);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
    });

    it('should unpublish published course', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, title: 'Test', published: false }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.togglePublished(1, false);

      expect(result).toEqual(mockResult.rows[0]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [false, 1]
      );
    });

    it('should return null when course not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.togglePublished(999, true);

      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    it('should list all courses with pagination', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '25' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      const mockCoursesResult: QueryResult = {
        rows: [
          { id: 1, title: 'Course 1', published: true, instructor_id: 2, instructor_name: 'John' },
          { id: 2, title: 'Course 2', published: false, instructor_id: 3, instructor_name: 'Jane' }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockCoursesResult);

      const result = await CoursesService.listCourses({ page: 1, limit: 10 });

      expect(result.courses).toHaveLength(2);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by published_only', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      const mockCoursesResult: QueryResult = {
        rows: [{ id: 1, title: 'Course 1', published: true, instructor_id: 2, instructor_name: 'John' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockCoursesResult);

      await CoursesService.listCourses({ page: 1, limit: 10, published_only: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.published = true'),
        expect.any(Array)
      );
    });

    it('should filter by instructor_id', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      const mockCoursesResult: QueryResult = {
        rows: [{ id: 1, title: 'Course 1', instructor_id: 2, published: true, instructor_name: 'John' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockCoursesResult);

      await CoursesService.listCourses({ page: 1, limit: 10, instructor_id: 2 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('c.instructor_id = $'),
        expect.arrayContaining([2])
      );
    });

    it('should search by title and description', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '3' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      const mockCoursesResult: QueryResult = {
        rows: [{ id: 1, title: 'JavaScript Course', description: 'Learn JS', instructor_id: 2, published: true, instructor_name: 'John' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockCoursesResult);

      await CoursesService.listCourses({ page: 1, limit: 10, search: 'javascript' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([expect.stringContaining('%javascript%')])
      );
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      const mockResult: QueryResult = {
        rows: [{ instructor_id: 2 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.canModifyCourse(1, 1, 'admin');

      expect(result).toBe(true);
    });

    it('should allow instructor to modify own course', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, instructor_id: 2, title: 'Test', published: false, description: null, price_cents: 1000, created_at: new Date() }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.canModifyCourse(1, 2, 'instructor');

      expect(result).toBe(true);
    });

    it('should deny instructor modifying other instructor course', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, instructor_id: 2, title: 'Test', published: false, description: null, price_cents: 1000, created_at: new Date() }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.canModifyCourse(1, 3, 'instructor');

      expect(result).toBe(false);
    });

    it('should deny student from modifying course', async () => {
      const mockResult: QueryResult = {
        rows: [{ instructor_id: 2 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.canModifyCourse(1, 4, 'student');

      expect(result).toBe(false);
    });

    it('should return false when course not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.canModifyCourse(999, 1, 'instructor');

      expect(result).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM courses WHERE id = $1',
        [1]
      );
    });

    it('should return false when course not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });
  });

  describe('getCourseOverview', () => {
    it('should return complete course overview with stats', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 2,
        instructor_name: 'John Instructor',
        created_at: new Date()
      };
      
      mockDb.query.mockResolvedValueOnce({ 
        rows: [mockCourse], 
        rowCount: 1, 
        command: 'SELECT', 
        oid: 0, 
        fields: [] 
      });

      const result = await CoursesService.getCourseOverview(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe('Test Course');
      expect(result?.instructor.name).toBe('John Instructor');
    });

    it('should return null when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] });

      const result = await CoursesService.getCourseOverview(999);

      expect(result).toBeNull();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });
});
