import { db } from '../db';

export interface Course {
  id: number;
  title: string;
  description: string | null;
  price_cents: number;
  published: boolean;
  instructor_id: number;
  created_at: Date;
  instructor?: {
    id: number;
    name: string;
  };
}

export interface CreateCourseData {
  title: string;
  description?: string;
  price_cents: number;
  instructor_id?: number; // Optional for admin to specify
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  price_cents?: number;
  instructor_id?: number; // Only admin can change
}

export interface CourseListOptions {
  page?: number;
  limit?: number;
  search?: string;
  published_only?: boolean;
  instructor_id?: number; // Filter by instructor
}

export interface CourseListResult {
  courses: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CourseOverview {
  id: number;
  title: string;
  published: boolean;
  instructor: {
    id: number;
    name: string;
  };
  totalLessons: number;
  enrollments: {
    active: number;
    completed: number;
  };
  averageProgress: number;
  quizzes: {
    total: number;
    totalQuestions: number;
  };
  certificatesIssued: number;
  updatedAt: Date;
}

export class CoursesService {
  /**
   * Create a new course
   */
  static async createCourse(data: CreateCourseData, creatorId: number, creatorRole: string): Promise<Course> {
    // Determine instructor_id based on role
    let instructorId = data.instructor_id;
    
    if (creatorRole === 'instructor') {
      // Instructors can only create courses for themselves
      instructorId = creatorId;
    } else if (creatorRole === 'admin') {
      // Admin can specify instructor_id or default to themselves
      instructorId = data.instructor_id || creatorId;
    } else {
      throw new Error('Insufficient permissions to create course');
    }

    const result = await db.query(
      `INSERT INTO courses (title, description, price_cents, instructor_id, published)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, title, description, price_cents, published, instructor_id, created_at`,
      [data.title, data.description || null, data.price_cents, instructorId]
    );

    return result.rows[0];
  }

  /**
   * Get course by ID with optional instructor info
   */
  static async getCourseById(id: number, includeInstructor = false): Promise<Course | null> {
    let query = `
      SELECT c.id, c.title, c.description, c.price_cents, c.published, c.instructor_id, c.created_at
    `;
    
    if (includeInstructor) {
      query += `, u.name as instructor_name`;
    }
    
    query += ` FROM courses c`;
    
    if (includeInstructor) {
      query += ` LEFT JOIN users u ON c.instructor_id = u.id`;
    }
    
    query += ` WHERE c.id = $1`;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const course = result.rows[0];
    
    if (includeInstructor && course.instructor_name) {
      course.instructor = {
        id: course.instructor_id,
        name: course.instructor_name
      };
      delete course.instructor_name;
    }

    return course;
  }

  /**
   * Update course by ID
   */
  static async updateCourse(id: number, data: UpdateCourseData): Promise<Course | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.price_cents !== undefined) {
      updates.push(`price_cents = $${paramCount++}`);
      values.push(data.price_cents);
    }

    if (data.instructor_id !== undefined) {
      updates.push(`instructor_id = $${paramCount++}`);
      values.push(data.instructor_id);
    }

    if (updates.length === 0) {
      // No updates to make, return current course
      return this.getCourseById(id);
    }

    values.push(id);

    const query = `
      UPDATE courses 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, title, description, price_cents, published, instructor_id, created_at
    `;

    const result = await db.query(query, values);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Toggle course published status
   */
  static async togglePublished(id: number, published: boolean): Promise<Course | null> {
    const result = await db.query(
      `UPDATE courses 
       SET published = $1 
       WHERE id = $2 
       RETURNING id, title, description, price_cents, published, instructor_id, created_at`,
      [published, id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * List courses with pagination and filtering
   */
  static async listCourses(options: CourseListOptions = {}): Promise<CourseListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      published_only = false,
      instructor_id
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (published_only) {
      conditions.push(`c.published = true`);
    }

    if (instructor_id) {
      conditions.push(`c.instructor_id = $${paramCount++}`);
      values.push(instructor_id);
    }

    if (search) {
      conditions.push(`(c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get courses with instructor info
    const coursesQuery = `
      SELECT 
        c.id, c.title, c.description, c.price_cents, c.published, c.instructor_id, c.created_at,
        u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    values.push(limit, offset);

    const coursesResult = await db.query(coursesQuery, values);

    const courses = coursesResult.rows.map(row => {
      const course: Course = {
        id: row.id,
        title: row.title,
        description: row.description,
        price_cents: row.price_cents,
        published: row.published,
        instructor_id: row.instructor_id,
        created_at: row.created_at
      };

      if (row.instructor_name) {
        course.instructor = {
          id: row.instructor_id,
          name: row.instructor_name
        };
      }

      return course;
    });

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if user can modify course (ownership check)
   */
  static async canModifyCourse(courseId: number, userId: number, userRole: string): Promise<boolean> {
    if (userRole === 'admin') {
      return true; // Admins can modify any course
    }

    if (userRole === 'instructor') {
      const course = await this.getCourseById(courseId);
      return course ? course.instructor_id === userId : false;
    }

    return false; // Students cannot modify courses
  }

  /**
   * Delete course by ID (admin only)
   */
  static async deleteCourse(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM courses WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get comprehensive course overview with statistics
   */
  static async getCourseOverview(courseId: number): Promise<CourseOverview | null> {
    // First get basic course info with instructor
    const courseQuery = `
      SELECT 
        c.id, c.title, c.published, c.instructor_id, c.created_at,
        u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `;
    
    const courseResult = await db.query(courseQuery, [courseId]);
    
    if (courseResult.rows.length === 0) {
      return null;
    }
    
    const course = courseResult.rows[0];
    
    // Get all statistics in parallel for better performance
    const [
      lessonsResult,
      enrollmentsResult,
      progressResult,
      quizzesResult,
      certificatesResult
    ] = await Promise.all([
      // Total lessons count
      db.query(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = $1',
        [courseId]
      ),
      
      // Enrollments by status
      db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM enrollments 
        WHERE course_id = $1
      `, [courseId]),
      
      // Average progress calculation
      db.query(`
        SELECT 
          COALESCE(AVG(
            CASE 
              WHEN lesson_count = 0 THEN 0
              ELSE (completed_lessons::float / lesson_count::float * 100)
            END
          ), 0) as average_progress
        FROM (
          SELECT 
            e.id,
            COUNT(l.id) as lesson_count,
            COUNT(lp.id) as completed_lessons
          FROM enrollments e
          LEFT JOIN lessons l ON l.course_id = e.course_id
          LEFT JOIN lesson_progress lp ON lp.enrollment_id = e.id AND lp.lesson_id = l.id AND lp.completed_at IS NOT NULL
          WHERE e.course_id = $1
          GROUP BY e.id
        ) progress_stats
      `, [courseId]),
      
      // Quizzes and questions count
      db.query(`
        SELECT 
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(qq.id) as total_questions
        FROM quizzes q
        LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
        WHERE q.course_id = $1
      `, [courseId]),
      
      // Certificates issued count
      db.query(`
        SELECT COUNT(*) as total
        FROM certificates
        WHERE course_id = $1
      `, [courseId])
    ]);
    
    // Extract results with defaults
    const totalLessons = parseInt(lessonsResult.rows[0]?.total || '0');
    const enrollments = {
      active: parseInt(enrollmentsResult.rows[0]?.active || '0'),
      completed: parseInt(enrollmentsResult.rows[0]?.completed || '0')
    };
    const averageProgress = Math.round(parseFloat(progressResult.rows[0]?.average_progress || '0'));
    const quizzes = {
      total: parseInt(quizzesResult.rows[0]?.total_quizzes || '0'),
      totalQuestions: parseInt(quizzesResult.rows[0]?.total_questions || '0')
    };
    const certificatesIssued = parseInt(certificatesResult.rows[0]?.total || '0');
    
    return {
      id: course.id,
      title: course.title,
      published: course.published,
      instructor: {
        id: course.instructor_id,
        name: course.instructor_name || 'Unknown'
      },
      totalLessons,
      enrollments,
      averageProgress,
      quizzes,
      certificatesIssued,
      updatedAt: course.created_at
    };
  }
}
