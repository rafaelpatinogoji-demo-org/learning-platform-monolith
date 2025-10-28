import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import { db } from '../../db';
import { progressService, ProgressService } from '../progress.service';

jest.mock('../../db', () => ({
  db: {
    query: jest.fn(),
  },
}));

const mockDbQuery = db.query as jest.MockedFunction<typeof db.query>;

const createMockQueryResult = (rows: any[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 10;
    const lessonId = 100;
    const courseId = 20;

    const mockEnrollment = { id: enrollmentId, user_id: userId, course_id: courseId };
    const mockLesson = { id: lessonId, course_id: courseId };

    it('should create a new progress record and mark it as complete', async () => {
      const completed = true;
      const newProgress = { id: 1, enrollment_id: enrollmentId, lesson_id: lessonId, completed, completed_at: new Date() };

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([newProgress]));

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, completed);

      expect(result).toEqual(newProgress);
      expect(mockDbQuery).toHaveBeenCalledTimes(4);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lesson_progress'), [
        enrollmentId,
        lessonId,
        completed,
        'CURRENT_TIMESTAMP',
      ]);
    });

    it('should update an existing progress record to be complete', async () => {
      const completed = true;
      const existingProgress = { id: 1, enrollment_id: enrollmentId, lesson_id: lessonId, completed: false, completed_at: null };
      const updatedProgress = { ...existingProgress, completed: true, completed_at: new Date() };

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([existingProgress]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([updatedProgress]));

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, completed);

      expect(result).toEqual(updatedProgress);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('SET completed = $1, completed_at = CURRENT_TIMESTAMP'), [
        completed,
        enrollmentId,
        lessonId,
      ]);
    });

    it('should update an existing complete record to be incomplete', async () => {
      const completed = false;
      const existingProgress = { id: 1, enrollment_id: enrollmentId, lesson_id: lessonId, completed: true, completed_at: new Date() };
      const updatedProgress = { ...existingProgress, completed: false, completed_at: null };

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([existingProgress]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([updatedProgress]));

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, completed);

      expect(result).toEqual(updatedProgress);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('SET completed = $1, completed_at = NULL'), [
        completed,
        enrollmentId,
        lessonId,
      ]);
    });

    it('should update an already completed lesson without changing completed_at', async () => {
      const completed = true;
      const existingProgress = { id: 1, enrollment_id: enrollmentId, lesson_id: lessonId, completed: true, completed_at: new Date() };

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([existingProgress]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([existingProgress]));

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, completed);

      expect(result).toEqual(existingProgress);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('SET updated_at = CURRENT_TIMESTAMP'), [
        completed,
        enrollmentId,
        lessonId,
      ]);
    });

    it('should throw an error if enrollment is not found', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true)).rejects.toThrow('Enrollment not found');
    });

    it('should throw an error if user does not own the enrollment', async () => {
      const otherUserId = 2;
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));

      await expect(service.markLessonProgress(otherUserId, enrollmentId, lessonId, true)).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw an error if lesson is not in the course', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true)).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 20;
    const enrollmentId = 10;

    it('should return a summary of user progress for a course', async () => {
      const mockEnrollment = { id: enrollmentId };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
      ];

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult(mockLessonsWithProgress));

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.totalLessons).toBe(3);
      expect(result.lessonsCompleted).toBe(2);
      expect(result.percent).toBe(67);
      expect(result.lessons.length).toBe(3);
      expect(result.lessons[0]).toMatchObject({
        lessonId: 1,
        lessonTitle: 'Lesson 1',
        position: 1,
        completed: true
      });
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '5' }]));

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.totalLessons).toBe(5);
      expect(result.lessonsCompleted).toBe(0);
      expect(result.percent).toBe(0);
      expect(result.lessons).toEqual([]);
    });

    it('should calculate correct percentage', async () => {
      const mockEnrollment = { id: enrollmentId };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
        { lesson_id: 4, lesson_title: 'Lesson 4', position: 4, completed: false, completed_at: null },
      ];

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult(mockLessonsWithProgress));

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.percent).toBe(75);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const instructorId = 2;
    const adminId = 99;

    it('should allow an admin to get course progress', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '3' }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([
        { user_id: 1, name: 'Student 1', email: 'student1@test.com', enrollment_id: 10, completed_count: '2' },
        { user_id: 2, name: 'Student 2', email: 'student2@test.com', enrollment_id: 11, completed_count: '3' }
      ]));

      const result = await service.getCourseProgress(courseId, adminId, 'admin');

      expect(mockDbQuery).toHaveBeenCalledTimes(3);
      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({
        user: { id: 1, name: 'Student 1', email: 'student1@test.com' },
        completedCount: 2,
        totalLessons: 3,
        percent: 67
      });
    });

    it('should allow the course instructor to get course progress', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '3' }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getCourseProgress(courseId, instructorId, 'instructor');

      expect(mockDbQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw an error for a non-owner instructor', async () => {
      const otherInstructorId = 3;
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }]));

      await expect(service.getCourseProgress(courseId, otherInstructorId, 'instructor')).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should throw an error if course is not found', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getCourseProgress(courseId, instructorId, 'instructor')).rejects.toThrow('Course not found');
    });

    it('should aggregate progress correctly for multiple students', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '10' }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([
        { user_id: 1, name: 'Student 1', email: 'student1@test.com', enrollment_id: 10, completed_count: '10' },
        { user_id: 2, name: 'Student 2', email: 'student2@test.com', enrollment_id: 11, completed_count: '5' },
        { user_id: 3, name: 'Student 3', email: 'student3@test.com', enrollment_id: 12, completed_count: '0' }
      ]));

      const result = await service.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result.length).toBe(3);
      expect(result[0].percent).toBe(100);
      expect(result[1].percent).toBe(50);
      expect(result[2].percent).toBe(0);
    });
  });

  describe('hasCompletedCourse', () => {
    const userId = 1;
    const courseId = 20;
    const enrollmentId = 10;

    it('should return true when all lessons are completed', async () => {
      const mockEnrollment = { id: enrollmentId };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
      ];

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult(mockLessonsWithProgress));

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when some lessons are incomplete', async () => {
      const mockEnrollment = { id: enrollmentId };
      const mockLessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null },
      ];

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult(mockLessonsWithProgress));

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false for course with no lessons', async () => {
      const mockEnrollment = { id: enrollmentId };

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    const enrollmentId = 10;
    const courseId = 20;

    it('should return correct progress for valid enrollment', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ course_id: courseId }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '5' }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ completed: '3' }]));

      const result = await service.getEnrollmentProgress(enrollmentId);

      expect(result).toMatchObject({
        completedLessons: 3,
        totalLessons: 5,
        percent: 60
      });
    });

    it('should throw an error if enrollment is not found', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getEnrollmentProgress(enrollmentId)).rejects.toThrow('Enrollment not found');
    });

    it('should calculate correct percentage with zero completed', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ course_id: courseId }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: '10' }]));
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ completed: '0' }]));

      const result = await service.getEnrollmentProgress(enrollmentId);

      expect(result.percent).toBe(0);
    });
  });
});
