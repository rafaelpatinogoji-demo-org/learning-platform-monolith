import { ProgressService, progressService } from '../../src/services/progress.service';
import { testUtils } from '../setup';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = require('../../src/db').db;

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 2;
    const lessonId = 3;
    const courseId = 4;

    it('should mark lesson as complete for first time', async () => {
      const mockProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{
          id: enrollmentId,
          user_id: userId,
          course_id: courseId,
          course_title: 'Test Course'
        }] })
        .mockResolvedValueOnce({ rows: [{ id: lessonId, course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockProgress] });

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(mockDb.query).toHaveBeenCalledTimes(4);
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('INSERT INTO lesson_progress'),
        [enrollmentId, lessonId, true, 'CURRENT_TIMESTAMP']
      );
      expect(result).toEqual(mockProgress);
    });

    it('should update existing progress to complete', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
        completed_at: null
      };
      const updatedProgress = { ...existingProgress, completed: true, completed_at: new Date() };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{
          id: enrollmentId,
          user_id: userId,
          course_id: courseId,
          course_title: 'Test Course'
        }] })
        .mockResolvedValueOnce({ rows: [{ id: lessonId, course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [existingProgress] })
        .mockResolvedValueOnce({ rows: [updatedProgress] });

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('UPDATE lesson_progress'),
        [true, enrollmentId, lessonId]
      );
      expect(result).toEqual(updatedProgress);
    });

    it('should mark lesson as incomplete', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date()
      };
      const updatedProgress = { ...existingProgress, completed: false, completed_at: null };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{
          id: enrollmentId,
          user_id: userId,
          course_id: courseId,
          course_title: 'Test Course'
        }] })
        .mockResolvedValueOnce({ rows: [{ id: lessonId, course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [existingProgress] })
        .mockResolvedValueOnce({ rows: [updatedProgress] });

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('completed_at = NULL'),
        [false, enrollmentId, lessonId]
      );
      expect(result).toEqual(updatedProgress);
    });

    it('should handle idempotent complete operation', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{
          id: enrollmentId,
          user_id: userId,
          course_id: courseId,
          course_title: 'Test Course'
        }] })
        .mockResolvedValueOnce({ rows: [{ id: lessonId, course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [existingProgress] })
        .mockResolvedValueOnce({ rows: [existingProgress] });

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        [true, enrollmentId, lessonId]
      );
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Enrollment not found');
    });

    it('should throw error when enrollment belongs to different user', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: enrollmentId,
          user_id: 999,
          course_id: courseId
        }]
      });

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not in course', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: enrollmentId,
            user_id: userId,
            course_id: courseId
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 2;
    const enrollmentId = 3;

    it('should return progress for enrolled user', async () => {
      const mockLessons = [
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
        .mockResolvedValueOnce({ rows: [{ id: enrollmentId }] })
        .mockResolvedValueOnce({ rows: mockLessons });

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(2);
      expect(result.percent).toBe(50);
      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0]).toEqual({
        lessonId: 1,
        lessonTitle: 'Lesson 1',
        position: 1,
        completed: true,
        completed_at: mockLessons[0].completed_at
      });
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(2);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should calculate 100% completion correctly', async () => {
      const mockLessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: enrollmentId }] })
        .mockResolvedValueOnce({ rows: mockLessons });

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.percent).toBe(100);
    });

    it('should handle course with no lessons', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: enrollmentId }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.percent).toBe(0);
      expect(result.totalLessons).toBe(0);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const requesterId = 2;

    it('should return progress for admin', async () => {
      const mockProgressData = [
        {
          user_id: 3,
          name: 'John Doe',
          email: 'john@example.com',
          enrollment_id: 1,
          completed_count: '2'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, instructor_id: 5 }] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: mockProgressData });

      const result = await service.getCourseProgress(courseId, requesterId, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        user: {
          id: 3,
          name: 'John Doe',
          email: 'john@example.com'
        },
        completedCount: 2,
        totalLessons: 5,
        percent: 40
      });
    });

    it('should return progress for course instructor', async () => {
      const instructorId = 2;
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, instructor_id: instructorId }] })
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(0);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getCourseProgress(courseId, requesterId, 'admin'))
        .rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to access other course', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId, instructor_id: 999 }] });

      await expect(service.getCourseProgress(courseId, requesterId, 'instructor'))
        .rejects.toThrow('You can only view progress for your own courses');
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true when all lessons completed', async () => {
      const userId = 1;
      const courseId = 2;
      const mockLessons = [
        { lesson_id: 1, completed: true },
        { lesson_id: 2, completed: true }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: mockLessons });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when some lessons incomplete', async () => {
      const userId = 1;
      const courseId = 2;
      const mockLessons = [
        { lesson_id: 1, completed: true },
        { lesson_id: 2, completed: false }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: mockLessons });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when no lessons exist', async () => {
      const userId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should return enrollment progress', async () => {
      const enrollmentId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [{ total: '4' }] })
        .mockResolvedValueOnce({ rows: [{ completed: '3' }] });

      const result = await service.getEnrollmentProgress(enrollmentId);

      expect(result).toEqual({
        completedLessons: 3,
        totalLessons: 4,
        percent: 75
      });
    });

    it('should throw error when enrollment not found', async () => {
      const enrollmentId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getEnrollmentProgress(enrollmentId))
        .rejects.toThrow('Enrollment not found');
    });

    it('should handle zero lessons', async () => {
      const enrollmentId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: courseId }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [{ completed: '0' }] });

      const result = await service.getEnrollmentProgress(enrollmentId);

      expect(result.percent).toBe(0);
    });
  });
});

describe('progressService singleton', () => {
  it('should export a singleton instance', () => {
    expect(progressService).toBeInstanceOf(ProgressService);
  });
});
