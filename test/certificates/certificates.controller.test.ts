/**
 * Tests for CertificatesController
 * 
 * Controller tests with mocked service layer, testing HTTP request/response handling,
 * validation, error handling, and proper status codes.
 */

import { Request, Response } from 'express';
import { certificatesController } from '../../src/controllers/certificates.controller';
import { certificatesService } from '../../src/services/certificates.service';
import { CertificateValidator } from '../../src/utils/validation';
import { config } from '../../src/config';
import { testUtils } from '../setup';

// Mock dependencies
jest.mock('../../src/services/certificates.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/config', () => ({
  config: {
    version: '1.2.0'
  }
}));

const mockCertificatesService = certificatesService as jest.Mocked<typeof certificatesService>;
const mockCertificateValidator = CertificateValidator as jest.Mocked<typeof CertificateValidator>;

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

  // Test data
  const mockUser = {
    id: 1,
    email: 'student@example.com',
    role: 'student'
  };

  const mockInstructor = {
    id: 2,
    email: 'instructor@example.com',
    role: 'instructor'
  };

  const mockAdmin = {
    id: 3,
    email: 'admin@example.com',
    role: 'admin'
  };

  const mockCertificate = {
    id: 1,
    user_id: 1,
    course_id: 1,
    code: 'CERT-ABC123-DEF456',
    issued_at: new Date('2023-01-01T00:00:00Z')
  };

  const mockCertificateWithDetails = {
    id: 1,
    code: 'CERT-ABC123-DEF456',
    issued_at: new Date('2023-01-01T00:00:00Z'),
    course: {
      id: 1,
      title: 'JavaScript Fundamentals'
    }
  };

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('issue', () => {
    beforeEach(() => {
      mockReq.user = mockInstructor;
      mockReq.body = { userId: 1, courseId: 1 };
    });

    it('should successfully issue certificate', async () => {
      // Arrange
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificateValidator.validateIssueCertificate).toHaveBeenCalledWith({
        userId: 1,
        courseId: 1
      });
      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(
        1, 1, 2, 'instructor'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          userId: 1,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: new Date('2023-01-01T00:00:00Z')
        },
        version: '1.2.0'
      });
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'userId', message: 'User ID is required' },
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
          { field: 'userId', message: 'User ID is required' },
          { field: 'courseId', message: 'Course ID is required' }
        ],
        version: '1.2.0'
      });
      expect(mockCertificatesService.issueCertificate).not.toHaveBeenCalled();
    });

    it('should return 404 when course not found', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 403 when instructor tries to issue for other course', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 400 when user not eligible', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 409 when certificate already issued', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should work for admin users', async () => {
      // Arrange
      mockReq.user = mockAdmin;
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      // Act
      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(
        1, 1, 3, 'admin'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('claim', () => {
    beforeEach(() => {
      mockReq.user = mockUser;
      mockReq.body = { courseId: 1 };
    });

    it('should successfully claim certificate', async () => {
      // Arrange
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificateValidator.validateClaimCertificate).toHaveBeenCalledWith({
        courseId: 1
      });
      expect(mockCertificatesService.claimCertificate).toHaveBeenCalledWith(1, 1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: new Date('2023-01-01T00:00:00Z')
        },
        version: '1.2.0'
      });
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required' }]
      });

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID is required' }],
        version: '1.2.0'
      });
    });

    it('should return 400 when user not eligible', async () => {
      // Arrange
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Not eligible for certificate: ENROLLMENT_NOT_FOUND')
      );

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'Not eligible for certificate: ENROLLMENT_NOT_FOUND',
        version: '1.2.0'
      });
    });

    it('should return 409 when certificate already claimed', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to claim certificate',
        version: '1.2.0'
      });
    });
  });

  describe('getMyCertificates', () => {
    beforeEach(() => {
      mockReq.user = mockUser;
    });

    it('should return user certificates', async () => {
      // Arrange
      const mockCertificates = [
        mockCertificateWithDetails,
        {
          id: 2,
          code: 'CERT-XYZ789-GHI012',
          issued_at: new Date('2023-02-01T00:00:00Z'),
          course: {
            id: 2,
            title: 'React Advanced'
          }
        }
      ];
      mockCertificatesService.getUserCertificates.mockResolvedValue(mockCertificates);

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificatesService.getUserCertificates).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: {
              id: 1,
              title: 'JavaScript Fundamentals'
            },
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date('2023-01-01T00:00:00Z')
          },
          {
            course: {
              id: 2,
              title: 'React Advanced'
            },
            code: 'CERT-XYZ789-GHI012',
            issued_at: new Date('2023-02-01T00:00:00Z')
          }
        ],
        count: 2,
        version: '1.2.0'
      });
    });

    it('should return empty array when user has no certificates', async () => {
      // Arrange
      mockCertificatesService.getUserCertificates.mockResolvedValue([]);

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: '1.2.0'
      });
    });

    it('should return 500 for service errors', async () => {
      // Arrange
      mockCertificatesService.getUserCertificates.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get certificates',
        version: '1.2.0'
      });
    });
  });

  describe('getCourseCertificates', () => {
    beforeEach(() => {
      mockReq.user = mockInstructor;
      mockReq.params = { courseId: '1' };
    });

    it('should return course certificates for instructor', async () => {
      // Arrange
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01T00:00:00Z'),
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ];
      mockCertificatesService.getCourseCertificates.mockResolvedValue(mockCertificates);

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificatesService.getCourseCertificates).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com'
            },
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date('2023-01-01T00:00:00Z')
          }
        ],
        count: 1,
        version: '1.2.0'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.params = { courseId: 'invalid' };

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: '1.2.0'
      });
      expect(mockCertificatesService.getCourseCertificates).not.toHaveBeenCalled();
    });

    it('should return 400 for negative course ID', async () => {
      // Arrange
      mockReq.params = { courseId: '-1' };

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: '1.2.0'
      });
    });

    it('should return 404 when course not found', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should return 403 when instructor tries to view other course certificates', async () => {
      // Arrange
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
        version: '1.2.0'
      });
    });

    it('should work for admin users', async () => {
      // Arrange
      mockReq.user = mockAdmin;
      mockCertificatesService.getCourseCertificates.mockResolvedValue([]);

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockCertificatesService.getCourseCertificates).toHaveBeenCalledWith(1, 3, 'admin');
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course certificates',
        version: '1.2.0'
      });
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      mockReq.params = { code: 'CERT-ABC123-DEF456' };
    });

    it('should return valid certificate details', async () => {
      // Arrange
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Fundamentals' },
        issued_at: new Date('2023-01-01T00:00:00Z')
      });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCertificateValidator.validateCertificateCode).toHaveBeenCalledWith('CERT-ABC123-DEF456');
      expect(mockCertificatesService.verifyCertificate).toHaveBeenCalledWith('CERT-ABC123-DEF456');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Fundamentals' },
        issued_at: new Date('2023-01-01T00:00:00Z'),
        version: '1.2.0'
      });
    });

    it('should return invalid for malformed certificate code', async () => {
      // Arrange
      mockReq.params = { code: 'INVALID-CODE' };
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
        version: '1.2.0'
      });
      expect(mockCertificatesService.verifyCertificate).not.toHaveBeenCalled();
    });

    it('should return invalid when certificate not found', async () => {
      // Arrange
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: false
      });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.2.0'
      });
    });

    it('should return invalid for service errors', async () => {
      // Arrange
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.2.0'
      });
    });

    it('should handle empty certificate code', async () => {
      // Arrange
      mockReq.params = { code: '' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Certificate code is required' }]
      });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.2.0'
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete certificate issuance flow', async () => {
      // Arrange - Admin issuing certificate
      mockReq.user = mockAdmin;
      mockReq.body = { userId: 1, courseId: 1 };
      
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
          userId: 1,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: new Date('2023-01-01T00:00:00Z')
        },
        version: '1.2.0'
      });
    });

    it('should handle complete certificate verification flow', async () => {
      // Arrange
      mockReq.params = { code: 'CERT-ABC123-DEF456' };
      
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Fundamentals' },
        issued_at: new Date('2023-01-01T00:00:00Z')
      });

      // Act
      await certificatesController.verify(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'JavaScript Fundamentals' },
        issued_at: new Date('2023-01-01T00:00:00Z'),
        version: '1.2.0'
      });
    });

    it('should handle student claiming and viewing certificates', async () => {
      // Arrange - Student claiming certificate
      mockReq.user = mockUser;
      mockReq.body = { courseId: 1 };
      
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      // Act - Claim certificate
      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);

      // Reset mocks for viewing certificates
      jest.clearAllMocks();
      mockReq.user = mockUser;
      mockCertificatesService.getUserCertificates.mockResolvedValue([mockCertificateWithDetails]);

      // Act - View certificates
      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: {
              id: 1,
              title: 'JavaScript Fundamentals'
            },
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date('2023-01-01T00:00:00Z')
          }
        ],
        count: 1,
        version: '1.2.0'
      });
    });
  });
});
