/**
 * Tests for CoursesService
 * 
 * Unit tests for course business logic including CRUD operations,
 * role-based permissions, and database interactions.
 */

import { CoursesService, CreateCourseData, UpdateCourseData, CourseListOptions } from '../../src/services/courses.service';

jest.mock('../../src/db');
const mockDb = require('../../src/db');
const mockQuery = jest.fn();
mockDb.db = { query: mockQuery };

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockClear();
  });

  describe('createCourse', () => {
    const validCourseData: CreateCourseData = {
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      instructor_id: 2
    };

    it('should create course for instructor role', async () => {
      // Arrange
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.createCourse(validCourseData, 1, 'instructor');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should create course for admin with specified instructor_id', async () => {
      // Arrange
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: false,
        instructor_id: 2,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.createCourse(validCourseData, 1, 'admin');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 2]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should create course for admin without specified instructor_id', async () => {
      // Arrange
      const courseDataWithoutInstructor = { ...validCourseData };
      delete courseDataWithoutInstructor.instructor_id;
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.createCourse(courseDataWithoutInstructor, 1, 'admin');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should throw error for student role', async () => {
      // Act & Assert
      await expect(
        CoursesService.createCourse(validCourseData, 1, 'student')
      ).rejects.toThrow('Insufficient permissions to create course');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle null description', async () => {
      // Arrange
      const courseDataWithNullDescription = { ...validCourseData, description: undefined };
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: null,
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.createCourse(courseDataWithNullDescription, 1, 'instructor');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', null, 2999, 1]
      );
      expect(result).toEqual(expectedCourse);
    });
  });

  describe('getCourseById', () => {
    it('should return course without instructor info', async () => {
      // Arrange
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.getCourseById(1, false);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        [1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should return course with instructor info', async () => {
      // Arrange
      const courseWithInstructor = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor_name: 'John Instructor'
      };
      mockQuery.mockResolvedValue({ rows: [courseWithInstructor] });

      // Act
      const result = await CoursesService.getCourseById(1, true);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users u ON c.instructor_id = u.id'),
        [1]
      );
      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: courseWithInstructor.created_at,
        instructor: {
          id: 1,
          name: 'John Instructor'
        }
      });
    });

    it('should return null when course not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await CoursesService.getCourseById(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle course with no instructor name', async () => {
      // Arrange
      const courseWithoutInstructorName = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor_name: null
      };
      mockQuery.mockResolvedValue({ rows: [courseWithoutInstructorName] });

      // Act
      const result = await CoursesService.getCourseById(1, true);

      // Assert
      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: courseWithoutInstructorName.created_at,
        instructor_name: null
      });
    });
  });

  describe('updateCourse', () => {
    it('should update course with all fields', async () => {
      // Arrange
      const updateData: UpdateCourseData = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 3999,
        instructor_id: 2
      };
      const expectedCourse = {
        id: 1,
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 3999,
        published: false,
        instructor_id: 2,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.updateCourse(1, updateData);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET title = $1, description = $2, price_cents = $3, instructor_id = $4'),
        ['Updated Course', 'Updated Description', 3999, 2, 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should update course with partial fields', async () => {
      // Arrange
      const updateData: UpdateCourseData = {
        title: 'Updated Title Only'
      };
      const expectedCourse = {
        id: 1,
        title: 'Updated Title Only',
        description: 'Original Description',
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.updateCourse(1, updateData);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET title = $1'),
        ['Updated Title Only', 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should return current course when no updates provided', async () => {
      // Arrange
      const updateData: UpdateCourseData = {};
      const expectedCourse = {
        id: 1,
        title: 'Original Course',
        description: 'Original Description',
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.updateCourse(1, updateData);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        [1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should return null when course not found', async () => {
      // Arrange
      const updateData: UpdateCourseData = { title: 'Updated Title' };
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await CoursesService.updateCourse(999, updateData);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle null description update', async () => {
      // Arrange
      const updateData: UpdateCourseData = {
        description: null as any
      };
      const expectedCourse = {
        id: 1,
        title: 'Original Course',
        description: null,
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.updateCourse(1, updateData);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET description = $1'),
        [null, 1]
      );
      expect(result).toEqual(expectedCourse);
    });
  });

  describe('togglePublished', () => {
    it('should publish course', async () => {
      // Arrange
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.togglePublished(1, true);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET published = $1'),
        [true, 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should unpublish course', async () => {
      // Arrange
      const expectedCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        published: false,
        instructor_id: 1,
        created_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [expectedCourse] });

      // Act
      const result = await CoursesService.togglePublished(1, false);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET published = $1'),
        [false, 1]
      );
      expect(result).toEqual(expectedCourse);
    });

    it('should return null when course not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await CoursesService.togglePublished(999, true);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    const mockCourses = [
      {
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor_name: 'John Instructor'
      },
      {
        id: 2,
        title: 'Course 2',
        description: 'Description 2',
        price_cents: 3999,
        published: false,
        instructor_id: 2,
        created_at: new Date(),
        instructor_name: 'Jane Instructor'
      }
    ];

    it('should list courses with default options', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // count query
        .mockResolvedValueOnce({ rows: mockCourses }); // courses query

      // Act
      const result = await CoursesService.listCourses();

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT COUNT(*)'), [10, 0]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY c.created_at DESC'), [10, 0]);
      expect(result.courses).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should list courses with pagination', async () => {
      // Arrange
      const options: CourseListOptions = { page: 2, limit: 5 };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '12' }] })
        .mockResolvedValueOnce({ rows: mockCourses });

      // Act
      const result = await CoursesService.listCourses(options);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $1 OFFSET $2'), [5, 5]);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3
      });
    });

    it('should filter by published_only', async () => {
      // Arrange
      const options: CourseListOptions = { published_only: true };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockCourses[0]] });

      // Act
      const result = await CoursesService.listCourses(options);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE c.published = true'), [10, 0]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE c.published = true'), [10, 0]);
    });

    it('should filter by instructor_id', async () => {
      // Arrange
      const options: CourseListOptions = { instructor_id: 1 };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockCourses[0]] });

      // Act
      const result = await CoursesService.listCourses(options);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('WHERE c.instructor_id = $1'), [1, 10, 0]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('WHERE c.instructor_id = $1'), [1, 10, 0]);
    });

    it('should filter by search term', async () => {
      // Arrange
      const options: CourseListOptions = { search: 'javascript' };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockCourses[0]] });

      // Act
      const result = await CoursesService.listCourses(options);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('(c.title ILIKE $1 OR c.description ILIKE $1)'), ['%javascript%', 10, 0]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('(c.title ILIKE $1 OR c.description ILIKE $1)'), ['%javascript%', 10, 0]);
    });

    it('should combine multiple filters', async () => {
      // Arrange
      const options: CourseListOptions = {
        published_only: true,
        instructor_id: 1,
        search: 'react'
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [mockCourses[0]] });

      // Act
      const result = await CoursesService.listCourses(options);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('WHERE c.published = true AND c.instructor_id = $1 AND (c.title ILIKE $2 OR c.description ILIKE $2)'), 
        [1, '%react%', 10, 0]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('WHERE c.published = true AND c.instructor_id = $1 AND (c.title ILIKE $2 OR c.description ILIKE $2)'), 
        [1, '%react%', 10, 0]
      );
    });

    it('should handle courses with instructor info', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: mockCourses });

      // Act
      const result = await CoursesService.listCourses();

      // Assert
      expect(result.courses[0]).toEqual({
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: mockCourses[0].created_at,
        instructor: {
          id: 1,
          name: 'John Instructor'
        }
      });
    });

    it('should handle courses without instructor info', async () => {
      // Arrange
      const coursesWithoutInstructor = [
        { ...mockCourses[0], instructor_name: null }
      ];
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: coursesWithoutInstructor });

      // Act
      const result = await CoursesService.listCourses();

      // Assert
      expect(result.courses[0]).toEqual({
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 2999,
        published: true,
        instructor_id: 1,
        created_at: mockCourses[0].created_at
      });
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      // Act
      const result = await CoursesService.canModifyCourse(1, 1, 'admin');

      // Assert
      expect(result).toBe(true);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify own course', async () => {
      // Arrange
      const course = {
        id: 1,
        title: 'Test Course',
        instructor_id: 1,
        published: false
      };
      mockQuery.mockResolvedValue({ rows: [course] });

      // Act
      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      // Assert
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        [1]
      );
    });

    it('should deny instructor modifying other instructor course', async () => {
      // Arrange
      const course = {
        id: 1,
        title: 'Test Course',
        instructor_id: 2,
        published: false
      };
      mockQuery.mockResolvedValue({ rows: [course] });

      // Act
      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      // Assert
      expect(result).toBe(false);
    });

    it('should deny instructor when course not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await CoursesService.canModifyCourse(999, 1, 'instructor');

      // Assert
      expect(result).toBe(false);
    });

    it('should deny student from modifying any course', async () => {
      // Act
      const result = await CoursesService.canModifyCourse(1, 1, 'student');

      // Assert
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rowCount: 1 });

      // Act
      const result = await CoursesService.deleteCourse(1);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM courses WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false when course not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rowCount: 0 });

      // Act
      const result = await CoursesService.deleteCourse(999);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rowCount: null });

      // Act
      const result = await CoursesService.deleteCourse(1);

      // Assert
      expect(result).toBe(false);
    });
  });
});
