import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { db } from '../../src/db';
import { mockStudent, mockInstructor, mockAdmin, mockCourse, mockEnrollment, createMockRequest, createMockResponse } from '../utils/test-helpers';

jest.mock('../../src/db');
jest.mock('../../src/modules/notifications/publisher', () => ({
  publish: jest.fn(),
  isNotificationsEnabled: jest.fn().mockReturnValue(false)
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Enrollments Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/enrollments - enroll', () => {
    it('should successfully enroll student in published course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any);

      const req = createMockRequest(mockStudent, { courseId: mockCourse.id });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: mockEnrollment
        })
      );
    });

    it('should return 409 for duplicate enrollment', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any);

      const req = createMockRequest(mockStudent, { courseId: mockCourse.id });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'ALREADY_ENROLLED'
          })
        })
      );
    });

    it('should return 400 for unpublished course', async () => {
      const unpublishedCourse = { ...mockCourse, published: false };
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedCourse] } as any);

      const req = createMockRequest(mockStudent, { courseId: mockCourse.id });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'COURSE_NOT_PUBLISHED'
          })
        })
      );
    });

    it('should return 404 for course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockStudent, { courseId: 999 });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest(mockStudent, { courseId: 'invalid' });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 for instructor or admin trying to enroll', async () => {
      const req = createMockRequest(mockInstructor, { courseId: mockCourse.id });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when not authenticated', async () => {
      const req = createMockRequest(undefined, { courseId: mockCourse.id });
      const res = createMockResponse();

      await enrollmentsController.enroll(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('GET /api/enrollments/me - getMyEnrollments', () => {
    it('should return user enrollments with pagination', async () => {
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

      const req = createMockRequest(mockStudent, {}, {}, { page: '1', limit: '10' });
      const res = createMockResponse();

      await enrollmentsController.getMyEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.any(Array),
          pagination: expect.any(Object)
        })
      );
    });

    it('should respect page and limit parameters', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockStudent, {}, {}, { page: '2', limit: '5' });
      const res = createMockResponse();

      await enrollmentsController.getMyEnrollments(req as any, res as any);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [mockStudent.id, 5, 5]
      );
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockRequest(undefined);
      const res = createMockResponse();

      await enrollmentsController.getMyEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /api/courses/:courseId/enrollments - getCourseEnrollments', () => {
    it('should allow instructor to view enrollments for their course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockInstructor, {}, { courseId: '1' });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
    });

    it('should allow admin to view enrollments for any course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockAdmin, {}, { courseId: '1' });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 403 for instructor viewing other course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockInstructor, {}, { courseId: '2' });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 for student trying to view enrollments', async () => {
      const req = createMockRequest(mockStudent, {}, { courseId: '1' });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest(mockAdmin, {}, { courseId: 'invalid' });
      const res = createMockResponse();

      await enrollmentsController.getCourseEnrollments(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /api/enrollments/:id/status - updateStatus', () => {
    it('should allow admin to update status to refunded', async () => {
      const refundedEnrollment = { ...mockEnrollment, status: 'refunded' };
      mockDb.query.mockResolvedValueOnce({ rows: [refundedEnrollment] } as any);

      const req = createMockRequest(mockAdmin, { status: 'refunded' }, { id: '1' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: refundedEnrollment
        })
      );
    });

    it('should allow admin to update status to completed', async () => {
      const completedEnrollment = { ...mockEnrollment, status: 'completed' };
      mockDb.query.mockResolvedValueOnce({ rows: [completedEnrollment] } as any);

      const req = createMockRequest(mockAdmin, { status: 'completed' }, { id: '1' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 for invalid status', async () => {
      const req = createMockRequest(mockAdmin, { status: 'invalid' }, { id: '1' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockAdmin, { status: 'refunded' }, { id: '999' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid enrollmentId', async () => {
      const req = createMockRequest(mockAdmin, { status: 'refunded' }, { id: 'invalid' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockRequest(undefined, { status: 'refunded' }, { id: '1' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-admin users', async () => {
      const req = createMockRequest(mockStudent, { status: 'refunded' }, { id: '1' });
      const res = createMockResponse();

      await enrollmentsController.updateStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
