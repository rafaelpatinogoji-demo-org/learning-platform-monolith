import { mockQuery, mockQuerySuccess, resetDbMocks } from '../mocks/db.mock';

jest.mock('../../src/db', () => ({
  db: {
    query: require('../mocks/db.mock').mockQuery,
    getClient: require('../mocks/db.mock').mockGetClient,
    connect: require('../mocks/db.mock').mockConnect,
    disconnect: require('../mocks/db.mock').mockDisconnect,
    healthCheck: jest.fn().mockResolvedValue(true),
    smokeTest: jest.fn().mockResolvedValue({ success: true, userCount: 1 }),
    getConnectionStatus: jest.fn().mockReturnValue(true),
    getPoolStats: jest.fn().mockReturnValue({ totalCount: 1, idleCount: 0, waitingCount: 0 }),
  },
}));

import { ProgressService } from '../../src/services/progress.service';

describe('ProgressService', () => {
  let progressService: ProgressService;

  beforeEach(() => {
    resetDbMocks();
    progressService = new ProgressService();
  });

  describe('markLessonProgress', () => {
    it('should mark a lesson as complete for first time', async () => {
      const userId = 1;
      const enrollmentId = 1;
      const lessonId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
        course_title: 'Test Course',
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        course_id: 1,
        title: 'Lesson 1',
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const mockProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([mockProgress]));

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result.completed).toBe(true);
      expect(result.completed_at).toBeTruthy();
    });

    it('should mark an already completed lesson as incomplete', async () => {
      const userId = 1;
      const enrollmentId = 1;
      const lessonId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: true,
        completed_at: new Date(),
      }]));

      const updatedProgress = {
        id: 1,
        enrollment_id: 1,
        lesson_id: 1,
        completed: false,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([updatedProgress]));

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should reject if enrollment not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        progressService.markLessonProgress(1, 999, 1, true)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should reject if user does not own enrollment', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 2,
        course_id: 1,
      }]));

      await expect(
        progressService.markLessonProgress(1, 1, 1, true)
      ).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should reject if lesson not in course', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        progressService.markLessonProgress(1, 1, 999, true)
      ).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    it('should return progress summary for enrolled user', async () => {
      const userId = 1;
      const courseId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
      ]));

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(2);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(67);
      expect(result.lessons).toHaveLength(3);
    });

    it('should return empty progress for unenrolled user', async () => {
      const userId = 1;
      const courseId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '5' }]));

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should calculate 100% progress correctly', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
      ]));

      const result = await progressService.getUserCourseProgress(1, 1);

      expect(result.percent).toBe(100);
      expect(result.lessonsCompleted).toBe(result.totalLessons);
    });
  });

  describe('getCourseProgress', () => {
    it('should get progress for all students in a course as instructor', async () => {
      const courseId = 1;
      const instructorId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '3' }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([
        {
          user_id: 2,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '2',
        },
        {
          user_id: 3,
          name: 'Student 2',
          email: 'student2@example.com',
          enrollment_id: 2,
          completed_count: '1',
        },
      ]));

      const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(2);
      expect(result[0].user.name).toBe('Student 1');
      expect(result[0].completedCount).toBe(2);
      expect(result[0].totalLessons).toBe(3);
      expect(result[0].percent).toBe(67);
    });

    it('should allow admin to view any course progress', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 2,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '0' }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await progressService.getCourseProgress(1, 1, 'admin');

      expect(result).toBeDefined();
    });

    it('should reject if course not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        progressService.getCourseProgress(999, 1, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should reject if user is not instructor of the course', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        instructor_id: 2,
      }]));

      await expect(
        progressService.getCourseProgress(1, 1, 'instructor')
      ).rejects.toThrow('You can only view progress for your own courses');
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true if all lessons completed', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
      ]));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(true);
    });

    it('should return false if not all lessons completed', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
      ]));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });

    it('should return false if course has no lessons', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        id: 1,
        user_id: 1,
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      const result = await progressService.hasCompletedCourse(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should get progress for specific enrollment', async () => {
      const enrollmentId = 1;

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '5' }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ completed: '3' }]));

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(3);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(60);
    });

    it('should reject if enrollment not found', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([]));

      await expect(
        progressService.getEnrollmentProgress(999)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should handle zero lessons correctly', async () => {
      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{
        course_id: 1,
      }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ total: '0' }]));

      mockQuery.mockResolvedValueOnce(mockQuerySuccess([{ completed: '0' }]));

      const result = await progressService.getEnrollmentProgress(1);

      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });
});
