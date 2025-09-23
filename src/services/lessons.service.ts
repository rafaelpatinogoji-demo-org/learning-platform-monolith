import { db } from '../db';
import { QueryResult } from 'pg';

interface Lesson {
  id: number;
  course_id: number;
  title: string;
  video_url?: string;
  content_md?: string;
  position: number;
  created_at: Date;
}

interface CreateLessonData {
  course_id: number;
  title: string;
  video_url?: string;
  content_md?: string;
  position?: number;
}

interface UpdateLessonData {
  title?: string;
  video_url?: string;
  content_md?: string;
}

export class LessonsService {
  /**
   * Create a new lesson for a course
   * If position is not provided, append to the end
   */
  async createLesson(data: CreateLessonData, userId: number, userRole: string): Promise<Lesson> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if the course exists and user has permission
      const courseResult = await client.query(
        'SELECT id, instructor_id, published FROM courses WHERE id = $1',
        [data.course_id]
      );
      
      if (courseResult.rows.length === 0) {
        throw { status: 404, message: 'Course not found' };
      }
      
      const course = courseResult.rows[0];
      
      // Check permission: instructor must own the course, admin can modify any
      if (userRole !== 'admin' && course.instructor_id !== userId) {
        throw { status: 403, message: 'You do not have permission to add lessons to this course' };
      }
      
      // Determine position if not provided
      let position = data.position;
      if (!position) {
        const maxPositionResult = await client.query(
          'SELECT COALESCE(MAX(position), 0) as max_position FROM lessons WHERE course_id = $1',
          [data.course_id]
        );
        position = maxPositionResult.rows[0].max_position + 1;
      } else {
        // If position is provided, shift existing lessons
        await client.query(
          'UPDATE lessons SET position = position + 1 WHERE course_id = $1 AND position >= $2',
          [data.course_id, position]
        );
      }
      
      // Create the lesson
      const result = await client.query(
        `INSERT INTO lessons (course_id, title, video_url, content_md, position)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.course_id, data.title, data.video_url || null, data.content_md || null, position]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * List lessons for a course, ordered by position
   * Visibility rules: public/student can only see lessons for published courses
   */
  async listLessons(courseId: number, userId?: number, userRole?: string): Promise<Lesson[]> {
    // First check if course exists and get its status
    const courseResult = await db.query(
      'SELECT id, instructor_id, published FROM courses WHERE id = $1',
      [courseId]
    );
    
    if (courseResult.rows.length === 0) {
      throw { status: 404, message: 'Course not found' };
    }
    
    const course = courseResult.rows[0];
    
    // Check visibility permissions
    const canView = 
      course.published || // Published courses are visible to all
      userRole === 'admin' || // Admins can see all
      (userId && course.instructor_id === userId); // Instructors can see their own
    
    if (!canView) {
      throw { status: 403, message: 'You do not have permission to view lessons for this course' };
    }
    
    // Get lessons ordered by position
    const result = await db.query(
      'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
      [courseId]
    );
    
    return result.rows;
  }
  
  /**
   * Get a single lesson by ID
   * Same visibility rules as list
   */
  async getLessonById(lessonId: number, userId?: number, userRole?: string): Promise<Lesson> {
    // Get lesson with course info
    const result = await db.query(
      `SELECT l.*, c.instructor_id, c.published 
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    
    if (result.rows.length === 0) {
      throw { status: 404, message: 'Lesson not found' };
    }
    
    const lesson = result.rows[0];
    
    // Check visibility permissions
    const canView = 
      lesson.published || // Published courses are visible to all
      userRole === 'admin' || // Admins can see all
      (userId && lesson.instructor_id === userId); // Instructors can see their own
    
    if (!canView) {
      throw { status: 403, message: 'You do not have permission to view this lesson' };
    }
    
    // Remove course metadata from response
    delete lesson.instructor_id;
    delete lesson.published;
    
    return lesson;
  }
  
  /**
   * Update a lesson
   * Only instructor owner or admin can update
   */
  async updateLesson(lessonId: number, data: UpdateLessonData, userId: number, userRole: string): Promise<Lesson> {
    // Get lesson with course info
    const lessonResult = await db.query(
      `SELECT l.*, c.instructor_id 
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    
    if (lessonResult.rows.length === 0) {
      throw { status: 404, message: 'Lesson not found' };
    }
    
    const lesson = lessonResult.rows[0];
    
    // Check permission
    if (userRole !== 'admin' && lesson.instructor_id !== userId) {
      throw { status: 403, message: 'You do not have permission to update this lesson' };
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (data.title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(data.title);
      paramCount++;
    }
    
    if (data.video_url !== undefined) {
      updates.push(`video_url = $${paramCount}`);
      values.push(data.video_url || null);
      paramCount++;
    }
    
    if (data.content_md !== undefined) {
      updates.push(`content_md = $${paramCount}`);
      values.push(data.content_md || null);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return lesson; // No updates to make
    }
    
    values.push(lessonId);
    
    const result = await db.query(
      `UPDATE lessons SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows[0];
  }
  
  /**
   * Reorder lessons atomically
   * Expects an ordered array of lesson IDs for the course
   */
  async reorderLessons(courseId: number, lessonIds: number[], userId: number, userRole: string): Promise<Lesson[]> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check course exists and user has permission
      const courseResult = await client.query(
        'SELECT id, instructor_id FROM courses WHERE id = $1',
        [courseId]
      );
      
      if (courseResult.rows.length === 0) {
        throw { status: 404, message: 'Course not found' };
      }
      
      const course = courseResult.rows[0];
      
      // Check permission
      if (userRole !== 'admin' && course.instructor_id !== userId) {
        throw { status: 403, message: 'You do not have permission to reorder lessons for this course' };
      }
      
      // Get current lessons for this course
      const currentLessonsResult = await client.query(
        'SELECT id FROM lessons WHERE course_id = $1 ORDER BY position',
        [courseId]
      );
      
      const currentLessonIds = currentLessonsResult.rows.map((row: any) => row.id);
      
      // Validate that provided IDs match exactly (same set, just reordered)
      if (lessonIds.length !== currentLessonIds.length) {
        throw { 
          status: 400, 
          message: 'Invalid lesson IDs: count mismatch. Expected ' + currentLessonIds.length + ' lessons' 
        };
      }
      
      const providedSet = new Set(lessonIds);
      const currentSet = new Set(currentLessonIds);
      
      for (const id of currentLessonIds) {
        if (!providedSet.has(id)) {
          throw { 
            status: 400, 
            message: `Invalid lesson IDs: lesson ${id} is missing from the reorder list` 
          };
        }
      }
      
      for (const id of lessonIds) {
        if (!currentSet.has(id)) {
          throw { 
            status: 400, 
            message: `Invalid lesson IDs: lesson ${id} does not belong to this course` 
          };
        }
      }
      
      // Update positions atomically
      for (let i = 0; i < lessonIds.length; i++) {
        await client.query(
          'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
          [i + 1, lessonIds[i], courseId]
        );
      }
      
      // Get the reordered lessons
      const result = await client.query(
        'SELECT * FROM lessons WHERE course_id = $1 ORDER BY position ASC',
        [courseId]
      );
      
      await client.query('COMMIT');
      return result.rows;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete a lesson and re-compact positions
   */
  async deleteLesson(lessonId: number, userId: number, userRole: string): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get lesson with course info
      const lessonResult = await client.query(
        `SELECT l.*, c.instructor_id 
         FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = $1`,
        [lessonId]
      );
      
      if (lessonResult.rows.length === 0) {
        throw { status: 404, message: 'Lesson not found' };
      }
      
      const lesson = lessonResult.rows[0];
      
      // Check permission
      if (userRole !== 'admin' && lesson.instructor_id !== userId) {
        throw { status: 403, message: 'You do not have permission to delete this lesson' };
      }
      
      // Delete the lesson
      await client.query('DELETE FROM lessons WHERE id = $1', [lessonId]);
      
      // Re-compact positions (close the gap)
      await client.query(
        'UPDATE lessons SET position = position - 1 WHERE course_id = $1 AND position > $2',
        [lesson.course_id, lesson.position]
      );
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Check if a user can modify lessons for a course
   */
  async canModifyCourseLessons(courseId: number, userId: number, userRole: string): Promise<boolean> {
    if (userRole === 'admin') {
      return true;
    }
    
    const result = await db.query(
      'SELECT instructor_id FROM courses WHERE id = $1',
      [courseId]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].instructor_id === userId;
  }
}

export const lessonsService = new LessonsService();
