import { CertificatesService, certificatesService } from '../certificates.service';
import { db } from '../../db';
import { progressService } from '../progress.service';
import { publish, isNotificationsEnabled } from '../../modules/notifications/publisher';
import crypto from 'crypto';

jest.mock('../../db');
jest.mock('../progress.service');
jest.mock('../../modules/notifications/publisher');
jest.mock('crypto');

describe('CertificatesService', () => {
  const mockDbQuery = db.query as jest.MockedFunction<typeof db.query>;
  const mockProgressService = progressService.getUserCourseProgress as jest.MockedFunction<typeof progressService.getUserCourseProgress>;
  const mockPublish = publish as jest.MockedFunction<typeof publish>;
  const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;
  const mockRandomBytes = crypto.randomBytes as jest.MockedFunction<typeof crypto.randomBytes>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRandomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('ABCDEF123456')
    } as any);
  });

  describe('checkEligibility', () => {
    it('should return eligible when enrollment status is completed', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
        rowCount: 1
      } as any);

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM enrollments'),
        [1, 1]
      );
    });

    it('should return eligible when all lessons completed with active enrollment', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);

      mockProgressService.mockResolvedValue({
        lessonsCompleted: 10,
        totalLessons: 10,
        percent: 100,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(true);
      expect(mockProgressService).toHaveBeenCalledWith(1, 1);
    });

    it('should return not eligible when enrollment not found', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_FOUND');
    });

    it('should return not eligible when enrollment not active', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'cancelled' }],
        rowCount: 1
      } as any);

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_ACTIVE');
    });

    it('should return not eligible when no lessons in course', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);

      mockProgressService.mockResolvedValue({
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
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);

      mockProgressService.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 10,
        percent: 50,
        lessons: []
      });

      const result = await certificatesService.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NOT_ALL_LESSONS_COMPLETED (5/10)');
    });
  });

  describe('issueCertificate', () => {
    it('should successfully issue certificate when instructor owns course', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.issueCertificate(1, 1, 2, 'instructor');

      expect(result.user_id).toBe(1);
      expect(result.course_id).toBe(1);
      expect(result.code).toBe('CERT-ABCDEF-123456');
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO certificates'),
        expect.arrayContaining([1, 1])
      );
    });

    it('should successfully issue certificate with admin role', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.issueCertificate(1, 1, 100, 'admin');

      expect(result.user_id).toBe(1);
      expect(result.course_id).toBe(1);
    });

    it('should throw error when course not found', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(
        certificatesService.issueCertificate(1, 999, 2, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor does not own course', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 999 }],
        rowCount: 1
      } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should throw error when user not eligible - enrollment not found', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('User is not eligible: ENROLLMENT_NOT_FOUND');
    });

    it('should throw error when user not eligible - enrollment not active', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 2 }],
        rowCount: 1
      } as any);

      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'cancelled' }],
        rowCount: 1
      } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('User is not eligible: ENROLLMENT_NOT_ACTIVE');
    });

    it('should throw error when user not eligible - incomplete lessons', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 2 }],
        rowCount: 1
      } as any);

      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);

      mockProgressService.mockResolvedValue({
        lessonsCompleted: 5,
        totalLessons: 10,
        percent: 50,
        lessons: []
      });

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('User is not eligible: NOT_ALL_LESSONS_COMPLETED (5/10)');
    });

    it('should throw error when certificate already exists', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1 }],
          rowCount: 1
        } as any);

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('Certificate already issued for this user and course');
    });

    it('should generate unique code with collision retry', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.issueCertificate(1, 1, 2, 'instructor');

      expect(result.code).toBe('CERT-ABCDEF-123456');
      expect(mockDbQuery).toHaveBeenCalledWith(
        'SELECT id FROM certificates WHERE code = $1',
        expect.any(Array)
      );
    });

    it('should throw error when max code generation attempts reached', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      for (let i = 0; i < 10; i++) {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{ id: 999 }],
          rowCount: 1
        } as any);
      }

      await expect(
        certificatesService.issueCertificate(1, 1, 2, 'instructor')
      ).rejects.toThrow('Failed to generate unique certificate code');
    });

    it('should publish notification event when notifications enabled', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      await certificatesService.issueCertificate(1, 1, 2, 'instructor');

      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABCDEF-123456'
      });
    });

    it('should skip notification when notifications disabled', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      await certificatesService.issueCertificate(1, 1, 2, 'instructor');

      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('claimCertificate', () => {
    it('should successfully claim certificate when eligible', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.claimCertificate(1, 1);

      expect(result.user_id).toBe(1);
      expect(result.course_id).toBe(1);
      expect(result.code).toBe('CERT-ABCDEF-123456');
    });

    it('should throw error when not eligible - enrollment not found', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate: ENROLLMENT_NOT_FOUND');
    });

    it('should throw error when not eligible - enrollment not active', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'cancelled' }],
        rowCount: 1
      } as any);

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate: ENROLLMENT_NOT_ACTIVE');
    });

    it('should throw error when not eligible - incomplete lessons', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);

      mockProgressService.mockResolvedValue({
        lessonsCompleted: 3,
        totalLessons: 10,
        percent: 30,
        lessons: []
      });

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (3/10)');
    });

    it('should throw error when certificate already claimed', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1 }],
          rowCount: 1
        } as any);

      await expect(
        certificatesService.claimCertificate(1, 1)
      ).rejects.toThrow('Certificate already claimed for this course');
    });

    it('should generate unique code with collision handling', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await certificatesService.claimCertificate(1, 1);

      expect(result.code).toBe('CERT-ABCDEF-123456');
    });

    it('should publish notification event when enabled', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 1, status: 'completed' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABCDEF-123456', issued_at: mockDate }],
          rowCount: 1
        } as any);

      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      await certificatesService.claimCertificate(1, 1);

      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABCDEF-123456'
      });
    });
  });

  describe('verifyCertificate', () => {
    it('should return valid verification with user and course details', async () => {
      const mockDate = new Date();
      
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          issued_at: mockDate,
          user_name: 'John Doe',
          course_title: 'Introduction to TypeScript'
        }],
        rowCount: 1
      } as any);

      const result = await certificatesService.verifyCertificate('CERT-ABCDEF-123456');

      expect(result.valid).toBe(true);
      expect(result.user?.name).toBe('John Doe');
      expect(result.course?.title).toBe('Introduction to TypeScript');
      expect(result.issued_at).toBe(mockDate);
    });

    it('should return invalid when certificate not found', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await certificatesService.verifyCertificate('CERT-INVALID-CODE');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.course).toBeUndefined();
    });
  });

  describe('getUserCertificates', () => {
    it('should return array of certificates with course details', async () => {
      const mockDate1 = new Date('2024-01-01');
      const mockDate2 = new Date('2024-02-01');
      
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'CERT-ABC123-DEF456',
            issued_at: mockDate2,
            course_id: 1,
            course_title: 'Advanced JavaScript'
          },
          {
            id: 2,
            code: 'CERT-GHI789-JKL012',
            issued_at: mockDate1,
            course_id: 2,
            course_title: 'React Fundamentals'
          }
        ],
        rowCount: 2
      } as any);

      const result = await certificatesService.getUserCertificates(1);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('CERT-ABC123-DEF456');
      expect(result[0].course?.title).toBe('Advanced JavaScript');
      expect(result[1].code).toBe('CERT-GHI789-JKL012');
      expect(result[1].course?.title).toBe('React Fundamentals');
    });

    it('should return empty array when user has no certificates', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await certificatesService.getUserCertificates(1);

      expect(result).toHaveLength(0);
    });

    it('should query with correct user id', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await certificatesService.getUserCertificates(123);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cert.user_id = $1'),
        [123]
      );
    });
  });

  describe('getCourseCertificates', () => {
    it('should return certificates with user details for admin role', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'CERT-ABC123-DEF456',
              issued_at: mockDate,
              user_id: 10,
              user_name: 'Alice Student',
              user_email: 'alice@example.com'
            }
          ],
          rowCount: 1
        } as any);

      const result = await certificatesService.getCourseCertificates(1, 100, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('CERT-ABC123-DEF456');
      expect(result[0].user?.name).toBe('Alice Student');
      expect(result[0].user?.email).toBe('alice@example.com');
    });

    it('should return certificates when instructor owns course', async () => {
      const mockDate = new Date();
      
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'CERT-ABC123-DEF456',
              issued_at: mockDate,
              user_id: 10,
              user_name: 'Bob Student',
              user_email: 'bob@example.com'
            }
          ],
          rowCount: 1
        } as any);

      const result = await certificatesService.getCourseCertificates(1, 2, 'instructor');

      expect(result).toHaveLength(1);
      expect(result[0].user?.name).toBe('Bob Student');
    });

    it('should throw error when course not found', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      await expect(
        certificatesService.getCourseCertificates(999, 2, 'instructor')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor does not own course', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 999 }],
        rowCount: 1
      } as any);

      await expect(
        certificatesService.getCourseCertificates(1, 2, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });

    it('should return empty array when no certificates issued', async () => {
      mockDbQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      const result = await certificatesService.getCourseCertificates(1, 2, 'instructor');

      expect(result).toHaveLength(0);
    });
  });
});
