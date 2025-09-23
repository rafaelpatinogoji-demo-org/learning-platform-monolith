import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /auth/register - Create new user account
router.post('/register', authController.register);

// POST /auth/login - Authenticate user and issue JWT
router.post('/login', authController.login);

// GET /auth/me - Get current user profile (requires authentication)
router.get('/me', authenticate, authController.me);

export default router;
