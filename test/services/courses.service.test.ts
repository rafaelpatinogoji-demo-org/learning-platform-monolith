jest.mock('../../src/db');

import { mockDb, mockQueryResult, mockClient } from '../mocks/db.mock';
import { CoursesService, CreateCourseData, UpdateCourseData } from '../../src/services/courses.service';

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getClient.mockResolvedValue(mockClient);
  });

  describe('createCourse', () => {
    const mockUser = { id: 1, role: 'instructor' };
    const courseData: CreateCourseData = {
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      instructor_id: 1
    };

    it('should create course successfully for instructor', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        instructor_id: 1,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(courseData, mockUser.id, mockUser.role);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining(['Test Course', 'Test Description', 9999, 1])
      );
      expect(result).toEqual(mockCourse);
    });

    it('should create course successfully for admin with custom instructor_id', async () => {
      const adminUser = { id: 2, role: 'admin' };
      const courseDataWithInstructor = { ...courseData, instructor_id: 3 };
      const mockCourse = { ...courseData, id: 1, instructor_id: 3, is_published: false };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(courseDataWithInstructor, adminUser.id, adminUser.role);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining(['Test Course', 'Test Description', 9999, 3])
      );
      expect(result.instructor_id).toBe(3);
    });

    it('should throw error for student role', async () => {
      const studentUser = { id: 3, role: 'student' };

      await expect(
        CoursesService.createCourse(courseData, studentUser.id, studentUser.role)
      ).rejects.toThrow('Only instructors and admins can create courses');
    });

    it('should ignore instructor_id for instructor role', async () => {
      const courseDataWithInstructor = { ...courseData, instructor_id: 999 };
      const mockCourse = { ...courseData, id: 1, instructor_id: 1, is_published: false };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(courseDataWithInstructor, mockUser.id, mockUser.role);

      expect(result.instructor_id).toBe(1);
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        CoursesService.createCourse(courseData, mockUser.id, mockUser.role)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getCourseById', () => {
    it('should return course with instructor info', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        instructor_id: 1,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
        instructor_email: 'instructor@test.com'
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.getCourseById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users'),
        [1]
      );
      expect(result).toEqual(mockCourse);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      await expect(CoursesService.getCourseById(999)).rejects.toThrow('Course not found');
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(CoursesService.getCourseById(1)).rejects.toThrow('Database error');
    });
  });

  describe('updateCourse', () => {
    const updateData: UpdateCourseData = {
      title: 'Updated Course',
      description: 'Updated Description',
      price_cents: 19999
    };

    it('should update course successfully', async () => {
      const mockUpdatedCourse = {
        id: 1,
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 19999,
        instructor_id: 1,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockUpdatedCourse]));

      const result = await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses SET'),
        expect.arrayContaining(['Updated Course', 'Updated Description', 19999, 1])
      );
      expect(result).toEqual(mockUpdatedCourse);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { title: 'New Title Only' };
      const mockUpdatedCourse = {
        id: 1,
        title: 'New Title Only',
        description: 'Original Description',
        price_cents: 9999,
        instructor_id: 1,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockUpdatedCourse]));

      const result = await CoursesService.updateCourse(1, partialUpdate);

      expect(result).toBeTruthy();
      expect(result!.title).toBe('New Title Only');
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      await expect(CoursesService.updateCourse(999, updateData)).rejects.toThrow('Course not found');
    });

    it('should handle empty update data', async () => {
      const mockCourse = {
        id: 1,
        title: 'Original Course',
        description: 'Original Description',
        price_cents: 9999,
        instructor_id: 1,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.updateCourse(1, {});

      expect(result).toEqual(mockCourse);
    });
  });

  describe('togglePublished', () => {
    it('should toggle course to published', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.togglePublished(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
      expect(result).toBeTruthy();
      expect(result!.published).toBe(true);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      const result = await CoursesService.togglePublished(999, false);

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
        instructor_id: 1,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
        instructor_email: 'instructor1@test.com'
      },
      {
        id: 2,
        title: 'Course 2',
        description: 'Description 2',
        price_cents: 19999,
        instructor_id: 2,
        is_published: false,
        created_at: new Date(),
        updated_at: new Date(),
        instructor_email: 'instructor2@test.com'
      }
    ];

    it('should list courses with default pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult(mockCourses))
        .mockResolvedValueOnce(mockQueryResult([{ count: '2' }]));

      const result = await CoursesService.listCourses({});

      expect(result.courses).toEqual(mockCourses);
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
        .mockResolvedValueOnce(mockQueryResult(publishedCourses))
        .mockResolvedValueOnce(mockQueryResult([{ count: '1' }]));

      const result = await CoursesService.listCourses({ published_only: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_published = true'),
        expect.any(Array)
      );
      expect(result.courses).toEqual(publishedCourses);
    });

    it('should filter by instructor_id', async () => {
      const instructorCourses = [mockCourses[0]];
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult(instructorCourses))
        .mockResolvedValueOnce(mockQueryResult([{ count: '1' }]));

      const result = await CoursesService.listCourses({ instructor_id: 1 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.instructor_id = $'),
        expect.arrayContaining([1])
      );
    });

    it('should handle search query', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([mockCourses[0]]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '1' }]));

      const result = await CoursesService.listCourses({ search: 'Course 1' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%Course 1%'])
      );
    });

    it('should handle custom pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([mockCourses[1]]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '2' }]));

      const result = await CoursesService.listCourses({ page: 2, limit: 1 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET $'),
        expect.arrayContaining([1, 1])
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(1);
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'admin');
      expect(result).toBe(true);
    });

    it('should allow instructor to modify their own course', async () => {
      const mockCourse = { instructor_id: 1 };
      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT instructor_id FROM courses WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should not allow instructor to modify other instructor course', async () => {
      const mockCourse = { instructor_id: 2 };
      mockDb.query.mockResolvedValueOnce(mockQueryResult([mockCourse]));

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should not allow student to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'student');
      expect(result).toBe(false);
    });

    it('should return false when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([]));

      const result = await CoursesService.canModifyCourse(999, 1, 'instructor');

      expect(result).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([], 1));

      await CoursesService.deleteCourse(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM courses WHERE id = $1',
        [1]
      );
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockQueryResult([], 0));

      await expect(CoursesService.deleteCourse(999)).rejects.toThrow('Course not found');
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(CoursesService.deleteCourse(1)).rejects.toThrow('Database error');
    });
  });
});
