/**
 * Tests for EnrollmentsService
 * 
 * Tests all business logic methods including enrollment creation,
 * retrieval, status updates, and permission checks.
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
    const courseId = 2;

    it('should create enrollment successfully for published course', async () => {
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
          rows: [{
            id: 1,
            user_id: userId,
            course_id: courseId,
            status: 'active',
            created_at: new Date()
          }],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        } as any);

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toEqual({
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: expect.any(Date)
      });

      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(1,
        'SELECT id, published FROM courses WHERE id = $1',
        [courseId]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );
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

    it('should throw error when user already enrolled', async () => {
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
          course_id: 2,
          status: 'active',
          created_at: new Date(),
          course_title: 'Test Course',
          course_description: 'Test Description',
          course_published: true,
          course_price_cents: 5000,
          course_instructor_id: 3
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

      expect(result).toEqual({
        enrollments: [{
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
            price_cents: 5000,
            instructor_id: 3
          }
        }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty result when user has no enrollments', async () => {
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

    it('should handle pagination parameters correctly', async () => {
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

      await EnrollmentsService.getUserEnrollments(userId, { page: 3, limit: 5 });

      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.any(String),
        [userId, 5, 10]
      );
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 1;

    it('should return course enrollments with student details', async () => {
      const mockEnrollments = [
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

      const result = await EnrollmentsService.getCourseEnrollments(courseId);

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
    });

    it('should return empty result when course has no enrollments', async () => {
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

    it('should update enrollment status successfully', async () => {
      const updatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 2,
        status: 'completed',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [updatedEnrollment],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'completed');

      expect(result).toEqual(updatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['completed', enrollmentId]
      );
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'completed');

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    const enrollmentId = 1;

    it('should return enrollment when found', async () => {
      const enrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 2,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [enrollment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toEqual(enrollment);
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
    const userId = 2;

    it('should return true for admin role', async () => {
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

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
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

    it('should return false for student role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'student');

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
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
      expect(EnrollmentsService.isValidStatus(123)).toBe(false);
    });
  });
});
