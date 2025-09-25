import { EnrollmentsService } from '../../src/services/enrollments.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment successfully for published course', async () => {
      const userId = 1;
      const courseId = 2;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active' as const,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1
        } as any);

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(1, 'SELECT id, published FROM courses WHERE id = $1', [courseId]);
      expect(mockDb.query).toHaveBeenNthCalledWith(2, 'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
      expect(mockDb.query).toHaveBeenNthCalledWith(3, 
        `INSERT INTO enrollments (user_id, course_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id, user_id, course_id, status, created_at`,
        [userId, courseId]
      );
    });

    it('should throw error when course not found', async () => {
      const userId = 1;
      const courseId = 999;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Course not found');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is not published', async () => {
      const userId = 1;
      const courseId = 2;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId, published: false }],
        rowCount: 1
      } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when already enrolled', async () => {
      const userId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any);

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Already enrolled in this course');

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
      const userId = 1;
      const mockEnrollments = [
        {
          id: 1,
          user_id: userId,
          course_id: 2,
          status: 'active' as const,
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
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: mockEnrollments,
          rowCount: 1
        } as any);

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toMatchObject({
        id: 1,
        user_id: userId,
        course_id: 2,
        status: 'active',
        course: {
          id: 2,
          title: 'Test Course',
          description: 'Test Description',
          published: true,
          price_cents: 5000,
          instructor_id: 3
        }
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should return empty result for user with no enrollments', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
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
          status: 'active' as const,
          created_at: new Date(),
          student_id: 2,
          student_name: 'John Doe',
          student_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: mockEnrollments,
          rowCount: 1
        } as any);

      const result = await EnrollmentsService.getCourseEnrollments(courseId);

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]).toMatchObject({
        id: 1,
        user_id: 2,
        course_id: courseId,
        status: 'active' as const,
        student: {
          id: 2,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status successfully', async () => {
      const enrollmentId = 1;
      const newStatus = 'completed';
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 2,
        status: newStatus as 'completed',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedEnrollment],
        rowCount: 1
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

      expect(result).toEqual(mockUpdatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        `UPDATE enrollments 
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, course_id, status, created_at`,
        [newStatus, enrollmentId]
      );
    });

    it('should return null when enrollment not found', async () => {
      const enrollmentId = 999;
      const newStatus = 'completed';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

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
        status: 'active' as const,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockEnrollment],
        rowCount: 1
      } as any);

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toEqual(mockEnrollment);
    });

    it('should return null when enrollment not found', async () => {
      const enrollmentId = 999;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should return true for admin users', async () => {
      const courseId = 1;
      const userId = 1;
      const userRole = 'admin';

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor of the course', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId }],
        rowCount: 1
      } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
    });

    it('should return false for instructor of different course', async () => {
      const courseId = 1;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(false);
    });

    it('should return false for student users', async () => {
      const courseId = 1;
      const userId = 1;
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
