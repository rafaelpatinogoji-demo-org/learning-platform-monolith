import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import { db } from '../../src/db';
import { progressService, ProgressService } from '../../src/services/progress.service';

// Mock the db module
jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Typed mock for db.query
const mockDbQuery = db.query as jest.MockedFunction<typeof db.query>;

// Helper to create a mock query result
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

      // Mock database query to verify enrollment exists and belongs to user
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment])); // Verify enrollment
      // Mock database query to verify lesson exists in the course
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));     // Verify lesson
      // Mock database query to check for existing progress (returns empty - no existing progress)
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));               // No existing progress
      // Mock database query for inserting new progress record
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([newProgress]));    // Insert progress

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

      // Mock database query to verify enrollment exists and belongs to user
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      // Mock database query to verify lesson exists in the course
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockLesson]));
      // Mock database query to find existing progress record
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([existingProgress])); // Existing progress
      // Mock database query for updating existing progress record
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([updatedProgress]));  // Update progress

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, completed);

      expect(result).toEqual(updatedProgress);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('SET completed = $1, completed_at = CURRENT_TIMESTAMP'), [
        completed,
        enrollmentId,
        lessonId,
      ]);
    });

    it('should throw an error if enrollment is not found', async () => {
      // Mock database query that returns no enrollment (simulating enrollment not found)
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([])); // No enrollment found

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true)).rejects.toThrow('Enrollment not found');
    });

    it('should throw an error if user does not own the enrollment', async () => {
      const otherUserId = 2;
      // Mock database query that returns enrollment belonging to different user
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment])); // Enrollment belongs to userId 1

      await expect(service.markLessonProgress(otherUserId, enrollmentId, lessonId, true)).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw an error if lesson is not in the course', async () => {
      // Mock database query to verify enrollment exists and belongs to user
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      // Mock database query that returns no lesson (simulating lesson not found in course)
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([])); // Lesson not found

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true)).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    it('should return a summary of user progress for a course', async () => {
      const userId = 1;
      const courseId = 20;
      const enrollmentId = 10;

      const mockEnrollment = { id: enrollmentId };
      const mockLessonsWithProgress = [
        { lesson_id: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, completed: false, completed_at: null },
        { lesson_id: 3, completed: true, completed_at: new Date() },
      ];

      // Mock database query to find user's enrollment in the course
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([mockEnrollment]));
      // Mock database query to get lessons with their progress status
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult(mockLessonsWithProgress));

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result.totalLessons).toBe(3);
      expect(result.lessonsCompleted).toBe(2);
      expect(result.percent).toBe(Math.round((2 / 3) * 100));
      expect(result.lessons.length).toBe(3);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const instructorId = 2;
    const adminId = 99;

    it('should allow an admin to get course progress', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }])); // Course fetch
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: 3 }])); // Total lessons
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([])); // Progress data

      await service.getCourseProgress(courseId, adminId, 'admin');

      expect(mockDbQuery).toHaveBeenCalledTimes(3);
    });

    it('should allow the course instructor to get course progress', async () => {
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }])); // Course fetch
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ total: 3 }])); // Total lessons
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([])); // Progress data

      await service.getCourseProgress(courseId, instructorId, 'instructor');

      expect(mockDbQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw an error for a non-owner instructor', async () => {
      const otherInstructorId = 3;
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, instructor_id: instructorId }])); // Course fetch

      await expect(service.getCourseProgress(courseId, otherInstructorId, 'instructor')).rejects.toThrow('You can only view progress for your own courses');
    });
  });
});
