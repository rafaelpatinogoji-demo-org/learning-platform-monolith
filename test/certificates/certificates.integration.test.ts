import { jest } from '@jest/globals';
import { CertificatesService } from '../../src/services/certificates.service';
import { certificatesController } from '../../src/controllers/certificates.controller';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import * as publisher from '../../src/modules/notifications/publisher';
import { Request, Response } from 'express';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('Certificates Integration Tests', () => {
  let certificatesService: CertificatesService;
  const mockDb = db as jest.Mocked<typeof db>;
  const mockProgressService = progressService as jest.Mocked<typeof progressService>;
  const mockPublisher = publisher as jest.Mocked<typeof publisher>;

  beforeEach(() => {
    certificatesService = new CertificatesService();
    jest.clearAllMocks();
  });

  describe('End-to-End Certificate Workflow', () => {
    it('should complete student journey: enrollment -> progress -> claim certificate', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'active' }],
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

      const eligibility = await certificatesService.checkEligibility(studentId, courseId);
      expect(eligibility.eligible).toBe(true);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'active' }],
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

      mockDb.query
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-ABC123-DEF456', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(true);
      mockPublisher.publish.mockResolvedValue(1);

      const certificate = await certificatesService.claimCertificate(studentId, courseId);

      expect(certificate).toBeDefined();
      expect(certificate.code).toMatch(/^CERT-/);
      expect(mockPublisher.publish).toHaveBeenCalledWith('certificate.issued', expect.objectContaining({
        certificateId: 1,
        userId: studentId,
        courseId: courseId
      }));

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          issued_at: certificate.issued_at,
          user_name: 'John Doe',
          course_title: 'Test Course'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const verification = await certificatesService.verifyCertificate(certificate.code);
      expect(verification.valid).toBe(true);
      expect(verification.user?.name).toBe('John Doe');
      expect(verification.course?.title).toBe('Test Course');
    });

    it('should complete instructor issuing certificate workflow', async () => {
      const instructorId = 1;
      const studentId = 2;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: instructorId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-XYZ789-ABC123', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(true);
      mockPublisher.publish.mockResolvedValue(1);

      const certificate = await certificatesService.issueCertificate(
        studentId,
        courseId,
        instructorId,
        'instructor'
      );

      expect(certificate).toBeDefined();
      expect(certificate.user_id).toBe(studentId);
      expect(certificate.course_id).toBe(courseId);
      expect(mockPublisher.publish).toHaveBeenCalled();
    });

    it('should handle certificate verification by public endpoint', async () => {
      const mockRequest: Partial<Request> = {
        params: { code: 'CERT-ABC123-DEF456' }
      };

      const mockResponse: Partial<Response> = {
        json: jest.fn() as any,
        status: jest.fn().mockReturnThis() as any
      } as any;

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          issued_at: new Date(),
          user_name: 'Jane Smith',
          course_title: 'Advanced Course'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const CertificateValidator = {
        validateCertificateCode: jest.fn().mockReturnValue({
          isValid: true,
          errors: []
        })
      };

      jest.mock('../../src/utils/validation', () => ({
        CertificateValidator
      }));

      await certificatesController.verify(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          valid: true
        })
      );
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to issue certificate for any course', async () => {
      const adminId = 999;
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-ADMIN-123456', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(false);

      const certificate = await certificatesService.issueCertificate(
        studentId,
        courseId,
        adminId,
        'admin'
      );

      expect(certificate).toBeDefined();
    });

    it('should deny instructor from issuing certificate for another instructor course', async () => {
      const instructorId = 1;
      const studentId = 2;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId, instructor_id: 999 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.issueCertificate(studentId, courseId, instructorId, 'instructor')
      ).rejects.toThrow('You can only issue certificates for your own courses');
    });

    it('should allow admin to view certificates for any course', async () => {
      const adminId = 999;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: 1 }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            code: 'CERT-ABC123-DEF456',
            issued_at: new Date(),
            user_id: 2,
            user_name: 'Student',
            user_email: 'student@example.com'
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      const certificates = await certificatesService.getCourseCertificates(
        courseId,
        adminId,
        'admin'
      );

      expect(certificates).toHaveLength(1);
    });

    it('should deny instructor from viewing certificates for another instructor course', async () => {
      const instructorId = 1;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: courseId, instructor_id: 999 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await expect(
        certificatesService.getCourseCertificates(courseId, instructorId, 'instructor')
      ).rejects.toThrow('You can only view certificates for your own courses');
    });
  });

  describe('Concurrent Certificate Operations', () => {
    it('should handle duplicate certificate prevention during concurrent claims', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: studentId, course_id: courseId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      await expect(
        certificatesService.claimCertificate(studentId, courseId)
      ).rejects.toThrow('Certificate already claimed for this course');
    });

    it('should handle unique code generation with retries', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-UNIQUE-123456', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(false);

      const certificate = await certificatesService.claimCertificate(studentId, courseId);

      expect(certificate).toBeDefined();
      expect(certificate.code).toMatch(/^CERT-/);
    });
  });

  describe('Cross-Module Integration', () => {
    it('should integrate with enrollments service for eligibility check', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: studentId, course_id: courseId, status: 'active' }],
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

      const eligibility = await certificatesService.checkEligibility(studentId, courseId);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('NOT_ALL_LESSONS_COMPLETED');
      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(studentId, courseId);
    });

    it('should integrate with progress service for completion tracking', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: studentId, course_id: courseId, status: 'active' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockProgressService.getUserCourseProgress.mockResolvedValueOnce({
        lessonsCompleted: 10,
        totalLessons: 10,
        percent: 100,
        lessons: []
      });

      const eligibility = await certificatesService.checkEligibility(studentId, courseId);

      expect(eligibility.eligible).toBe(true);
      expect(mockProgressService.getUserCourseProgress).toHaveBeenCalledWith(studentId, courseId);
    });

    it('should publish notification event to outbox when enabled', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-NOTIFY-123456', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(true);
      mockPublisher.publish.mockResolvedValue(1);

      await certificatesService.claimCertificate(studentId, courseId);

      expect(mockPublisher.isNotificationsEnabled).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'certificate.issued',
        expect.objectContaining({
          certificateId: 1,
          userId: studentId,
          courseId: courseId,
          code: 'CERT-NOTIFY-123456'
        })
      );
    });

    it('should not publish notification event when disabled', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
          rows: [{ 
            id: 1, 
            user_id: studentId, 
            course_id: courseId, 
            code: 'CERT-NONOTIFY-123456', 
            issued_at: new Date() 
          }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

      mockPublisher.isNotificationsEnabled.mockReturnValue(false);

      await certificatesService.claimCertificate(studentId, courseId);

      expect(mockPublisher.isNotificationsEnabled).toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should maintain data consistency when certificate issuance fails', async () => {
      const instructorId = 1;
      const studentId = 2;
      const courseId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: courseId, instructor_id: instructorId }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: studentId, course_id: courseId, status: 'completed' }],
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
        .mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        certificatesService.issueCertificate(studentId, courseId, instructorId, 'instructor')
      ).rejects.toThrow('Database connection lost');
    });

    it('should verify certificate existence before retrieval', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: studentId, course_id: courseId }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const exists = await certificatesService.certificateExists(studentId, courseId);
      expect(exists).toBe(true);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ 
          id: 1, 
          user_id: studentId, 
          course_id: courseId, 
          code: 'CERT-EXISTS-123456', 
          issued_at: new Date() 
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const certificate = await certificatesService.getCertificate(studentId, courseId);
      expect(certificate).toBeDefined();
      expect(certificate?.code).toBe('CERT-EXISTS-123456');
    });
  });

  describe('Validation Layer Integration', () => {
    it('should validate certificate code format before verification', async () => {
      const validCode = 'CERT-ABC123-DEF456';
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          issued_at: new Date(),
          user_name: 'Test User',
          course_title: 'Test Course'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const verification = await certificatesService.verifyCertificate(validCode);
      expect(verification.valid).toBe(true);
    });

    it('should handle edge cases in eligibility checking', async () => {
      const studentId = 1;
      const courseId = 1;

      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: studentId, course_id: courseId, status: 'active' }],
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

      const eligibility = await certificatesService.checkEligibility(studentId, courseId);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe('NO_LESSONS_IN_COURSE');
    });
  });
});
