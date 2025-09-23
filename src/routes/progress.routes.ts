import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Progress Routes
 * All routes require authentication
 */

// POST /api/progress/complete
// Mark a lesson as complete/incomplete for the authenticated student
router.post('/complete', authMiddleware.required, progressController.markComplete);

// GET /api/progress/me?courseId=...
// Get the authenticated user's progress for a specific course
router.get('/me', authMiddleware.required, progressController.getMyProgress);

export default router;
