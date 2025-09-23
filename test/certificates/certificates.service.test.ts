/**
 * Tests for CertificatesService
 * 
 * Tests certificate issuance, verification, eligibility checks, and CRUD operations
 * with mocked database dependencies.
 */

import { certificatesService, CertificatesService } from '../../src/services/certificates.service';
import { progressService } from '../../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { db } from '../../src/db';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

const mockDb = db as jest.Mocked<typeof db>;
const mockProgressService = progressService as jest.Mocked<typeof progressService>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('CertificatesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationsEnabled.mockReturnValue(true);
  });

  describe('checkEligibility', () => {
    it('should return eligible true when enrollment status is completed', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'completed', user_id: 1, course_id: 1 }]
      } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM enrollments \n       WHERE user_id = $1 AND course_id = $2',
        [1, 1]
      );
    });

    it('should return not eligible when enrollment not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_FOUND');
    });

    it('should return not eligible when enrollment is not active', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'refunded', user_id: 1, course_id: 1 }]
      } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('ENROLLMENT_NOT_ACTIVE');
    });

    it('should return not eligible when no lessons in course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        totalLessons: 0,
        lessonsCompleted: 0
      } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NO_LESSONS_IN_COURSE');
    });

    it('should return not eligible when not all lessons completed', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        totalLessons: 5,
        lessonsCompleted: 3
      } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('NOT_ALL_LESSONS_COMPLETED (3/5)');
    });

    it('should return eligible when all lessons completed', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({
        rows: [{ status: 'active', user_id: 1, course_id: 1 }]
      } as any);
      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        totalLessons: 5,
        lessonsCompleted: 5
      } as any);

      // Act
      const result = await certificatesService.checkEligibility(1, 1);

      // Assert
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('issueCertificate', () => {
    it('should successfully issue certificate for admin', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [] } as any) // code uniqueness check
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any); // insert certificate

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act
      const result = await certificatesService.issueCertificate(2, 1, 1, 'admin');

      // Assert
      expect(result).toEqual(mockCertificate);
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 2,
        courseId: 1,
        code: 'CERT-ABC123-DEF456'
      });
    });

    it('should successfully issue certificate for course instructor', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [] } as any) // code uniqueness check
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any); // insert certificate

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act
      const result = await certificatesService.issueCertificate(2, 1, 3, 'instructor');

      // Assert
      expect(result).toEqual(mockCertificate);
    });

    it('should throw error when course not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(
        certificatesService.issueCertificate(2, 1, 1, 'admin')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to issue for other course', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 5 }] } as any);

      // Act & Assert
      await expect(
        certificatesService.issueCertificate(2, 1, 3, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should throw error when user not eligible', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any);
      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: false,
        reason: 'NOT_ALL_LESSONS_COMPLETED (3/5)'
      });

      // Act & Assert
      await expect(
        certificatesService.issueCertificate(2, 1, 1, 'admin')
      ).rejects.toThrow('User is not eligible: NOT_ALL_LESSONS_COMPLETED (3/5)');
    });

    it('should throw error when certificate already exists', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any); // existing certificate

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act & Assert
      await expect(
        certificatesService.issueCertificate(2, 1, 1, 'admin')
      ).rejects.toThrow('Certificate already issued for this user and course');
    });

    it('should retry code generation when duplicate found', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-XYZ789-ABC123',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [{ id: 2 }] } as any) // first code exists
        .mockResolvedValueOnce({ rows: [] } as any) // second code unique
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any); // insert certificate

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act
      const result = await certificatesService.issueCertificate(2, 1, 1, 'admin');

      // Assert
      expect(result).toEqual(mockCertificate);
      expect(mockDb.query).toHaveBeenCalledTimes(5);
    });

    it('should throw error when unable to generate unique code', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any) // course query
        .mockResolvedValueOnce({ rows: [] } as any); // existing certificate check

      for (let i = 0; i < 10; i++) {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: i + 1 }] } as any);
      }

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act & Assert
      await expect(
        certificatesService.issueCertificate(2, 1, 1, 'admin')
      ).rejects.toThrow('Failed to generate unique certificate code');
    });

    it('should not publish event when notifications disabled', async () => {
      // Arrange
      mockIsNotificationsEnabled.mockReturnValue(false);
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 3 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any);

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act
      await certificatesService.issueCertificate(2, 1, 1, 'admin');

      // Assert
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('claimCertificate', () => {
    it('should successfully claim certificate for eligible student', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 2,
        course_id: 1,
        code: 'CERT-STU123-CLM456',
        issued_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // existing certificate check
        .mockResolvedValueOnce({ rows: [] } as any) // code uniqueness check
        .mockResolvedValueOnce({ rows: [mockCertificate] } as any); // insert certificate

      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act
      const result = await certificatesService.claimCertificate(2, 1);

      // Assert
      expect(result).toEqual(mockCertificate);
      expect(mockPublish).toHaveBeenCalledWith('certificate.issued', {
        certificateId: 1,
        userId: 2,
        courseId: 1,
        code: 'CERT-STU123-CLM456'
      });
    });

    it('should throw error when student not eligible', async () => {
      // Arrange
      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: false,
        reason: 'NOT_ALL_LESSONS_COMPLETED (2/5)'
      });

      // Act & Assert
      await expect(
        certificatesService.claimCertificate(2, 1)
      ).rejects.toThrow('Not eligible for certificate: NOT_ALL_LESSONS_COMPLETED (2/5)');
    });

    it('should throw error when certificate already claimed', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);
      jest.spyOn(certificatesService, 'checkEligibility').mockResolvedValueOnce({
        eligible: true
      });

      // Act & Assert
      await expect(
        certificatesService.claimCertificate(2, 1)
      ).rejects.toThrow('Certificate already claimed for this course');
    });
  });

  describe('getUserCertificates', () => {
    it('should return formatted user certificates', async () => {
      // Arrange
      const mockRows = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01'),
          course_id: 1,
          course_title: 'JavaScript Basics'
        },
        {
          id: 2,
          code: 'CERT-XYZ789-ABC123',
          issued_at: new Date('2023-02-01'),
          course_id: 2,
          course_title: 'React Advanced'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows } as any);

      // Act
      const result = await certificatesService.getUserCertificates(1);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date('2023-01-01'),
        course: {
          id: 1,
          title: 'JavaScript Basics'
        }
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return empty array when no certificates found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await certificatesService.getUserCertificates(1);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getCourseCertificates', () => {
    it('should return course certificates for admin', async () => {
      // Arrange
      const mockCourseRows = [{ id: 1, instructor_id: 2 }];
      const mockCertRows = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01'),
          user_id: 3,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockCourseRows } as any)
        .mockResolvedValueOnce({ rows: mockCertRows } as any);

      // Act
      const result = await certificatesService.getCourseCertificates(1, 1, 'admin');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date('2023-01-01'),
        user: {
          id: 3,
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    it('should return course certificates for course instructor', async () => {
      // Arrange
      const mockCourseRows = [{ id: 1, instructor_id: 2 }];
      const mockCertRows = [
        {
          id: 1,
          code: 'CERT-ABC123-DEF456',
          issued_at: new Date('2023-01-01'),
          user_id: 3,
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: mockCourseRows } as any)
        .mockResolvedValueOnce({ rows: mockCertRows } as any);

      // Act
      const result = await certificatesService.getCourseCertificates(1, 2, 'instructor');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should throw error when course not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(
        certificatesService.getCourseCertificates(1, 1, 'admin')
      ).rejects.toThrow('Course not found');
    });

    it('should throw error when instructor tries to view other course certificates', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 5 }] } as any);

      // Act & Assert
      await expect(
        certificatesService.getCourseCertificates(1, 2, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });
  });

  describe('verifyCertificate', () => {
    it('should return valid verification for existing certificate', async () => {
      // Arrange
      const mockRows = [
        {
          issued_at: new Date('2023-01-01'),
          user_name: 'John Doe',
          course_title: 'JavaScript Basics'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockRows } as any);

      // Act
      const result = await certificatesService.verifyCertificate('CERT-ABC123-DEF456');

      // Assert
      expect(result).toEqual({
        valid: true,
        user: {
          name: 'John Doe'
        },
        course: {
          title: 'JavaScript Basics'
        },
        issued_at: new Date('2023-01-01')
      });
    });

    it('should return invalid verification for non-existing certificate', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await certificatesService.verifyCertificate('CERT-INVALID-CODE');

      // Assert
      expect(result).toEqual({ valid: false });
    });
  });

  describe('certificateExists', () => {
    it('should return true when certificate exists', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);

      // Act
      const result = await certificatesService.certificateExists(1, 1);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
        [1, 1]
      );
    });

    it('should return false when certificate does not exist', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await certificatesService.certificateExists(1, 1);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getCertificate', () => {
    it('should return certificate when found', async () => {
      // Arrange
      const mockCertificate = {
        id: 1,
        user_id: 1,
        course_id: 1,
        code: 'CERT-ABC123-DEF456',
        issued_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCertificate] } as any);

      // Act
      const result = await certificatesService.getCertificate(1, 1);

      // Assert
      expect(result).toEqual(mockCertificate);
    });

    it('should return null when certificate not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await certificatesService.getCertificate(1, 1);

      // Assert
      expect(result).toBeNull();
    });
  });
});
