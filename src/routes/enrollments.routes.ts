import { Router } from 'express';
import { enrollmentsController } from '../controllers/enrollments.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/enrollments
 * Enroll in a course (student only)
 * Body: { courseId: number }
 */
router.post(
  '/',
  authenticate,
  requireRole('student'),
  enrollmentsController.enroll
);

/**
 * GET /api/enrollments/me
 * Get current user's enrollments with course details
 * Query: ?page=1&limit=10
 */
router.get(
  '/me',
  authenticate,
  enrollmentsController.getMyEnrollments
);

/**
 * PUT /api/enrollments/:id/status
 * Update enrollment status (admin only)
 * Body: { status: 'active' | 'completed' | 'refunded' }
 */
router.put(
  '/:id/status',
  authenticate,
  requireRole('admin'),
  enrollmentsController.updateStatus
);

export default router;
