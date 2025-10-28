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

import { EnrollmentsService } from '../../src/services/enrollments.service';

describe('EnrollmentsService', () => {
  beforeEach(() => {
    resetDbMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment for published course', async () => {
      const userId = 1;
      const courseId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        published: true,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockEnrollment]));

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toEqual(mockEnrollment);
      expect(result.status).toBe('active');
    });

    it('should reject enrollment for non-existent course', async () => {
      const userId = 1;
      const courseId = 999;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        EnrollmentsService.createEnrollment(userId, courseId)
      ).rejects.toThrow('Course not found');
    });

    it('should reject enrollment for unpublished course', async () => {
      const userId = 1;
      const courseId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        published: false,
      }]));

      await expect(
        EnrollmentsService.createEnrollment(userId, courseId)
      ).rejects.toThrow('Cannot enroll in unpublished course');
    });

    it('should reject duplicate enrollment', async () => {
      const userId = 1;
      const courseId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        published: true,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
      }]));

      await expect(
        EnrollmentsService.createEnrollment(userId, courseId)
      ).rejects.toThrow('Already enrolled in this course');
    });
  });

  describe('getUserEnrollments', () => {
    it('should get user enrollments with pagination', async () => {
      const userId = 1;

      const mockEnrollments = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          status: 'active',
          created_at: new Date(),
          course_title: 'Course 1',
          course_description: 'Description 1',
          course_published: true,
          course_price_cents: 9900,
          course_instructor_id: 2,
        },
      ];

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '1' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess(mockEnrollments));

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].course).toBeDefined();
      expect(result.enrollments[0].course?.title).toBe('Course 1');
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty enrollments', async () => {
      const userId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '0' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getCourseEnrollments', () => {
    it('should get course enrollments with student details', async () => {
      const courseId = 1;

      const mockEnrollments = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          status: 'active',
          created_at: new Date(),
          student_id: 1,
          student_name: 'John Doe',
          student_email: 'john@example.com',
        },
      ];

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '1' }]));
      mockQuery.mockResolvedValueOnce(mockQuerySuccess(mockEnrollments));

      const result = await EnrollmentsService.getCourseEnrollments(courseId, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student).toBeDefined();
      expect(result.enrollments[0].student?.name).toBe('John Doe');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status to completed', async () => {
      const enrollmentId = 1;
      const status = 'completed';

      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'completed',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockEnrollment]));

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);

      expect(result?.status).toBe('completed');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        [status, enrollmentId]
      );
    });

    it('should return null for non-existent enrollment', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await EnrollmentsService.updateEnrollmentStatus(999, 'completed');

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    it('should get enrollment by id', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockEnrollment]));

      const result = await EnrollmentsService.getEnrollmentById(1);

      expect(result).toEqual(mockEnrollment);
    });

    it('should return null if not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await EnrollmentsService.getEnrollmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should allow admin to view any course enrollments', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'admin');

      expect(result).toBe(true);
    });

    it('should allow instructor to view their own course enrollments', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ id: 1 }]));

      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'instructor');

      expect(result).toBe(true);
    });

    it('should deny instructor viewing other courses', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'instructor');

      expect(result).toBe(false);
    });

    it('should deny students', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'student');

      expect(result).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    it('should validate active status', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
    });

    it('should validate completed status', () => {
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
    });

    it('should validate refunded status', () => {
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
    });
  });
});
