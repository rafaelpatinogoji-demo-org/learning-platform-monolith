import { EnrollmentsService } from '../enrollments.service';
import { db } from '../../db';

jest.mock('../../db');

const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    const userId = 1;
    const courseId = 10;

    it('should successfully create an enrollment for a published course', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
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
        });

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toHaveProperty('id');
      expect(result.user_id).toBe(userId);
      expect(result.course_id).toBe(courseId);
      expect(result.status).toBe('active');
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error when course is not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects
        .toThrow('Course not found');
    });

    it('should throw error when trying to enroll in unpublished course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId, published: false }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects
        .toThrow('Cannot enroll in unpublished course');
    });

    it('should throw error when user is already enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, published: true }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 5 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects
        .toThrow('Already enrolled in this course');
    });
  });

  describe('getUserEnrollments', () => {
    const userId = 1;

    it('should return user enrollments with default pagination', async () => {
      const enrollmentsData = [
        {
          id: 1,
          user_id: userId,
          course_id: 10,
          status: 'active',
          created_at: new Date(),
          course_title: 'Test Course 1',
          course_description: 'Description 1',
          course_published: true,
          course_price_cents: 5000,
          course_instructor_id: 2
        },
        {
          id: 2,
          user_id: userId,
          course_id: 11,
          status: 'completed',
          created_at: new Date(),
          course_title: 'Test Course 2',
          course_description: 'Description 2',
          course_published: true,
          course_price_cents: 10000,
          course_instructor_id: 3
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '2' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: enrollmentsData,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(2);
      expect(result.enrollments[0]).toHaveProperty('course');
      expect(result.enrollments[0].course?.title).toBe('Test Course 1');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should handle custom pagination parameters', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '25' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

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

    it('should return empty enrollments when user has none', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await EnrollmentsService.getUserEnrollments(userId);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('getCourseEnrollments', () => {
    const courseId = 10;

    it('should return course enrollments with student details', async () => {
      const enrollmentsData = [
        {
          id: 1,
          user_id: 1,
          course_id: courseId,
          status: 'active',
          created_at: new Date(),
          student_id: 1,
          student_name: 'John Doe',
          student_email: 'john@example.com'
        },
        {
          id: 2,
          user_id: 2,
          course_id: courseId,
          status: 'completed',
          created_at: new Date(),
          student_id: 2,
          student_name: 'Jane Smith',
          student_email: 'jane@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '2' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: enrollmentsData,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await EnrollmentsService.getCourseEnrollments(courseId);

      expect(result.enrollments).toHaveLength(2);
      expect(result.enrollments[0]).toHaveProperty('student');
      expect(result.enrollments[0].student?.name).toBe('John Doe');
      expect(result.enrollments[0].student?.email).toBe('john@example.com');
      expect(result.pagination.total).toBe(2);
    });

    it('should handle custom pagination for course enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ total: '50' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        });

      const result = await EnrollmentsService.getCourseEnrollments(courseId, { page: 3, limit: 20 });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
        totalPages: 3
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [courseId, 20, 40]
      );
    });
  });

  describe('updateEnrollmentStatus', () => {
    const enrollmentId = 1;

    it('should successfully update status to completed', async () => {
      const updatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 10,
        status: 'completed',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [updatedEnrollment],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'completed');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('completed');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['completed', enrollmentId]
      );
    });

    it('should successfully update status to refunded', async () => {
      const updatedEnrollment = {
        id: enrollmentId,
        user_id: 1,
        course_id: 10,
        status: 'refunded',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [updatedEnrollment],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'refunded');

      expect(result?.status).toBe('refunded');
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.updateEnrollmentStatus(999, 'completed');

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment when found', async () => {
      const enrollment = {
        id: 1,
        user_id: 1,
        course_id: 10,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [enrollment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.getEnrollmentById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.status).toBe('active');
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.getEnrollmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    const courseId = 10;
    const userId = 1;

    it('should return true for admin role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor viewing their own course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
    });

    it('should return false for instructor viewing another instructor course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return false for unknown role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, userId, 'unknown');

      expect(result).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    it('should return true for valid status active', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
    });

    it('should return true for valid status completed', () => {
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
    });

    it('should return true for valid status refunded', () => {
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('pending')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
    });
  });
});
