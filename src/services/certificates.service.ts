import { db } from '../db';
import { progressService } from './progress.service';
import { publish, isNotificationsEnabled } from '../modules/notifications/publisher';
import crypto from 'crypto';

export interface Certificate {
  id: number;
  user_id: number;
  course_id: number;
  code: string;
  issued_at: Date;
}

export interface CertificateWithDetails {
  id: number;
  code: string;
  issued_at: Date;
  course?: {
    id: number;
    title: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CertificateVerification {
  valid: boolean;
  user?: {
    name: string;
  };
  course?: {
    title: string;
  };
  issued_at?: Date;
}

export class CertificatesService {
  /**
   * Generate a unique, URL-safe certificate code
   * Format: CERT-XXXXXX-XXXXXX (12 random chars in base36)
   */
  private generateCertificateCode(): string {
    const part1 = crypto.randomBytes(4).toString('base64url').substring(0, 6).toUpperCase();
    const part2 = crypto.randomBytes(4).toString('base64url').substring(0, 6).toUpperCase();
    return `CERT-${part1}-${part2}`;
  }

  /**
   * Check if a user is eligible for a certificate
   * Eligibility: active enrollment + all lessons completed OR enrollment status='completed'
   */
  async checkEligibility(userId: number, courseId: number): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    // Check enrollment exists and is active
    const enrollment = await db.query(
      `SELECT * FROM enrollments 
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    if (!enrollment.rows[0]) {
      return { eligible: false, reason: 'ENROLLMENT_NOT_FOUND' };
    }

    const enrollmentData = enrollment.rows[0];

    // If enrollment status is 'completed', user is eligible
    if (enrollmentData.status === 'completed') {
      return { eligible: true };
    }

    // Check if enrollment is active
    if (enrollmentData.status !== 'active') {
      return { eligible: false, reason: 'ENROLLMENT_NOT_ACTIVE' };
    }

    // Check progress - all lessons must be completed
    const progress = await progressService.getUserCourseProgress(userId, courseId);
    
    if (progress.totalLessons === 0) {
      return { eligible: false, reason: 'NO_LESSONS_IN_COURSE' };
    }

    if (progress.lessonsCompleted < progress.totalLessons) {
      return { 
        eligible: false, 
        reason: `NOT_ALL_LESSONS_COMPLETED (${progress.lessonsCompleted}/${progress.totalLessons})`
      };
    }

    return { eligible: true };
  }

  /**
   * Issue a certificate to a user for a course (instructor/admin)
   */
  async issueCertificate(
    userId: number,
    courseId: number,
    issuerId: number,
    issuerRole: string
  ): Promise<Certificate> {
    // Check if issuer can issue certificates for this course
    const course = await db.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );

    if (!course.rows[0]) {
      throw new Error('Course not found');
    }

    // Check permissions
    if (issuerRole !== 'admin' && course.rows[0].instructor_id !== issuerId) {
      throw new Error('You can only issue certificates for your own courses');
    }

    // Check eligibility
    const eligibility = await this.checkEligibility(userId, courseId);
    if (!eligibility.eligible) {
      throw new Error(`User is not eligible: ${eligibility.reason}`);
    }

    // Check if certificate already exists
    const existing = await db.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existing.rows[0]) {
      throw new Error('Certificate already issued for this user and course');
    }

    // Generate unique code
    let code = this.generateCertificateCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const codeCheck = await db.query(
        'SELECT id FROM certificates WHERE code = $1',
        [code]
      );
      if (codeCheck.rows.length === 0) {
        break;
      }
      code = this.generateCertificateCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error('Failed to generate unique certificate code');
    }

    // Issue certificate
    const result = await db.query(
      `INSERT INTO certificates (user_id, course_id, code, issued_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, courseId, code]
    );

    const certificate = result.rows[0];

    // Publish event to outbox
    if (isNotificationsEnabled()) {
      await publish('certificate.issued', {
        certificateId: certificate.id,
        userId: userId,
        courseId: courseId,
        code: certificate.code
      });
    }

    return certificate;
  }

  /**
   * Allow a student to claim their own certificate
   */
  async claimCertificate(userId: number, courseId: number): Promise<Certificate> {
    // Check eligibility
    const eligibility = await this.checkEligibility(userId, courseId);
    if (!eligibility.eligible) {
      throw new Error(`Not eligible for certificate: ${eligibility.reason}`);
    }

    // Check if certificate already exists
    const existing = await db.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existing.rows[0]) {
      throw new Error('Certificate already claimed for this course');
    }

    // Generate unique code
    let code = this.generateCertificateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const codeCheck = await db.query(
        'SELECT id FROM certificates WHERE code = $1',
        [code]
      );
      if (codeCheck.rows.length === 0) {
        break;
      }
      code = this.generateCertificateCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error('Failed to generate unique certificate code');
    }

    // Issue certificate
    const result = await db.query(
      `INSERT INTO certificates (user_id, course_id, code, issued_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, courseId, code]
    );

    const certificate = result.rows[0];

    // Publish event to outbox
    if (isNotificationsEnabled()) {
      await publish('certificate.issued', {
        certificateId: certificate.id,
        userId: userId,
        courseId: courseId,
        code: certificate.code
      });
    }

    return certificate;
  }

  /**
   * Get all certificates for a user
   */
  async getUserCertificates(userId: number): Promise<CertificateWithDetails[]> {
    const result = await db.query(
      `SELECT 
        cert.id,
        cert.code,
        cert.issued_at,
        c.id as course_id,
        c.title as course_title
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       WHERE cert.user_id = $1
       ORDER BY cert.issued_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      code: row.code,
      issued_at: row.issued_at,
      course: {
        id: row.course_id,
        title: row.course_title
      }
    }));
  }

  /**
   * Get all certificates issued for a course (instructor/admin only)
   */
  async getCourseCertificates(
    courseId: number,
    requesterId: number,
    requesterRole: string
  ): Promise<CertificateWithDetails[]> {
    // Check permissions
    const course = await db.query(
      'SELECT * FROM courses WHERE id = $1',
      [courseId]
    );

    if (!course.rows[0]) {
      throw new Error('Course not found');
    }

    if (requesterRole !== 'admin' && course.rows[0].instructor_id !== requesterId) {
      throw new Error('You can only view certificates for your own courses');
    }

    // Get certificates with user details
    const result = await db.query(
      `SELECT 
        cert.id,
        cert.code,
        cert.issued_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
       FROM certificates cert
       JOIN users u ON cert.user_id = u.id
       WHERE cert.course_id = $1
       ORDER BY cert.issued_at DESC`,
      [courseId]
    );

    return result.rows.map(row => ({
      id: row.id,
      code: row.code,
      issued_at: row.issued_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      }
    }));
  }

  /**
   * Verify a certificate by its code (public endpoint)
   */
  async verifyCertificate(code: string): Promise<CertificateVerification> {
    const result = await db.query(
      `SELECT 
        cert.issued_at,
        u.name as user_name,
        c.title as course_title
       FROM certificates cert
       JOIN users u ON cert.user_id = u.id
       JOIN courses c ON cert.course_id = c.id
       WHERE cert.code = $1`,
      [code]
    );

    if (!result.rows[0]) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        name: result.rows[0].user_name
      },
      course: {
        title: result.rows[0].course_title
      },
      issued_at: result.rows[0].issued_at
    };
  }

  /**
   * Check if a certificate exists for a user and course
   */
  async certificateExists(userId: number, courseId: number): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get a single certificate by user and course
   */
  async getCertificate(userId: number, courseId: number): Promise<Certificate | null> {
    const result = await db.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    return result.rows[0] || null;
  }
}

export const certificatesService = new CertificatesService();
