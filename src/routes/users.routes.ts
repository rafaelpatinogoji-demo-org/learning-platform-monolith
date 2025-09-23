import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /users - List users (admin only)
router.get('/', requireRole('admin'), usersController.index);

// POST /users - Create user (admin only)
router.post('/', requireRole('admin'), usersController.create);

// GET /users/:id - Get user details (admin or own profile)
router.get('/:id', usersController.show);

// PUT /users/:id - Update user (admin or own profile)
router.put('/:id', usersController.update);

// DELETE /users/:id - Delete user (admin only)
router.delete('/:id', requireRole('admin'), usersController.remove);

export default router;
