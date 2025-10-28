import crypto from 'crypto';
import { certificatesService } from '../../src/services/certificates.service';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

describe('CertificatesService', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockProgressService = progressService as jest.Mocked<typeof progressService>;
  const mockPublish = publish as jest.MockedFunction<typeof publish>;
  const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationsEnabled.mockReturnValue(false);
  });

  describe('generateCertificateCode', () => {
    it('should generate a code with correct format CERT-XXXXXX-XXXXXX', async () => {
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
          .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
          .mockResolvedValueOnce({ rows: [{ id: i + 1, status: 'active' }] } as any)
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [] } as any)
          .mockResolvedValueOnce({ rows: [{ id: i + 1, user_id: i + 1, course_id: 1, code: `CODE${i}`, issued_at: new Date() }] } as any);
        
        const certificate = await certificatesService.issueCertificate(i + 1, 1, 1, 'admin');
        codes.add(certificate.code);
      }

      expect(codes.size).toBe(10);
      spyCrypto.mockRestore();
    });

    it('should retry when code collision occurs', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

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
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);
      
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
  });

  describe('issueCertificate', () => {
    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        certificatesService.issueCertificate(1, 999, 1, 'admin')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to issue for another course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should allow admin to issue certificate for any course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
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
      expect(certificate).toBeDefined();
      expect(certificate.code).toMatch(/^CERT-/);
    });

    it('should allow instructor to issue certificate for own course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
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
      expect(certificate.code).toMatch(/^CERT-/);
    });

    it('should throw error when user is not eligible', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any);

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
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'EXISTING-CODE', issued_at: new Date() }] } as any);

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

    it('should successfully issue certificate and publish event when notifications enabled', async () => {
      mockIsNotificationsEnabled.mockReturnValue(true);
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
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
      
      expect(certificate).toBeDefined();
      expect(mockPublish).toHaveBeenCalledWith(
        'certificate.issued',
        expect.objectContaining({
          userId: 1,
          courseId: 1
        })
      );
    });
  });

  describe('claimCertificate', () => {
    it('should throw error when not eligible', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate');
    });

    it('should throw error when certificate already claimed', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'EXISTING-CODE', issued_at: new Date() }] } as any);

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

    it('should successfully claim certificate', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const certificate = await certificatesService.claimCertificate(1, 1);
      expect(certificate).toBeDefined();
      expect(certificate.code).toMatch(/^CERT-/);
    });

    it('should publish event when claiming certificate with notifications enabled', async () => {
      mockIsNotificationsEnabled.mockReturnValue(true);
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }] } as any);

      mockProgressService.getUserCourseProgress.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      await certificatesService.claimCertificate(1, 1);
      
      expect(mockPublish).toHaveBeenCalledWith(
        'certificate.issued',
        expect.objectContaining({
          userId: 1,
          courseId: 1
        })
      );
    });
  });

  describe('getUserCertificates', () => {
    it('should return empty array when user has no certificates', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const certificates = await certificatesService.getUserCertificates(1);
      expect(certificates).toEqual([]);
    });

    it('should return user certificates with course details', async () => {
      const mockCerts = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2024-01-01'),
          course_id_join: 1,
          course_title: 'Test Course 1',
          course_description: 'Description 1'
        },
        {
          id: 2,
          user_id: 1,
          course_id: 2,
          code: 'CERT-GHI789-JKL012',
          issued_at: new Date('2024-01-02'),
          course_id_join: 2,
          course_title: 'Test Course 2',
          course_description: 'Description 2'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCerts } as any);

      const certificates = await certificatesService.getUserCertificates(1);
      
      expect(certificates).toHaveLength(2);
      expect(certificates[0].code).toBe('CERT-ABC123-DEF456');
      expect(certificates[0].course?.title).toBe('Test Course 1');
      expect(certificates[1].code).toBe('CERT-GHI789-JKL012');
      expect(certificates[1].course?.title).toBe('Test Course 2');
    });
  });

  describe('getCourseCertificates', () => {
    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        certificatesService.getCourseCertificates(999, 1, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to view another course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);

      await expect(
        certificatesService.getCourseCertificates(1, 1, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });

    it('should return certificates for instructor viewing own course', async () => {
      const mockCerts = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2024-01-01'),
          user_id_join: 1,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: mockCerts } as any);

      const certificates = await certificatesService.getCourseCertificates(1, 1, 'instructor');
      
      expect(certificates).toHaveLength(1);
      expect(certificates[0].code).toBe('CERT-ABC123-DEF456');
      expect(certificates[0].user?.name).toBe('John Doe');
    });

    it('should allow admin to view any course certificates', async () => {
      const mockCerts = [
        {
          id: 1,
          user_id: 1,
          course_id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2024-01-01'),
          user_id_join: 1,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }] } as any)
        .mockResolvedValueOnce({ rows: mockCerts } as any);

      const certificates = await certificatesService.getCourseCertificates(1, 1, 'admin');
      
      expect(certificates).toHaveLength(1);
      expect(certificates[0].code).toBe('CERT-ABC123-DEF456');
    });
  });

  describe('verifyCertificate', () => {
    it('should return valid true for existing certificate', async () => {
      const mockCert = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date('2024-01-01'),
        user_name: 'John Doe',
        course_title: 'Test Course'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCert] } as any);

      const result = await certificatesService.verifyCertificate('CERT-ABC123-DEF456');
      
      expect(result.valid).toBe(true);
      expect(result.user?.name).toBe('John Doe');
      expect(result.course?.title).toBe('Test Course');
    });

    it('should return valid false for non-existent certificate', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await certificatesService.verifyCertificate('CERT-INVALID-CODE');
      
      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.course).toBeUndefined();
    });
  });

  describe('certificateExists', () => {
    it('should return true when certificate exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);

      const exists = await certificatesService.certificateExists(1, 1);
      expect(exists).toBe(true);
    });

    it('should return false when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const exists = await certificatesService.certificateExists(1, 1);
      expect(exists).toBe(false);
    });
  });

  describe('getCertificate', () => {
    it('should return certificate when it exists', async () => {
      const mockCert = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date('2024-01-01')
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCert] } as any);

      const certificate = await certificatesService.getCertificate(1, 1);
      expect(certificate).toBeDefined();
      expect(certificate?.code).toBe('CERT-ABC123-DEF456');
    });

    it('should return null when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const certificate = await certificatesService.getCertificate(1, 1);
      expect(certificate).toBeNull();
    });
  });
});
