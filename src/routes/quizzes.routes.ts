import { Router } from 'express';
import { quizzesController } from '../controllers/quizzes.controller';
import { authenticate, requireRole, authenticateOptional } from '../middleware/auth.middleware';

const router = Router();

// Quiz detail and submissions routes
// GET /api/quizzes/:id - Get quiz detail with questions (public can see published course quizzes)
router.get('/:id', authenticateOptional, quizzesController.getQuiz);

// POST /api/quizzes/:id/submit - Submit quiz answers (enrolled students only)
router.post('/:id/submit', authenticate, quizzesController.submitQuiz);

// GET /api/quizzes/:id/submissions/me - Get student's latest submission
router.get('/:id/submissions/me', authenticate, quizzesController.getMySubmission);

// GET /api/quizzes/:id/submissions - List all submissions (instructor/admin only)
router.get('/:id/submissions', authenticate, quizzesController.listSubmissions);

// Quiz question management routes
// POST /api/quizzes/:quizId/questions - Create a question (instructor/admin only)
router.post('/:quizId/questions', authenticate, requireRole('instructor', 'admin'), quizzesController.createQuestion);

// PUT /api/quizzes/:quizId/questions/:questionId - Update question (instructor/admin only)
router.put('/:quizId/questions/:questionId', authenticate, requireRole('instructor', 'admin'), quizzesController.updateQuestion);

// DELETE /api/quizzes/:quizId/questions/:questionId - Delete question (instructor/admin only)
router.delete('/:quizId/questions/:questionId', authenticate, requireRole('instructor', 'admin'), quizzesController.deleteQuestion);

export default router;
