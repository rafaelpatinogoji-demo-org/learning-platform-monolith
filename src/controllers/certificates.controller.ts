import { Request, Response } from 'express';
import { certificatesService } from '../services/certificates.service';
import { CertificateValidator } from '../utils/validation';
import { config } from '../config';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const certificatesController = {
  /**
   * POST /api/certificates/issue
   * Issue a certificate to a user (instructor/admin only)
   */
  issue: async (req: AuthRequest, res: Response) => {
    try {
      // Validate request body
      const validation = CertificateValidator.validateIssueCertificate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: config.version
        });
      }

      const { userId, courseId } = req.body;
      const issuerId = req.user!.id;
      const issuerRole = req.user!.role;

      // Issue certificate
      const certificate = await certificatesService.issueCertificate(
        userId,
        courseId,
        issuerId,
        issuerRole
      );

      res.status(201).json({
        ok: true,
        data: {
          id: certificate.id,
          userId: certificate.user_id,
          courseId: certificate.course_id,
          code: certificate.code,
          issuedAt: certificate.issued_at
        },
        version: config.version
      });
    } catch (error: any) {
      console.error('Error issuing certificate:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }

      if (error.message.includes('can only issue certificates for your own')) {
        return res.status(403).json({
          ok: false,
          error: 'NOT_OWNER',
          message: error.message,
          version: config.version
        });
      }

      if (error.message.includes('not eligible')) {
        return res.status(400).json({
          ok: false,
          error: 'NOT_ELIGIBLE',
          message: error.message,
          version: config.version
        });
      }

      if (error.message.includes('already issued')) {
        return res.status(409).json({
          ok: false,
          error: 'ALREADY_ISSUED',
          message: error.message,
          version: config.version
        });
      }

      res.status(500).json({
        ok: false,
        error: 'Failed to issue certificate',
        version: config.version
      });
    }
  },

  /**
   * POST /api/certificates/claim
   * Allow a student to claim their own certificate
   */
  claim: async (req: AuthRequest, res: Response) => {
    try {
      // Validate request body
      const validation = CertificateValidator.validateClaimCertificate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          errors: validation.errors,
          version: config.version
        });
      }

      const { courseId } = req.body;
      const userId = req.user!.id;

      // Claim certificate
      const certificate = await certificatesService.claimCertificate(userId, courseId);

      res.status(201).json({
        ok: true,
        data: {
          id: certificate.id,
          courseId: certificate.course_id,
          code: certificate.code,
          issuedAt: certificate.issued_at
        },
        version: config.version
      });
    } catch (error: any) {
      console.error('Error claiming certificate:', error);

      if (error.message.includes('Not eligible')) {
        return res.status(400).json({
          ok: false,
          error: 'NOT_ELIGIBLE',
          message: error.message,
          version: config.version
        });
      }

      if (error.message.includes('already claimed')) {
        return res.status(409).json({
          ok: false,
          error: 'ALREADY_ISSUED',
          message: error.message,
          version: config.version
        });
      }

      res.status(500).json({
        ok: false,
        error: 'Failed to claim certificate',
        version: config.version
      });
    }
  },

  /**
   * GET /api/certificates/me
   * Get the authenticated user's certificates
   */
  getMyCertificates: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const certificates = await certificatesService.getUserCertificates(userId);

      res.json({
        ok: true,
        data: certificates.map(cert => ({
          course: {
            id: cert.course!.id,
            title: cert.course!.title
          },
          code: cert.code,
          issued_at: cert.issued_at
        })),
        count: certificates.length,
        version: config.version
      });
    } catch (error: any) {
      console.error('Error getting user certificates:', error);

      res.status(500).json({
        ok: false,
        error: 'Failed to get certificates',
        version: config.version
      });
    }
  },

  /**
   * GET /api/courses/:courseId/certificates
   * Get all certificates for a course (instructor/admin only)
   */
  getCourseCertificates: async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid course ID',
          version: config.version
        });
      }

      const userId = req.user!.id;
      const role = req.user!.role;

      // Get course certificates (service will check permissions)
      const certificates = await certificatesService.getCourseCertificates(
        courseId,
        userId,
        role
      );

      res.json({
        ok: true,
        data: certificates.map(cert => ({
          user: {
            id: cert.user!.id,
            name: cert.user!.name,
            email: cert.user!.email
          },
          code: cert.code,
          issued_at: cert.issued_at
        })),
        count: certificates.length,
        version: config.version
      });
    } catch (error: any) {
      console.error('Error getting course certificates:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          error: error.message,
          version: config.version
        });
      }

      if (error.message.includes('can only view certificates for your own')) {
        return res.status(403).json({
          ok: false,
          error: 'NOT_OWNER',
          message: error.message,
          version: config.version
        });
      }

      res.status(500).json({
        ok: false,
        error: 'Failed to get course certificates',
        version: config.version
      });
    }
  },

  /**
   * GET /api/certificates/:code
   * Verify a certificate by its code (public endpoint)
   */
  verify: async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      
      // Validate code format
      const validation = CertificateValidator.validateCertificateCode(code);
      if (!validation.isValid) {
        return res.json({
          ok: true,
          valid: false,
          version: config.version
        });
      }

      // Verify certificate
      const verification = await certificatesService.verifyCertificate(code);

      if (!verification.valid) {
        return res.json({
          ok: true,
          valid: false,
          version: config.version
        });
      }

      res.json({
        ok: true,
        valid: true,
        user: {
          name: verification.user!.name
        },
        course: {
          title: verification.course!.title
        },
        issued_at: verification.issued_at,
        version: config.version
      });
    } catch (error: any) {
      console.error('Error verifying certificate:', error);

      // For verification, always return valid: false on error
      res.json({
        ok: true,
        valid: false,
        version: config.version
      });
    }
  }
};
