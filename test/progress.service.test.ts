import { ProgressService } from '../src/services/progress.service';
import { db } from '../src/db';
import { QueryResult, QueryResultRow } from 'pg';

jest.mock('../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

const createMockQueryResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> => ({
  rows,
  command: '',
  rowCount: rows.length,
  oid: 0,
  fields: []
});

describe('ProgressService', () => {
  let progressService: ProgressService;

  beforeEach(() => {
    progressService = new ProgressService();
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 1;
    const lessonId = 1;
    const courseId = 1;

    const mockEnrollment = createMockQueryResult([{
      id: enrollmentId,
      user_id: userId,
      course_id: courseId,
      status: 'active',
      course_title: 'Test Course'
    }]);

    const mockLesson = createMockQueryResult([{
      id: lessonId,
      course_id: courseId,
      title: 'Test Lesson',
      position: 1
    }]);

    it('should mark lesson as complete for valid enrollment', async () => {
      const mockProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(mockProgress);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result.completed).toBe(true);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should mark lesson as incomplete', async () => {
      const mockExistingProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01')
      }]);

      const mockUpdatedProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
        completed_at: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02')
      }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(mockExistingProgress)
        .mockResolvedValueOnce(mockUpdatedProgress);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });

    it('should update timestamp when marking already completed lesson', async () => {
      const mockExistingProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01')
      }]);

      const mockUpdatedProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02')
      }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(mockExistingProgress)
        .mockResolvedValueOnce(mockUpdatedProgress);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result.completed).toBe(true);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error when user does not own enrollment', async () => {
      const wrongUserEnrollment = createMockQueryResult([{
        id: enrollmentId,
        user_id: 999,
        course_id: courseId,
        status: 'active'
      }]);

      mockDb.query.mockResolvedValueOnce(wrongUserEnrollment);

      await expect(
        progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
      ).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not found in course', async () => {
      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
      ).rejects.toThrow('Lesson not found in this course');
    });

    it('should create new progress record when none exists', async () => {
      const mockNewProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(mockNewProgress);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result.id).toBe(1);
      expect(result.completed).toBe(true);
    });

    it('should set completed_at when marking complete first time', async () => {
      const mockExistingProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
        completed_at: null
      }]);

      const mockUpdatedProgress = createMockQueryResult([{
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLesson)
        .mockResolvedValueOnce(mockExistingProgress)
        .mockResolvedValueOnce(mockUpdatedProgress);

      const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result.completed).toBe(true);
      expect(result.completed_at).toBeTruthy();
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 1;
    const enrollmentId = 1;

    it('should return progress for enrolled user', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      const mockLessonsWithProgress = createMockQueryResult([
        {
          lesson_id: 1,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date('2024-01-01')
        },
        {
          lesson_id: 2,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: false,
          completed_at: null
        }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLessonsWithProgress);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(2);
      expect(result.percent).toBe(50);
      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0].completed).toBe(true);
    });

    it('should return empty progress for non-enrolled user', async () => {
      const mockTotalLessons = createMockQueryResult([{ total: '3' }]);

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(mockTotalLessons);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(3);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should calculate correct percentage', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      const mockLessonsWithProgress = createMockQueryResult([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 3, lesson_title: 'Lesson 3', position: 3, completed: true, completed_at: new Date() },
        { lesson_id: 4, lesson_title: 'Lesson 4', position: 4, completed: false, completed_at: null }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLessonsWithProgress);

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(3);
      expect(result.totalLessons).toBe(4);
      expect(result.percent).toBe(75);
    });

    it('should handle course with no lessons', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await progressService.getUserCourseProgress(userId, courseId);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const instructorId = 1;
    const adminId = 2;
    const studentId = 3;

    it('should return course progress for instructor owner', async () => {
      const mockCourse = createMockQueryResult([
        { id: courseId, instructor_id: instructorId, title: 'Test Course' }
      ]);

      const mockTotalLessons = createMockQueryResult([{ total: '5' }]);

      const mockProgressData = createMockQueryResult([
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '3'
        },
        {
          user_id: 2,
          name: 'Student 2',
          email: 'student2@example.com',
          enrollment_id: 2,
          completed_count: '5'
        }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockCourse)
        .mockResolvedValueOnce(mockTotalLessons)
        .mockResolvedValueOnce(mockProgressData);

      const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(2);
      expect(result[0].user.name).toBe('Student 1');
      expect(result[0].completedCount).toBe(3);
      expect(result[0].totalLessons).toBe(5);
      expect(result[0].percent).toBe(60);
      expect(result[1].percent).toBe(100);
    });

    it('should return course progress for admin', async () => {
      const mockCourse = createMockQueryResult([
        { id: courseId, instructor_id: instructorId, title: 'Test Course' }
      ]);

      const mockTotalLessons = createMockQueryResult([{ total: '10' }]);

      const mockProgressData = createMockQueryResult([
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 1,
          completed_count: '5'
        }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockCourse)
        .mockResolvedValueOnce(mockTotalLessons)
        .mockResolvedValueOnce(mockProgressData);

      const result = await progressService.getCourseProgress(courseId, adminId, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBe(50);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        progressService.getCourseProgress(courseId, instructorId, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when non-owner instructor tries to access', async () => {
      const mockCourse = createMockQueryResult([
        { id: courseId, instructor_id: instructorId, title: 'Test Course' }
      ]);

      mockDb.query.mockResolvedValueOnce(mockCourse);

      await expect(
        progressService.getCourseProgress(courseId, studentId, 'instructor')
      ).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should throw error when student tries to access', async () => {
      const mockCourse = createMockQueryResult([
        { id: courseId, instructor_id: instructorId, title: 'Test Course' }
      ]);

      mockDb.query.mockResolvedValueOnce(mockCourse);

      await expect(
        progressService.getCourseProgress(courseId, studentId, 'student')
      ).rejects.toThrow('You can only view progress for your own courses');
    });

    it('should handle course with no enrollments', async () => {
      const mockCourse = createMockQueryResult([
        { id: courseId, instructor_id: instructorId, title: 'Test Course' }
      ]);

      const mockTotalLessons = createMockQueryResult([{ total: '5' }]);

      mockDb.query
        .mockResolvedValueOnce(mockCourse)
        .mockResolvedValueOnce(mockTotalLessons)
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(0);
    });
  });

  describe('hasCompletedCourse', () => {
    const userId = 1;
    const courseId = 1;
    const enrollmentId = 1;

    it('should return true when all lessons completed', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      const mockLessonsWithProgress = createMockQueryResult([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: true, completed_at: new Date() }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLessonsWithProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when some lessons incomplete', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      const mockLessonsWithProgress = createMockQueryResult([
        { lesson_id: 1, lesson_title: 'Lesson 1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'Lesson 2', position: 2, completed: false, completed_at: null }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockLessonsWithProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const mockEnrollment = createMockQueryResult([
        { id: enrollmentId, user_id: userId, course_id: courseId }
      ]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    const enrollmentId = 1;
    const courseId = 1;

    it('should return enrollment progress', async () => {
      const mockEnrollment = createMockQueryResult([{ course_id: courseId }]);

      const mockTotalLessons = createMockQueryResult([{ total: '10' }]);

      const mockCompletedLessons = createMockQueryResult([{ completed: '7' }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockTotalLessons)
        .mockResolvedValueOnce(mockCompletedLessons);

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(7);
      expect(result.totalLessons).toBe(10);
      expect(result.percent).toBe(70);
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(
        progressService.getEnrollmentProgress(enrollmentId)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should handle zero lessons', async () => {
      const mockEnrollment = createMockQueryResult([{ course_id: courseId }]);

      const mockTotalLessons = createMockQueryResult([{ total: '0' }]);

      const mockCompletedLessons = createMockQueryResult([{ completed: '0' }]);

      mockDb.query
        .mockResolvedValueOnce(mockEnrollment)
        .mockResolvedValueOnce(mockTotalLessons)
        .mockResolvedValueOnce(mockCompletedLessons);

      const result = await progressService.getEnrollmentProgress(enrollmentId);

      expect(result.completedLessons).toBe(0);
      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });
});
