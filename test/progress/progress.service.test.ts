/**
 * Tests for ProgressService
 * 
 * Tests business logic for progress tracking with mocked database dependencies.
 */

import { progressService, ProgressService } from '../../src/services/progress.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const mockEnrollment = {
      id: 1,
      user_id: 1,
      course_id: 1,
      course_title: 'Test Course'
    };

    const mockLesson = {
      id: 2,
      course_id: 1,
      title: 'Test Lesson'
    };

    it('should create new progress record when none exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            enrollment_id: 1,
            lesson_id: 2,
            completed: true,
            completed_at: new Date('2023-01-01T10:00:00Z'),
            created_at: new Date('2023-01-01T10:00:00Z'),
            updated_at: new Date('2023-01-01T10:00:00Z')
          }]
        } as any);

      const result = await progressService.markLessonProgress(1, 1, 2, true);

      expect(result.completed).toBe(true);
      expect(result.enrollment_id).toBe(1);
      expect(result.lesson_id).toBe(2);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should update existing progress record from incomplete to complete', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: false,
        completed_at: null
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any)
        .mockResolvedValueOnce({
          rows: [{
            ...existingProgress,
            completed: true,
            completed_at: new Date('2023-01-01T10:00:00Z'),
            updated_at: new Date('2023-01-01T10:00:00Z')
          }]
        } as any);

      const result = await progressService.markLessonProgress(1, 1, 2, true);

      expect(result.completed).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lesson_progress'),
        [true, 1, 2]
      );
    });

    it('should update existing progress record from complete to incomplete', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: true,
        completed_at: new Date('2023-01-01T09:00:00Z')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any)
        .mockResolvedValueOnce({
          rows: [{
            ...existingProgress,
            completed: false,
            completed_at: null,
            updated_at: new Date('2023-01-01T10:00:00Z')
          }]
        } as any);

      const result = await progressService.markLessonProgress(1, 1, 2, false);

      expect(result.completed).toBe(false);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = NULL'),
        [false, 1, 2]
      );
    });

    it('should handle idempotent operation when already completed', async () => {
      const existingProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 2,
        completed: true,
        completed_at: new Date('2023-01-01T09:00:00Z')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any)
        .mockResolvedValueOnce({
          rows: [{
            ...existingProgress,
            updated_at: new Date('2023-01-01T10:00:00Z')
          }]
        } as any);

      const result = await progressService.markLessonProgress(1, 1, 2, true);

      expect(result.completed).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SET updated_at = CURRENT_TIMESTAMP'),
        [true, 1, 2]
      );
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        progressService.markLessonProgress(1, 999, 2, true)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error when user does not own enrollment', async () => {
      const otherUserEnrollment = { ...mockEnrollment, user_id: 2 };
      mockDb.query.mockResolvedValueOnce({ rows: [otherUserEnrollment] } as any);

      await expect(
        progressService.markLessonProgress(1, 1, 2, true)
      ).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not found in course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        progressService.markLessonProgress(1, 1, 999, true)
      ).rejects.toThrow('Lesson not found in this course');
    });

    it('should throw error when lesson belongs to different course', async () => {
      const differentCourseLesson = { ...mockLesson, course_id: 2 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        progressService.markLessonProgress(1, 1, 2, true)
      ).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    it('should return progress for enrolled user', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };
      const mockLessonsWithProgress = [
        {
          lesson_id: 1,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date('2023-01-01T10:00:00Z')
        },
        {
          lesson_id: 2,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: false,
          completed_at: null
        },
        {
          lesson_id: 3,
          lesson_title: 'Lesson 3',
          position: 3,
          completed: true,
          completed_at: new Date('2023-01-01T11:00:00Z')
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockLessonsWithProgress } as any);

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessonsCompleted).toBe(2);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(67);
      expect(result.lessons).toHaveLength(3);
      expect(result.lessons[0]).toEqual({
        lessonId: 1,
        lessonTitle: 'Lesson 1',
        position: 1,
        completed: true,
        completed_at: mockLessonsWithProgress[0].completed_at
      });
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any);

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should handle course with no lessons', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should calculate correct percentage for partial completion', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockLessonsWithProgress } as any);

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(33);
    });
  });

  describe('getCourseProgress', () => {
    const mockCourse = { id: 1, instructor_id: 2, title: 'Test Course' };

    it('should return progress for course instructor', async () => {
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student One',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '3'
        },
        {
          user_id: 2,
          name: 'Student Two',
          email: 'student2@example.com',
          enrollment_id: 2,
          completed_count: '1'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
        .mockResolvedValueOnce({ rows: mockProgressData } as any);

      const result = await progressService.getCourseProgress(1, 2, 'instructor');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user: {
          id: 1,
          name: 'Student One',
          email: 'student1@example.com'
        },
        completedCount: 3,
        totalLessons: 5,
        percent: 60
      });
      expect(result[1]).toEqual({
        user: {
          id: 2,
          name: 'Student Two',
          email: 'student2@example.com'
        },
        completedCount: 1,
        totalLessons: 5,
        percent: 20
      });
    });

    it('should return progress for admin user', async () => {
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student One',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '2'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '4' }] } as any)
        .mockResolvedValueOnce({ rows: mockProgressData } as any);

      const result = await progressService.getCourseProgress(1, 999, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBe(50);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        progressService.getCourseProgress(999, 2, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when non-admin user tries to view other instructor course', async () => {
      const otherInstructorCourse = { ...mockCourse, instructor_id: 3 };
      mockDb.query.mockResolvedValueOnce({ rows: [otherInstructorCourse] } as any);

      await expect(
        progressService.getCourseProgress(1, 2, 'instructor')
      ).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should throw error when student tries to view course progress', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse] } as any);

      await expect(
        progressService.getCourseProgress(1, 1, 'student')
      ).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should handle course with no enrollments', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '3' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await progressService.getCourseProgress(1, 2, 'instructor');

      expect(result).toHaveLength(0);
    });

    it('should handle course with no lessons', async () => {
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student One',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '0'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)
        .mockResolvedValueOnce({ rows: mockProgressData } as any);

      const result = await progressService.getCourseProgress(1, 2, 'instructor');

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBe(0);
      expect(result[0].totalLessons).toBe(0);
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true when all lessons are completed', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockLessonsWithProgress } as any);

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(true);
    });

    it('should return false when some lessons are incomplete', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockLessonsWithProgress } as any);

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });

    it('should return false when user is not enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '2' }] } as any);

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const mockEnrollment = { id: 1, user_id: 1, course_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should return progress for valid enrollment', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
        .mockResolvedValueOnce({ rows: [{ completed: '3' }] } as any);

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.completedLessons).toBe(3);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(60);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        progressService.getEnrollmentProgress(999)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should handle enrollment with no completed lessons', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '3' }] } as any)
        .mockResolvedValueOnce({ rows: [{ completed: '0' }] } as any);

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.completedLessons).toBe(0);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(0);
    });

    it('should handle enrollment with course having no lessons', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [{ completed: '0' }] } as any);

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.completedLessons).toBe(0);
      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });
});
