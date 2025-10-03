import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import { certificatesService } from '../../src/services/certificates.service';
import { CertificateValidator } from '../../src/utils/validation';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

const mockDb = db as jest.Mocked<typeof db>;
const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('CertificateValidator', () => {
  describe('validateIssueCertificate', () => {
    it('should pass validation for valid issue certificate data', () => {
      const data = {
        userId: 1,
        courseId: 1
      };

      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when userId is missing', () => {
      const data = {
        courseId: 1
      };

      const result = CertificateValidator.validateIssueCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'userId', message: 'User ID is required' })
      );
    });

    it('should fail when userId is not a number', () => {
      const data = {
        userId: 'invalid',
        courseId: 1
      };

      const result = CertificateValidator.validateIssueCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'userId', message: 'User ID must be a positive integer' })
      );
    });

    it('should fail when courseId is missing', () => {
      const data = {
        userId: 1
      };

      const result = CertificateValidator.validateIssueCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'courseId', message: 'Course ID is required' })
      );
    });

    it('should fail when courseId is not a number', () => {
      const data = {
        userId: 1,
        courseId: 'invalid'
      };

      const result = CertificateValidator.validateIssueCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'courseId', message: 'Course ID must be a positive integer' })
      );
    });
  });

  describe('validateClaimCertificate', () => {
    it('should pass validation for valid claim certificate data', () => {
      const data = {
        courseId: 1
      };

      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when courseId is missing', () => {
      const data = {};

      const result = CertificateValidator.validateClaimCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'courseId', message: 'Course ID is required' })
      );
    });

    it('should fail when courseId is not a number', () => {
      const data = {
        courseId: 'invalid'
      };

      const result = CertificateValidator.validateClaimCertificate(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'courseId', message: 'Course ID must be a positive integer' })
      );
    });
  });

  describe('validateCertificateCode', () => {
    it('should pass validation for valid certificate code', () => {
      const code = 'CERT-ABC123-DEF456';

      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when code is missing', () => {
      const result = CertificateValidator.validateCertificateCode(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'code', message: 'Certificate code is required' })
      );
    });

    it('should fail when code is not a string', () => {
      const result = CertificateValidator.validateCertificateCode(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'code', message: 'Certificate code must be a string' })
      );
    });

    it('should fail when code format is invalid (too short)', () => {
      const result = CertificateValidator.validateCertificateCode('SHORT');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'code', message: 'Invalid certificate code format' })
      );
    });

    it('should accept valid code with sufficient length', () => {
      const result = CertificateValidator.validateCertificateCode('CERT-123ABC-XYZ789');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('CertificatesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationsEnabled.mockReturnValue(false);
  });

  describe('checkEligibility', () => {
    it('should return not eligible when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_FOUND');
    });

    it('should return eligible when enrollment status is completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }]
      } as any);

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not eligible when enrollment is not active', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'dropped' }]
      } as any);

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_ACTIVE');
    });

    it('should return not eligible when course has no lessons', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 0,
        totalLessons: 0,
        percent: 0,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NO_LESSONS_IN_COURSE');
    });

    it('should return not eligible when not all lessons completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('NOT_ALL_LESSONS_COMPLETED');
      expect(result.reason).toContain('3/5');
    });

    it('should return eligible when all lessons completed and enrollment active', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle enrollment with exactly one lesson', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 1,
        totalLessons: 1,
        percent: 100,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);
      expect(result.eligible).toBe(true);
    });
  });

  describe('issueCertificate', () => {
    beforeEach(() => {
      mockDb.query.mockReset();
      mockProgressService.getUserCourseProgress.mockReset();
    });

    it('should generate certificate code with correct format CERT-XXXXXX-XXXXXX', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.issueCertificate(1, 1, 1, 'admin');
      expect(certificate.code).toMatch(/^CERT-[A-Z0-9]{6}-[A-Z0-9]{6}$/);
    });

    it('should issue certificate when issuer is admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.issueCertificate(1, 1, 2, 'admin');
      expect(certificate).toBeDefined();
      expect(certificate.user_id).toBe(1);
      expect(certificate.course_id).toBe(1);
    });

    it('should issue certificate when issuer is course instructor', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.issueCertificate(1, 1, 1, 'instructor');
      expect(certificate).toBeDefined();
    });

    it('should throw error when issuer is not authorized', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 999 }] } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should throw error when course does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        certificatesService.issueCertificate(1, 999, 1, 'admin')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when user is not eligible', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'admin')
      ).rejects.toThrow('User is not eligible');
    });

    it('should throw error when certificate already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any) // enrollment query (checkEligibility)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any); // existing certificate check

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'admin')
      ).rejects.toThrow('Certificate already issued for this user and course');
    });

    it('should retry when code collision occurs', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any) // enrollment query (checkEligibility)
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [{ id: 999 }] } as any) // first code collision
        .mockResolvedValueOnce({ rows: [] } as any) // second code is unique
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any); // INSERT

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.issueCertificate(1, 1, 1, 'admin');
      expect(certificate).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM certificates WHERE code = $1',
        expect.any(Array)
      );
    });

    it('should throw error after max retry attempts', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any) // enrollment query (checkEligibility)
        .mockResolvedValueOnce({ rows: [] } as any); // existing certificate check
      
      for (let i = 0; i < 10; i++) {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 999 }] } as any);
      }

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'admin')
      ).rejects.toThrow('Failed to generate unique certificate code');
    });

    it('should generate unique codes', async () => {
      const codes = new Set<string>();
      let callCount = 0;
      const spyCrypto = jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => {
        return Buffer.from(`test${callCount++}abc`.padEnd(size, 'x'));
      });

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      for (let i = 0; i < 10; i++) {
        mockDb.query
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any) // course query
          .mockResolvedValueOnce({ rows: [{ id: i + 1, status: 'active' }] } as any) // enrollment query
          .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
          .mockResolvedValueOnce({ rows: [] } as any) // code collision check
          .mockResolvedValueOnce({ rows: [{ id: i + 1, user_id: i + 1, course_id: 1, code: `CODE${i}`, issued_at: new Date() }] } as any); // INSERT
        
        const certificate = await certificatesService.issueCertificate(i + 1, 1, 1, 'admin');
        codes.add(certificate.code);
      }

      expect(codes.size).toBe(10);
      spyCrypto.mockRestore();
    });
  });

  describe('claimCertificate', () => {
    beforeEach(() => {
      mockDb.query.mockReset();
      mockProgressService.getUserCourseProgress.mockReset();
    });

    it('should allow student to claim their certificate', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] } as any) // enrollment query (checkEligibility)
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [] } as any) // code collision check
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any); // INSERT

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.claimCertificate(1, 1);
      expect(certificate).toBeDefined();
      expect(certificate.user_id).toBe(1);
      expect(certificate.course_id).toBe(1);
    });

    it('should throw error when user is not eligible', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      });

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate');
    });

    it('should throw error when certificate already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'completed' }] } as any) // enrollment query (checkEligibility)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any); // existing certificate check

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Certificate already claimed for this course');
    });

    it('should throw error when enrollment does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        certificatesService.claimCertificate(1, 999)
      ).rejects.toThrow('Not eligible for certificate: ENROLLMENT_NOT_FOUND');
    });
  });

  describe('verifyCertificate', () => {
    beforeEach(() => {
      mockDb.query.mockReset();
    });

    it('should verify a valid certificate by code', async () => {
      const mockRow = {
        issued_at: new Date(),
        user_name: 'John Doe',
        course_title: 'Test Course'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await certificatesService.verifyCertificate('CERT-ABC123-DEF456');
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.user?.name).toBe('John Doe');
      expect(result.course?.title).toBe('Test Course');
      expect(result.issued_at).toBeDefined();
    });

    it('should return invalid result for non-existent certificate code', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await certificatesService.verifyCertificate('CERT-INVALID-CODE');
      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.course).toBeUndefined();
    });
  });

  describe('getCertificate', () => {
    beforeEach(() => {
      mockDb.query.mockReset();
    });

    it('should get certificate for a user and course', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCertificate] } as any);

      const result = await certificatesService.getCertificate(1, 1);
      expect(result).toBeDefined();
      expect(result?.code).toBe('CERT-ABC123-DEF456');
    });

    it('should return null when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await certificatesService.getCertificate(1, 999);
      expect(result).toBeNull();
    });
  });
});
