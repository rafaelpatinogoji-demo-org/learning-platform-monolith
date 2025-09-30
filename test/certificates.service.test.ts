import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { CertificatesService } from '../src/services/certificates.service';
import { db } from '../src/db';
import { progressService } from '../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../src/modules/notifications/publisher';

jest.mock('../src/db');
jest.mock('../src/services/progress.service');
jest.mock('../src/modules/notifications/publisher');

const mockDb = db as jest.Mocked<typeof db>;
const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('CertificatesService', () => {
  let service: CertificatesService;

  beforeEach(() => {
    service = new CertificatesService();
    jest.clearAllMocks();
  });

  describe('checkEligibility', () => {
    test('should return not eligible when enrollment not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_FOUND');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM enrollments'),
        [1, 1]
      );
    });

    test('should return eligible when enrollment status is completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'completed', user_id: 1, course_id: 1 }]
      } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('should return not eligible when enrollment status is not active', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'refunded', user_id: 1, course_id: 1 }]
      } as any);

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_ACTIVE');
    });

    test('should return not eligible when course has no lessons', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 0,
        totalLessons: 0,
        percent: 0,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NO_LESSONS_IN_COURSE');
    });

    test('should return not eligible when not all lessons completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NOT_ALL_LESSONS_COMPLETED (3/5)');
    });

    test('should return eligible when all lessons completed', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      });

      const result = await service.checkEligibility(1, 1);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('issueCertificate', () => {
    test('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.issueCertificate(1, 1, 2, 'instructor')).rejects.toThrow('Course not found');
    });

    test('should throw error when non-admin tries to issue for another instructor course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 3 }]
      } as any);

      await expect(service.issueCertificate(1, 1, 2, 'instructor')).rejects.toThrow(
        'You can only issue certificates for your own courses'
      );
    });

    test('should allow admin to issue certificate for any course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-XYZ789', issued_at: new Date() }]
        } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'admin');

      expect(result).toBeDefined();
      expect(result.code).toMatch(/^CERT-/);
    });

    test('should allow instructor to issue certificate for own course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-ABC123-XYZ789', issued_at: new Date() }]
        } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toBeDefined();
      expect(result.code).toMatch(/^CERT-/);
    });

    test('should throw error when user not eligible', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.issueCertificate(1, 1, 2, 'instructor')).rejects.toThrow(
        'User is not eligible: ENROLLMENT_NOT_FOUND'
      );
    });

    test('should throw error when certificate already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'EXISTING' }]
        } as any);

      await expect(service.issueCertificate(1, 1, 2, 'instructor')).rejects.toThrow(
        'Certificate already issued for this user and course'
      );
    });

    test('should generate unique code and issue certificate', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toEqual(mockCertificate);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    test('should publish event when notifications enabled', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValueOnce(1);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toEqual(mockCertificate);
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABC123-XYZ789'
      });
    });

    test('should retry code generation on collision', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-DEF456-ABC123',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 99 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.issueCertificate(1, 1, 2, 'instructor');

      expect(result).toEqual(mockCertificate);
      expect(mockDb.query).toHaveBeenCalledTimes(6);
    });

    test('should throw error when code generation fails after max attempts', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      for (let i = 0; i < 10; i++) {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 99 }] } as any);
      }

      await expect(service.issueCertificate(1, 1, 2, 'instructor')).rejects.toThrow(
        'Failed to generate unique certificate code'
      );
    });
  });

  describe('claimCertificate', () => {
    test('should throw error when user not eligible', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.claimCertificate(1, 1)).rejects.toThrow(
        'Not eligible for certificate: ENROLLMENT_NOT_FOUND'
      );
    });

    test('should throw error when certificate already claimed', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, course_id: 1, code: 'EXISTING' }]
        } as any);

      await expect(service.claimCertificate(1, 1)).rejects.toThrow(
        'Certificate already claimed for this course'
      );
    });

    test('should successfully claim certificate', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(false);

      const result = await service.claimCertificate(1, 1);

      expect(result).toEqual(mockCertificate);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    test('should publish event when notifications enabled', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);
      
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValueOnce(1);

      const result = await service.claimCertificate(1, 1);

      expect(result).toEqual(mockCertificate);
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 1,
        courseId: 1,
        code: 'CERT-ABC123-XYZ789'
      });
    });
  });

  describe('getUserCertificates', () => {
    test('should return empty array when user has no certificates', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.getUserCertificates(1);

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    test('should return user certificates with course details', async () => {
      const mockRows = [
        {
          id: 1,
          code: 'CERT-ABC123-XYZ789',
          issued_at: new Date('2024-01-01'),
          course_id: 10,
          course_title: 'Test Course 1'
        },
        {
          id: 2,
          code: 'CERT-DEF456-ABC123',
          issued_at: new Date('2024-01-02'),
          course_id: 20,
          course_title: 'Test Course 2'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await service.getUserCertificates(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: mockRows[0].issued_at,
        course: {
          id: 10,
          title: 'Test Course 1'
        }
      });
      expect(result[1]).toEqual({
        id: 2,
        code: 'CERT-DEF456-ABC123',
        issued_at: mockRows[1].issued_at,
        course: {
          id: 20,
          title: 'Test Course 2'
        }
      });
    });
  });

  describe('getCourseCertificates', () => {
    test('should throw error when course not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(service.getCourseCertificates(1, 2, 'instructor')).rejects.toThrow('Course not found');
    });

    test('should throw error when non-admin tries to view another instructor course', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, instructor_id: 3 }]
      } as any);

      await expect(service.getCourseCertificates(1, 2, 'instructor')).rejects.toThrow(
        'You can only view certificates for your own courses'
      );
    });

    test('should allow admin to view certificates for any course', async () => {
      const mockRows = [
        {
          id: 1,
          code: 'CERT-ABC123-XYZ789',
          issued_at: new Date('2024-01-01'),
          user_id: 10,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any)
        .mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await service.getCourseCertificates(1, 2, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: mockRows[0].issued_at,
        user: {
          id: 10,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    test('should allow instructor to view certificates for own course', async () => {
      const mockRows = [
        {
          id: 1,
          code: 'CERT-ABC123-XYZ789',
          issued_at: new Date('2024-01-01'),
          user_id: 10,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: mockRows } as any);

      const result = await service.getCourseCertificates(1, 2, 'instructor');

      expect(result).toHaveLength(1);
      expect(result[0].user).toBeDefined();
      expect(result[0].user!.name).toBe('John Doe');
    });

    test('should return empty array when course has no certificates', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.getCourseCertificates(1, 2, 'instructor');

      expect(result).toEqual([]);
    });
  });

  describe('verifyCertificate', () => {
    test('should return invalid when certificate not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.verifyCertificate('CERT-INVALID-CODE123');

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.course).toBeUndefined();
      expect(result.issued_at).toBeUndefined();
    });

    test('should return valid certificate with details when found', async () => {
      const mockDate = new Date('2024-01-01');
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          issued_at: mockDate,
          user_name: 'John Doe',
          course_title: 'Test Course'
        }]
      } as any);

      const result = await service.verifyCertificate('CERT-ABC123-XYZ789');

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({ name: 'John Doe' });
      expect(result.course).toEqual({ title: 'Test Course' });
      expect(result.issued_at).toEqual(mockDate);
    });
  });

  describe('certificateExists', () => {
    test('should return true when certificate exists', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      } as any);

      const result = await service.certificateExists(1, 1);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
        [1, 1]
      );
    });

    test('should return false when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.certificateExists(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('getCertificate', () => {
    test('should return certificate when it exists', async () => {
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-XYZ789',
        issued_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockCertificate]
      } as any);

      const result = await service.getCertificate(1, 1);

      expect(result).toEqual(mockCertificate);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
        [1, 1]
      );
    });

    test('should return null when certificate does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await service.getCertificate(1, 1);

      expect(result).toBeNull();
    });
  });
});
