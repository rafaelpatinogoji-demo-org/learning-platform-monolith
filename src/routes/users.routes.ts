import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), usersController.index);

router.get('/:id', requireRole('admin'), usersController.show);

router.patch('/:id/role', requireRole('admin'), usersController.updateRole);

router.post('/', requireRole('admin'), usersController.create);

router.put('/:id', usersController.update);

router.delete('/:id', requireRole('admin'), usersController.remove);

export default router;
