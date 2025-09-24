/**
 * Tests for enrollments service
 * 
 * Tests enrollment business logic, validation, and database operations
 * with mocked database interactions.
 */

import { EnrollmentsService } from '../../src/services/enrollments.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    const userId = 1;
    const courseId = 1;

    it('should create enrollment successfully', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

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
        `INSERT INTO enrollments (user_id, course_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id, user_id, course_id, status, created_at`,
        [userId, courseId]
      );
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Course not found');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is not published', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId, published: false }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when already enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Already enrolled in this course');

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEnrollments', () => {
    const userId = 1;

    it('should return user enrollments with pagination', async () => {
      const mockEnrollments = [
        {
          id: 1,
          user_id: userId,
          course_id: 1,
          status: 'active',
          created_at: new Date(),
          course_title: 'Test Course',
          course_description: 'Test Description',
          course_published: true,
          course_price_cents: 1000,
          course_instructor_id: 2
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: mockEnrollments,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 1, limit: 10 });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        'SELECT COUNT(*) as total FROM enrollments WHERE user_id = $1',
        [userId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SELECT'),
        [userId, 10, 0]
      );

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toEqual({
        id: 1,
        user_id: userId,
        course_id: 1,
        status: 'active',
        created_at: expect.any(Date),
        course: {
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          published: true,
          price_cents: 1000,
          instructor_id: 2
        }
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should handle empty results', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      await EnrollmentsService.getUserEnrollments(userId);

      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SELECT'),
        [userId, 10, 0]
      );
    });

    it('should handle custom pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '25' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 3, limit: 5 });

      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SELECT'),
        [userId, 5, 10]
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5
      });
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 1;

    it('should return course enrollments with student details', async () => {
      const mockEnrollments = [
        {
          id: 1,
          user_id: 1,
          course_id: courseId,
          status: 'active',
          created_at: new Date(),
          student_id: 1,
          student_name: 'John Doe',
          student_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: mockEnrollments,
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.getCourseEnrollments(courseId, { page: 1, limit: 10 });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        'SELECT COUNT(*) as total FROM enrollments WHERE course_id = $1',
        [courseId]
      );

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toEqual({
        id: 1,
        user_id: 1,
        course_id: courseId,
        status: 'active',
        created_at: expect.any(Date),
        student: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    it('should handle empty course enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.getCourseEnrollments(courseId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateEnrollmentStatus', () => {
    const enrollmentId = 1;
    const newStatus = 'completed';

    it('should update enrollment status successfully', async () => {
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 1,
        status: newStatus,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedEnrollment],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

      expect(mockDb.query).toHaveBeenCalledWith(
        `UPDATE enrollments 
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, course_id, status, created_at`,
        [newStatus, enrollmentId]
      );
      expect(result).toEqual(mockUpdatedEnrollment);
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      const statuses: Array<'active' | 'completed' | 'refunded'> = ['active', 'completed', 'refunded'];
      
      for (const status of statuses) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: enrollmentId, status }],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: []
        } as any);

        const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);
        expect(result).toBeTruthy();
      }
    });
  });

  describe('getEnrollmentById', () => {
    const enrollmentId = 1;

    it('should return enrollment when found', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockEnrollment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
        [enrollmentId]
      );
      expect(result).toEqual(mockEnrollment);
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    const courseId = 1;
    const userId = 1;

    it('should return true for admin users', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor who owns the course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
      expect(result).toBe(true);
    });

    it('should return false for instructor who does not own the course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student users', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return false for unknown roles', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'unknown');

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
