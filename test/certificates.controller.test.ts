import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { certificatesController } from '../src/controllers/certificates.controller';
import { certificatesService } from '../src/services/certificates.service';
import { CertificateValidator } from '../src/utils/validation';
import { config } from '../src/config';

jest.mock('../src/services/certificates.service');
jest.mock('../src/utils/validation');
jest.mock('../src/config');

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
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      body: {},
      params: {},
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'instructor'
      }
    };
    
    mockRes = {
      status: statusMock as any,
      json: jsonMock as any
    };

    mockConfig.version = '1.0.0';
    jest.clearAllMocks();
  });

  describe('issue', () => {
    test('should return 400 when validation fails', async () => {
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'userId', message: 'User ID is required' }]
      });

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'userId', message: 'User ID is required' }],
        version: '1.0.0'
      });
    });

    test('should return 404 when course not found', async () => {
      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(new Error('Course not found'));

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: '1.0.0'
      });
    });

    test('should return 403 when non-owner tries to issue certificate', async () => {
      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('You can only issue certificates for your own courses')
      );

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only issue certificates for your own courses',
        version: '1.0.0'
      });
    });

    test('should return 400 when user not eligible', async () => {
      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('User is not eligible: NOT_ALL_LESSONS_COMPLETED')
      );

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'User is not eligible: NOT_ALL_LESSONS_COMPLETED',
        version: '1.0.0'
      });
    });

    test('should return 409 when certificate already issued', async () => {
      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(
        new Error('Certificate already issued for this user and course')
      );

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already issued for this user and course',
        version: '1.0.0'
      });
    });

    test('should return 201 with certificate data on success', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date('2024-01-01')
      };

      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(mockCertificatesService.issueCertificate).toHaveBeenCalledWith(2, 1, 1, 'instructor');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          userId: 2,
          courseId: 1,
          code: 'CERT-ABC123-XYZ789',
          issuedAt: mockCertificate.issued_at
        },
        version: '1.0.0'
      });
    });

    test('should return 500 on unexpected error', async () => {
      mockReq.body = { userId: 2, courseId: 1 };
      mockCertificateValidator.validateIssueCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.issueCertificate.mockRejectedValue(new Error('Database connection failed'));

      await certificatesController.issue(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to issue certificate',
        version: '1.0.0'
      });
    });
  });

  describe('claim', () => {
    test('should return 400 when validation fails', async () => {
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: false,
        errors: [{ field: 'courseId', message: 'Course ID is required' }]
      });

      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: [{ field: 'courseId', message: 'Course ID is required' }],
        version: '1.0.0'
      });
    });

    test('should return 400 when user not eligible', async () => {
      mockReq.body = { courseId: 1 };
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED')
      );

      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_ELIGIBLE',
        message: 'Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED',
        version: '1.0.0'
      });
    });

    test('should return 409 when certificate already claimed', async () => {
      mockReq.body = { courseId: 1 };
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(
        new Error('Certificate already claimed for this course')
      );

      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'ALREADY_ISSUED',
        message: 'Certificate already claimed for this course',
        version: '1.0.0'
      });
    });

    test('should return 201 with certificate data on success', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date('2024-01-01')
      };

      mockReq.body = { courseId: 1 };
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockResolvedValue(mockCertificate);

      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      expect(mockCertificatesService.claimCertificate).toHaveBeenCalledWith(1, 1);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: {
          id: 1,
          courseId: 1,
          code: 'CERT-ABC123-XYZ789',
          issuedAt: mockCertificate.issued_at
        },
        version: '1.0.0'
      });
    });

    test('should return 500 on unexpected error', async () => {
      mockReq.body = { courseId: 1 };
      mockCertificateValidator.validateClaimCertificate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.claimCertificate.mockRejectedValue(new Error('Database connection failed'));

      await certificatesController.claim(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to claim certificate',
        version: '1.0.0'
      });
    });
  });

  describe('getMyCertificates', () => {
    test('should return empty array when user has no certificates', async () => {
      mockCertificatesService.getUserCertificates.mockResolvedValue([]);

      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(mockCertificatesService.getUserCertificates).toHaveBeenCalledWith(1);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: [],
        count: 0,
        version: '1.0.0'
      });
    });

    test('should return certificates with course details', async () => {
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-XYZ789',
          issued_at: new Date('2024-01-01'),
          course: {
            id: 10,
            title: 'Test Course 1'
          }
        },
        {
          id: 2,
          code: 'CERT-DEF456-ABC123',
          issued_at: new Date('2024-01-02'),
          course: {
            id: 20,
            title: 'Test Course 2'
          }
        }
      ];

      mockCertificatesService.getUserCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            course: { id: 10, title: 'Test Course 1' },
            code: 'CERT-ABC123-XYZ789',
            issued_at: mockCertificates[0].issued_at
          },
          {
            course: { id: 20, title: 'Test Course 2' },
            code: 'CERT-DEF456-ABC123',
            issued_at: mockCertificates[1].issued_at
          }
        ],
        count: 2,
        version: '1.0.0'
      });
    });

    test('should return 500 on error', async () => {
      mockCertificatesService.getUserCertificates.mockRejectedValue(new Error('Database error'));

      await certificatesController.getMyCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get certificates',
        version: '1.0.0'
      });
    });
  });

  describe('getCourseCertificates', () => {
    test('should return 400 for invalid courseId', async () => {
      mockReq.params = { courseId: 'invalid' };

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: '1.0.0'
      });
    });

    test('should return 400 for zero courseId', async () => {
      mockReq.params = { courseId: '0' };

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: '1.0.0'
      });
    });

    test('should return 400 for negative courseId', async () => {
      mockReq.params = { courseId: '-1' };

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: '1.0.0'
      });
    });

    test('should return 404 when course not found', async () => {
      mockReq.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(new Error('Course not found'));

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: '1.0.0'
      });
    });

    test('should return 403 when non-owner tries to view certificates', async () => {
      mockReq.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(
        new Error('You can only view certificates for your own courses')
      );

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'NOT_OWNER',
        message: 'You can only view certificates for your own courses',
        version: '1.0.0'
      });
    });

    test('should return certificates with user details on success', async () => {
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-XYZ789',
          issued_at: new Date('2024-01-01'),
          user: {
            id: 10,
            name: 'John Doe',
            email: 'john@example.com'
          }
        },
        {
          id: 2,
          code: 'CERT-DEF456-ABC123',
          issued_at: new Date('2024-01-02'),
          user: {
            id: 20,
            name: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      ];

      mockReq.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockResolvedValue(mockCertificates);

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(mockCertificatesService.getCourseCertificates).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: [
          {
            user: { id: 10, name: 'John Doe', email: 'john@example.com' },
            code: 'CERT-ABC123-XYZ789',
            issued_at: mockCertificates[0].issued_at
          },
          {
            user: { id: 20, name: 'Jane Smith', email: 'jane@example.com' },
            code: 'CERT-DEF456-ABC123',
            issued_at: mockCertificates[1].issued_at
          }
        ],
        count: 2,
        version: '1.0.0'
      });
    });

    test('should return 500 on unexpected error', async () => {
      mockReq.params = { courseId: '1' };
      mockCertificatesService.getCourseCertificates.mockRejectedValue(new Error('Database error'));

      await certificatesController.getCourseCertificates(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get course certificates',
        version: '1.0.0'
      });
    });
  });

  describe('verify', () => {
    test('should return invalid for invalid code format', async () => {
      mockReq.params = { code: 'INVALID' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: false,
        errors: [{ field: 'code', message: 'Invalid certificate code format' }]
      });

      await certificatesController.verify(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.0.0'
      });
    });

    test('should return invalid when certificate not found', async () => {
      mockReq.params = { code: 'CERT-ABC123-XYZ789' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: false
      });

      await certificatesController.verify(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.0.0'
      });
    });

    test('should return valid certificate with details when found', async () => {
      const mockDate = new Date('2024-01-01');
      mockReq.params = { code: 'CERT-ABC123-XYZ789' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockResolvedValue({
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'Test Course' },
        issued_at: mockDate
      });

      await certificatesController.verify(mockReq as Request, mockRes as Response);

      expect(mockCertificatesService.verifyCertificate).toHaveBeenCalledWith('CERT-ABC123-XYZ789');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        valid: true,
        user: { name: 'John Doe' },
        course: { title: 'Test Course' },
        issued_at: mockDate,
        version: '1.0.0'
      });
    });

    test('should return invalid on error for graceful degradation', async () => {
      mockReq.params = { code: 'CERT-ABC123-XYZ789' };
      mockCertificateValidator.validateCertificateCode.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCertificatesService.verifyCertificate.mockRejectedValue(new Error('Database error'));

      await certificatesController.verify(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        valid: false,
        version: '1.0.0'
      });
    });
  });
});
