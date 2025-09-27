import { Request, Response } from 'express';
import { CoursesService, CreateCourseData, UpdateCourseData } from '../services/courses.service';
import { CourseValidator } from '../utils/validation';

export const coursesController = {
  // GET /courses - List courses with role-based filtering
  index: async (req: Request, res: Response) => {
    try {
      const { page, limit } = CourseValidator.validatePagination(req.query);
      const search = CourseValidator.sanitizeSearch(req.query.q);
      
      let options: any = { page, limit, search };

      // Role-based filtering
      if (!req.user || req.user.role === 'student') {
        // Public or student access - only published courses
        options.published_only = true;
      } else if (req.user.role === 'instructor') {
        // Instructor - only their own courses
        options.instructor_id = req.user.id;
      }
      // Admin sees all courses (no additional filtering)

      const result = await CoursesService.listCourses(options);

      res.json({
        ok: true,
        data: result.courses,
        pagination: result.pagination,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] List courses error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list courses',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // POST /courses - Create new course (instructor/admin only)
  create: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate input
      const validation = CourseValidator.validateCreateCourse(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid course data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Normalize price to cents
      const normalizedPrice = CourseValidator.normalizePrice(req.body.price_cents);
      
      const courseData: CreateCourseData = {
        title: req.body.title.trim(),
        description: req.body.description?.trim() || null,
        price_cents: normalizedPrice!,
        instructor_id: req.body.instructor_id // Only admin can set this
      };

      const course = await CoursesService.createCourse(
        courseData,
        req.user.id,
        req.user.role
      );

      res.status(201).json({
        ok: true,
        message: 'Course created successfully',
        data: course,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Create course error:`, error);
      
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // GET /courses/:id - Get course details
  show: async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const course = await CoursesService.getCourseById(courseId, true);
      
      if (!course) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user can view unpublished course
      if (!course.published) {
        if (!req.user) {
          return res.status(404).json({
            ok: false,
            error: {
              code: 'COURSE_NOT_FOUND',
              message: 'Course not found',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Only instructor (owner) or admin can view unpublished courses
        if (req.user.role === 'student' || 
            (req.user.role === 'instructor' && course.instructor_id !== req.user.id)) {
          return res.status(404).json({
            ok: false,
            error: {
              code: 'COURSE_NOT_FOUND',
              message: 'Course not found',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      res.json({
        ok: true,
        data: course,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Get course error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // PUT /courses/:id - Update course (owner instructor/admin only)
  update: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user can modify this course
      const canModify = await CoursesService.canModifyCourse(courseId, req.user.id, req.user.role);
      if (!canModify) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify this course',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate input
      const validation = CourseValidator.validateUpdateCourse(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid course data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const updateData: UpdateCourseData = {};

      if (req.body.title !== undefined) {
        updateData.title = req.body.title.trim();
      }

      if (req.body.description !== undefined) {
        updateData.description = req.body.description?.trim() || null;
      }

      if (req.body.price_cents !== undefined) {
        updateData.price_cents = CourseValidator.normalizePrice(req.body.price_cents)!;
      }

      // Only admin can change instructor_id
      if (req.body.instructor_id !== undefined && req.user.role === 'admin') {
        updateData.instructor_id = req.body.instructor_id;
      }

      const course = await CoursesService.updateCourse(courseId, updateData);
      
      if (!course) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        message: 'Course updated successfully',
        data: course,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Update course error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // DELETE /courses/:id - Delete course (admin only)
  remove: async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can delete courses',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const deleted = await CoursesService.deleteCourse(courseId);
      
      if (!deleted) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Delete course error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // POST /courses/:id/publish - Publish course (owner instructor/admin only)
  publish: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user can modify this course
      const canModify = await CoursesService.canModifyCourse(courseId, req.user.id, req.user.role);
      if (!canModify) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to publish this course',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const course = await CoursesService.togglePublished(courseId, true);
      
      if (!course) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        message: 'Course published successfully',
        data: course,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Publish course error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to publish course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // POST /courses/:id/unpublish - Unpublish course (owner instructor/admin only)
  unpublish: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user can modify this course
      const canModify = await CoursesService.canModifyCourse(courseId, req.user.id, req.user.role);
      if (!canModify) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to unpublish this course',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const course = await CoursesService.togglePublished(courseId, false);
      
      if (!course) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        message: 'Course unpublished successfully',
        data: course,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Unpublish course error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unpublish course',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // GET /courses/:id/overview - Get course overview with statistics
  overview: async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const overview = await CoursesService.getCourseOverview(courseId);
      
      if (!overview) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check access permissions
      if (!overview.published) {
        if (!req.user) {
          return res.status(404).json({
            ok: false,
            error: {
              code: 'COURSE_NOT_FOUND',
              message: 'Course not found',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }

        // Only instructor (owner) or admin can view unpublished course overview
        if (req.user.role === 'student' || 
            (req.user.role === 'instructor' && overview.instructor.id !== req.user.id)) {
          return res.status(404).json({
            ok: false,
            error: {
              code: 'COURSE_NOT_FOUND',
              message: 'Course not found',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      res.json({
        ok: true,
        data: overview,
        version: 'v1.9' // Versión de API actualizada con mejoras en el sistema de gestión de cursos
      });
    } catch (error) {
      console.error(`[${req.requestId}] Get course overview error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get course overview',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
