import { Router } from 'express';
import { lessonsController } from '../controllers/lessons.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * Lessons Routes v0.8
 * 
 * These routes handle lesson management with role-based access control.
 * Lessons are nested under courses for creation and listing.
 */

// ===== Course-nested lesson routes =====

// POST /api/courses/:courseId/lessons - Create lesson (instructor owner|admin)
// Note: This route is defined in courses.routes.ts as a nested route

// GET /api/courses/:courseId/lessons - List lessons ordered by position
// Note: This route is defined in courses.routes.ts as a nested route

// PATCH /api/courses/:courseId/lessons/reorder - Atomic reorder (instructor owner|admin)
// Note: This route is defined in courses.routes.ts as a nested route

// ===== Direct lesson routes =====

// GET /api/lessons/:id - Get lesson detail
// Public/student can view if course is published
// Instructor owner and admin can always view
router.get('/:id', authMiddleware.optional, lessonsController.show);

// PUT /api/lessons/:id - Update lesson (instructor owner|admin)
router.put('/:id', authMiddleware.required, lessonsController.update);

// DELETE /api/lessons/:id - Delete lesson (instructor owner|admin)
router.delete('/:id', authMiddleware.required, lessonsController.remove);

export default router;
