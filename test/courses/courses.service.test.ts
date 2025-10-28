import { mockQuery, mockQuerySuccess, resetDbMocks } from '../mocks/db.mock';

jest.mock('../../src/db', () => ({
  db: {
    query: require('../mocks/db.mock').mockQuery,
    getClient: require('../mocks/db.mock').mockGetClient,
    connect: require('../mocks/db.mock').mockConnect,
    disconnect: require('../mocks/db.mock').mockDisconnect,
    healthCheck: jest.fn().mockResolvedValue(true),
    smokeTest: jest.fn().mockResolvedValue({ success: true, userCount: 1 }),
    getConnectionStatus: jest.fn().mockReturnValue(true),
    getPoolStats: jest.fn().mockReturnValue({ totalCount: 1, idleCount: 0, waitingCount: 0 }),
  },
}));

import { CoursesService } from '../../src/services/courses.service';

describe('CoursesService', () => {
  beforeEach(() => {
    resetDbMocks();
  });

  describe('createCourse', () => {
    it('should create a course for an instructor', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
      };
      const userId = 1;
      const userRole = 'instructor';

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.createCourse(courseData, userId, userRole);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, userId]
      );
    });

    it('should allow admin to specify instructor_id', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        instructor_id: 5,
      };
      const adminId = 1;
      const userRole = 'admin';

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: false,
        instructor_id: 5,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.createCourse(courseData, adminId, userRole);

      expect(result.instructor_id).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, 5]
      );
    });

    it('should reject student role', async () => {
      const courseData = {
        title: 'Test Course',
        price_cents: 9900,
      };

      await expect(
        CoursesService.createCourse(courseData, 1, 'student')
      ).rejects.toThrow('Insufficient permissions to create course');
    });

    it('should default instructor_id to creator for admin without explicit instructor_id', async () => {
      const courseData = {
        title: 'Test Course',
        price_cents: 9900,
      };
      const adminId = 1;

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: null,
        price_cents: 9900,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.createCourse(courseData, adminId, 'admin');

      expect(result.instructor_id).toBe(adminId);
    });
  });

  describe('getCourseById', () => {
    it('should return course without instructor info', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.getCourseById(1, false);

      expect(result).toEqual(mockCourse);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id'),
        [1]
      );
    });

    it('should return course with instructor info', async () => {
      const mockRow = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor_name: 'John Doe',
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockRow]));

      const result = await CoursesService.getCourseById(1, true);

      expect(result?.instructor).toEqual({
        id: 1,
        name: 'John Doe',
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users'),
        [1]
      );
    });

    it('should return null for non-existent course', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCourse', () => {
    it('should update course title', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const mockCourse = {
        id: 1,
        title: 'Updated Title',
        description: 'Test Description',
        price_cents: 9900,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result?.title).toBe('Updated Title');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        expect.arrayContaining(['Updated Title', 1])
      );
    });

    it('should return null if no rows updated', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await CoursesService.updateCourse(999, updateData);

      expect(result).toBeNull();
    });

    it('should handle empty update data', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.updateCourse(1, {});

      expect(result).toEqual(mockCourse);
    });
  });

  describe('togglePublished', () => {
    it('should publish a course', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.togglePublished(1, true);

      expect(result?.published).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
    });

    it('should unpublish a course', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9900,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.togglePublished(1, false);

      expect(result?.published).toBe(false);
    });
  });

  describe('listCourses', () => {
    it('should list courses with pagination', async () => {
      const mockCourses = [
        {
          id: 1,
          title: 'Course 1',
          description: 'Description 1',
          price_cents: 9900,
          published: true,
          instructor_id: 1,
          created_at: new Date(),
          instructor_name: 'John Doe',
        },
        {
          id: 2,
          title: 'Course 2',
          description: 'Description 2',
          price_cents: 4900,
          published: true,
          instructor_id: 1,
          created_at: new Date(),
          instructor_name: 'John Doe',
        },
      ];

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '2' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess(mockCourses));

      const result = await CoursesService.listCourses({ page: 1, limit: 10 });

      expect(result.courses).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by published_only', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '1' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await CoursesService.listCourses({ published_only: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('c.published = true'),
        expect.any(Array)
      );
    });

    it('should filter by search term', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '0' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await CoursesService.listCourses({ search: 'TypeScript' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%TypeScript%', 10, 0])
      );
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'admin');

      expect(result).toBe(true);
    });

    it('should allow instructor to modify their own course', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        instructor_id: 1,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(result).toBe(true);
    });

    it('should deny instructor from modifying other courses', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        instructor_id: 2,
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockCourse]));

      const result = await CoursesService.canModifyCourse(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should deny students from modifying courses', async () => {
      const result = await CoursesService.canModifyCourse(1, 1, 'student');

      expect(result).toBe(false);
    });
  });

  describe('deleteCourse', () => {
    it('should delete a course', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [], command: 'DELETE', oid: 0, fields: [] });

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM courses WHERE id = $1', [1]);
    });

    it('should return false if course not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [], command: 'DELETE', oid: 0, fields: [] });

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });
  });
});
