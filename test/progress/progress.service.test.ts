import { ProgressService, progressService } from '../../src/services/progress.service';
import { db } from '../../src/db';
import { mockStudent, mockEnrollment, mockLesson, mockLessonProgress, mockCourse, mockInstructor } from '../utils/test-helpers';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgressService();
  });

  describe('markLessonProgress', () => {
    const enrollmentWithCourse = {
      ...mockEnrollment,
      course_id: 1,
      course_title: 'Test Course'
    };

    it('should create new progress record when marking complete', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any);

      const result = await service.markLessonProgress(
        mockStudent.id,
        mockEnrollment.id,
        mockLesson.id,
        true
      );

      expect(result).toEqual(mockLessonProgress);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should update existing progress when marking incomplete', async () => {
      const existingProgress = { ...mockLessonProgress, completed: true };
      const updatedProgress = { ...mockLessonProgress, completed: false, completed_at: null };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any)
        .mockResolvedValueOnce({ rows: [updatedProgress] } as any);

      const result = await service.markLessonProgress(
        mockStudent.id,
        mockEnrollment.id,
        mockLesson.id,
        false
      );

      expect(result.completed).toBe(false);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('completed_at = NULL'),
        [false, mockEnrollment.id, mockLesson.id]
      );
    });

    it('should be idempotent when marking complete twice', async () => {
      const existingProgress = { ...mockLessonProgress, completed: true };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any)
        .mockResolvedValueOnce({ rows: [existingProgress] } as any);

      const result = await service.markLessonProgress(
        mockStudent.id,
        mockEnrollment.id,
        mockLesson.id,
        true
      );

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledTimes(4);
    });

    it('should set completed_at timestamp on first completion', async () => {
      const incompleteProgress = { ...mockLessonProgress, completed: false, completed_at: null };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [incompleteProgress] } as any)
        .mockResolvedValueOnce({ rows: [mockLessonProgress] } as any);

      await service.markLessonProgress(
        mockStudent.id,
        mockEnrollment.id,
        mockLesson.id,
        true
      );

      expect(mockDb.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('completed_at = CURRENT_TIMESTAMP'),
        [true, mockEnrollment.id, mockLesson.id]
      );
    });

    it('should clear completed_at when marking incomplete', async () => {
      const completedProgress = { ...mockLessonProgress, completed: true };
      const incompleteProgress = { ...mockLessonProgress, completed: false, completed_at: null };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [mockLesson] } as any)
        .mockResolvedValueOnce({ rows: [completedProgress] } as any)
        .mockResolvedValueOnce({ rows: [incompleteProgress] } as any);

      const result = await service.markLessonProgress(
        mockStudent.id,
        mockEnrollment.id,
        mockLesson.id,
        false
      );

      expect(result.completed_at).toBeNull();
    });

    it('should throw error if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.markLessonProgress(mockStudent.id, 999, mockLesson.id, true)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error if user does not own enrollment', async () => {
      const otherUserEnrollment = { ...enrollmentWithCourse, user_id: 999 };
      mockDb.query.mockResolvedValueOnce({ rows: [otherUserEnrollment] } as any);

      await expect(
        service.markLessonProgress(mockStudent.id, mockEnrollment.id, mockLesson.id, true)
      ).rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error if lesson not in course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollmentWithCourse] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.markLessonProgress(mockStudent.id, mockEnrollment.id, 999, true)
      ).rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('getUserCourseProgress', () => {
    it('should return progress summary with lesson details', async () => {
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

      const result = await service.getUserCourseProgress(mockStudent.id, mockCourse.id);

      expect(result.lessonsCompleted).toBe(1);
      expect(result.totalLessons).toBe(2);
      expect(result.percent).toBe(50);
      expect(result.lessons).toHaveLength(2);
    });

    it('should calculate completion percentage correctly', async () => {
      const enrollment = { ...mockEnrollment };
      const lessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() },
        { lesson_id: 3, lesson_title: 'L3', position: 3, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: lessonsWithProgress } as any);

      const result = await service.getUserCourseProgress(mockStudent.id, mockCourse.id);

      expect(result.percent).toBe(100);
    });

    it('should return empty progress for non-enrolled user', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any);

      const result = await service.getUserCourseProgress(mockStudent.id, mockCourse.id);

      expect(result.lessonsCompleted).toBe(0);
      expect(result.totalLessons).toBe(5);
      expect(result.percent).toBe(0);
      expect(result.lessons).toHaveLength(0);
    });

    it('should handle course with no lessons', async () => {
      const enrollment = { ...mockEnrollment };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.getUserCourseProgress(mockStudent.id, mockCourse.id);

      expect(result.totalLessons).toBe(0);
      expect(result.percent).toBe(0);
    });
  });

  describe('getCourseProgress', () => {
    it('should return aggregated student progress for instructor', async () => {
      const course = { ...mockCourse, instructor_id: mockInstructor.id };
      const progressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@test.com',
          enrollment_id: 1,
          completed_count: '3'
        },
        {
          user_id: 2,
          name: 'Student 2',
          email: 'student2@test.com',
          enrollment_id: 2,
          completed_count: '5'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [course] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any)
        .mockResolvedValueOnce({ rows: progressData } as any);

      const result = await service.getCourseProgress(mockCourse.id, mockInstructor.id, 'instructor');

      expect(result).toHaveLength(2);
      expect(result[0].completedCount).toBe(3);
      expect(result[0].totalLessons).toBe(10);
      expect(result[0].percent).toBe(30);
      expect(result[1].percent).toBe(50);
    });

    it('should return progress for admin', async () => {
      const course = { ...mockCourse };
      mockDb.query
        .mockResolvedValueOnce({ rows: [course] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.getCourseProgress(mockCourse.id, 999, 'admin');

      expect(result).toHaveLength(0);
    });

    it('should throw error if course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.getCourseProgress(999, mockInstructor.id, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error if requester not instructor or admin', async () => {
      const course = { ...mockCourse };
      mockDb.query.mockResolvedValueOnce({ rows: [course] } as any);

      await expect(
        service.getCourseProgress(mockCourse.id, 999, 'instructor')
      ).rejects.toThrow('You can only view progress for your own courses');
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true when all lessons completed', async () => {
      const enrollment = { ...mockEnrollment };
      const lessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: true, completed_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: lessonsWithProgress } as any);

      const result = await service.hasCompletedCourse(mockStudent.id, mockCourse.id);

      expect(result).toBe(true);
    });

    it('should return false when some lessons incomplete', async () => {
      const enrollment = { ...mockEnrollment };
      const lessonsWithProgress = [
        { lesson_id: 1, lesson_title: 'L1', position: 1, completed: true, completed_at: new Date() },
        { lesson_id: 2, lesson_title: 'L2', position: 2, completed: false, completed_at: null }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: lessonsWithProgress } as any);

      const result = await service.hasCompletedCourse(mockStudent.id, mockCourse.id);

      expect(result).toBe(false);
    });

    it('should return false for course with no lessons', async () => {
      const enrollment = { ...mockEnrollment };

      mockDb.query
        .mockResolvedValueOnce({ rows: [enrollment] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.hasCompletedCourse(mockStudent.id, mockCourse.id);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should calculate progress for specific enrollment', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ course_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any)
        .mockResolvedValueOnce({ rows: [{ completed: '7' }] } as any);

      const result = await service.getEnrollmentProgress(mockEnrollment.id);

      expect(result.completedLessons).toBe(7);
      expect(result.totalLessons).toBe(10);
      expect(result.percent).toBe(70);
    });

    it('should throw error if enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        service.getEnrollmentProgress(999)
      ).rejects.toThrow('Enrollment not found');
    });
  });
});
