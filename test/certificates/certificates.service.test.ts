import { CertificatesService } from '../../src/services/certificates.service';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import crypto from 'crypto';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');
jest.mock('crypto');

describe('CertificatesService', () => {
  let service: CertificatesService;
  let mockDbQuery: jest.MockedFunction<typeof db.query>;
  let mockGetUserCourseProgress: jest.MockedFunction<typeof progressService.getUserCourseProgress>;
  let mockPublish: jest.MockedFunction<typeof publish>;
  let mockIsNotificationsEnabled: jest.MockedFunction<typeof isNotificationsEnabled>;
  let mockRandomBytes: jest.MockedFunction<typeof crypto.randomBytes>;

  beforeEach(() => {
    service = new CertificatesService();
    mockDbQuery = db.query as jest.MockedFunction<typeof db.query>;
    mockGetUserCourseProgress = progressService.getUserCourseProgress as jest.MockedFunction<typeof progressService.getUserCourseProgress>;
    mockPublish = publish as jest.MockedFunction<typeof publish>;
    mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;
    mockRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;
  });

  describe('checkEligibility', () => {
    it('should return ENROLLMENT_NOT_FOUND when no enrollment exists', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({
        eligible: false,
        reason: 'ENROLLMENT_NOT_FOUND'
      });
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM enrollments'),
        [1, 1]
      );
    });

    it('should return eligible=true when enrollment status is completed', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
        rowCount: 1
      } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({ eligible: true });
    });

    it('should return ENROLLMENT_NOT_ACTIVE when status is not active or completed', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'dropped' }],
        rowCount: 1
      } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({
        eligible: false,
        reason: 'ENROLLMENT_NOT_ACTIVE'
      });
    });

    it('should return NO_LESSONS_IN_COURSE when totalLessons is 0', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);
      
      mockGetUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 0,
        totalLessons: 0,
        percent: 0,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({
        eligible: false,
        reason: 'NO_LESSONS_IN_COURSE'
      });
    });

    it('should return NOT_ALL_LESSONS_COMPLETED when lessonsCompleted < totalLessons', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);
      
      mockGetUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 5,
        totalLessons: 10,
        percent: 50,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({
        eligible: false,
        reason: 'NOT_ALL_LESSONS_COMPLETED (5/10)'
      });
    });

    it('should return eligible=true when all lessons completed', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);
      
      mockGetUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 10,
        totalLessons: 10,
        percent: 100,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result).toEqual({ eligible: true });
    });
  });

  describe('issueCertificate', () => {
    beforeEach(() => {
      mockRandomBytes.mockImplementation((size: number) => Buffer.from('ABCDEF'));
    });

    it('should throw error when course not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when issuer is not admin and not course instructor', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 5 }],
        rowCount: 1
      } as any);

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should throw error when user not eligible - enrollment not found', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('User is not eligible: ENROLLMENT_NOT_FOUND');
    });

    it('should throw error when user not eligible - not all lessons completed', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }],
          rowCount: 1
        } as any);

      mockGetUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 5,
        totalLessons: 10,
        percent: 50,
        lessons: []
      });

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)');
    });

    it('should throw error when certificate already exists', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF' }],
          rowCount: 1
        } as any);

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('Certificate already issued for this user and course');
    });

    it('should generate unique code on collision', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toBeDefined();
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM certificates WHERE code'),
        expect.any(Array)
      );
    });

    it('should throw error after max attempts to generate unique code', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      for (let i = 0; i < 10; i++) {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any);
      }

      await expect(
        service.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('Failed to generate unique certificate code');
    });

    it('should successfully issue certificate with notification when enabled', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValueOnce(1);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toBeDefined();
      expect(result.user_id).toBe(1);
      expect(result.course_id).toBe(1);
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABC-DEF'
      });
    });

    it('should successfully issue certificate without notification when disabled', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toBeDefined();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should allow admin to issue certificate for any course', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 5 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'admin');

      expect(result).toBeDefined();
    });
  });

  describe('claimCertificate', () => {
    beforeEach(() => {
      mockRandomBytes.mockImplementation((size: number) => Buffer.from('ABCDEF'));
    });

    it('should throw error when user not eligible', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        service.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate: ENROLLMENT_NOT_FOUND');
    });

    it('should throw error when certificate already claimed', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF' }],
          rowCount: 1
        } as any);

      await expect(
        service.claimCertificate(1, 1)
      ).rejects.toThrow('Certificate already claimed for this course');
    });

    it('should generate unique code on collision', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.claimCertificate(1, 1);

      expect(result).toBeDefined();
    });

    it('should throw error after max attempts', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      for (let i = 0; i < 10; i++) {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any);
      }

      await expect(
        service.claimCertificate(1, 1)
      ).rejects.toThrow('Failed to generate unique certificate code');
    });

    it('should successfully claim certificate with notification when enabled', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValueOnce(1);

      const result = await service.claimCertificate(1, 1);

      expect(result).toBeDefined();
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABC-DEF'
      });
    });

    it('should successfully claim certificate without notification when disabled', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC-DEF', issued_at: new Date() }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.claimCertificate(1, 1);

      expect(result).toBeDefined();
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('getUserCertificates', () => {
    it('should return empty array when user has no certificates', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.getUserCertificates(1);

      expect(result).toEqual([]);
    });

    it('should return certificates with course details', async () => {
      const mockDate = new Date();
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'CERT-ABC-DEF',
            issued_at: mockDate,
            course_id: 1,
            course_title: 'Test Course'
          },
          {
            id: 2,
            code: 'CERT-GHI-JKL',
            issued_at: mockDate,
            course_id: 2,
            course_title: 'Another Course'
          }
        ],
        rowCount: 2
      } as any);

      const result = await service.getUserCertificates(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC-DEF',
        issued_at: mockDate,
        course: {
          id: 1,
          title: 'Test Course'
        }
      });
    });
  });

  describe('getCourseCertificates', () => {
    it('should throw error when course not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        service.getCourseCertificates(1, 2, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when requester is not admin and not instructor', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 5 }],
        rowCount: 1
      } as any);

      await expect(
        service.getCourseCertificates(1, 2, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });

    it('should return certificates with user details for admin', async () => {
      const mockDate = new Date();
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 5 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'CERT-ABC-DEF',
              issued_at: mockDate,
              user_id: 1,
              user_name: 'John Doe',
              user_email: 'john@example.com'
            }
          ],
          rowCount: 1
        } as any);

      const result = await service.getCourseCertificates(1, 2, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC-DEF',
        issued_at: mockDate,
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    it('should return certificates with user details for instructor', async () => {
      const mockDate = new Date();
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Course', instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'CERT-ABC-DEF',
              issued_at: mockDate,
              user_id: 1,
              user_name: 'John Doe',
              user_email: 'john@example.com'
            }
          ],
          rowCount: 1
        } as any);

      const result = await service.getCourseCertificates(1, 2, 'instructor');

      expect(result).toHaveLength(1);
    });
  });

  describe('verifyCertificate', () => {
    it('should return {valid: false} when code does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.verifyCertificate('CERT-ABC-DEF');

      expect(result).toEqual({ valid: false });
    });

    it('should return {valid: true, user, course, issued_at} when code is valid', async () => {
      const mockDate = new Date();
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            issued_at: mockDate,
            user_name: 'John Doe',
            course_title: 'Test Course'
          }
        ],
        rowCount: 1
      } as any);

      const result = await service.verifyCertificate('CERT-ABC-DEF');

      expect(result).toEqual({
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'Test Course'
        },
        issued_at: mockDate
      });
    });
  });

  describe('certificateExists', () => {
    it('should return false when certificate does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.certificateExists(1, 1);

      expect(result).toBe(false);
    });

    it('should return true when certificate exists', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1
      } as any);

      const result = await service.certificateExists(1, 1);

      expect(result).toBe(true);
    });
  });

  describe('getCertificate', () => {
    it('should return null when certificate does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await service.getCertificate(1, 1);

      expect(result).toBeNull();
    });

    it('should return certificate when it exists', async () => {
      const mockCert = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC-DEF',
        issued_at: new Date()
      };
      mockDbQuery.mockResolvedValueOnce({
        rows: [mockCert],
        rowCount: 1
      } as any);

      const result = await service.getCertificate(1, 1);

      expect(result).toEqual(mockCert);
    });
  });
});
