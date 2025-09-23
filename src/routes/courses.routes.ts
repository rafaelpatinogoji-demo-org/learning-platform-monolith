import { Router } from 'express';
import { coursesController } from '../controllers/courses.controller';
import { lessonsController } from '../controllers/lessons.controller';
import { enrollmentsController } from '../controllers/enrollments.controller';
import { quizzesController } from '../controllers/quizzes.controller';
import { progressController } from '../controllers/progress.controller';
import { certificatesController } from '../controllers/certificates.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public routes (no authentication required)
// GET /courses - List courses (role-based filtering applied in controller)
router.get('/', coursesController.index);

// GET /courses/:id - Get course details (role-based access applied in controller)
router.get('/:id', coursesController.show);

// Protected routes require authentication
// POST /courses - Create course (instructors and admins only)
router.post('/', authenticate, requireRole('instructor', 'admin'), coursesController.create);

// PUT /courses/:id - Update course (ownership checks in controller)
router.put('/:id', authenticate, requireRole('instructor', 'admin'), coursesController.update);

// DELETE /courses/:id - Delete course (admins only)
router.delete('/:id', authenticate, requireRole('admin'), coursesController.remove);

// Publish/Unpublish endpoints (ownership checks in controller)
router.post('/:id/publish', authenticate, requireRole('instructor', 'admin'), coursesController.publish);
router.post('/:id/unpublish', authenticate, requireRole('instructor', 'admin'), coursesController.unpublish);

// ===== Nested Lesson Routes =====

// POST /courses/:courseId/lessons - Create lesson for course (instructor owner|admin)
router.post('/:courseId/lessons', authenticate, requireRole('instructor', 'admin'), lessonsController.create);

// GET /courses/:courseId/lessons - List lessons for course (visibility checks in controller)
// Public/student can view if course is published
router.get('/:courseId/lessons', authMiddleware.optional, lessonsController.listByCourse);

// PATCH /courses/:courseId/lessons/reorder - Atomically reorder lessons (instructor owner|admin)
router.patch('/:courseId/lessons/reorder', authenticate, requireRole('instructor', 'admin'), lessonsController.reorder);

// ===== Nested Quiz Routes =====

// POST /courses/:courseId/quizzes - Create quiz for course (instructor owner|admin)
router.post('/:courseId/quizzes', authenticate, requireRole('instructor', 'admin'), quizzesController.createQuiz);

// GET /courses/:courseId/quizzes - List quizzes for course (visibility checks in controller)
// Public/student can view if course is published
router.get('/:courseId/quizzes', authMiddleware.optional, quizzesController.listCourseQuizzes);

// ===== Nested Enrollment Routes =====

// GET /courses/:courseId/enrollments - List enrollments for course (instructor owner|admin)
router.get('/:courseId/enrollments', authenticate, requireRole('instructor', 'admin'), enrollmentsController.getCourseEnrollments);

// ===== Nested Progress Routes =====

// Import progress controller at the top of the file (will add this import separately)
// GET /courses/:courseId/progress - Get aggregated progress for course (instructor owner|admin)
router.get('/:courseId/progress', authenticate, requireRole('instructor', 'admin'), progressController.getCourseProgress);

// ===== Nested Certificate Routes =====

// GET /courses/:courseId/certificates - List certificates for course (instructor owner|admin)
router.get('/:courseId/certificates', authenticate, requireRole('instructor', 'admin'), certificatesController.getCourseCertificates);

export default router;
