/**
 * Tests for CertificatesController
 * 
 * Tests HTTP endpoints with mocked service dependencies and proper error handling.
 */

import { Request, Response } from 'express';
import { certificatesController } from '../../src/controllers/certificates.controller';
import { certificatesService } from '../../src/services/certificates.service';
import { CertificateValidator } from '../../src/utils/validation';
import { config } from '../../src/config';
import { testUtils } from '../setup';

jest.mock('../../src/services/certificates.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/config');

const mockCertificatesService = certificatesService as jest.Mocked<typeof certificatesService>;
const mockCertificateValidator = CertificateValidator as jest.Mocked<typeof CertificateValidator>;
const mockConfig = config as jest.Mocked<typeof config>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('CertificatesController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    jest.clearAllMocks();
    
    mockConfig.version = 'v1.2';
  });

  describe('issue', () => {
    it('should successfully issue certificate with valid data', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date('2023-01-01')
      };

      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          userId: 2,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: new Date('2023-01-01')
        },
        version: 'v1.2'
      });
      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(2, 1, 1, 'admin');
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.body = { userId: 'invalid', courseId: null };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'userId', message: 'User ID must be a positive integer' },
          { field: 'courseId', message: 'Course ID is required' }
        ]
      });

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [
          { field: 'userId', message: 'User ID must be a positive integer' },
          { field: 'courseId', message: 'Course ID is required' }
        ],
        version: 'v1.2'
      });
      expect(mockCertificatesService.issueCertificate).not.toHaveBeenCalled();
    });

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Course not found')
      );

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.2'
      });
    });

    it('should return 403 when instructor tries to issue for other course', async () => {
      // Arrange
      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 3, email: 'instructor@example.com', role: 'instructor' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('You can only issue certificates for your own courses')
      );

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only issue certificates for your own courses',
        version: 'v1.2'
      });
    });

    it('should return 400 when user not eligible', async () => {
      // Arrange
      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('User is not eligible: NOT_ALL_LESSONS_COMPLETED (3/5)')
      );

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'User is not eligible: NOT_ALL_LESSONS_COMPLETED (3/5)',
        version: 'v1.2'
      });
    });

    it('should return 409 when certificate already issued', async () => {
      // Arrange
      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Certificate already issued for this user and course')
      );

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already issued for this user and course',
        version: 'v1.2'
      });
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      mockReq.body = { userId: 2, courseId: 1 };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to issue certificate',
        version: 'v1.2'
      });
    });
  });

  describe('claim', () => {
    it('should successfully claim certificate for student', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-STU123-CLM456',
        issued_at: new Date('2023-01-01')
      };

      mockReq.body = { courseId: 1 };
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          courseId: 1,
          code: 'CERT-STU123-CLM456',
          issuedAt: new Date('2023-01-01')
        },
        version: 'v1.2'
      });
      expect(mockCertificatesService.claimCertificate).toHaveBeenCalledWith(2, 1);
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.body = { courseId: 'invalid' };
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
        version: 'v1.2'
      });
    });

    it('should return 400 when student not eligible', async () => {
      // Arrange
      mockReq.body = { courseId: 1 };
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (2/5)')
      );

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (2/5)',
        version: 'v1.2'
      });
    });

    it('should return 409 when certificate already claimed', async () => {
      // Arrange
      mockReq.body = { courseId: 1 };
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Certificate already claimed for this course')
      );

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already claimed for this course',
        version: 'v1.2'
      });
    });
  });

  describe('getMyCertificates', () => {
    it('should return user certificates', async () => {
      // Arrange
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01'),
          course: { id: 1, title: 'JavaScript Basics' }
        },
        {
          id: 2,
          code: 'CERT-XYZ789-ABC123',
          issued_at: new Date('2023-02-01'),
          course: { id: 2, title: 'React Advanced' }
        }
      ];

      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };
      mockCertificatesService.getUserCertificates.mockResolvedValue(mockCertificates);

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: { id: 1, title: 'JavaScript Basics' },
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date('2023-01-01')
          },
          {
            course: { id: 2, title: 'React Advanced' },
            code: 'CERT-XYZ789-ABC123',
            issued_at: new Date('2023-02-01')
          }
        ],
        count: 2,
        version: 'v1.2'
      });
      expect(mockCertificatesService.getUserCertificates).toHaveBeenCalledWith(2);
    });

    it('should return empty array when no certificates found', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };
      mockCertificatesService.getUserCertificates.mockResolvedValue([]);

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: 'v1.2'
      });
    });

    it('should return 500 for service errors', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'student@example.com', role: 'student' };
      mockCertificatesService.getUserCertificates.mockRejectedValue(
        new Error('Database error')
      );

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get certificates',
        version: 'v1.2'
      });
    });
  });

  describe('getCourseCertificates', () => {
    it('should return course certificates for admin', async () => {
      // Arrange
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01'),
          user: { id: 3, name: 'John Doe', email: 'john@example.com' }
        }
      ];

      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockCertificatesService.getCourseCertificates.mockResolvedValue(mockCertificates);

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            user: { id: 3, name: 'John Doe', email: 'john@example.com' },
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date('2023-01-01')
          }
        ],
        count: 1,
        version: 'v1.2'
      });
      expect(mockCertificatesService.getCourseCertificates).toHaveBeenCalledWith(1, 1, 'admin');
    });

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.params = { courseId: 'invalid' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.2'
      });
    });

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('Course not found')
      );

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.2'
      });
    });

    it('should return 403 when instructor tries to view other course', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('You can only view certificates for your own courses')
      );

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only view certificates for your own courses',
        version: 'v1.2'
      });
    });
  });

  describe('verify', () => {
    it('should return valid verification for existing certificate', async () => {
      // Arrange
      const mockVerification = {
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Basics' },
        issued_at: new Date('2023-01-01')
      };

      mockReq.params = { code: 'CERT-ABC123-DEF456' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue(mockVerification);

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Basics' },
        issued_at: new Date('2023-01-01'),
        version: 'v1.2'
      });
    });

    it('should return invalid for malformed certificate code', async () => {
      // Arrange
      mockReq.params = { code: 'invalid-code' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Invalid certificate code format' }]
      });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.2'
      });
      expect(mockCertificatesService.verifyCertificate).not.toHaveBeenCalled();
    });

    it('should return invalid for non-existing certificate', async () => {
      // Arrange
      mockReq.params = { code: 'CERT-NOTFND-123456' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({ valid: false });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.2'
      });
    });

    it('should return invalid for service errors', async () => {
      // Arrange
      mockReq.params = { code: 'CERT-ABC123-DEF456' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockRejectedValue(
        new Error('Database error')
      );

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.2'
      });
    });
  });
});
