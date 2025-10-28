import { progressController } from '../../src/controllers/progress.controller';
import { db } from '../../src/db';
import { mockStudent, mockInstructor, mockAdmin, mockCourse, mockEnrollment, mockLesson, mockLessonProgress, createMockRequest, createMockResponse } from '../utils/test-helpers';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('Progress Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/progress/complete - markComplete', () => {
    it('should mark lesson as complete', async () => {
      const enrollmentWithCourse = {
        ...mockEnrollment,
        course_id: 1,
        course_title: 'Test Course'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any);

      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 1, completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            completed: true
          })
        })
      );
    });

    it('should mark lesson as incomplete', async () => {
      const enrollmentWithCourse = {
        ...mockEnrollment,
        course_id: 1,
        course_title: 'Test Course'
      };
      const incompleteProgress = { ...mockLessonProgress, completed: false, completed_at: null };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any)
        .mockResolvedValueOnce({ rows: [incompleteProgress] } as any);

      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 1, completed: false }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            completed: false
          })
        })
      );
    });

    it('should be idempotent when marking complete twice', async () => {
      const enrollmentWithCourse = {
        ...mockEnrollment,
        course_id: 1,
        course_title: 'Test Course'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any);

      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 1, completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 for invalid enrollmentId', async () => {
      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 'invalid', lessonId: 1, completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid lessonId', async () => {
      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 'invalid', completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing completed field', async () => {
      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 1 }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 999, lessonId: 1, completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for wrong user', async () => {
      const otherUserEnrollment = {
        ...mockEnrollment,
        user_id: 999,
        course_id: 1,
        course_title: 'Test Course'
      };
      mockDb.query.mockResolvedValueOnce({ rows: [otherUserEnrollment] } as any);

      const req = createMockRequest(
        mockStudent,
        { enrollmentId: 1, lessonId: 1, completed: true }
      );
      const res = createMockResponse();

      await progressController.markComplete(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('GET /api/progress/me - getMyProgress', () => {
    it('should return progress summary for enrolled student', async () => {
      const enrollment = { ...mockEnrollment };
      const lessonsWithProgress = [
        {
          lesson_id: 1,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date()
        },
        {
          lesson_id: 2,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: false,
          completed_at: null
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: lessonsWithProgress } as any);

      const req = createMockRequest(mockStudent, {}, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getMyProgress(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            lessonsCompleted: 1,
            totalLessons: 2,
            percent: 50
          })
        })
      );
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any);

      const req = createMockRequest(mockStudent, {}, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getMyProgress(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            lessonsCompleted: 0,
            totalLessons: 5
          })
        })
      );
    });

    it('should return 400 for missing courseId', async () => {
      const req = createMockRequest(mockStudent, {}, {}, {});
      const res = createMockResponse();

      await progressController.getMyProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest(mockStudent, {}, {}, { courseId: 'invalid' });
      const res = createMockResponse();

      await progressController.getMyProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/courses/:courseId/progress - getCourseProgress', () => {
    it('should allow instructor to view progress for their course', async () => {
      const course = { ...mockCourse, instructor_id: mockInstructor.id };
      const progressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@test.com',
          enrollment_id: 1,
          completed_count: '3'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [course] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any)
        .mockResolvedValueOnce({ rows: progressData } as any);

      const req = createMockRequest(mockInstructor, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              completedCount: 3,
              totalLessons: 10,
              percent: 30
            })
          ])
        })
      );
    });

    it('should allow admin to view progress for any course', async () => {
      const course = { ...mockCourse };
      mockDb.query
        .mockResolvedValueOnce({ rows: [course] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockAdmin, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 for course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const req = createMockRequest(mockInstructor, {}, { courseId: '999' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for instructor viewing other course', async () => {
      const course = { ...mockCourse, instructor_id: 999 };
      mockDb.query.mockResolvedValueOnce({ rows: [course] } as any);

      const req = createMockRequest(mockInstructor, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 for student trying to view progress', async () => {
      const course = { ...mockCourse };
      mockDb.query.mockResolvedValueOnce({ rows: [course] } as any);

      const req = createMockRequest(mockStudent, {}, { courseId: '1' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest(mockAdmin, {}, { courseId: 'invalid' });
      const res = createMockResponse();

      await progressController.getCourseProgress(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
