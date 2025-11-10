import { jest } from '@jest/globals';
import { CertificatesService } from '../../src/services/certificates.service';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import * as publisher from '../../src/modules/notifications/publisher';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

describe('CertificatesService', () => {
  let certificatesService: CertificatesService;
  const mockDb = db as jest.Mocked<typeof db>;
  const mockProgressService = progressService as jest.Mocked<typeof progressService>;
  const mockPublisher = publisher as jest.Mocked<typeof publisher>;

  beforeEach(() => {
    certificatesService = new CertificatesService();
    jest.clearAllMocks();
  });

  describe('checkEligibility', () => {
    it('should return eligible when enrollment is completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not eligible when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_FOUND');
    });

    it('should return not eligible when enrollment is not active', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'refunded' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_ACTIVE');
    });

    it('should return not eligible when no lessons in course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
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
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NOT_ALL_LESSONS_COMPLETED (3/5)');
    });

    it('should return eligible when all lessons completed with active enrollment', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
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
    it('should successfully issue certificate by instructor for own course', async () => {
      const courseId = 1;
      const userId = 2;
      const issuerId = 1;
      const issuerRole = 'instructor';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: issuerId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: userId, course_id: courseId, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: userId, course_id: courseId, code: 'CERT-ABC123-DEF456', issued_at: new Date() }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(true);
      mockPublisher.publish.mockResolvedValue(1);

      const result = await certificatesService.issueCertificate(userId, courseId, issuerId, issuerRole);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.course_id).toBe(courseId);
      expect(result.code).toMatch(/^CERT-/);
      expect(mockPublisher.publish).toHaveBeenCalledWith('certificate.issued', expect.any(Object));
    });

    it('should successfully issue certificate by admin', async () => {
      const courseId = 1;
      const userId = 2;
      const issuerId = 3;
      const issuerRole = 'admin';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: 999 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: userId, course_id: courseId, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: userId, course_id: courseId, code: 'CERT-ABC123-DEF456', issued_at: new Date() }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.issueCertificate(userId, courseId, issuerId, issuerRole);

      expect(result).toBeDefined();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.issueCertificate(1, 999, 1, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to issue for another course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 999 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should throw error when user is not eligible', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'instructor')
      ).rejects.toThrow('User is not eligible');
    });

    it('should throw error when certificate already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      await expect(
        certificatesService.issueCertificate(1, 1, 1, 'instructor')
      ).rejects.toThrow('Certificate already issued for this user and course');
    });

    it('should handle code collision and retry', async () => {
      const courseId = 1;
      const userId = 2;
      const issuerId = 1;
      const issuerRole = 'instructor';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: issuerId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: userId, course_id: courseId, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 999 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: userId, course_id: courseId, code: 'CERT-ABC123-DEF456', issued_at: new Date() }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.issueCertificate(userId, courseId, issuerId, issuerRole);

      expect(result).toBeDefined();
    });
  });

  describe('claimCertificate', () => {
    it('should successfully claim certificate when eligible', async () => {
      const userId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: userId, course_id: courseId, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: userId, course_id: courseId, code: 'CERT-XYZ789-ABC123', issued_at: new Date() }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(true);
      mockPublisher.publish.mockResolvedValue(1);

      const result = await certificatesService.claimCertificate(userId, courseId);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.course_id).toBe(courseId);
      expect(mockPublisher.publish).toHaveBeenCalledWith('certificate.issued', expect.any(Object));
    });

    it('should throw error when not eligible', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate');
    });

    it('should throw error when certificate already claimed', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Certificate already claimed for this course');
    });
  });

  describe('getUserCertificates', () => {
    it('should return all certificates for a user', async () => {
      const userId = 1;
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date(),
          course_id: 1,
          course_title: 'Course 1'
        },
        {
          id: 2,
          code: 'CERT-XYZ789-ABC123',
          issued_at: new Date(),
          course_id: 2,
          course_title: 'Course 2'
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockCertificates,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.getUserCertificates(userId);

      expect(result).toHaveLength(2);
      expect(result[0].course?.title).toBe('Course 1');
      expect(result[1].course?.title).toBe('Course 2');
    });

    it('should return empty array when user has no certificates', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.getUserCertificates(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('getCourseCertificates', () => {
    it('should return certificates for course instructor', async () => {
      const courseId = 1;
      const instructorId = 1;
      const mockCertificates = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date(),
          user_id: 2,
          user_name: 'Student 1',
          user_email: 'student1@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: instructorId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: mockCertificates,
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      const result = await certificatesService.getCourseCertificates(courseId, instructorId, 'instructor');

      expect(result).toHaveLength(1);
      expect(result[0].user?.name).toBe('Student 1');
    });

    it('should return certificates for admin', async () => {
      const courseId = 1;
      const adminId = 999;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        });

      const result = await certificatesService.getCourseCertificates(courseId, adminId, 'admin');

      expect(result).toHaveLength(0);
    });

    it('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.getCourseCertificates(999, 1, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when non-owner tries to view', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 999 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.getCourseCertificates(1, 1, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });
  });

  describe('verifyCertificate', () => {
    it('should return valid certificate details', async () => {
      const code = 'CERT-ABC123-DEF456';
      const mockCertificate = {
        issued_at: new Date(),
        user_name: 'John Doe',
        course_title: 'Test Course'
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockCertificate],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.verifyCertificate(code);

      expect(result.valid).toBe(true);
      expect(result.user?.name).toBe('John Doe');
      expect(result.course?.title).toBe('Test Course');
      expect(result.issued_at).toBeDefined();
    });

    it('should return invalid for non-existent certificate', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.verifyCertificate('INVALID-CODE');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.course).toBeUndefined();
    });
  });

  describe('certificateExists', () => {
    it('should return true when certificate exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.certificateExists(1, 1);

      expect(result).toBe(true);
    });

    it('should return false when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.certificateExists(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('getCertificate', () => {
    it('should return certificate when found', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockCertificate],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.getCertificate(1, 1);

      expect(result).toBeDefined();
      expect(result?.code).toBe('CERT-ABC123-DEF456');
    });

    it('should return null when certificate not found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await certificatesService.getCertificate(1, 1);

      expect(result).toBeNull();
    });
  });
});
