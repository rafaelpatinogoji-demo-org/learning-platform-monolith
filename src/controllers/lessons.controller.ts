import { Request, Response, NextFunction } from 'express';
import { lessonsService } from '../services/lessons.service';
import { LessonValidator } from '../utils/validation';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const lessonsController = {
  /**
   * POST /api/courses/:courseId/lessons
   * Create a new lesson for a course
   */
  create: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const courseId = parseInt(req.params.courseId);
      
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid course ID',
          version: 'v0.8'
        });
      }
      
      // Validate input
      const validation = LessonValidator.validateCreateLesson(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: 'v0.8'
        });
      }
      
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required',
          version: 'v0.8'
        });
      }
      
      // Check role permissions
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: 'Only instructors and admins can create lessons',
          role: req.user.role,
          version: 'v0.8'
        });
      }
      
      // Create lesson
      const lessonData = {
        course_id: courseId,
        title: req.body.title,
        video_url: req.body.video_url,
        content_md: req.body.content_md,
        position: req.body.position
      };
      
      const lesson = await lessonsService.createLesson(
        lessonData,
        req.user.id,
        req.user.role
      );
      
      res.status(201).json({
        ok: true,
        lesson,
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  },
  
  /**
   * GET /api/courses/:courseId/lessons
   * List lessons for a course ordered by position
   */
  listByCourse: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const courseId = parseInt(req.params.courseId);
      
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid course ID',
          version: 'v0.8'
        });
      }
      
      const lessons = await lessonsService.listLessons(
        courseId,
        req.user?.id,
        req.user?.role
      );
      
      res.json({
        ok: true,
        lessons,
        count: lessons.length,
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  },
  
  /**
   * GET /api/lessons/:id
   * Get a single lesson by ID
   */
  show: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lessonId = parseInt(req.params.id);
      
      if (isNaN(lessonId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid lesson ID',
          version: 'v0.8'
        });
      }
      
      const lesson = await lessonsService.getLessonById(
        lessonId,
        req.user?.id,
        req.user?.role
      );
      
      res.json({
        ok: true,
        lesson,
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  },
  
  /**
   * PUT /api/lessons/:id
   * Update a lesson
   */
  update: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lessonId = parseInt(req.params.id);
      
      if (isNaN(lessonId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid lesson ID',
          version: 'v0.8'
        });
      }
      
      // Validate input
      const validation = LessonValidator.validateUpdateLesson(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: 'v0.8'
        });
      }
      
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required',
          version: 'v0.8'
        });
      }
      
      // Check role permissions
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: 'Only instructors and admins can update lessons',
          role: req.user.role,
          version: 'v0.8'
        });
      }
      
      const updateData = {
        title: req.body.title,
        video_url: req.body.video_url,
        content_md: req.body.content_md
      };
      
      const lesson = await lessonsService.updateLesson(
        lessonId,
        updateData,
        req.user.id,
        req.user.role
      );
      
      res.json({
        ok: true,
        lesson,
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  },
  
  /**
   * PATCH /api/courses/:courseId/lessons/reorder
   * Atomically reorder lessons for a course
   */
  reorder: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const courseId = parseInt(req.params.courseId);
      
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid course ID',
          version: 'v0.8'
        });
      }
      
      // Validate input
      const validation = LessonValidator.validateReorder(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: 'v0.8'
        });
      }
      
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required',
          version: 'v0.8'
        });
      }
      
      // Check role permissions
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: 'Only instructors and admins can reorder lessons',
          role: req.user.role,
          version: 'v0.8'
        });
      }
      
      const lessons = await lessonsService.reorderLessons(
        courseId,
        req.body.lessonIds,
        req.user.id,
        req.user.role
      );
      
      res.json({
        ok: true,
        lessons,
        count: lessons.length,
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  },
  
  /**
   * DELETE /api/lessons/:id
   * Delete a lesson and re-compact positions
   */
  remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const lessonId = parseInt(req.params.id);
      
      if (isNaN(lessonId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid lesson ID',
          version: 'v0.8'
        });
      }
      
      // Check authentication
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'Authentication required',
          version: 'v0.8'
        });
      }
      
      // Check role permissions
      if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: 'Only instructors and admins can delete lessons',
          role: req.user.role,
          version: 'v0.8'
        });
      }
      
      await lessonsService.deleteLesson(
        lessonId,
        req.user.id,
        req.user.role
      );
      
      res.json({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({
          ok: false,
          error: error.message,
          version: 'v0.8'
        });
      }
      next(error);
    }
  }
};
