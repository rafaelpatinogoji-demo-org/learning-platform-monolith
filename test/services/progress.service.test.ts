/**
 * Tests for ProgressService
 * 
 * Tests all business logic methods including lesson progress tracking,
 * course progress calculation, and completion status.
 */

import { progressService } from '../../src/services/progress.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 2;
    const lessonId = 3;

    it('should mark lesson as complete for valid enrollment and lesson', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: 4,
        course_title: 'Test Course'
      };

      const mockLesson = {
        id: lessonId,
        course_id: 4,
        title: 'Test Lesson'
      };

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
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [mockLesson],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [mockProgress],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toEqual(mockProgress);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Enrollment not found');
    });

    it('should throw error when enrollment does not belong to user', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 999,
        course_id: 4
      };

      mockDb.query.mockResolvedValueOnce({ 
        rows: [mockEnrollment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not found in course', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: 4
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Lesson not found in this course');
    });

    it('should update existing progress when marking as incomplete', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: 4
      };

      const mockLesson = {
        id: lessonId,
        course_id: 4
      };

      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date()
      };

      const updatedProgress = {
        ...existingProgress,
        completed: false,
        completed_at: null,
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [mockLesson],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [existingProgress],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [updatedProgress],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should create new progress record when none exists', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: 4
      };

      const mockLesson = {
        id: lessonId,
        course_id: 4
      };

      const newProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [mockLesson],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [newProgress],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toEqual(newProgress);
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('INSERT INTO lesson_progress'),
        [enrollmentId, lessonId, true, 'CURRENT_TIMESTAMP']
      );
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 2;

    it('should return progress for enrolled user', async () => {
      const mockEnrollment = {
        id: 1,
        user_id: userId,
        course_id: courseId
      };

      const mockLessonsWithProgress = [
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
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: mockLessonsWithProgress,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result).toEqual({
        lessonsCompleted: 1,
        totalLessons: 2,
        percent: 50,
        lessons: [
          {
            lessonId: 1,
            lessonTitle: 'Lesson 1',
            position: 1,
            completed: true,
            completed_at: expect.any(Date)
          },
          {
            lessonId: 2,
            lessonTitle: 'Lesson 2',
            position: 2,
            completed: false,
            completed_at: null
          }
        ]
      });
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '3' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result).toEqual({
        lessonsCompleted: 0,
        totalLessons: 3,
        percent: 0,
        lessons: []
      });
    });

    it('should calculate progress percentage correctly', async () => {
      const mockEnrollment = { id: 1, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 3, lesson_title: 'L3', position: 3, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: mockLessons,
          rowCount: 3,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.percent).toBe(100);
      expect(result.lessonsCompleted).toBe(3);
      expect(result.totalLessons).toBe(3);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const requesterId = 2;

    it('should return course progress for admin', async () => {
      const mockCourse = { id: courseId, instructor_id: 3 };
      const mockProgressData = [
        {
          user_id: 4,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '2'
        },
        {
          user_id: 5,
          name: 'Student 2',
          email: 'student2@example.com',
          enrollment_id: 2,
          completed_count: '1'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockCourse],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '3' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: mockProgressData,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getCourseProgress(courseId, requesterId, 'admin');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user: {
          id: 4,
          name: 'Student 1',
          email: 'student1@example.com'
        },
        completedCount: 2,
        totalLessons: 3,
        percent: 67
      });
    });

    it('should return course progress for course instructor', async () => {
      const mockCourse = { id: courseId, instructor_id: requesterId };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockCourse],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '2' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getCourseProgress(courseId, requesterId, 'instructor');

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(progressService.getCourseProgress(courseId, requesterId, 'instructor'))
        .rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to view other instructor course', async () => {
      const mockCourse = { id: courseId, instructor_id: 999 };
      mockDb.query.mockResolvedValueOnce({ 
        rows: [mockCourse],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(progressService.getCourseProgress(courseId, requesterId, 'instructor'))
        .rejects.toThrow('You can only view progress for your own courses');
    });
  });

  describe('hasCompletedCourse', () => {
    const userId = 1;
    const courseId = 2;

    it('should return true when user completed all lessons', async () => {
      const mockEnrollment = { id: 1, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: mockLessons,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when user has not completed all lessons', async () => {
      const mockEnrollment = { id: 1, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: mockLessons,
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const mockEnrollment = { id: 1, user_id: userId, course_id: courseId };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [mockEnrollment],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    const enrollmentId = 1;

    it('should return progress for valid enrollment', async () => {
      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ course_id: 2 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '5' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ completed: '3' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result).toEqual({
        completedLessons: 3,
        totalLessons: 5,
        percent: 60
      });
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      } as any);

      await expect(progressService.getEnrollmentProgress(enrollmentId))
        .rejects.toThrow('Enrollment not found');
    });

    it('should handle zero lessons correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ course_id: 2 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ completed: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result).toEqual({
        completedLessons: 0,
        totalLessons: 0,
        percent: 0
      });
    });

    it('should calculate percentage correctly for partial completion', async () => {
      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ course_id: 2 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ total: '3' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any)
        .mockResolvedValueOnce({ 
          rows: [{ completed: '1' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
        } as any);

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.percent).toBe(33);
    });
  });
});
