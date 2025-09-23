import { Request, Response } from 'express';
import { progressService } from '../services/progress.service';
import { ProgressValidator } from '../utils/validation';
import { config } from '../config';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const progressController = {
  /**
   * POST /api/progress/complete
   * Mark a lesson as complete or incomplete for the authenticated student
   */
  markComplete: async (req: AuthRequest, res: Response) => {
    try {
      // Validate request body
      const validation = ProgressValidator.validateMarkProgress(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: config.version
        });
      }

      const { enrollmentId, lessonId, completed } = req.body;
      const userId = req.user!.id;

      // Mark lesson progress
      const progress = await progressService.markLessonProgress(
        userId,
        enrollmentId,
        lessonId,
        completed
      );

      res.json({
        ok: true,
        data: {
          id: progress.id,
          enrollmentId: progress.enrollment_id,
          lessonId: progress.lesson_id,
          completed: progress.completed,
          completedAt: progress.completed_at,
          createdAt: progress.created_at,
          updatedAt: progress.updated_at
        },
        version: config.version
      });
    } catch (error: any) {
      console.error('Error marking lesson progress:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }
      
      if (error.message.includes('can only mark progress for your own')) {
        return res.status(403).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }

      res.status(500).json({
        ok: false,
        error: 'Failed to mark lesson progress',
        version: config.version
      });
    }
  },

  /**
   * GET /api/progress/me?courseId=...
   * Get the authenticated user's progress for a specific course
   */
  getMyProgress: async (req: AuthRequest, res: Response) => {
    try {
      // Validate query parameters
      const validation = ProgressValidator.validateCourseIdQuery(req.query);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: config.version
        });
      }

      const courseId = parseInt(req.query.courseId as string);
      const userId = req.user!.id;

      // Get user's progress for the course
      const progress = await progressService.getUserCourseProgress(userId, courseId);

      res.json({
        ok: true,
        data: progress,
        version: config.version
      });
    } catch (error: any) {
      console.error('Error getting user progress:', error);
      
      res.status(500).json({
        ok: false,
        error: 'Failed to get progress',
        version: config.version
      });
    }
  },

  /**
   * GET /api/courses/:courseId/progress
   * Get aggregated progress for all students in a course (instructor/admin only)
   */
  getCourseProgress: async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid course ID',
          version: config.version
        });
      }

      const userId = req.user!.id;
      const role = req.user!.role;

      // Get course progress (service will check permissions)
      const progress = await progressService.getCourseProgress(courseId, userId, role);

      res.json({
        ok: true,
        data: progress,
        count: progress.length,
        version: config.version
      });
    } catch (error: any) {
      console.error('Error getting course progress:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }
      
      if (error.message.includes('can only view progress for your own')) {
        return res.status(403).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }

      res.status(500).json({
        ok: false,
        error: 'Failed to get course progress',
        version: config.version
      });
    }
  }
};
