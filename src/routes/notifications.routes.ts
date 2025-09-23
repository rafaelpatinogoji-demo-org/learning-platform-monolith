import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';

const router = Router();

// Health check endpoint - no authentication required
router.get('/health', notificationsController.getHealth);

export default router;
