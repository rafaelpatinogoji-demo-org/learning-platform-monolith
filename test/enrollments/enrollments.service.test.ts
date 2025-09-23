import { EnrollmentsService } from '../../src/services/enrollments.service';
import { testUtils } from '../setup';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = require('../../src/db').db;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment for published course', async () => {
      const userId = 1;
      const courseId = 2;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockEnrollment] });

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
        expect.stringContaining('INSERT INTO enrollments'),
        [userId, courseId]
      );
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw error when course not found', async () => {
      const userId = 1;
      const courseId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Course not found');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is not published', async () => {
      const userId = 1;
      const courseId = 2;

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId, published: false }] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when already enrolled', async () => {
      const userId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Already enrolled in this course');

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
      const userId = 1;
      const options = { page: 1, limit: 10 };
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
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockEnrollments });

      const result = await EnrollmentsService.getUserEnrollments(userId, options);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].course).toEqual({
        id: 2,
        title: 'Test Course',
        description: 'Test Description',
        published: true,
        price_cents: 5000,
        instructor_id: 3
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should handle empty results', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should use default pagination values', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await EnrollmentsService.getUserEnrollments(userId);

      expect(mockDb.query).toHaveBeenNthCalledWith(2,
        expect.any(String),
        [userId, 10, 0]
      );
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments with student details', async () => {
      const courseId = 1;
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
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: mockEnrollments });

      const result = await EnrollmentsService.getCourseEnrollments(courseId);

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student).toEqual({
        id: 2,
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status successfully', async () => {
      const enrollmentId = 1;
      const status = 'completed';
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 2,
        status,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollment] });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        [status, enrollmentId]
      );
      expect(result).toEqual(mockEnrollment);
    });

    it('should return null when enrollment not found', async () => {
      const enrollmentId = 999;
      const status = 'completed';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment when found', async () => {
      const enrollmentId = 1;
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 2,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollment] });

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toEqual(mockEnrollment);
    });

    it('should return null when enrollment not found', async () => {
      const enrollmentId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should allow admin to view any course enrollments', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'admin';

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to view their own course enrollments', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId }] });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
    });

    it('should deny instructor access to other courses', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(false);
    });

    it('should deny student access', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'student';

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

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
    });
  });
});
