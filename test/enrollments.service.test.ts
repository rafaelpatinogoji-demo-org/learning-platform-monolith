import { EnrollmentsService } from '../src/services/enrollments.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('EnrollmentsService', () => {
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create enrollment for published course', async () => {
      const userId = 1;
      const courseId = 100;
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(1, 'SELECT id, published FROM courses WHERE id = $1', [courseId]);
      expect(mockDb.query).toHaveBeenNthCalledWith(2, 'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
    });

    it('should throw error if course not found', async () => {
      const userId = 1;
      const courseId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Course not found');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error if course is not published', async () => {
      const userId = 1;
      const courseId = 100;

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId, published: false }], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error if already enrolled', async () => {
      const userId = 1;
      const courseId = 100;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], command: '', rowCount: 1, oid: 0, fields: [] });

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
          course_id: 100,
          status: 'active',
          created_at: new Date(),
          course_title: 'Test Course',
          course_description: 'Test Description',
          course_published: true,
          course_price_cents: 1999,
          course_instructor_id: 2
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockEnrollments, command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1
      });
      expect(result.enrollments[0].course).toBeDefined();
      expect(result.enrollments[0].course?.title).toBe('Test Course');
    });

    it('should use default pagination values', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 10, 0]
      );
    });

    it('should handle custom pagination', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '25' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await EnrollmentsService.getUserEnrollments(userId, { page: 2, limit: 5 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [userId, 5, 5]
      );
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments with student details', async () => {
      const courseId = 100;
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
        .mockResolvedValueOnce({ rows: [{ total: '3' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockEnrollments, command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.getCourseEnrollments(courseId, { page: 1, limit: 10 });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student).toBeDefined();
      expect(result.enrollments[0].student?.name).toBe('John Doe');
      expect(result.pagination.total).toBe(3);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status successfully', async () => {
      const enrollmentId = 1;
      const newStatus = 'completed';
      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 100,
        status: newStatus,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

      expect(result).toEqual(mockUpdatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        [newStatus, enrollmentId]
      );
    });

    it('should return null if enrollment not found', async () => {
      const enrollmentId = 999;
      const newStatus = 'completed';

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, newStatus);

      expect(result).toBeNull();
    });

    it('should handle all valid status values', async () => {
      const enrollmentId = 1;
      const statuses: Array<'active' | 'completed' | 'refunded'> = ['active', 'completed', 'refunded'];

      for (const status of statuses) {
        mockDb.query.mockResolvedValueOnce({
          rows: [{ id: enrollmentId, user_id: 1, course_id: 100, status, created_at: new Date() }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, status);
        expect(result?.status).toBe(status);
      }
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment by id', async () => {
      const enrollmentId = 1;
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 100,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
        [enrollmentId]
      );
    });

    it('should return null if enrollment not found', async () => {
      const enrollmentId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await EnrollmentsService.getEnrollmentById(enrollmentId);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should allow admin to view any course enrollments', async () => {
      const courseId = 100;
      const userId = 1;
      const userRole = 'admin';

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to view their own course enrollments', async () => {
      const courseId = 100;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
    });

    it('should deny instructor from viewing other instructor courses', async () => {
      const courseId = 100;
      const userId = 2;
      const userRole = 'instructor';

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(false);
    });

    it('should deny student from viewing course enrollments', async () => {
      const courseId = 100;
      const userId = 1;
      const userRole = 'student';

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, userRole);

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('isValidStatus', () => {
    it('should validate correct status values', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should reject invalid status values', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('pending')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
    });
  });
});
