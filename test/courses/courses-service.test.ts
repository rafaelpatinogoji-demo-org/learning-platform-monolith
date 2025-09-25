/**
 * Tests for CoursesService
 * 
 * Unit tests for course service methods with mocked database operations
 */

import { CoursesService, CreateCourseData, UpdateCourseData } from '../../src/services/courses.service';
import { db } from '../../src/db';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    const mockCourseData: CreateCourseData = {
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999
    };

    const mockCreatedCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: false,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should create course for instructor with their own ID', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCreatedCourse] } as any);

      const result = await CoursesService.createCourse(mockCourseData, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 5]
      );
      expect(result).toEqual(mockCreatedCourse);
    });

    it('should create course for admin with specified instructor_id', async () => {
      const dataWithInstructor = { ...mockCourseData, instructor_id: 3 };
      const courseWithInstructor = { ...mockCreatedCourse, instructor_id: 3 };
      
      mockDb.query.mockResolvedValue({ rows: [courseWithInstructor] } as any);

      const result = await CoursesService.createCourse(dataWithInstructor, 5, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 3]
      );
      expect(result).toEqual(courseWithInstructor);
    });

    it('should create course for admin with their own ID when instructor_id not specified', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCreatedCourse] } as any);

      const result = await CoursesService.createCourse(mockCourseData, 5, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 2999, 5]
      );
      expect(result).toEqual(mockCreatedCourse);
    });

    it('should throw error for student role', async () => {
      await expect(
        CoursesService.createCourse(mockCourseData, 5, 'student')
      ).rejects.toThrow('Insufficient permissions to create course');

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle null description', async () => {
      const dataWithNullDesc = { ...mockCourseData, description: undefined };
      const courseWithNullDesc = { ...mockCreatedCourse, description: null };
      
      mockDb.query.mockResolvedValue({ rows: [courseWithNullDesc] } as any);

      const result = await CoursesService.createCourse(dataWithNullDesc, 5, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', null, 2999, 5]
      );
      expect(result).toEqual(courseWithNullDesc);
    });
  });

  describe('getCourseById', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should get course without instructor info', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCourse] } as any);

      const result = await CoursesService.getCourseById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        [1]
      );
      expect(result).toEqual(mockCourse);
    });

    it('should get course with instructor info', async () => {
      const mockCourseWithInstructor = {
        ...mockCourse,
        instructor_name: 'John Doe'
      };
      
      mockDb.query.mockResolvedValue({ rows: [mockCourseWithInstructor] } as any);

      const result = await CoursesService.getCourseById(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.name as instructor_name'),
        [1]
      );
      expect(result).toEqual({
        ...mockCourse,
        instructor: {
          id: 5,
          name: 'John Doe'
        }
      });
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });

    it('should handle course with no instructor name', async () => {
      const mockCourseNoInstructor = {
        ...mockCourse,
        instructor_name: null
      };
      
      mockDb.query.mockResolvedValue({ rows: [mockCourseNoInstructor] } as any);

      const result = await CoursesService.getCourseById(1, true);

      expect(result).toEqual(mockCourseNoInstructor);
    });
  });

  describe('updateCourse', () => {
    const mockUpdatedCourse = {
      id: 1,
      title: 'Updated Course',
      description: 'Updated Description',
      price_cents: 3999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should update course with all fields', async () => {
      const updateData: UpdateCourseData = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 3999,
        instructor_id: 7
      };

      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse] } as any);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        ['Updated Course', 'Updated Description', 3999, 7, 1]
      );
      expect(result).toEqual(mockUpdatedCourse);
    });

    it('should update course with partial fields', async () => {
      const updateData: UpdateCourseData = {
        title: 'Updated Course'
      };

      mockDb.query.mockResolvedValue({ rows: [mockUpdatedCourse] } as any);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        ['Updated Course', 1]
      );
      expect(result).toEqual(mockUpdatedCourse);
    });

    it('should return current course when no updates provided', async () => {
      const mockCurrentCourse = { ...mockUpdatedCourse };
      
      jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockCurrentCourse);

      const result = await CoursesService.updateCourse(1, {});

      expect(CoursesService.getCourseById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCurrentCourse);
    });

    it('should return null for non-existent course', async () => {
      const updateData: UpdateCourseData = {
        title: 'Updated Course'
      };

      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.updateCourse(999, updateData);

      expect(result).toBeNull();
    });
  });

  describe('togglePublished', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should toggle course to published', async () => {
      mockDb.query.mockResolvedValue({ rows: [mockCourse] } as any);

      const result = await CoursesService.togglePublished(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
      expect(result).toEqual(mockCourse);
    });

    it('should toggle course to unpublished', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query.mockResolvedValue({ rows: [unpublishedCourse] } as any);

      const result = await CoursesService.togglePublished(1, false);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [false, 1]
      );
      expect(result).toEqual(unpublishedCourse);
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

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
        price_cents: 2999,
        published: true,
        instructor_id: 5,
        created_at: new Date(),
        instructor_name: 'John Doe'
      },
      {
        id: 2,
        title: 'Course 2',
        description: 'Description 2',
        price_cents: 3999,
        published: false,
        instructor_id: 6,
        created_at: new Date(),
        instructor_name: 'Jane Smith'
      }
    ];

    it('should list courses with default options', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] } as any)
        .mockResolvedValueOnce({ rows: mockCourses } as any);

      const result = await CoursesService.listCourses();

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(result.courses).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter by published_only', async () => {
      const publishedCourses = [mockCourses[0]];
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: publishedCourses } as any);

      const result = await CoursesService.listCourses({ published_only: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.published = true'),
        [10, 0]
      );
      expect(result.courses).toHaveLength(1);
    });

    it('should filter by instructor_id', async () => {
      const instructorCourses = [mockCourses[0]];
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: instructorCourses } as any);

      const result = await CoursesService.listCourses({ instructor_id: 5 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.instructor_id = $1'),
        [5, 10, 0]
      );
      expect(result.courses).toHaveLength(1);
    });

    it('should search by title and description', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [mockCourses[0]] } as any);

      const result = await CoursesService.listCourses({ search: 'Course 1' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('(c.title ILIKE $1 OR c.description ILIKE $1)'),
        ['%Course 1%', 10, 0]
      );
    });

    it('should handle pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] } as any)
        .mockResolvedValueOnce({ rows: mockCourses } as any);

      const result = await CoursesService.listCourses({ page: 2, limit: 5 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 5]
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5
      });
    });

    it('should format courses with instructor info', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [mockCourses[0]] } as any);

      const result = await CoursesService.listCourses();

      expect(result.courses[0]).toEqual({
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 2999,
        published: true,
        instructor_id: 5,
        created_at: expect.any(Date),
        instructor: {
          id: 5,
          name: 'John Doe'
        }
      });
    });
  });

  describe('canModifyCourse', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 10, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify their own course', async () => {
      jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockCourse);

      const result = await CoursesService.canModifyCourse(1, 5, 'instructor');

      expect(result).toBe(true);
      expect(CoursesService.getCourseById).toHaveBeenCalledWith(1);
    });

    it('should not allow instructor to modify other instructor course', async () => {
      jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(mockCourse);

      const result = await CoursesService.canModifyCourse(1, 6, 'instructor');

      expect(result).toBe(false);
    });

    it('should not allow student to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 5, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return false for non-existent course', async () => {
      jest.spyOn(CoursesService, 'getCourseById').mockResolvedValue(null);

      const result = await CoursesService.canModifyCourse(999, 5, 'instructor');

      expect(result).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should delete existing course', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await CoursesService.deleteCourse(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM courses WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      mockDb.query.mockResolvedValue({ rowCount: null } as any);

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(false);
    });
  });
});
