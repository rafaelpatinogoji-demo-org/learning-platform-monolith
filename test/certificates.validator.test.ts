import { describe, test, expect } from '@jest/globals';
import { CertificateValidator } from '../src/utils/validation';

describe('CertificateValidator', () => {
  describe('validateIssueCertificate', () => {
    test('should return invalid for null data', () => {
      const result = CertificateValidator.validateIssueCertificate(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid for undefined data', () => {
      const result = CertificateValidator.validateIssueCertificate(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid for non-object data', () => {
      const result = CertificateValidator.validateIssueCertificate('invalid');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid when userId is missing', () => {
      const result = CertificateValidator.validateIssueCertificate({
        courseId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[0].message).toBe('User ID is required');
    });

    test('should return invalid when userId is null', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: null,
        courseId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[0].message).toBe('User ID is required');
    });

    test('should return invalid when userId is not an integer', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1.5,
        courseId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[0].message).toBe('User ID must be a positive integer');
    });

    test('should return invalid when userId is zero', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 0,
        courseId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[0].message).toBe('User ID must be a positive integer');
    });

    test('should return invalid when userId is negative', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: -1,
        courseId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[0].message).toBe('User ID must be a positive integer');
    });

    test('should return invalid when courseId is missing', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID is required');
    });

    test('should return invalid when courseId is null', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1,
        courseId: null
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID is required');
    });

    test('should return invalid when courseId is not an integer', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1,
        courseId: 1.5
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return invalid when courseId is zero', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1,
        courseId: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return invalid when courseId is negative', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1,
        courseId: -1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return invalid when both userId and courseId are invalid', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: -1,
        courseId: -1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('userId');
      expect(result.errors[1].field).toBe('courseId');
    });

    test('should return valid for correct data', () => {
      const result = CertificateValidator.validateIssueCertificate({
        userId: 1,
        courseId: 2
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateClaimCertificate', () => {
    test('should return invalid for null data', () => {
      const result = CertificateValidator.validateClaimCertificate(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid for undefined data', () => {
      const result = CertificateValidator.validateClaimCertificate(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid for non-object data', () => {
      const result = CertificateValidator.validateClaimCertificate('invalid');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid data provided');
    });

    test('should return invalid when courseId is missing', () => {
      const result = CertificateValidator.validateClaimCertificate({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID is required');
    });

    test('should return invalid when courseId is null', () => {
      const result = CertificateValidator.validateClaimCertificate({
        courseId: null
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID is required');
    });

    test('should return invalid when courseId is not an integer', () => {
      const result = CertificateValidator.validateClaimCertificate({
        courseId: 1.5
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return invalid when courseId is zero', () => {
      const result = CertificateValidator.validateClaimCertificate({
        courseId: 0
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return invalid when courseId is negative', () => {
      const result = CertificateValidator.validateClaimCertificate({
        courseId: -1
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
      expect(result.errors[0].message).toBe('Course ID must be a positive integer');
    });

    test('should return valid for correct data', () => {
      const result = CertificateValidator.validateClaimCertificate({
        courseId: 1
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCertificateCode', () => {
    test('should return invalid when code is missing', () => {
      const result = CertificateValidator.validateCertificateCode(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Certificate code is required');
    });

    test('should return invalid when code is undefined', () => {
      const result = CertificateValidator.validateCertificateCode(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Certificate code is required');
    });

    test('should return invalid when code is empty string', () => {
      const result = CertificateValidator.validateCertificateCode('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Certificate code is required');
    });

    test('should return invalid when code is not a string', () => {
      const result = CertificateValidator.validateCertificateCode(12345);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Certificate code must be a string');
    });

    test('should return invalid when code is too short', () => {
      const result = CertificateValidator.validateCertificateCode('CERT-123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Invalid certificate code format');
    });

    test('should return invalid when code is too long', () => {
      const result = CertificateValidator.validateCertificateCode('C'.repeat(101));
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('Invalid certificate code format');
    });

    test('should return valid for correct code format', () => {
      const result = CertificateValidator.validateCertificateCode('CERT-ABC123-XYZ789');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return valid for minimum length code', () => {
      const result = CertificateValidator.validateCertificateCode('C'.repeat(10));
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return valid for maximum length code', () => {
      const result = CertificateValidator.validateCertificateCode('C'.repeat(100));
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
