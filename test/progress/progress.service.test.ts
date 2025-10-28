/**
 * Tests for progress service
 * 
 * Tests progress calculations, completion tracking, and analytics
 * with mocked database operations.
 */

import { ProgressService, progressService } from '../../src/services/progress.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('Progress Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markLessonProgress', () => {
    const userId = 1;
    const enrollmentId = 1;
    const lessonId = 2;
    const courseId = 1;

    const mockEnrollment = {
      rows: [{
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Web Development'
      }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: []
    } as any;

    const mockLesson = {
      rows: [{
        id: lessonId,
        course_id: courseId,
        title: 'CSS Styling'
      }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: []
    } as any;

    describe('Validation Scenarios', () => {
      it('should throw error when enrollment not found', async () => {
        mockDb.query.mockResolvedValueOnce({ 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any);

        await expect(
          progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
        ).rejects.toThrow('Enrollment not found');

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('FROM enrollments e'),
          [enrollmentId]
        );
      });

      it('should throw error when enrollment belongs to different user', async () => {
        const wrongUserEnrollment = {
          rows: [{
            id: enrollmentId,
            user_id: 999,
            course_id: courseId,
            course_title: 'Web Development'
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query.mockResolvedValueOnce(wrongUserEnrollment);

        await expect(
          progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
        ).rejects.toThrow('You can only mark progress for your own enrollments');
      });

      it('should throw error when lesson not found in course', async () => {
        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce({ 
            rows: [], 
            command: 'SELECT', 
            rowCount: 0, 
            oid: 0, 
            fields: [] 
          } as any);

        await expect(
          progressService.markLessonProgress(userId, enrollmentId, lessonId, true)
        ).rejects.toThrow('Lesson not found in this course');

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT * FROM lessons WHERE id = $1 AND course_id = $2',
          [lessonId, courseId]
        );
      });
    });

    describe('Progress Creation Scenarios', () => {
      beforeEach(() => {
        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockLesson);
      });

      it('should create new progress record when marking as complete', async () => {
        const mockNewProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date('2024-01-15T10:00:00Z'),
            created_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z')
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce({ 
            rows: [], 
            command: 'SELECT', 
            rowCount: 0, 
            oid: 0, 
            fields: [] 
          } as any)
          .mockResolvedValueOnce(mockNewProgress);

        const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT * FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2',
          [enrollmentId, lessonId]
        );

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO lesson_progress'),
          [enrollmentId, lessonId, true, 'CURRENT_TIMESTAMP']
        );

        expect(result).toEqual(mockNewProgress.rows[0]);
      });

      it('should create new progress record when marking as incomplete', async () => {
        const mockNewProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: false,
            completed_at: null,
            created_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z')
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce({ 
            rows: [], 
            command: 'SELECT', 
            rowCount: 0, 
            oid: 0, 
            fields: [] 
          } as any)
          .mockResolvedValueOnce(mockNewProgress);

        const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO lesson_progress'),
          [enrollmentId, lessonId, false, null]
        );

        expect(result).toEqual(mockNewProgress.rows[0]);
      });
    });

    describe('Progress Update Scenarios', () => {
      beforeEach(() => {
        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockLesson);
      });

      it('should update existing progress when marking incomplete lesson as complete', async () => {
        const existingProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: false,
            completed_at: null
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        const updatedProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z')
          }],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(existingProgress)
          .mockResolvedValueOnce(updatedProgress);

        const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE lesson_progress'),
          [true, enrollmentId, lessonId]
        );

        expect(result).toEqual(updatedProgress.rows[0]);
      });

      it('should update existing progress when marking complete lesson as incomplete', async () => {
        const existingProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date('2024-01-14T10:00:00Z')
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        const updatedProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: false,
            completed_at: null,
            updated_at: new Date('2024-01-15T10:00:00Z')
          }],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(existingProgress)
          .mockResolvedValueOnce(updatedProgress);

        const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('completed_at = NULL'),
          [false, enrollmentId, lessonId]
        );

        expect(result).toEqual(updatedProgress.rows[0]);
      });

      it('should update timestamp when marking already complete lesson as complete', async () => {
        const existingProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date('2024-01-14T10:00:00Z')
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        const updatedProgress = {
          rows: [{
            id: 1,
            enrollment_id: enrollmentId,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date('2024-01-14T10:00:00Z'),
            updated_at: new Date('2024-01-15T10:00:00Z')
          }],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(existingProgress)
          .mockResolvedValueOnce(updatedProgress);

        const result = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('SET updated_at = CURRENT_TIMESTAMP'),
          [true, enrollmentId, lessonId]
        );

        expect(result).toEqual(updatedProgress.rows[0]);
      });
    });
  });

  describe('getUserCourseProgress', () => {
    const userId = 1;
    const courseId = 1;

    describe('Non-enrolled User Scenarios', () => {
      it('should return empty progress when user not enrolled', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce({ 
            rows: [], 
            command: 'SELECT', 
            rowCount: 0, 
            oid: 0, 
            fields: [] 
          } as any)
          .mockResolvedValueOnce(mockTotalLessons);

        const result = await progressService.getUserCourseProgress(userId, courseId);

        expect(result).toEqual({
          lessonsCompleted: 0,
          totalLessons: 3,
          percent: 0,
          lessons: []
        });

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
          [userId, courseId]
        );

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
          [courseId]
        );
      });
    });

    describe('Enrolled User Scenarios', () => {
      const mockEnrollment = {
        rows: [{
          id: 1,
          user_id: userId,
          course_id: courseId
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any;

      beforeEach(() => {
        mockDb.query.mockResolvedValueOnce(mockEnrollment);
      });

      it('should calculate progress correctly with partial completion', async () => {
        const mockLessonsWithProgress = {
          rows: [
            {
              lesson_id: 1,
              lesson_title: 'HTML Basics',
              position: 1,
              completed: true,
              completed_at: new Date('2024-01-14T10:00:00Z')
            },
            {
              lesson_id: 2,
              lesson_title: 'CSS Styling',
              position: 2,
              completed: true,
              completed_at: new Date('2024-01-15T10:00:00Z')
            },
            {
              lesson_id: 3,
              lesson_title: 'JavaScript Fundamentals',
              position: 3,
              completed: false,
              completed_at: null
            }
          ],
          command: 'SELECT',
          rowCount: 3,
          oid: 0,
          fields: []
        } as any;

        mockDb.query.mockResolvedValueOnce(mockLessonsWithProgress);

        const result = await progressService.getUserCourseProgress(userId, courseId);

        expect(result).toEqual({
          lessonsCompleted: 2,
          totalLessons: 3,
          percent: 67,
          lessons: [
            {
              lessonId: 1,
              lessonTitle: 'HTML Basics',
              position: 1,
              completed: true,
              completed_at: new Date('2024-01-14T10:00:00Z')
            },
            {
              lessonId: 2,
              lessonTitle: 'CSS Styling',
              position: 2,
              completed: true,
              completed_at: new Date('2024-01-15T10:00:00Z')
            },
            {
              lessonId: 3,
              lessonTitle: 'JavaScript Fundamentals',
              position: 3,
              completed: false,
              completed_at: null
            }
          ]
        });

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('LEFT JOIN lesson_progress lp'),
          [1, courseId]
        );
      });

      it('should calculate 100% progress when all lessons completed', async () => {
        const mockLessonsWithProgress = {
          rows: [
            {
              lesson_id: 1,
              lesson_title: 'HTML Basics',
              position: 1,
              completed: true,
              completed_at: new Date('2024-01-14T10:00:00Z')
            },
            {
              lesson_id: 2,
              lesson_title: 'CSS Styling',
              position: 2,
              completed: true,
              completed_at: new Date('2024-01-15T10:00:00Z')
            }
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: []
        } as any;

        mockDb.query.mockResolvedValueOnce(mockLessonsWithProgress);

        const result = await progressService.getUserCourseProgress(userId, courseId);

        expect(result.lessonsCompleted).toBe(2);
        expect(result.totalLessons).toBe(2);
        expect(result.percent).toBe(100);
      });

      it('should calculate 0% progress when no lessons completed', async () => {
        const mockLessonsWithProgress = {
          rows: [
            {
              lesson_id: 1,
              lesson_title: 'HTML Basics',
              position: 1,
              completed: false,
              completed_at: null
            },
            {
              lesson_id: 2,
              lesson_title: 'CSS Styling',
              position: 2,
              completed: false,
              completed_at: null
            }
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: []
        } as any;

        mockDb.query.mockResolvedValueOnce(mockLessonsWithProgress);

        const result = await progressService.getUserCourseProgress(userId, courseId);

        expect(result.lessonsCompleted).toBe(0);
        expect(result.totalLessons).toBe(2);
        expect(result.percent).toBe(0);
      });

      it('should handle course with no lessons', async () => {
        mockDb.query.mockResolvedValueOnce({ 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any);

        const result = await progressService.getUserCourseProgress(userId, courseId);

        expect(result).toEqual({
          lessonsCompleted: 0,
          totalLessons: 0,
          percent: 0,
          lessons: []
        });
      });
    });
  });

  describe('getCourseProgress', () => {
    const courseId = 1;
    const instructorId = 2;
    const adminId = 3;
    const studentId = 1;

    const mockCourse = {
      rows: [{
        id: courseId,
        title: 'Web Development',
        instructor_id: instructorId
      }],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: []
    } as any;

    describe('Authorization Scenarios', () => {
      it('should throw error when course not found', async () => {
        mockDb.query.mockResolvedValueOnce({ 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any);

        await expect(
          progressService.getCourseProgress(courseId, instructorId, 'instructor')
        ).rejects.toThrow('Course not found');

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT * FROM courses WHERE id = $1',
          [courseId]
        );
      });

      it('should throw error when non-admin user tries to view other instructor course', async () => {
        mockDb.query.mockResolvedValueOnce(mockCourse);

        await expect(
          progressService.getCourseProgress(courseId, 999, 'instructor')
        ).rejects.toThrow('You can only view progress for your own courses');
      });

      it('should throw error when student tries to view course progress', async () => {
        mockDb.query.mockResolvedValueOnce(mockCourse);

        await expect(
          progressService.getCourseProgress(courseId, studentId, 'student')
        ).rejects.toThrow('You can only view progress for your own courses');
      });

      it('should allow instructor to view their own course progress', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = { 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockCourse)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([]);
      });

      it('should allow admin to view any course progress', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = { 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockCourse)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, adminId, 'admin');

        expect(result).toEqual([]);
      });
    });

    describe('Progress Calculation Scenarios', () => {
      beforeEach(() => {
        mockDb.query.mockResolvedValueOnce(mockCourse);
      });

      it('should calculate progress for multiple students', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = {
          rows: [
            {
              user_id: 1,
              name: 'Jane Student',
              email: 'jane@test.com',
              enrollment_id: 1,
              completed_count: '2'
            },
            {
              user_id: 4,
              name: 'Bob Learner',
              email: 'bob@test.com',
              enrollment_id: 2,
              completed_count: '1'
            }
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 2,
            totalLessons: 3,
            percent: 67
          },
          {
            user: { id: 4, name: 'Bob Learner', email: 'bob@test.com' },
            completedCount: 1,
            totalLessons: 3,
            percent: 33
          }
        ]);

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
          [courseId]
        );

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(CASE WHEN lp.completed = true THEN 1 END)'),
          [courseId]
        );
      });

      it('should handle students with zero progress', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '2' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = {
          rows: [
            {
              user_id: 1,
              name: 'Jane Student',
              email: 'jane@test.com',
              enrollment_id: 1,
              completed_count: '0'
            }
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 0,
            totalLessons: 2,
            percent: 0
          }
        ]);
      });

      it('should handle students with 100% progress', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '2' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = {
          rows: [
            {
              user_id: 1,
              name: 'Jane Student',
              email: 'jane@test.com',
              enrollment_id: 1,
              completed_count: '2'
            }
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 2,
            totalLessons: 2,
            percent: 100
          }
        ]);
      });

      it('should handle course with no lessons', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '0' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = {
          rows: [
            {
              user_id: 1,
              name: 'Jane Student',
              email: 'jane@test.com',
              enrollment_id: 1,
              completed_count: '0'
            }
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([
          {
            user: { id: 1, name: 'Jane Student', email: 'jane@test.com' },
            completedCount: 0,
            totalLessons: 0,
            percent: 0
          }
        ]);
      });

      it('should return empty array when no enrollments exist', async () => {
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockProgressData = { 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockProgressData);

        const result = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

        expect(result).toEqual([]);
      });
    });
  });

  describe('hasCompletedCourse', () => {
    const userId = 1;
    const courseId = 1;

    it('should return true when user completed all lessons', async () => {
      const mockProgress = {
        lessonsCompleted: 3,
        totalLessons: 3,
        percent: 100,
        lessons: []
      };

      jest.spyOn(progressService, 'getUserCourseProgress').mockResolvedValue(mockProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(true);
      expect(progressService.getUserCourseProgress).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return false when user has not completed all lessons', async () => {
      const mockProgress = {
        lessonsCompleted: 2,
        totalLessons: 3,
        percent: 67,
        lessons: []
      };

      jest.spyOn(progressService, 'getUserCourseProgress').mockResolvedValue(mockProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when course has no lessons', async () => {
      const mockProgress = {
        lessonsCompleted: 0,
        totalLessons: 0,
        percent: 0,
        lessons: []
      };

      jest.spyOn(progressService, 'getUserCourseProgress').mockResolvedValue(mockProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });

    it('should return false when user not enrolled', async () => {
      const mockProgress = {
        lessonsCompleted: 0,
        totalLessons: 3,
        percent: 0,
        lessons: []
      };

      jest.spyOn(progressService, 'getUserCourseProgress').mockResolvedValue(mockProgress);

      const result = await progressService.hasCompletedCourse(userId, courseId);

      expect(result).toBe(false);
    });
  });

  describe('getEnrollmentProgress', () => {
    const enrollmentId = 1;
    const courseId = 1;

    describe('Success Scenarios', () => {
      it('should calculate enrollment progress correctly', async () => {
        const mockEnrollment = { 
          rows: [{ course_id: courseId }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockCompletedLessons = { 
          rows: [{ completed: '2' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockCompletedLessons);

        const result = await progressService.getEnrollmentProgress(enrollmentId);

        expect(result).toEqual({
          completedLessons: 2,
          totalLessons: 3,
          percent: 67
        });

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT course_id FROM enrollments WHERE id = $1',
          [enrollmentId]
        );

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
          [courseId]
        );

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE lp.enrollment_id = $1 AND lp.completed = true'),
          [enrollmentId, courseId]
        );
      });

      it('should handle enrollment with no completed lessons', async () => {
        const mockEnrollment = { 
          rows: [{ course_id: courseId }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockTotalLessons = { 
          rows: [{ total: '3' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockCompletedLessons = { 
          rows: [{ completed: '0' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockCompletedLessons);

        const result = await progressService.getEnrollmentProgress(enrollmentId);

        expect(result).toEqual({
          completedLessons: 0,
          totalLessons: 3,
          percent: 0
        });
      });

      it('should handle enrollment with all lessons completed', async () => {
        const mockEnrollment = { 
          rows: [{ course_id: courseId }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockTotalLessons = { 
          rows: [{ total: '2' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockCompletedLessons = { 
          rows: [{ completed: '2' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockCompletedLessons);

        const result = await progressService.getEnrollmentProgress(enrollmentId);

        expect(result).toEqual({
          completedLessons: 2,
          totalLessons: 2,
          percent: 100
        });
      });

      it('should handle course with no lessons', async () => {
        const mockEnrollment = { 
          rows: [{ course_id: courseId }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockTotalLessons = { 
          rows: [{ total: '0' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;
        const mockCompletedLessons = { 
          rows: [{ completed: '0' }], 
          command: 'SELECT', 
          rowCount: 1, 
          oid: 0, 
          fields: [] 
        } as any;

        mockDb.query
          .mockResolvedValueOnce(mockEnrollment)
          .mockResolvedValueOnce(mockTotalLessons)
          .mockResolvedValueOnce(mockCompletedLessons);

        const result = await progressService.getEnrollmentProgress(enrollmentId);

        expect(result).toEqual({
          completedLessons: 0,
          totalLessons: 0,
          percent: 0
        });
      });
    });

    describe('Error Scenarios', () => {
      it('should throw error when enrollment not found', async () => {
        mockDb.query.mockResolvedValueOnce({ 
          rows: [], 
          command: 'SELECT', 
          rowCount: 0, 
          oid: 0, 
          fields: [] 
        } as any);

        await expect(
          progressService.getEnrollmentProgress(enrollmentId)
        ).rejects.toThrow('Enrollment not found');

        expect(mockDb.query).toHaveBeenCalledWith(
          'SELECT course_id FROM enrollments WHERE id = $1',
          [enrollmentId]
        );
      });
    });
  });
});
