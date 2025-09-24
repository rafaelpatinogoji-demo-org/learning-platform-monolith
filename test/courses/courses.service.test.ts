/**
 * Tests for courses service
 * 
 * Tests business logic, database operations, and role-based permissions
 * with mocked database calls.
 */

import { CoursesService, CreateCourseData, UpdateCourseData, CourseListOptions } from '../../src/services/courses.service';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    const mockCourseData: CreateCourseData = {
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999
    };

    const mockDbResult = {
      rows: [{
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      }],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: []
    } as any;

    it('should create course for instructor with their own ID', async () => {
      mockDb.query.mockResolvedValue(mockDbResult);

      const result = await CoursesService.createCourse(mockCourseData, 1, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        `INSERT INTO courses (title, description, price_cents, instructor_id, published)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, title, description, price_cents, published, instructor_id, created_at`,
        ['Test Course', 'Test Description', 9999, 1]
      );
      expect(result).toEqual(mockDbResult.rows[0]);
    });

    it('should create course for admin with specified instructor_id', async () => {
      const courseDataWithInstructor = { ...mockCourseData, instructor_id: 5 };
      mockDb.query.mockResolvedValue(mockDbResult);

      await CoursesService.createCourse(courseDataWithInstructor, 2, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Test Course', 'Test Description', 9999, 5]
      );
    });

    it('should create course for admin with default to admin ID when no instructor_id specified', async () => {
      mockDb.query.mockResolvedValue(mockDbResult);

      await CoursesService.createCourse(mockCourseData, 2, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Test Course', 'Test Description', 9999, 2]
      );
    });

    it('should throw error for student role', async () => {
      await expect(
        CoursesService.createCourse(mockCourseData, 1, 'student')
      ).rejects.toThrow('Insufficient permissions to create course');

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle null description', async () => {
      const courseDataWithNullDesc = { ...mockCourseData, description: undefined };
      mockDb.query.mockResolvedValue(mockDbResult);

      await CoursesService.createCourse(courseDataWithNullDesc, 1, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Test Course', null, 9999, 1]
      );
    });
  });

  describe('getCourseById', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: true,
      instructor_id: 2,
      created_at: new Date(),
      instructor_name: 'Test Instructor'
    };

    it('should get course without instructor info', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.getCourseById(1, false);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title, c.description, c.price_cents, c.published, c.instructor_id, c.created_at'),
        [1]
      );
      expect(result).toEqual(mockCourse);
    });

    it('should get course with instructor info', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCourse], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.getCourseById(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users u ON c.instructor_id = u.id'),
        [1]
      );
      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        published: true,
        instructor_id: 2,
        created_at: mockCourse.created_at,
        instructor: {
          id: 2,
          name: 'Test Instructor'
        }
      });
    });

    it('should return null when course not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });

    it('should handle course without instructor name', async () => {
      const courseWithoutInstructor = { ...mockCourse, instructor_name: null };
      mockDb.query.mockResolvedValue({ rows: [courseWithoutInstructor], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.getCourseById(1, true);

      expect(result?.instructor).toEqual({ id: 2, name: 'Test Instructor' });
    });
  });

  describe('updateCourse', () => {
    const mockUpdatedCourse = {
      id: 1,
      title: 'Updated Course',
      description: 'Updated Description',
      price_cents: 19999,
      published: false,
      instructor_id: 1,
      created_at: new Date()
    };

    it('should update single field', async () => {
      const updateData: UpdateCourseData = { title: 'Updated Course' };
      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        `
      UPDATE courses 
      SET title = $1
      WHERE id = $2
      RETURNING id, title, description, price_cents, published, instructor_id, created_at
    `,
        ['Updated Course', 1]
      );
      expect(result).toEqual(mockUpdatedCourse);
    });

    it('should update multiple fields', async () => {
      const updateData: UpdateCourseData = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 19999
      };
      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        `
      UPDATE courses 
      SET title = $1, description = $2, price_cents = $3
      WHERE id = $4
      RETURNING id, title, description, price_cents, published, instructor_id, created_at
    `,
        ['Updated Course', 'Updated Description', 19999, 1]
      );
    });

    it('should handle instructor_id update', async () => {
      const updateData: UpdateCourseData = { instructor_id: 5 };
      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('instructor_id = $1'),
        [5, 1]
      );
    });

    it('should return current course when no updates provided', async () => {
      const updateData: UpdateCourseData = {};
      const getCurrentCourseSpy = jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockUpdatedCourse);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(getCurrentCourseSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUpdatedCourse);
      expect(mockDb.query).not.toHaveBeenCalled();

      getCurrentCourseSpy.mockRestore();
    });

    it('should return null when course not found', async () => {
      const updateData: UpdateCourseData = { title: 'Updated' };
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] } as any);

      const result = await CoursesService.updateCourse(999, updateData);

      expect(result).toBeNull();
    });

    it('should handle null description update', async () => {
      const updateData: UpdateCourseData = { description: undefined };
      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title, c.description, c.price_cents, c.published, c.instructor_id, c.created_at'),
        [1]
      );
    });
  });

  describe('togglePublished', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: true,
      instructor_id: 1,
      created_at: new Date()
    };

    it('should publish course', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      const result = await CoursesService.togglePublished(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        `UPDATE courses 
       SET published = $1 
       WHERE id = $2 
       RETURNING id, title, description, price_cents, published, instructor_id, created_at`,
        [true, 1]
      );
      expect(result).toEqual(mockCourse);
    });

    it('should unpublish course', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query.mockResolvedValue({ rows: [unpublishedCourse], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as any);

      const result = await CoursesService.togglePublished(1, false);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [false, 1]
      );
      expect(result).toEqual(unpublishedCourse);
    });

    it('should return null when course not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'UPDATE', oid: 0, fields: [] } as any);

      const result = await CoursesService.togglePublished(999, true);

      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    const mockCourses = [
      {
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor_name: 'Instructor 1'
      },
      {
        id: 2,
        title: 'Course 2',
        description: 'Description 2',
        price_cents: 19999,
        published: false,
        instructor_id: 2,
        created_at: new Date(),
        instructor_name: 'Instructor 2'
      }
    ];

    beforeEach(() => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any) // Count query
        .mockResolvedValueOnce({ rows: mockCourses, rowCount: 2, command: 'SELECT', oid: 0, fields: [] } as any); // Courses query
    });

    it('should list courses with default options', async () => {
      const result = await CoursesService.listCourses();

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT COUNT(*) as total'),
        [10, 0]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0]
      );
      expect(result.courses).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter by published_only', async () => {
      const options: CourseListOptions = { published_only: true };

      await CoursesService.listCourses(options);

      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('WHERE c.published = true'),
        [10, 0]
      );
    });

    it('should filter by instructor_id', async () => {
      const options: CourseListOptions = { instructor_id: 5 };

      await CoursesService.listCourses(options);

      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('WHERE c.instructor_id = $1'),
        [5, 10, 0]
      );
    });

    it('should filter by search term', async () => {
      const options: CourseListOptions = { search: 'javascript' };

      await CoursesService.listCourses(options);

      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('(c.title ILIKE $1 OR c.description ILIKE $1)'),
        ['%javascript%', 10, 0]
      );
    });

    it('should handle pagination', async () => {
      const options: CourseListOptions = { page: 2, limit: 5 };

      await CoursesService.listCourses(options);

      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 5]
      );
    });

    it('should combine multiple filters', async () => {
      const options: CourseListOptions = {
        published_only: true,
        instructor_id: 3,
        search: 'react'
      };

      await CoursesService.listCourses(options);

      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('WHERE c.published = true AND c.instructor_id = $1 AND (c.title ILIKE $2 OR c.description ILIKE $2)'),
        [3, '%react%', 10, 0]
      );
    });

    it('should format courses with instructor info', async () => {
      const result = await CoursesService.listCourses();

      expect(result.courses[0]).toEqual({
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        created_at: mockCourses[0].created_at,
        instructor: {
          id: 1,
          name: 'Instructor 1'
        }
      });
    });

    it('should handle courses without instructor names', async () => {
      const coursesWithoutInstructor = mockCourses.map(course => ({ ...course, instructor_name: null }));
      mockDb.query
        .mockReset()
        .mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: coursesWithoutInstructor, rowCount: 2, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.listCourses();

      expect(result.courses[0].instructor).toBeUndefined();
    });

    it('should calculate total pages correctly', async () => {
      mockDb.query
        .mockReset()
        .mockResolvedValueOnce({ rows: [{ total: '23' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any)
        .mockResolvedValueOnce({ rows: mockCourses, rowCount: 2, command: 'SELECT', oid: 0, fields: [] } as any);

      const result = await CoursesService.listCourses({ limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('canModifyCourse', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: true,
      instructor_id: 2,
      created_at: new Date()
    };

    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 5, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify their own course', async () => {
      const getCourseByIdSpy = jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockCourse);

      const result = await CoursesService.canModifyCourse(1, 2, 'instructor');

      expect(getCourseByIdSpy).toHaveBeenCalledWith(1);
      expect(result).toBe(true);

      getCourseByIdSpy.mockRestore();
    });

    it('should deny instructor access to other instructor courses', async () => {
      const getCourseByIdSpy = jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockCourse);

      const result = await CoursesService.canModifyCourse(1, 3, 'instructor');

      expect(result).toBe(false);

      getCourseByIdSpy.mockRestore();
    });

    it('should deny instructor access when course not found', async () => {
      const getCourseByIdSpy = jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(null);

      const result = await CoursesService.canModifyCourse(999, 2, 'instructor');

      expect(result).toBe(false);

      getCourseByIdSpy.mockRestore();
    });

    it('should deny student access', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1, rows: [], command: 'DELETE', oid: 0, fields: [] } as any);

      const result = await CoursesService.deleteCourse(1);

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM courses WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false when course not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0, rows: [], command: 'DELETE', oid: 0, fields: [] } as any);

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      mockDb.query.mockResolvedValue({ rowCount: null, rows: [], command: 'DELETE', oid: 0, fields: [] } as any);

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(false);
    });
  });
});
