/**
 * Tests for EnrollmentsService
 * 
 * Tests enrollment business logic, database operations, and access control
 * without any database dependencies using mocked database queries.
 */

import { EnrollmentsService, Enrollment, EnrollmentListResult } from '../../src/services/enrollments.service';
import { testUtils } from '../setup';
import { QueryResult } from 'pg';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

import { db } from '../../src/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    const userId = 1;
    const courseId = 2;

    it('should create enrollment successfully for published course', async () => {
      // Arrange
      const mockCourseCheck: QueryResult = {
        rows: [{ id: courseId, published: true }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockExistingCheck: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };
      const mockCreateResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCourseCheck)
        .mockResolvedValueOnce(mockExistingCheck)
        .mockResolvedValueOnce(mockCreateResult);

      // Act
      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      // Assert
      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(1, 
        'SELECT id, published FROM courses WHERE id = $1',
        [courseId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO enrollments'),
        [userId, courseId]
      );
    });

    it('should throw error when course not found', async () => {
      // Arrange
      const mockCourseCheck: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValueOnce(mockCourseCheck);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Course not found');
      
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is not published', async () => {
      // Arrange
      const mockCourseCheck: QueryResult = {
        rows: [{ id: courseId, published: false }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValueOnce(mockCourseCheck);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');
      
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when already enrolled', async () => {
      // Arrange
      const mockCourseCheck: QueryResult = {
        rows: [{ id: courseId, published: true }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockExistingCheck: QueryResult = {
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCourseCheck)
        .mockResolvedValueOnce(mockExistingCheck);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Already enrolled in this course');
      
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserEnrollments', () => {
    const userId = 1;

    it('should return user enrollments with course details and pagination', async () => {
      // Arrange
      const mockCountResult: QueryResult = {
        rows: [{ total: '5' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockEnrollmentsResult: QueryResult = {
        rows: [
          {
            id: 1,
            user_id: userId,
            course_id: 2,
            status: 'active',
            created_at: new Date(),
            course_title: 'Test Course',
            course_description: 'Test Description',
            course_published: true,
            course_price_cents: 1000,
            course_instructor_id: 3
          }
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      // Act
      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 1, limit: 10 });

      // Assert
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toEqual({
        id: 1,
        user_id: userId,
        course_id: 2,
        status: 'active',
        created_at: expect.any(Date),
        course: {
          id: 2,
          title: 'Test Course',
          description: 'Test Description',
          published: true,
          price_cents: 1000,
          instructor_id: 3
        }
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1
      });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should use default pagination when no options provided', async () => {
      // Arrange
      const mockCountResult: QueryResult = {
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      // Act
      const result = await EnrollmentsService.getUserEnrollments(userId);

      // Assert
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [userId, 10, 0]
      );
    });

    it('should calculate correct offset for pagination', async () => {
      // Arrange
      const mockCountResult: QueryResult = {
        rows: [{ total: '25' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      // Act
      await EnrollmentsService.getUserEnrollments(userId, { page: 3, limit: 5 });

      // Assert
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [userId, 5, 10]
      );
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 1;

    it('should return course enrollments with student details', async () => {
      // Arrange
      const mockCountResult: QueryResult = {
        rows: [{ total: '3' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockEnrollmentsResult: QueryResult = {
        rows: [
          {
            id: 1,
            user_id: 2,
            course_id: courseId,
            status: 'active',
            created_at: new Date(),
            student_id: 2,
            student_name: 'John Doe',
            student_email: 'john@example.com'
          }
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      // Act
      const result = await EnrollmentsService.getCourseEnrollments(courseId, { page: 1, limit: 10 });

      // Assert
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toEqual({
        id: 1,
        user_id: 2,
        course_id: courseId,
        status: 'active',
        created_at: expect.any(Date),
        student: {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
      expect(result.pagination.total).toBe(3);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockCountResult: QueryResult = {
        rows: [{ total: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      const mockEnrollmentsResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };

      mockDb.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockEnrollmentsResult);

      // Act
      const result = await EnrollmentsService.getCourseEnrollments(courseId);

      // Assert
      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateEnrollmentStatus', () => {
    const enrollmentId = 1;

    it('should update enrollment status successfully', async () => {
      // Arrange
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 2,
        course_id: 3,
        status: 'completed',
        created_at: new Date()
      };
      const mockResult: QueryResult = {
        rows: [mockUpdatedEnrollment],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'completed');

      // Assert
      expect(result).toEqual(mockUpdatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['completed', enrollmentId]
      );
    });

    it('should return null when enrollment not found', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'refunded');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      // Arrange
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 2,
        course_id: 3,
        status: 'refunded',
        created_at: new Date()
      };
      const mockResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query.mockResolvedValue(mockResult);

      const statuses: Array<'active' | 'completed' | 'refunded'> = ['active', 'completed', 'refunded'];
      
      for (const status of statuses) {
        mockEnrollment.status = status;
        const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);
        expect(result?.status).toBe(status);
      }
    });
  });

  describe('getEnrollmentById', () => {
    const enrollmentId = 1;

    it('should return enrollment when found', async () => {
      // Arrange
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 2,
        course_id: 3,
        status: 'active',
        created_at: new Date()
      };
      const mockResult: QueryResult = {
        rows: [mockEnrollment],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      // Assert
      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
        [enrollmentId]
      );
    });

    it('should return null when enrollment not found', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      };

      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    const courseId = 1;
    const userId = 2;

    it('should return true for admin users', async () => {
      // Act
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'admin');

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor who owns the course', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [{ id: courseId }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
    });

    it('should return false for instructor who does not own the course', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      };
      mockDb.query.mockResolvedValueOnce(mockResult);

      // Act
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for student users', async () => {
      // Act
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'student');

      // Assert
      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return false for unknown roles', async () => {
      // Act
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'unknown');

      // Assert
      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('isValidStatus', () => {
    it('should return true for valid status values', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should return false for invalid status values', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
      expect(EnrollmentsService.isValidStatus(123)).toBe(false);
      expect(EnrollmentsService.isValidStatus({})).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(EnrollmentsService.isValidStatus('Active')).toBe(false);
      expect(EnrollmentsService.isValidStatus('ACTIVE')).toBe(false);
      expect(EnrollmentsService.isValidStatus('Completed')).toBe(false);
    });
  });
});
