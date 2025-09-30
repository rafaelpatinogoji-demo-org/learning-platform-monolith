import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EnrollmentsService, Enrollment, EnrollmentListResult } from '../src/services/enrollments.service';
import { db } from '../src/db';
import { QueryResult } from 'pg';

jest.mock('../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createEnrollment', () => {
    it('should successfully create enrollment for published course', async () => {
      const mockCourseResult: QueryResult = {
        rows: [{ id: 1, published: true }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockExistingResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      const mockEnrollment = {
        id: 1,
        user_id: 10,
        course_id: 1,
        status: 'active' as const,
        created_at: new Date(),
      };

      const mockInsertResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'INSERT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCourseResult)
        .mockResolvedValueOnce(mockExistingResult)
        .mockResolvedValueOnce(mockInsertResult);

      const result = await EnrollmentsService.createEnrollment(10, 1);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [10, 1]
      );
    });

    it('should throw error when course not found', async () => {
      const mockCourseResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query.mockResolvedValueOnce(mockCourseResult);

      await expect(EnrollmentsService.createEnrollment(10, 999)).rejects.toThrow(
        'Course not found'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is not published', async () => {
      const mockCourseResult: QueryResult = {
        rows: [{ id: 1, published: false }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query.mockResolvedValueOnce(mockCourseResult);

      await expect(EnrollmentsService.createEnrollment(10, 1)).rejects.toThrow(
        'Cannot enroll in unpublished course'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when user already enrolled', async () => {
      const mockCourseResult: QueryResult = {
        rows: [{ id: 1, published: true }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockExistingResult: QueryResult = {
        rows: [{ id: 5 }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCourseResult)
        .mockResolvedValueOnce(mockExistingResult);

      await expect(EnrollmentsService.createEnrollment(10, 1)).rejects.toThrow(
        'Already enrolled in this course'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEnrollments', () => {
    it('should return enrollments with course details and pagination', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '25' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [
          {
            id: 1,
            user_id: 10,
            course_id: 5,
            status: 'active',
            created_at: new Date(),
            course_title: 'Test Course',
            course_description: 'Test Description',
            course_published: true,
            course_price_cents: 9900,
            course_instructor_id: 2,
          },
          {
            id: 2,
            user_id: 10,
            course_id: 6,
            status: 'completed',
            created_at: new Date(),
            course_title: 'Another Course',
            course_description: null,
            course_published: true,
            course_price_cents: 4900,
            course_instructor_id: 3,
          },
        ],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 2,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getUserEnrollments(10, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(2);
      expect(result.enrollments[0]).toHaveProperty('course');
      expect(result.enrollments[0].course?.title).toBe('Test Course');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should handle pagination parameters correctly', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '50' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getUserEnrollments(10, { page: 3, limit: 20 });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [10, 20, 40]
      );
    });

    it('should return empty array when user has no enrollments', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '0' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getUserEnrollments(10);

      expect(result.enrollments).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should calculate pagination metadata correctly', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '100' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getUserEnrollments(10, { page: 1, limit: 15 });

      expect(result.pagination.totalPages).toBe(7);
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return enrollments with student details and pagination', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '15' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [
          {
            id: 1,
            user_id: 10,
            course_id: 5,
            status: 'active',
            created_at: new Date(),
            student_id: 10,
            student_name: 'John Doe',
            student_email: 'john@example.com',
          },
        ],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getCourseEnrollments(5, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toHaveProperty('student');
      expect(result.enrollments[0].student?.name).toBe('John Doe');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it('should handle pagination parameters correctly', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '30' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      await EnrollmentsService.getCourseEnrollments(5, { page: 2, limit: 5 });

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [5, 5, 5]
      );
    });

    it('should return empty array when course has no enrollments', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '0' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getCourseEnrollments(5);

      expect(result.enrollments).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should calculate pagination metadata correctly', async () => {
      const mockCountResult: QueryResult = {
        rows: [{ total: '47' }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      const result = await EnrollmentsService.getCourseEnrollments(5, { page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should successfully update enrollment status', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'completed' as const,
        created_at: new Date(),
      };

      const mockResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'UPDATE',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'completed');

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['completed', 1]
      );
    });

    it('should return null when enrollment not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        command: 'UPDATE',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.updateEnrollmentStatus(999, 'completed');

      expect(result).toBeNull();
    });

    it('should accept all valid status values', async () => {
      const statuses: Array<'active' | 'completed' | 'refunded'> = ['active', 'completed', 'refunded'];

      for (const status of statuses) {
        const mockEnrollment = {
          id: 1,
          user_id: 10,
          course_id: 5,
          status,
          created_at: new Date(),
        };

        const mockResult: QueryResult = {
          rows: [mockEnrollment],
          command: 'UPDATE',
          oid: 0,
          fields: [],
          rowCount: 1,
        };

        mockDb.query.mockResolvedValueOnce(mockResult);

        const result = await EnrollmentsService.updateEnrollmentStatus(1, status);

        expect(result?.status).toBe(status);
      }
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment when found', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 10,
        course_id: 5,
        status: 'active' as const,
        created_at: new Date(),
      };

      const mockResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.getEnrollmentById(1);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
        [1]
      );
    });

    it('should return null when not found', async () => {
      const mockResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.getEnrollmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should return true for admin role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(5, 10, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor who owns the course', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 5 }],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 1,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.canViewCourseEnrollments(5, 10, 'instructor');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [5, 10]
      );
    });

    it('should return false for instructor who does not own the course', async () => {
      const mockResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        oid: 0,
        fields: [],
        rowCount: 0,
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      const result = await EnrollmentsService.canViewCourseEnrollments(5, 10, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(5, 10, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('isValidStatus', () => {
    it('should return true for valid statuses', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('pending')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
      expect(EnrollmentsService.isValidStatus(123)).toBe(false);
    });
  });
});
