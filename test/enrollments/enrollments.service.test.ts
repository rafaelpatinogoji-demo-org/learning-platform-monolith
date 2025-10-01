import { EnrollmentsService } from '../../src/services/enrollments.service';
import { db } from '../../src/db';
import { mockStudent, mockCourse, mockUnpublishedCourse, mockEnrollment, mockInstructor } from '../utils/test-helpers';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should successfully create enrollment for published course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any);

      const result = await EnrollmentsService.createEnrollment(mockStudent.id, mockCourse.id);

      expect(result).toEqual(mockEnrollment);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id, published FROM courses WHERE id = $1',
        [mockCourse.id]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [mockStudent.id, mockCourse.id]
      );
    });

    it('should throw error if course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        EnrollmentsService.createEnrollment(mockStudent.id, 999)
      ).rejects.toThrow('Course not found');
    });

    it('should throw error if course not published', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockUnpublishedCourse] } as any);

      await expect(
        EnrollmentsService.createEnrollment(mockStudent.id, mockUnpublishedCourse.id)
      ).rejects.toThrow('Cannot enroll in unpublished course');
    });

    it('should throw error if already enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any);

      await expect(
        EnrollmentsService.createEnrollment(mockStudent.id, mockCourse.id)
      ).rejects.toThrow('Already enrolled in this course');
    });
  });

  describe('getUserEnrollments', () => {
    it('should return paginated enrollments with course details', async () => {
      const enrollments = [{
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date(),
        course_title: 'Test Course',
        course_description: 'Description',
        course_published: true,
        course_price_cents: 5000,
        course_instructor_id: 2
      }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: enrollments } as any);

      const result = await EnrollmentsService.getUserEnrollments(mockStudent.id);

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].course).toBeDefined();
      expect(result.enrollments[0].course?.title).toBe('Test Course');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should handle pagination parameters correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.getUserEnrollments(mockStudent.id, { page: 2, limit: 5 });

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [mockStudent.id, 5, 5]
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5
      });
    });

    it('should return empty list for user with no enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.getUserEnrollments(mockStudent.id);

      expect(result.enrollments).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return paginated enrollments with student details', async () => {
      const enrollments = [{
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date(),
        student_id: 1,
        student_name: 'Test Student',
        student_email: 'student@test.com'
      }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: enrollments } as any);

      const result = await EnrollmentsService.getCourseEnrollments(mockCourse.id);

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student).toBeDefined();
      expect(result.enrollments[0].student?.name).toBe('Test Student');
      expect(result.pagination.total).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.getCourseEnrollments(mockCourse.id, { page: 3, limit: 20 });

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [mockCourse.id, 20, 40]
      );
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should successfully update status to completed', async () => {
      const updatedEnrollment = { ...mockEnrollment, status: 'completed' };
      mockDb.query.mockResolvedValueOnce({ rows: [updatedEnrollment] } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'completed');

      expect(result).toEqual(updatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['completed', 1]
      );
    });

    it('should successfully update status to refunded', async () => {
      const refundedEnrollment = { ...mockEnrollment, status: 'refunded' };
      mockDb.query.mockResolvedValueOnce({ rows: [refundedEnrollment] } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'refunded');

      expect(result?.status).toBe('refunded');
    });

    it('should return null if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.updateEnrollmentStatus(999, 'completed');

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment when found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollment] } as any);

      const result = await EnrollmentsService.getEnrollmentById(1);

      expect(result).toEqual(mockEnrollment);
    });

    it('should return null when not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.getEnrollmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should return true for admin role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(
        mockCourse.id,
        mockStudent.id,
        'admin'
      );

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor who owns course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse] } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(
        mockCourse.id,
        mockInstructor.id,
        'instructor'
      );

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [mockCourse.id, mockInstructor.id]
      );
    });

    it('should return false for instructor who does not own course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await EnrollmentsService.canViewCourseEnrollments(
        mockCourse.id,
        999,
        'instructor'
      );

      expect(result).toBe(false);
    });

    it('should return false for student role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(
        mockCourse.id,
        mockStudent.id,
        'student'
      );

      expect(result).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    it('should return true for active status', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
    });

    it('should return true for completed status', () => {
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
    });

    it('should return true for refunded status', () => {
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
    });
  });
});
