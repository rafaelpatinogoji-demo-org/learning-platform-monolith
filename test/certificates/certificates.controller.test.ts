import { Request, Response } from 'express';
import { certificatesController } from '../../src/controllers/certificates.controller';
import { certificatesService } from '../../src/services/certificates.service';
import { CertificateValidator } from '../../src/utils/validation';
import { config } from '../../src/config';

jest.mock('../../src/services/certificates.service');
jest.mock('../../src/utils/validation');
jest.mock('../../src/config', () => ({
  config: {
    version: 'v1.9'
  }
}));

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

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('issue', () => {
    beforeEach(() => {
      mockRequest = {
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' },
        body: {}
      };
    });

    it('should return 400 when validation fails', async () => {
      mockRequest.body = { userId: -1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'userId', message: 'User ID must be a positive integer' }]
      });

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'userId', message: 'User ID must be a positive integer' }],
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockRejectedValue(
        new Error('Course not found')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should return 403 when user does not have permission', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockRejectedValue(
        new Error('You can only issue certificates for your own courses')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only issue certificates for your own courses',
        version: 'v1.9'
      });
    });

    it('should return 400 when user not eligible', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockRejectedValue(
        new Error('User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)',
        version: 'v1.9'
      });
    });

    it('should return 409 when certificate already issued', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockRejectedValue(
        new Error('Certificate already issued for this user and course')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already issued for this user and course',
        version: 'v1.9'
      });
    });

    it('should return 201 with certificate data on success', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC-DEF',
        issued_at: new Date()
      };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockResolvedValue(mockCertificate);

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          userId: 1,
          courseId: 1,
          code: 'CERT-ABC-DEF',
          issuedAt: mockCertificate.issued_at
        },
        version: 'v1.9'
      });
    });

    it('should return 500 on unexpected errors', async () => {
      mockRequest.body = { userId: 1, courseId: 1 };
      
      (CertificateValidator.validateIssueCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.issueCertificate as jest.Mock).mockRejectedValue(
        new Error('Unexpected database error')
      );

      await certificatesController.issue(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to issue certificate',
        version: 'v1.9'
      });
    });
  });

  describe('claim', () => {
    beforeEach(() => {
      mockRequest = {
        user: { id: 1, email: 'student@example.com', role: 'student' },
        body: {}
      };
    });

    it('should return 400 when validation fails', async () => {
      mockRequest.body = { courseId: -1 };
      
      (CertificateValidator.validateClaimCertificate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
        version: 'v1.9'
      });
    });

    it('should return 400 when user not eligible', async () => {
      mockRequest.body = { courseId: 1 };
      
      (CertificateValidator.validateClaimCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.claimCertificate as jest.Mock).mockRejectedValue(
        new Error('Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (5/10)')
      );

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (5/10)',
        version: 'v1.9'
      });
    });

    it('should return 409 when certificate already claimed', async () => {
      mockRequest.body = { courseId: 1 };
      
      (CertificateValidator.validateClaimCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.claimCertificate as jest.Mock).mockRejectedValue(
        new Error('Certificate already claimed for this course')
      );

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already claimed for this course',
        version: 'v1.9'
      });
    });

    it('should return 201 with certificate data on success', async () => {
      mockRequest.body = { courseId: 1 };
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC-DEF',
        issued_at: new Date()
      };
      
      (CertificateValidator.validateClaimCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.claimCertificate as jest.Mock).mockResolvedValue(mockCertificate);

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          courseId: 1,
          code: 'CERT-ABC-DEF',
          issuedAt: mockCertificate.issued_at
        },
        version: 'v1.9'
      });
    });

    it('should return 500 on unexpected errors', async () => {
      mockRequest.body = { courseId: 1 };
      
      (CertificateValidator.validateClaimCertificate as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.claimCertificate as jest.Mock).mockRejectedValue(
        new Error('Unexpected database error')
      );

      await certificatesController.claim(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to claim certificate',
        version: 'v1.9'
      });
    });
  });

  describe('getMyCertificates', () => {
    beforeEach(() => {
      mockRequest = {
        user: { id: 1, email: 'student@example.com', role: 'student' }
      };
    });

    it('should return 200 with empty array when no certificates', async () => {
      (certificatesService.getUserCertificates as jest.Mock).mockResolvedValue([]);

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: 'v1.9'
      });
    });

    it('should return 200 with certificates array', async () => {
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC-DEF',
          issued_at: new Date(),
          course: {
            id: 1,
            title: 'Test Course'
          }
        },
        {
          id: 2,
          code: 'CERT-GHI-JKL',
          issued_at: new Date(),
          course: {
            id: 2,
            title: 'Another Course'
          }
        }
      ];
      
      (certificatesService.getUserCertificates as jest.Mock).mockResolvedValue(mockCertificates);

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: {
              id: 1,
              title: 'Test Course'
            },
            code: 'CERT-ABC-DEF',
            issued_at: mockCertificates[0].issued_at
          },
          {
            course: {
              id: 2,
              title: 'Another Course'
            },
            code: 'CERT-GHI-JKL',
            issued_at: mockCertificates[1].issued_at
          }
        ],
        count: 2,
        version: 'v1.9'
      });
    });

    it('should return 500 on error', async () => {
      (certificatesService.getUserCertificates as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await certificatesController.getMyCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get certificates',
        version: 'v1.9'
      });
    });
  });

  describe('getCourseCertificates', () => {
    beforeEach(() => {
      mockRequest = {
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' },
        params: {}
      };
    });

    it('should return 400 when courseId is invalid (NaN)', async () => {
      mockRequest.params = { courseId: 'abc' };

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 when courseId is <= 0', async () => {
      mockRequest.params = { courseId: '0' };

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.params = { courseId: '1' };
      
      (certificatesService.getCourseCertificates as jest.Mock).mockRejectedValue(
        new Error('Course not found')
      );

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should return 403 when user does not have permission', async () => {
      mockRequest.params = { courseId: '1' };
      
      (certificatesService.getCourseCertificates as jest.Mock).mockRejectedValue(
        new Error('You can only view certificates for your own courses')
      );

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only view certificates for your own courses',
        version: 'v1.9'
      });
    });

    it('should return 200 with certificates array on success', async () => {
      mockRequest.params = { courseId: '1' };
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC-DEF',
          issued_at: new Date(),
          user: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ];
      
      (certificatesService.getCourseCertificates as jest.Mock).mockResolvedValue(mockCertificates);

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com'
            },
            code: 'CERT-ABC-DEF',
            issued_at: mockCertificates[0].issued_at
          }
        ],
        count: 1,
        version: 'v1.9'
      });
    });

    it('should return 500 on unexpected errors', async () => {
      mockRequest.params = { courseId: '1' };
      
      (certificatesService.getCourseCertificates as jest.Mock).mockRejectedValue(
        new Error('Unexpected database error')
      );

      await certificatesController.getCourseCertificates(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course certificates',
        version: 'v1.9'
      });
    });
  });

  describe('verify', () => {
    beforeEach(() => {
      mockRequest = {
        params: {}
      };
    });

    it('should return {valid: false} when code format is invalid', async () => {
      mockRequest.params = { code: 'abc' };
      
      (CertificateValidator.validateCertificateCode as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Invalid certificate code format' }]
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.9'
      });
    });

    it('should return {valid: false} when certificate not found', async () => {
      mockRequest.params = { code: 'CERT-ABC-DEF' };
      
      (CertificateValidator.validateCertificateCode as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.verifyCertificate as jest.Mock).mockResolvedValue({
        valid: false
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.9'
      });
    });

    it('should return {valid: true, ...details} when certificate is valid', async () => {
      mockRequest.params = { code: 'CERT-ABC-DEF' };
      const mockDate = new Date();
      
      (CertificateValidator.validateCertificateCode as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.verifyCertificate as jest.Mock).mockResolvedValue({
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'Test Course'
        },
        issued_at: mockDate
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'Test Course'
        },
        issued_at: mockDate,
        version: 'v1.9'
      });
    });

    it('should return {valid: false} on unexpected errors', async () => {
      mockRequest.params = { code: 'CERT-ABC-DEF' };
      
      (CertificateValidator.validateCertificateCode as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      
      (certificatesService.verifyCertificate as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.9'
      });
    });
  });
});
