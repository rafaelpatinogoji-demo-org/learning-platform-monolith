import { Router } from 'express';
import { certificatesController } from '../controllers/certificates.controller';
import { authMiddleware, authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/issue', authenticate, requireRole('instructor', 'admin'), certificatesController.issue);

router.post('/claim', authenticate, requireRole('student'), certificatesController.claim);

router.get('/me', authMiddleware.required, certificatesController.getMyCertificates);

router.get('/:code', certificatesController.verify);

export default router;
