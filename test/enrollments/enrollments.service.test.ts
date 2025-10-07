import { EnrollmentsService } from '../../src/services/enrollments.service';
import { db } from '../../src/db';
import { mockDbQueryResult, mockEnrollment, mockCourse } from '../utils/test-helpers';

const mockDb = db as jest.Mocked<typeof db>;

describe('EnrollmentsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should successfully create enrollment for published course', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, published: true }]))
        .mockResolvedValueOnce(mockDbQueryResult([]))
        .mockResolvedValueOnce(mockDbQueryResult([mockEnrollment()]));

      const result = await EnrollmentsService.createEnrollment(1, 1);

      expect(result).toEqual(mockEnrollment());
      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id, published FROM courses WHERE id = $1',
        [1]
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [1, 1]
      );
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      await expect(EnrollmentsService.createEnrollment(1, 999)).rejects.toThrow(
        'Course not found'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when course is unpublished', async () => {
      mockDb.query.mockResolvedValueOnce(
        mockDbQueryResult([{ id: 1, published: false }])
      );

      await expect(EnrollmentsService.createEnrollment(1, 1)).rejects.toThrow(
        'Cannot enroll in unpublished course'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error when already enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, published: true }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]));

      await expect(EnrollmentsService.createEnrollment(1, 1)).rejects.toThrow(
        'Already enrolled in this course'
      );
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
      const enrollmentWithCourse = {
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date('2024-01-01'),
        course_title: 'Test Course',
        course_description: 'Test Description',
        course_published: true,
        course_price_cents: 9900,
        course_instructor_id: 2,
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '5' }]))
        .mockResolvedValueOnce(mockDbQueryResult([enrollmentWithCourse]));

      const result = await EnrollmentsService.getUserEnrollments(1, {
        page: 1,
        limit: 10,
      });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].course).toBeDefined();
      expect(result.enrollments[0].course?.title).toBe('Test Course');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
      });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when user has no enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '0' }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.getUserEnrollments(1);

      expect(result.enrollments).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should correctly calculate pagination metadata', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '25' }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.getUserEnrollments(1, {
        page: 2,
        limit: 10,
      });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should use default pagination values', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '0' }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      await EnrollmentsService.getUserEnrollments(1);

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [1, 10, 0]
      );
    });
  });

  describe('getCourseEnrollments', () => {
    it('should return course enrollments with student details', async () => {
      const enrollmentWithStudent = {
        id: 1,
        user_id: 1,
        course_id: 1,
        status: 'active',
        created_at: new Date('2024-01-01'),
        student_id: 1,
        student_name: 'Test Student',
        student_email: 'student@test.com',
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '3' }]))
        .mockResolvedValueOnce(mockDbQueryResult([enrollmentWithStudent]));

      const result = await EnrollmentsService.getCourseEnrollments(1, {
        page: 1,
        limit: 10,
      });

      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0].student).toBeDefined();
      expect(result.enrollments[0].student?.name).toBe('Test Student');
      expect(result.pagination.total).toBe(3);
    });

    it('should return empty array when course has no enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '0' }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.getCourseEnrollments(1);

      expect(result.enrollments).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should correctly handle pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '15' }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      await EnrollmentsService.getCourseEnrollments(1, { page: 2, limit: 5 });

      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        [1, 5, 5]
      );
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should successfully update status to active', async () => {
      const updatedEnrollment = mockEnrollment({ status: 'active' });
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([updatedEnrollment]));

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'active');

      expect(result).toEqual(updatedEnrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrollments'),
        ['active', 1]
      );
    });

    it('should successfully update status to completed', async () => {
      const updatedEnrollment = mockEnrollment({ status: 'completed' });
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([updatedEnrollment]));

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'completed');

      expect(result).toEqual(updatedEnrollment);
      expect(result?.status).toBe('completed');
    });

    it('should successfully update status to refunded', async () => {
      const updatedEnrollment = mockEnrollment({ status: 'refunded' });
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([updatedEnrollment]));

      const result = await EnrollmentsService.updateEnrollmentStatus(1, 'refunded');

      expect(result).toEqual(updatedEnrollment);
      expect(result?.status).toBe('refunded');
    });

    it('should return null when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.updateEnrollmentStatus(999, 'active');

      expect(result).toBeNull();
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment when found', async () => {
      const enrollment = mockEnrollment();
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([enrollment]));

      const result = await EnrollmentsService.getEnrollmentById(1);

      expect(result).toEqual(enrollment);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
        [1]
      );
    });

    it('should return null when not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.getEnrollmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should return true for admin role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'admin');

      expect(result).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should return true for instructor of the course', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]));

      const result = await EnrollmentsService.canViewCourseEnrollments(1, 2, 'instructor');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [1, 2]
      );
    });

    it('should return false for instructor of different course', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await EnrollmentsService.canViewCourseEnrollments(1, 3, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for student role', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'student');

      expect(result).toBe(false);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('isValidStatus', () => {
    it('should return true for active', () => {
      expect(EnrollmentsService.isValidStatus('active')).toBe(true);
    });

    it('should return true for completed', () => {
      expect(EnrollmentsService.isValidStatus('completed')).toBe(true);
    });

    it('should return true for refunded', () => {
      expect(EnrollmentsService.isValidStatus('refunded')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(EnrollmentsService.isValidStatus('invalid')).toBe(false);
      expect(EnrollmentsService.isValidStatus('')).toBe(false);
      expect(EnrollmentsService.isValidStatus(null)).toBe(false);
      expect(EnrollmentsService.isValidStatus(undefined)).toBe(false);
    });
  });
});
