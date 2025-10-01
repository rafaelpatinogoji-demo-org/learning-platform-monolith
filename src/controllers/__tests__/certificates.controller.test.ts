import { Request, Response } from 'express';
import { certificatesController } from '../certificates.controller';
import { certificatesService } from '../../services/certificates.service';
import { CertificateValidator } from '../../utils/validation';
import { config } from '../../config';

jest.mock('../../services/certificates.service');
jest.mock('../../utils/validation');
jest.mock('../../config', () => ({
  config: {
    version: 'v1.9'
  }
}));

describe('certificatesController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockCertificatesService = certificatesService as jest.Mocked<typeof certificatesService>;
  const mockCertificateValidator = CertificateValidator as jest.Mocked<typeof CertificateValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  function createAuthRequest(user: any, body: any = {}, params: any = {}): any {
    return {
      user,
      body,
      params
    };
  }

  describe('issue', () => {
    it('should successfully issue certificate with valid data', async () => {
      const mockDate = new Date();
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: mockDate
      };

      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockCertificateValidator.validateIssueCertificate).toHaveBeenCalledWith({ userId: 2, courseId: 1 });
      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(2, 1, 1, 'instructor');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          userId: 2,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: mockDate
        },
        version: 'v1.9'
      });
    });

    it('should return 400 when validation fails', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 'invalid', courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'userId', message: 'User ID must be a positive integer' }]
      });

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'userId', message: 'User ID must be a positive integer' }],
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 999 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(new Error('Course not found'));

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should return 403 when instructor does not own course', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('You can only issue certificates for your own courses')
      );

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only issue certificates for your own courses',
        version: 'v1.9'
      });
    });

    it('should return 400 when user not eligible', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)')
      );

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)',
        version: 'v1.9'
      });
    });

    it('should return 409 when certificate already issued', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Certificate already issued for this user and course')
      );

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already issued for this user and course',
        version: 'v1.9'
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        { userId: 2, courseId: 1 }
      );

      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Database connection failed')
      );

      await certificatesController.issue(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to issue certificate',
        version: 'v1.9'
      });
    });
  });

  describe('claim', () => {
    it('should successfully claim certificate', async () => {
      const mockDate = new Date();
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: mockDate
      };

      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' },
        { courseId: 1 }
      );

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.claim(mockRequest as any, mockResponse as Response);

      expect(mockCertificateValidator.validateClaimCertificate).toHaveBeenCalledWith({ courseId: 1 });
      expect(mockCertificatesService.claimCertificate).toHaveBeenCalledWith(1, 1);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          courseId: 1,
          code: 'CERT-ABC123-DEF456',
          issuedAt: mockDate
        },
        version: 'v1.9'
      });
    });

    it('should return 400 when validation fails', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' },
        { courseId: 'invalid' }
      );

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }]
      });

      await certificatesController.claim(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID must be a positive integer' }],
        version: 'v1.9'
      });
    });

    it('should return 400 when not eligible', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' },
        { courseId: 1 }
      );

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Not eligible for certificate: ENROLLMENT_NOT_FOUND')
      );

      await certificatesController.claim(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'Not eligible for certificate: ENROLLMENT_NOT_FOUND',
        version: 'v1.9'
      });
    });

    it('should return 409 when already claimed', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' },
        { courseId: 1 }
      );

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Certificate already claimed for this course')
      );

      await certificatesController.claim(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already claimed for this course',
        version: 'v1.9'
      });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' },
        { courseId: 1 }
      );

      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Database connection failed')
      );

      await certificatesController.claim(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to claim certificate',
        version: 'v1.9'
      });
    });
  });

  describe('getMyCertificates', () => {
    it('should return user certificates with course details', async () => {
      const mockDate = new Date();
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: mockDate,
          course: {
            id: 1,
            title: 'Advanced JavaScript'
          }
        }
      ];

      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' }
      );

      mockCertificatesService.getUserCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getMyCertificates(mockRequest as any, mockResponse as Response);

      expect(mockCertificatesService.getUserCertificates).toHaveBeenCalledWith(1);
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: {
              id: 1,
              title: 'Advanced JavaScript'
            },
            code: 'CERT-ABC123-DEF456',
            issued_at: mockDate
          }
        ],
        count: 1,
        version: 'v1.9'
      });
    });

    it('should return empty array when no certificates', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' }
      );

      mockCertificatesService.getUserCertificates.mockResolvedValue([]);

      await certificatesController.getMyCertificates(mockRequest as any, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: 'v1.9'
      });
    });

    it('should return 500 on error', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'student@example.com', role: 'student' }
      );

      mockCertificatesService.getUserCertificates.mockRejectedValue(
        new Error('Database error')
      );

      await certificatesController.getMyCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get certificates',
        version: 'v1.9'
      });
    });
  });

  describe('getCourseCertificates', () => {
    it('should return course certificates with user details', async () => {
      const mockDate = new Date();
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: mockDate,
          user: {
            id: 10,
            name: 'Alice Student',
            email: 'alice@example.com'
          }
        }
      ];

      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: '1' }
      );

      mockCertificatesService.getCourseCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockCertificatesService.getCourseCertificates).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            user: {
              id: 10,
              name: 'Alice Student',
              email: 'alice@example.com'
            },
            code: 'CERT-ABC123-DEF456',
            issued_at: mockDate
          }
        ],
        count: 1,
        version: 'v1.9'
      });
    });

    it('should return 400 when courseId is not a number', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: 'invalid' }
      );

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 400 when courseId is less than or equal to 0', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: '0' }
      );

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: '999' }
      );

      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('Course not found')
      );

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v1.9'
      });
    });

    it('should return 403 when not course owner', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: '1' }
      );

      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('You can only view certificates for your own courses')
      );

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only view certificates for your own courses',
        version: 'v1.9'
      });
    });

    it('should return 500 on error', async () => {
      mockRequest = createAuthRequest(
        { id: 1, email: 'instructor@example.com', role: 'instructor' },
        {},
        { courseId: '1' }
      );

      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('Database error')
      );

      await certificatesController.getCourseCertificates(mockRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course certificates',
        version: 'v1.9'
      });
    });
  });

  describe('verify', () => {
    it('should return valid certificate data when found', async () => {
      const mockDate = new Date();
      const mockVerification = {
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'Introduction to TypeScript'
        },
        issued_at: mockDate
      };

      mockRequest = {
        params: { code: 'CERT-ABC123-DEF456' }
      };

      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.verifyCertificate.mockResolvedValue(mockVerification);

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockCertificateValidator.validateCertificateCode).toHaveBeenCalledWith('CERT-ABC123-DEF456');
      expect(mockCertificatesService.verifyCertificate).toHaveBeenCalledWith('CERT-ABC123-DEF456');
      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'Introduction to TypeScript'
        },
        issued_at: mockDate,
        version: 'v1.9'
      });
    });

    it('should return valid false when certificate not found', async () => {
      mockRequest = {
        params: { code: 'CERT-INVALID-CODE' }
      };

      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: false
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.9'
      });
    });

    it('should return valid false when code format invalid', async () => {
      mockRequest = {
        params: { code: 'INVALID' }
      };

      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Invalid certificate code format' }]
      });

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: 'v1.9'
      });
      expect(mockCertificatesService.verifyCertificate).not.toHaveBeenCalled();
    });

    it('should return valid false on any error', async () => {
      mockRequest = {
        params: { code: 'CERT-ABC123-DEF456' }
      };

      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockCertificatesService.verifyCertificate.mockRejectedValue(
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
