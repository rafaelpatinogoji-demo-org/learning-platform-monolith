import { Request, Response } from 'express';
import { EnrollmentsService } from '../services/enrollments.service';
import { EnrollmentValidator } from '../utils/validation';
import { config } from '../config';
import { publish, isNotificationsEnabled } from '../modules/notifications/publisher';

export const enrollmentsController = {
  /**
   * POST /api/enrollments
   * Student enrolls in a course
   */
  enroll: async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validation = EnrollmentValidator.validateCreateEnrollment(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid enrollment data',
            fields: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Students can only enroll themselves
      if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only students can enroll in courses',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Create enrollment
      const enrollment = await EnrollmentsService.createEnrollment(
        req.user.id,
        req.body.courseId
      );

      // Publish enrollment.created event to notifications outbox
      if (isNotificationsEnabled()) {
        await publish('enrollment.created', {
          enrollmentId: enrollment.id,
          userId: req.user.id,
          courseId: req.body.courseId
        });
      }

      res.status(201).json({
        ok: true,
        data: enrollment,
        version: config.version
      });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Course not found') {
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
        
        if (error.message === 'Cannot enroll in unpublished course') {
          return res.status(400).json({
            ok: false,
            error: {
              code: 'COURSE_NOT_PUBLISHED',
              message: 'Cannot enroll in unpublished course',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        if (error.message === 'Already enrolled in this course') {
          return res.status(409).json({
            ok: false,
            error: {
              code: 'ALREADY_ENROLLED',
              message: 'Already enrolled in this course',
              requestId: req.requestId,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      console.error('Error creating enrollment:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create enrollment',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/enrollments/me
   * Get current user's enrollments
   */
  getMyEnrollments: async (req: Request, res: Response) => {
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

      // Get pagination parameters
      const { page, limit } = EnrollmentValidator.validatePagination(req.query);

      // Get user's enrollments
      const result = await EnrollmentsService.getUserEnrollments(
        req.user.id,
        { page, limit }
      );

      res.json({
        ok: true,
        data: result.enrollments,
        pagination: result.pagination,
        version: config.version
      });
    } catch (error) {
      console.error('Error fetching user enrollments:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch enrollments',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/courses/:courseId/enrollments
   * Get enrollments for a specific course (instructor/admin only)
   */
  getCourseEnrollments: async (req: Request, res: Response) => {
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

      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_COURSE_ID',
            message: 'Invalid course ID',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if user can view course enrollments
      const canView = await EnrollmentsService.canViewCourseEnrollments(
        courseId,
        req.user.id,
        req.user.role
      );

      if (!canView) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view enrollments for this course',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get pagination parameters
      const { page, limit } = EnrollmentValidator.validatePagination(req.query);

      // Get course enrollments
      const result = await EnrollmentsService.getCourseEnrollments(
        courseId,
        { page, limit }
      );

      res.json({
        ok: true,
        data: result.enrollments,
        pagination: result.pagination,
        version: config.version
      });
    } catch (error) {
      console.error('Error fetching course enrollments:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch course enrollments',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * PUT /api/enrollments/:id/status
   * Update enrollment status (admin only)
   */
  updateStatus: async (req: Request, res: Response) => {
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

      // Only admins can update enrollment status
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can update enrollment status',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const enrollmentId = parseInt(req.params.id);
      if (isNaN(enrollmentId) || enrollmentId <= 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ENROLLMENT_ID',
            message: 'Invalid enrollment ID',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate request body
      const validation = EnrollmentValidator.validateStatusUpdate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update data',
            fields: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update enrollment status
      const enrollment = await EnrollmentsService.updateEnrollmentStatus(
        enrollmentId,
        req.body.status
      );

      if (!enrollment) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'ENROLLMENT_NOT_FOUND',
            message: 'Enrollment not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        data: enrollment,
        version: config.version
      });
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update enrollment status',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
