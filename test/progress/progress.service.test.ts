import { progressService } from '../../src/services/progress.service';
import { db } from '../../src/db';
import { mockDbQueryResult, mockProgress, mockLesson } from '../utils/test-helpers';

const mockDb = db as jest.Mocked<typeof db>;

describe('ProgressService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    it('should create new progress record when marking complete', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([]))
        .mockResolvedValueOnce(mockDbQueryResult([mockProgress({ completed: true })]));

      const result = await progressService.markLessonProgress(1, 1, 1, true);

      expect(result.completed).toBe(true);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO lesson_progress'),
        [1, 1, true, 'CURRENT_TIMESTAMP']
      );
    });

    it('should create new progress record when marking incomplete', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([]))
        .mockResolvedValueOnce(mockDbQueryResult([mockProgress({ completed: false, completed_at: null })]));

      const result = await progressService.markLessonProgress(1, 1, 1, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should update existing progress from incomplete to complete', async () => {
      const existingProgress = mockProgress({ completed: false, completed_at: null });
      const updatedProgress = mockProgress({ completed: true });

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([existingProgress]))
        .mockResolvedValueOnce(mockDbQueryResult([updatedProgress]));

      const result = await progressService.markLessonProgress(1, 1, 1, true);

      expect(result.completed).toBe(true);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('UPDATE lesson_progress'),
        [true, 1, 1]
      );
    });

    it('should update existing progress from complete to incomplete', async () => {
      const existingProgress = mockProgress({ completed: true });
      const updatedProgress = mockProgress({ completed: false, completed_at: null });

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([existingProgress]))
        .mockResolvedValueOnce(mockDbQueryResult([updatedProgress]));

      const result = await progressService.markLessonProgress(1, 1, 1, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should be idempotent when marking already completed lesson as complete', async () => {
      const existingProgress = mockProgress({ completed: true });

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([existingProgress]))
        .mockResolvedValueOnce(mockDbQueryResult([existingProgress]));

      const result = await progressService.markLessonProgress(1, 1, 1, true);

      expect(result.completed).toBe(true);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      await expect(
        progressService.markLessonProgress(999, 1, 1, true)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error when enrollment belongs to different user', async () => {
      mockDb.query.mockResolvedValueOnce(
        mockDbQueryResult([{ id: 1, user_id: 2, course_id: 1 }])
      );

      await expect(
        progressService.markLessonProgress(1, 1, 1, true)
      ).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not in course', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, user_id: 1, course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      await expect(
        progressService.markLessonProgress(1, 999, 1, true)
      ).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    it('should return progress summary for enrolled user', async () => {
      const lessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult(lessons));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0].completed).toBe(true);
      expect(result.lessons[1].completed).toBe(false);
      expect(result.percent).toBe(50);
      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(2);
    });

    it('should return empty progress when user not enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '5' }]));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessons).toEqual([]);
      expect(result.percent).toBe(0);
      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(5);
    });

    it('should correctly calculate completion percentage', async () => {
      const lessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
        { lesson_id: 4, lesson_title: 'Lesson 4', position: 4, completed: false, completed_at: null },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult(lessons));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.percent).toBe(75);
      expect(result.lessonsCompleted).toBe(3);
      expect(result.totalLessons).toBe(4);
    });

    it('should order lessons by position', async () => {
      const lessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: false, completed_at: null },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: false, completed_at: null },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult(lessons));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessons[0].lessonId).toBe(1);
      expect(result.lessons[1].lessonId).toBe(2);
      expect(result.lessons[2].lessonId).toBe(3);
    });

    it('should handle course with no lessons', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.lessons).toEqual([]);
      expect(result.percent).toBe(0);
      expect(result.totalLessons).toBe(0);
    });
  });

  describe('getCourseProgress', () => {
    it('should return student progress list for admin', async () => {
      const progressData = [
        { user_id: 1, name: 'Student 1', email: 'student1@test.com', enrollment_id: 1, completed_count: '1' },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, instructor_id: 2 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '2' }]))
        .mockResolvedValueOnce(mockDbQueryResult(progressData));

      const result = await progressService.getCourseProgress(1, 3, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBe(50);
      expect(result[0].completedCount).toBe(1);
      expect(result[0].totalLessons).toBe(2);
    });

    it('should return student progress list for course instructor', async () => {
      const progressData = [
        { user_id: 1, name: 'Student 1', email: 'student1@test.com', enrollment_id: 1, completed_count: '0' },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, instructor_id: 2 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '1' }]))
        .mockResolvedValueOnce(mockDbQueryResult(progressData));

      const result = await progressService.getCourseProgress(1, 2, 'instructor');

      expect(result).toHaveLength(1);
    });

    it('should throw error for instructor of different course', async () => {
      mockDb.query.mockResolvedValueOnce(
        mockDbQueryResult([{ id: 1, instructor_id: 2 }])
      );

      await expect(
        progressService.getCourseProgress(1, 3, 'instructor')
      ).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      await expect(
        progressService.getCourseProgress(999, 1, 'admin')
      ).rejects.toThrow('Course not found');
    });

    it('should correctly calculate per-student percentages', async () => {
      const progressData = [
        { user_id: 1, name: 'Student 1', email: 'student1@test.com', enrollment_id: 1, completed_count: '2' },
        { user_id: 2, name: 'Student 2', email: 'student2@test.com', enrollment_id: 2, completed_count: '1' },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1, instructor_id: 2 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '2' }]))
        .mockResolvedValueOnce(mockDbQueryResult(progressData));

      const result = await progressService.getCourseProgress(1, 2, 'instructor');

      expect(result[0].percent).toBe(100);
      expect(result[1].percent).toBe(50);
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true when all lessons completed', async () => {
      const lessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult(lessons));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(true);
    });

    it('should return false when some lessons incomplete', async () => {
      const lessons = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult(lessons));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });

    it('should return false when no lessons exist', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([]));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should return correct progress for enrollment', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '3' }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ completed: '2' }]));

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.completedLessons).toBe(2);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBeCloseTo(67, 0);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce(mockDbQueryResult([]));

      await expect(progressService.getEnrollmentProgress(999)).rejects.toThrow(
        'Enrollment not found'
      );
    });

    it('should correctly calculate percentage', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockDbQueryResult([{ course_id: 1 }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ total: '4' }]))
        .mockResolvedValueOnce(mockDbQueryResult([{ completed: '3' }]));

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.percent).toBe(75);
    });
  });
});
