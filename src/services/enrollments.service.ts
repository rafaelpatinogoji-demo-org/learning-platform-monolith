import { db } from '../db';

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  status: 'active' | 'completed' | 'refunded';
  created_at: Date;
  // Optional joined data
  course?: {
    id: number;
    title: string;
    description: string | null;
    published: boolean;
    price_cents: number;
    instructor_id: number;
  };
  student?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateEnrollmentData {
  courseId: number;
}

export interface UpdateEnrollmentStatusData {
  status: 'active' | 'completed' | 'refunded';
}

export interface EnrollmentListOptions {
  page?: number;
  limit?: number;
}

export interface EnrollmentListResult {
  enrollments: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class EnrollmentsService {
  /**
   * Create a new enrollment for a student
   */
  static async createEnrollment(userId: number, courseId: number): Promise<Enrollment> {
    // Check if course exists and is published
    const courseCheck = await db.query(
      'SELECT id, published FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      throw new Error('Course not found');
    }

    if (!courseCheck.rows[0].published) {
      throw new Error('Cannot enroll in unpublished course');
    }

    // Check for existing enrollment
    const existingCheck = await db.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingCheck.rows.length > 0) {
      throw new Error('Already enrolled in this course');
    }

    // Create enrollment
    const result = await db.query(
      `INSERT INTO enrollments (user_id, course_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id, user_id, course_id, status, created_at`,
      [userId, courseId]
    );

    return result.rows[0];
  }

  /**
   * Get user's enrollments with course details
   */
  static async getUserEnrollments(
    userId: number,
    options: EnrollmentListOptions = {}
  ): Promise<EnrollmentListResult> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM enrollments WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get enrollments with course details
    const enrollmentsResult = await db.query(
      `SELECT 
        e.id, e.user_id, e.course_id, e.status, e.created_at,
        c.title as course_title, c.description as course_description, 
        c.published as course_published, c.price_cents as course_price_cents,
        c.instructor_id as course_instructor_id
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const enrollments = enrollmentsResult.rows.map(row => {
      const enrollment: Enrollment = {
        id: row.id,
        user_id: row.user_id,
        course_id: row.course_id,
        status: row.status,
        created_at: row.created_at,
        course: {
          id: row.course_id,
          title: row.course_title,
          description: row.course_description,
          published: row.course_published,
          price_cents: row.course_price_cents,
          instructor_id: row.course_instructor_id
        }
      };
      return enrollment;
    });

    return {
      enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get course enrollments with student details (for instructors/admins)
   */
  static async getCourseEnrollments(
    courseId: number,
    options: EnrollmentListOptions = {}
  ): Promise<EnrollmentListResult> {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM enrollments WHERE course_id = $1',
      [courseId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get enrollments with student details
    const enrollmentsResult = await db.query(
      `SELECT 
        e.id, e.user_id, e.course_id, e.status, e.created_at,
        u.id as student_id, u.name as student_name, u.email as student_email
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       WHERE e.course_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [courseId, limit, offset]
    );

    const enrollments = enrollmentsResult.rows.map(row => {
      const enrollment: Enrollment = {
        id: row.id,
        user_id: row.user_id,
        course_id: row.course_id,
        status: row.status,
        created_at: row.created_at,
        student: {
          id: row.student_id,
          name: row.student_name,
          email: row.student_email
        }
      };
      return enrollment;
    });

    return {
      enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update enrollment status (admin only)
   */
  static async updateEnrollmentStatus(
    enrollmentId: number,
    status: 'active' | 'completed' | 'refunded'
  ): Promise<Enrollment | null> {
    const result = await db.query(
      `UPDATE enrollments 
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, course_id, status, created_at`,
      [status, enrollmentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get enrollment by ID
   */
  static async getEnrollmentById(enrollmentId: number): Promise<Enrollment | null> {
    const result = await db.query(
      'SELECT id, user_id, course_id, status, created_at FROM enrollments WHERE id = $1',
      [enrollmentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check if user can view course enrollments
   * Instructors can only view enrollments for their own courses
   * Admins can view all enrollments
   */
  static async canViewCourseEnrollments(
    courseId: number,
    userId: number,
    userRole: string
  ): Promise<boolean> {
    if (userRole === 'admin') {
      return true;
    }

    if (userRole === 'instructor') {
      const result = await db.query(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
      return result.rows.length > 0;
    }

    return false;
  }

  /**
   * Validate enrollment status
   */
  static isValidStatus(status: any): status is 'active' | 'completed' | 'refunded' {
    return ['active', 'completed', 'refunded'].includes(status);
  }
}
