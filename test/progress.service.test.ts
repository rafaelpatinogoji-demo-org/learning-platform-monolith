import { ProgressService } from '../src/services/progress.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('ProgressService', () => {
  let progressService: ProgressService;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    progressService = new ProgressService();
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 10;
    const lessonId = 100;
    const courseId = 50;

    it('should mark lesson as complete for first time', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };
      const mockLesson = { id: lessonId, course_id: courseId };
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
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockProgress], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toEqual(mockProgress);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should mark lesson as incomplete', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };
      const mockLesson = { id: lessonId, course_id: courseId };
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
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [existingProgress], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [updatedProgress], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should update existing completed progress', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };
      const mockLesson = { id: lessonId, course_id: courseId };
      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01')
      };
      const updatedProgress = {
        ...existingProgress,
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [existingProgress], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [updatedProgress], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should throw error if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Enrollment not found');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error if enrollment belongs to different user', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 999,
        course_id: courseId,
        course_title: 'Test Course'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('You can only mark progress for your own enrollments');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error if lesson not found in course', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Lesson not found in this course');

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 50;

    it('should return progress for enrolled user', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };
      const mockLessons = [
        {
          lesson_id: 100,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date()
        },
        {
          lesson_id: 101,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: false,
          completed_at: null
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 2, oid: 0, fields: [] });

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(2);
      expect(result.percent).toBe(50);
      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0].completed).toBe(true);
      expect(result.lessons[1].completed).toBe(false);
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(0);
      expect(result.lessons).toEqual([]);
    });

    it('should calculate progress percentage correctly', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 100, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 101, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 102, lesson_title: 'L3', position: 3, completed: true, completed_at: new Date() },
        { lesson_id: 103, lesson_title: 'L4', position: 4, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 4, oid: 0, fields: [] });

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(3);
      expect(result.totalLessons).toBe(4);
      expect(result.percent).toBe(75);
    });

    it('should handle course with no lessons', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 50;
    const instructorId = 2;

    it('should return progress for all students (admin)', async () => {
      const mockCourse = { id: courseId, instructor_id: instructorId };
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 10,
          completed_count: '3'
        },
        {
          user_id: 2,
          name: 'Student 2',
          email: 'student2@example.com',
          enrollment_id: 11,
          completed_count: '1'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockProgressData, command: '', rowCount: 2, oid: 0, fields: [] });

      const result = await progressService.getCourseProgress(courseId, 999, 'admin');

      expect(result).toHaveLength(2);
      expect(result[0].user.name).toBe('Student 1');
      expect(result[0].completedCount).toBe(3);
      expect(result[0].totalLessons).toBe(5);
      expect(result[0].percent).toBe(60);
      expect(result[1].completedCount).toBe(1);
      expect(result[1].percent).toBe(20);
    });

    it('should return progress for instructor own course', async () => {
      const mockCourse = { id: courseId, instructor_id: instructorId };
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 10,
          completed_count: '2'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '4' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockProgressData, command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBe(50);
    });

    it('should throw error if course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(progressService.getCourseProgress(courseId, instructorId, 'instructor'))
        .rejects.toThrow('Course not found');
    });

    it('should throw error if instructor tries to view other course', async () => {
      const mockCourse = { id: courseId, instructor_id: 999 };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(progressService.getCourseProgress(courseId, instructorId, 'instructor'))
        .rejects.toThrow('You can only view progress for your own courses');
    });

    it('should handle course with no enrollments', async () => {
      const mockCourse = { id: courseId, instructor_id: instructorId };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toEqual([]);
    });
  });

  describe('hasCompletedCourse', () => {
    const userId = 1;
    const courseId = 50;

    it('should return true when all lessons completed', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 100, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 101, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 2, oid: 0, fields: [] });

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when some lessons incomplete', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };
      const mockLessons = [
        { lesson_id: 100, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 101, lesson_title: 'L2', position: 2, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 2, oid: 0, fields: [] });

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const mockEnrollment = { id: 10, user_id: userId, course_id: courseId };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    const enrollmentId = 10;
    const courseId = 50;

    it('should return enrollment progress statistics', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: courseId }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '10' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ completed: '7' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(7);
      expect(result.totalLessons).toBe(10);
      expect(result.percent).toBe(70);
    });

    it('should throw error if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(progressService.getEnrollmentProgress(enrollmentId))
        .rejects.toThrow('Enrollment not found');
    });

    it('should handle enrollment with no progress', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: courseId }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '5' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ completed: '0' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(0);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(0);
    });

    it('should handle enrollment with 100% progress', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: courseId }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '3' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ completed: '3' }], command: '', rowCount: 1, oid: 0, fields: [] });

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(3);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(100);
    });
  });
});
