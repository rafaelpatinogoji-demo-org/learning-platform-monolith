import { jest } from '@jest/globals';
import { Request, Response } from 'express';
import { certificatesController } from '../../src/controllers/certificates.controller';
import { certificatesService } from '../../src/services/certificates.service';
import { CertificateValidator } from '../../src/utils/validation';

jest.mock('../../src/services/certificates.service');
jest.mock('../../src/utils/validation');

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('CertificatesController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  const mockCertificatesService = certificatesService as jest.Mocked<typeof certificatesService>;
  const mockValidator = CertificateValidator as jest.Mocked<typeof CertificateValidator>;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis() as any;
    mockStatus = jest.fn().mockReturnThis() as any;
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    } as any;

    mockRequest = {
      body: {},
      params: {},
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'instructor'
      }
    };

    jest.clearAllMocks();
  });

  describe('issue', () => {
    it('should successfully issue certificate with 201 status', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockRequest.body = { userId: 2, courseId: 1 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            id: 1,
            userId: 2,
            courseId: 1,
            code: 'CERT-ABC123-DEF456'
          })
        })
      );
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.body = { userId: 'invalid', courseId: null };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'userId', message: 'User ID must be a positive integer' },
          { field: 'courseId', message: 'Course ID is required' }
        ]
      });

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'userId' }),
            expect.objectContaining({ field: 'courseId' })
          ])
        })
      );
    });

    it('should return 404 when course not found', async () => {
      mockRequest.body = { userId: 2, courseId: 999 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(new Error('Course not found'));

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Course not found'
        })
      );
    });

    it('should return 403 when instructor tries to issue for another course', async () => {
      mockRequest.body = { userId: 2, courseId: 1 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('You can only issue certificates for your own courses')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'NOT_OWNER'
        })
      );
    });

    it('should return 400 when user is not eligible', async () => {
      mockRequest.body = { userId: 2, courseId: 1 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('User is not eligible: NOT_ALL_LESSONS_COMPLETED')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'NOT_ELIGIBLE'
        })
      );
    });

    it('should return 409 when certificate already issued', async () => {
      mockRequest.body = { userId: 2, courseId: 1 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Certificate already issued for this user and course')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'ALREADY_ISSUED'
        })
      );
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { userId: 2, courseId: 1 };
      mockValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(new Error('Database connection failed'));

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Failed to issue certificate'
        })
      );
    });
  });

  describe('claim', () => {
    it('should successfully claim certificate with 201 status', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-XYZ789-ABC123',
        issued_at: new Date()
      };

      mockRequest.body = { courseId: 1 };
      mockValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            id: 1,
            courseId: 1,
            code: 'CERT-XYZ789-ABC123'
          })
        })
      );
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.body = { courseId: 'invalid' };
      mockValidator.validateClaimCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Validation failed'
        })
      );
    });

    it('should return 400 when not eligible', async () => {
      mockRequest.body = { courseId: 1 };
      mockValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Not eligible for certificate: ENROLLMENT_NOT_FOUND')
      );

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'NOT_ELIGIBLE'
        })
      );
    });

    it('should return 409 when certificate already claimed', async () => {
      mockRequest.body = { courseId: 1 };
      mockValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Certificate already claimed for this course')
      );

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'ALREADY_ISSUED'
        })
      );
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.body = { courseId: 1 };
      mockValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(new Error('Unexpected error'));

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Failed to claim certificate'
        })
      );
    });
  });

  describe('getMyCertificates', () => {
    it('should return user certificates successfully', async () => {
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date(),
          course: { id: 1, title: 'Course 1' }
        },
        {
          id: 2,
          code: 'CERT-XYZ789-ABC123',
          issued_at: new Date(),
          course: { id: 2, title: 'Course 2' }
        }
      ];

      mockCertificatesService.getUserCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              course: expect.objectContaining({ id: 1, title: 'Course 1' })
            })
          ]),
          count: 2
        })
      );
    });

    it('should return empty array when user has no certificates', async () => {
      mockCertificatesService.getUserCertificates.mockResolvedValue([]);

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: [],
          count: 0
        })
      );
    });

    it('should return 500 for unexpected errors', async () => {
      mockCertificatesService.getUserCertificates.mockRejectedValue(new Error('Database error'));

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Failed to get certificates'
        })
      );
    });
  });

  describe('getCourseCertificates', () => {
    it('should return course certificates for instructor', async () => {
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date(),
          user: { id: 2, name: 'Student 1', email: 'student1@example.com' }
        }
      ];

      mockRequest.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              user: expect.objectContaining({ name: 'Student 1' })
            })
          ]),
          count: 1
        })
      );
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { courseId: 'invalid' };

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Invalid course ID'
        })
      );
    });

    it('should return 400 for negative course ID', async () => {
      mockRequest.params = { courseId: '-1' };

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Invalid course ID'
        })
      );
    });

    it('should return 404 when course not found', async () => {
      mockRequest.params = { courseId: '999' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(new Error('Course not found'));

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Course not found'
        })
      );
    });

    it('should return 403 when non-owner tries to view', async () => {
      mockRequest.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('You can only view certificates for your own courses')
      );

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'NOT_OWNER'
        })
      );
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(new Error('Unexpected error'));

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Failed to get course certificates'
        })
      );
    });
  });

  describe('verify', () => {
    it('should return valid certificate details', async () => {
      const mockVerification = {
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'Test Course' },
        issued_at: new Date()
      };

      mockRequest.params = { code: 'CERT-ABC123-DEF456' };
      mockValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue(mockVerification);

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          valid: true,
          user: expect.objectContaining({ name: 'John Doe' }),
          course: expect.objectContaining({ title: 'Test Course' })
        })
      );
    });

    it('should return valid false for invalid code format', async () => {
      mockRequest.params = { code: 'INVALID' };
      mockValidator.validateCertificateCode.mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Invalid certificate code format' }]
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          valid: false
        })
      );
    });

    it('should return valid false for non-existent certificate', async () => {
      mockRequest.params = { code: 'CERT-NOTFOUND-123456' };
      mockValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({ valid: false });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          valid: false
        })
      );
    });

    it('should return valid false on error', async () => {
      mockRequest.params = { code: 'CERT-ABC123-DEF456' };
      mockValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockRejectedValue(new Error('Database error'));

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          valid: false
        })
      );
    });
  });
});
