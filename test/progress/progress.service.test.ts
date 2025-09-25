import { ProgressService, progressService } from '../../src/services/progress.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 1;
    const lessonId = 1;
    const courseId = 2;

    it('should mark lesson as complete for first time', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };
      const mockLesson = {
        id: lessonId,
        course_id: courseId,
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
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [mockLesson],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [mockProgress],
          rowCount: 1
        } as any);

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toEqual(mockProgress);
      expect(mockDb.query).toHaveBeenCalledTimes(4);
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        `INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [enrollmentId, lessonId, true, expect.any(String)]
      );
    });

    it('should update existing progress to complete', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId
      };
      const mockLesson = {
        id: lessonId,
        course_id: courseId
      };
      const existingProgress = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
        completed_at: null
      };
      const updatedProgress = {
        ...existingProgress,
        completed: true,
        completed_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [mockLesson],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [existingProgress],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [updatedProgress],
          rowCount: 1
        } as any);

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(result).toEqual(updatedProgress);
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        `UPDATE lesson_progress 
           SET completed = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2 AND lesson_id = $3
           RETURNING *`,
        [true, enrollmentId, lessonId]
      );
    });

    it('should mark lesson as incomplete', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId
      };
      const mockLesson = {
        id: lessonId,
        course_id: courseId
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
        completed_at: null
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [mockLesson],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [existingProgress],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [updatedProgress],
          rowCount: 1
        } as any);

      const result = await service.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(result).toEqual(updatedProgress);
      expect(mockDb.query).toHaveBeenNthCalledWith(4,
        `UPDATE lesson_progress 
           SET completed = $1, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2 AND lesson_id = $3
           RETURNING *`,
        [false, enrollmentId, lessonId]
      );
    });

    it('should throw error when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Enrollment not found');
    });

    it('should throw error when user does not own enrollment', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: 999,
        course_id: courseId
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockEnrollment],
        rowCount: 1
      } as any);

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should throw error when lesson not found in course', async () => {
      const mockEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      await expect(service.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Lesson not found in this course');
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
        .mockResolvedValueOnce({
          rows: [mockEnrollment],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: mockLessons,
          rowCount: 2
        } as any);

      const result = await service.getUserCourseProgress(userId, courseId);

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
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '3' }],
          rowCount: 1
        } as any);

      const result = await service.getUserCourseProgress(userId, courseId);

      expect(result).toEqual({
        lessonsCompleted: 0,
        totalLessons: 3,
        percent: 0,
        lessons: []
      });
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const requesterId = 2;

    it('should return course progress for admin', async () => {
      const mockCourse = {
        id: courseId,
        instructor_id: 3
      };
      const mockProgressData = [
        {
          user_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          enrollment_id: 1,
          completed_count: '2'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [mockCourse],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '5' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: mockProgressData,
          rowCount: 1
        } as any);

      const result = await service.getCourseProgress(courseId, requesterId, 'admin');

      expect(result).toEqual([
        {
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          },
          completedCount: 2,
          totalLessons: 5,
          percent: 40
        }
      ]);
    });

    it('should return course progress for course instructor', async () => {
      const instructorId = 2;
      const mockCourse = {
        id: courseId,
        instructor_id: instructorId
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [mockCourse],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '3' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      const result = await service.getCourseProgress(courseId, instructorId, 'instructor');

      expect(result).toEqual([]);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(service.getCourseProgress(courseId, requesterId, 'admin'))
        .rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to view other course progress', async () => {
      const mockCourse = {
        id: courseId,
        instructor_id: 999
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockCourse],
        rowCount: 1
      } as any);

      await expect(service.getCourseProgress(courseId, requesterId, 'instructor'))
        .rejects.toThrow('You can only view progress for your own courses');
    });
  });

  describe('hasCompletedCourse', () => {
    it('should return true when all lessons completed', async () => {
      const userId = 1;
      const courseId = 2;

      jest.spyOn(service, 'getUserCourseProgress').mockResolvedValueOnce({
        lessonsCompleted: 3,
        totalLessons: 3,
        percent: 100,
        lessons: []
      });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
    });

    it('should return false when not all lessons completed', async () => {
      const userId = 1;
      const courseId = 2;

      jest.spyOn(service, 'getUserCourseProgress').mockResolvedValueOnce({
        lessonsCompleted: 2,
        totalLessons: 3,
        percent: 67,
        lessons: []
      });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const userId = 1;
      const courseId = 2;

      jest.spyOn(service, 'getUserCourseProgress').mockResolvedValueOnce({
        lessonsCompleted: 0,
        totalLessons: 0,
        percent: 0,
        lessons: []
      });

      const result = await service.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should return enrollment progress', async () => {
      const enrollmentId = 1;
      const courseId = 2;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ course_id: courseId }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '5' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ completed: '3' }],
          rowCount: 1
        } as any);

      const result = await service.getEnrollmentProgress(enrollmentId);

      expect(result).toEqual({
        completedLessons: 3,
        totalLessons: 5,
        percent: 60
      });
    });

    it('should throw error when enrollment not found', async () => {
      const enrollmentId = 999;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(service.getEnrollmentProgress(enrollmentId))
        .rejects.toThrow('Enrollment not found');
    });
  });
});
