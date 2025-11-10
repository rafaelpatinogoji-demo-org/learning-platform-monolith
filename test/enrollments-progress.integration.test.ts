import { EnrollmentsService } from '../src/services/enrollments.service';
import { ProgressService } from '../src/services/progress.service';
import { db } from '../src/db';

jest.mock('../src/db');

describe('Enrollments & Progress Integration Tests', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  let progressService: ProgressService;

  beforeEach(() => {
    progressService = new ProgressService();
    jest.clearAllMocks();
  });

  describe('Complete Enrollment Workflow', () => {
    it('should complete full enrollment and progress tracking workflow', async () => {
      const userId = 1;
      const courseId = 100;
      const lessonId1 = 200;
      const lessonId2 = 201;

      const mockEnrollment = {
        id: 10,
        user_id: userId,
        course_id: courseId,
        status: 'active',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const enrollment = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(enrollment).toBeDefined();
      expect(enrollment.user_id).toBe(userId);
      expect(enrollment.course_id).toBe(courseId);
      expect(enrollment.status).toBe('active');

      const mockEnrollmentData = {
        id: enrollment.id,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };
      const mockLesson1 = { id: lessonId1, course_id: courseId };
      const mockProgress1 = {
        id: 1,
        enrollment_id: enrollment.id,
        lesson_id: lessonId1,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson1], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockProgress1], command: '', rowCount: 1, oid: 0, fields: [] });

      const progress1 = await progressService.markLessonProgress(userId, enrollment.id, lessonId1, true);

      expect(progress1).toBeDefined();
      expect(progress1.completed).toBe(true);
      expect(progress1.lesson_id).toBe(lessonId1);

      const mockLesson2 = { id: lessonId2, course_id: courseId };
      const mockProgress2 = {
        id: 2,
        enrollment_id: enrollment.id,
        lesson_id: lessonId2,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson2], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockProgress2], command: '', rowCount: 1, oid: 0, fields: [] });

      const progress2 = await progressService.markLessonProgress(userId, enrollment.id, lessonId2, true);

      expect(progress2).toBeDefined();
      expect(progress2.completed).toBe(true);
      expect(progress2.lesson_id).toBe(lessonId2);

      const mockLessons = [
        {
          lesson_id: lessonId1,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date()
        },
        {
          lesson_id: lessonId2,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: true,
          completed_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 2, oid: 0, fields: [] });

      const courseProgress = await progressService.getUserCourseProgress(userId, courseId);

      expect(courseProgress.lessonsCompleted).toBe(2);
      expect(courseProgress.totalLessons).toBe(2);
      expect(courseProgress.percent).toBe(100);
    });

    it('should handle partial course completion', async () => {
      const userId = 1;
      const courseId = 100;
      const enrollmentId = 10;
      const lessonId1 = 200;
      const lessonId2 = 201;
      const lessonId3 = 202;

      const mockEnrollmentData = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };

      const mockLesson1 = { id: lessonId1, course_id: courseId };
      const mockProgress1 = {
        id: 1,
        enrollment_id: enrollmentId,
        lesson_id: lessonId1,
        completed: true,
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson1], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockProgress1], command: '', rowCount: 1, oid: 0, fields: [] });

      await progressService.markLessonProgress(userId, enrollmentId, lessonId1, true);

      const mockLessons = [
        {
          lesson_id: lessonId1,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date()
        },
        {
          lesson_id: lessonId2,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: false,
          completed_at: null
        },
        {
          lesson_id: lessonId3,
          lesson_title: 'Lesson 3',
          position: 3,
          completed: false,
          completed_at: null
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 3, oid: 0, fields: [] });

      const courseProgress = await progressService.getUserCourseProgress(userId, courseId);

      expect(courseProgress.lessonsCompleted).toBe(1);
      expect(courseProgress.totalLessons).toBe(3);
      expect(courseProgress.percent).toBe(33);
    });
  });

  describe('Enrollment Status Updates and Progress', () => {
    it('should update enrollment status after course completion', async () => {
      const enrollmentId = 10;
      const userId = 1;
      const courseId = 100;

      const mockEnrollmentData = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };

      const mockLessons = [
        {
          lesson_id: 200,
          lesson_title: 'Lesson 1',
          position: 1,
          completed: true,
          completed_at: new Date()
        },
        {
          lesson_id: 201,
          lesson_title: 'Lesson 2',
          position: 2,
          completed: true,
          completed_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockLessons, command: '', rowCount: 2, oid: 0, fields: [] });

      const isCompleted = await progressService.hasCompletedCourse(userId, courseId);
      expect(isCompleted).toBe(true);

      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        status: 'completed',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const updatedEnrollment = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'completed');

      expect(updatedEnrollment).toBeDefined();
      expect(updatedEnrollment?.status).toBe('completed');
    });

    it('should handle refund workflow', async () => {
      const enrollmentId = 10;
      const userId = 1;
      const courseId = 100;

      const mockUpdatedEnrollment = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        status: 'refunded',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedEnrollment], command: '', rowCount: 1, oid: 0, fields: [] });

      const refundedEnrollment = await EnrollmentsService.updateEnrollmentStatus(enrollmentId, 'refunded');

      expect(refundedEnrollment).toBeDefined();
      expect(refundedEnrollment?.status).toBe('refunded');
    });
  });

  describe('Multi-Student Progress Tracking', () => {
    it('should track progress for multiple students in same course', async () => {
      const courseId = 100;
      const instructorId = 2;

      const mockCourse = { id: courseId, instructor_id: instructorId };
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 10,
          completed_count: '5'
        },
        {
          user_id: 2,
          name: 'Student 2',
          email: 'student2@example.com',
          enrollment_id: 11,
          completed_count: '3'
        },
        {
          user_id: 3,
          name: 'Student 3',
          email: 'student3@example.com',
          enrollment_id: 12,
          completed_count: '10'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '10' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockProgressData, command: '', rowCount: 3, oid: 0, fields: [] });

      const courseProgress = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(courseProgress).toHaveLength(3);
      expect(courseProgress[0].completedCount).toBe(5);
      expect(courseProgress[0].percent).toBe(50);
      expect(courseProgress[1].completedCount).toBe(3);
      expect(courseProgress[1].percent).toBe(30);
      expect(courseProgress[2].completedCount).toBe(10);
      expect(courseProgress[2].percent).toBe(100);
    });
  });

  describe('Progress Modification Workflow', () => {
    it('should allow marking lesson as incomplete after completion', async () => {
      const userId = 1;
      const enrollmentId = 10;
      const lessonId = 200;
      const courseId = 100;

      const mockEnrollmentData = {
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

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [existingProgress], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{
            ...existingProgress,
            completed: false,
            completed_at: null,
            updated_at: new Date()
          }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      const updatedProgress = await progressService.markLessonProgress(userId, enrollmentId, lessonId, false);

      expect(updatedProgress.completed).toBe(false);
      expect(updatedProgress.completed_at).toBeNull();
    });

    it('should handle idempotent progress marking', async () => {
      const userId = 1;
      const enrollmentId = 10;
      const lessonId = 200;
      const courseId = 100;

      const mockEnrollmentData = {
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

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockLesson], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [existingProgress], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{
            ...existingProgress,
            updated_at: new Date()
          }],
          command: '',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      const progress = await progressService.markLessonProgress(userId, enrollmentId, lessonId, true);

      expect(progress).toBeDefined();
      expect(progress.completed).toBe(true);
    });
  });

  describe('Enrollment Validation Rules', () => {
    it('should prevent enrollment in unpublished course', async () => {
      const userId = 1;
      const courseId = 100;

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId, published: false }], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Cannot enroll in unpublished course');
    });

    it('should prevent duplicate enrollments', async () => {
      const userId = 1;
      const courseId = 100;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: courseId, published: true }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(EnrollmentsService.createEnrollment(userId, courseId))
        .rejects.toThrow('Already enrolled in this course');
    });

    it('should prevent progress marking for wrong user', async () => {
      const userId = 1;
      const wrongUserId = 2;
      const enrollmentId = 10;
      const lessonId = 200;
      const courseId = 100;

      const mockEnrollmentData = {
        id: enrollmentId,
        user_id: wrongUserId,
        course_id: courseId,
        course_title: 'Test Course'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('You can only mark progress for your own enrollments');
    });

    it('should prevent progress marking for lesson not in course', async () => {
      const userId = 1;
      const enrollmentId = 10;
      const lessonId = 999;
      const courseId = 100;

      const mockEnrollmentData = {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        course_title: 'Test Course'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEnrollmentData], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      await expect(progressService.markLessonProgress(userId, enrollmentId, lessonId, true))
        .rejects.toThrow('Lesson not found in this course');
    });
  });

  describe('Instructor Access Control', () => {
    it('should allow instructor to view their own course enrollments', async () => {
      const courseId = 100;
      const instructorId = 2;

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: courseId }], command: '', rowCount: 1, oid: 0, fields: [] });

      const canView = await EnrollmentsService.canViewCourseEnrollments(courseId, instructorId, 'instructor');

      expect(canView).toBe(true);
    });

    it('should deny instructor from viewing other instructor courses', async () => {
      const courseId = 100;
      const instructorId = 2;

      mockDb.query.mockResolvedValueOnce({ rows: [], command: '', rowCount: 0, oid: 0, fields: [] });

      const canView = await EnrollmentsService.canViewCourseEnrollments(courseId, instructorId, 'instructor');

      expect(canView).toBe(false);
    });

    it('should allow admin to view any course enrollments', async () => {
      const courseId = 100;
      const adminId = 999;

      const canView = await EnrollmentsService.canViewCourseEnrollments(courseId, adminId, 'admin');

      expect(canView).toBe(true);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to view their own course progress', async () => {
      const courseId = 100;
      const instructorId = 2;

      const mockCourse = { id: courseId, instructor_id: instructorId };
      const mockProgressData = [
        {
          user_id: 1,
          name: 'Student 1',
          email: 'student1@example.com',
          enrollment_id: 10,
          completed_count: '5'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '10' }], command: '', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: mockProgressData, command: '', rowCount: 1, oid: 0, fields: [] });

      const progress = await progressService.getCourseProgress(courseId, instructorId, 'instructor');

      expect(progress).toHaveLength(1);
    });

    it('should deny instructor from viewing other instructor course progress', async () => {
      const courseId = 100;
      const instructorId = 2;
      const otherInstructorId = 3;

      const mockCourse = { id: courseId, instructor_id: otherInstructorId };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCourse], command: '', rowCount: 1, oid: 0, fields: [] });

      await expect(progressService.getCourseProgress(courseId, instructorId, 'instructor'))
        .rejects.toThrow('You can only view progress for your own courses');
    });
  });
});
