import { db } from '../db';

export interface LessonProgress {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProgressSummary {
  lessonsCompleted: number;
  totalLessons: number;
  percent: number;
  lessons: {
    lessonId: number;
    lessonTitle?: string;
    position?: number;
    completed: boolean;
    completed_at: Date | null;
  }[];
}

export interface StudentProgress {
  user: {
    id: number;
    name: string;
    email: string;
  };
  completedCount: number;
  totalLessons: number;
  percent: number;
}

export class ProgressService {
  /**
   * Mark a lesson as complete or incomplete for an enrollment
   * Idempotent operation - can be called multiple times
   */
  async markLessonProgress(
    userId: number,
    enrollmentId: number,
    lessonId: number,
    completed: boolean
  ): Promise<LessonProgress> {
    // Verify the enrollment belongs to the user
    const enrollment = await db.query(
      `SELECT e.*, c.id as course_id, c.title as course_title
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = $1`,
      [enrollmentId]
    );

    if (!enrollment.rows[0]) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.rows[0].user_id !== userId) {
      throw new Error('You can only mark progress for your own enrollments');
    }

    // Verify the lesson belongs to the enrollment's course
    const lesson = await db.query(
      'SELECT * FROM lessons WHERE id = $1 AND course_id = $2',
      [lessonId, enrollment.rows[0].course_id]
    );

    if (!lesson.rows[0]) {
      throw new Error('Lesson not found in this course');
    }

    // Check if progress record exists
    const existingProgress = await db.query(
      'SELECT * FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2',
      [enrollmentId, lessonId]
    );

    let result;
    if (existingProgress.rows[0]) {
      // Update existing progress
      if (completed && !existingProgress.rows[0].completed) {
        // First time marking as complete - set completed_at
        result = await db.query(
          `UPDATE lesson_progress 
           SET completed = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2 AND lesson_id = $3
           RETURNING *`,
          [completed, enrollmentId, lessonId]
        );
      } else if (!completed) {
        // Marking as incomplete - clear completed_at
        result = await db.query(
          `UPDATE lesson_progress 
           SET completed = $1, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2 AND lesson_id = $3
           RETURNING *`,
          [completed, enrollmentId, lessonId]
        );
      } else {
        // Already completed, just update timestamp
        result = await db.query(
          `UPDATE lesson_progress 
           SET updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2 AND lesson_id = $3
           RETURNING *`,
          [completed, enrollmentId, lessonId]
        );
      }
    } else {
      // Create new progress record
      result = await db.query(
        `INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [enrollmentId, lessonId, completed, completed ? 'CURRENT_TIMESTAMP' : null]
      );
    }

    return result.rows[0];
  }

  /**
   * Get user's progress for a specific course
   */
  async getUserCourseProgress(userId: number, courseId: number): Promise<ProgressSummary> {
    // Get user's enrollment for the course
    const enrollment = await db.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (!enrollment.rows[0]) {
      // User not enrolled, return empty progress
      const totalLessonsResult = await db.query(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
        [courseId]
      );
      const totalLessons = parseInt(totalLessonsResult.rows[0].total);

      return {
        lessonsCompleted: 0,
        totalLessons,
        percent: 0,
        lessons: []
      };
    }

    const enrollmentId = enrollment.rows[0].id;

    // Get all lessons for the course with progress status
    const lessonsWithProgress = await db.query(
      `SELECT 
        l.id as lesson_id,
        l.title as lesson_title,
        l.position,
        COALESCE(lp.completed, false) as completed,
        lp.completed_at
       FROM lessons l
       LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = $1
       WHERE l.course_id = $2
       ORDER BY l.position`,
      [enrollmentId, courseId]
    );

    const lessons = lessonsWithProgress.rows.map(row => ({
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title,
      position: row.position,
      completed: row.completed,
      completed_at: row.completed_at
    }));

    const lessonsCompleted = lessons.filter(l => l.completed).length;
    const totalLessons = lessons.length;
    const percent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

    return {
      lessonsCompleted,
      totalLessons,
      percent,
      lessons
    };
  }

  /**
   * Get aggregated progress for all students in a course
   * Only accessible by course instructor or admin
   */
  async getCourseProgress(courseId: number, requesterId: number, role: string): Promise<StudentProgress[]> {
    // Check if requester can view course progress
    const course = await db.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );

    if (!course.rows[0]) {
      throw new Error('Course not found');
    }

    // Check permissions
    if (role !== 'admin' && course.rows[0].instructor_id !== requesterId) {
      throw new Error('You can only view progress for your own courses');
    }

    // Get total lessons for the course
    const totalLessonsResult = await db.query(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const totalLessons = parseInt(totalLessonsResult.rows[0].total);

    // Get all enrollments with progress counts
    const progressData = await db.query(
      `SELECT 
        u.id as user_id,
        u.name,
        u.email,
        e.id as enrollment_id,
        COUNT(CASE WHEN lp.completed = true THEN 1 END) as completed_count
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN lesson_progress lp ON e.id = lp.enrollment_id
       WHERE e.course_id = $1
       GROUP BY u.id, u.name, u.email, e.id
       ORDER BY u.name`,
      [courseId]
    );

    return progressData.rows.map(row => ({
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email
      },
      completedCount: parseInt(row.completed_count),
      totalLessons,
      percent: totalLessons > 0 ? Math.round((parseInt(row.completed_count) / totalLessons) * 100) : 0
    }));
  }

  /**
   * Check if a user has completed all lessons in a course
   * Useful for certificate eligibility
   */
  async hasCompletedCourse(userId: number, courseId: number): Promise<boolean> {
    const progress = await this.getUserCourseProgress(userId, courseId);
    return progress.totalLessons > 0 && progress.lessonsCompleted === progress.totalLessons;
  }

  /**
   * Get progress for a specific enrollment (internal use)
   */
  async getEnrollmentProgress(enrollmentId: number): Promise<{
    completedLessons: number;
    totalLessons: number;
    percent: number;
  }> {
    // Get course ID from enrollment
    const enrollment = await db.query(
      'SELECT course_id FROM enrollments WHERE id = $1',
      [enrollmentId]
    );

    if (!enrollment.rows[0]) {
      throw new Error('Enrollment not found');
    }

    const courseId = enrollment.rows[0].course_id;

    // Get total lessons
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
      [courseId]
    );
    const totalLessons = parseInt(totalResult.rows[0].total);

    // Get completed lessons
    const completedResult = await db.query(
      `SELECT COUNT(*) as completed 
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.enrollment_id = $1 AND lp.completed = true AND l.course_id = $2`,
      [enrollmentId, courseId]
    );
    const completedLessons = parseInt(completedResult.rows[0].completed);

    return {
      completedLessons,
      totalLessons,
      percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    };
  }
}

export const progressService = new ProgressService();
