import { Router } from 'express';
import { certificatesController } from '../controllers/certificates.controller';
import { authMiddleware, authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

/**
 * Certificates Routes
 */

// POST /api/certificates/issue
// Issue a certificate to a user (instructor/admin only)
router.post('/issue', authenticate, requireRole('instructor', 'admin'), certificatesController.issue);

// POST /api/certificates/claim
// Student claims their own certificate
router.post('/claim', authenticate, requireRole('student'), certificatesController.claim);

// GET /api/certificates/me
// Get authenticated user's certificates
router.get('/me', authMiddleware.required, certificatesController.getMyCertificates);

// GET /api/certificates/:code
// Verify a certificate by code (public endpoint)
router.get('/:code', certificatesController.verify);

export default router;
