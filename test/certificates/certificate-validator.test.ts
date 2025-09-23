/**
 * Tests for CertificateValidator
 * 
 * Tests input validation for certificate operations including format validation
 * and business rule validation.
 */

import { CertificateValidator } from '../../src/utils/validation';

describe('CertificateValidator', () => {
  describe('validateIssueCertificate', () => {
    it('should validate required userId and courseId fields', () => {
      // Arrange
      const validData = { userId: 1, courseId: 2 };

      // Act
      const result = CertificateValidator.validateIssueCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when userId is missing', () => {
      // Arrange
      const invalidData = { courseId: 2 };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should return error when userId is not a number', () => {
      // Arrange
      const invalidData = { userId: 'not-a-number', courseId: 2 };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
    });

    it('should return error when userId is not a positive integer', () => {
      // Arrange
      const testCases = [
        { userId: 0, courseId: 2 },
        { userId: -1, courseId: 2 },
        { userId: 1.5, courseId: 2 }
      ];

      testCases.forEach(invalidData => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'userId',
          message: 'User ID must be a positive integer'
        });
      });
    });

    it('should return error when courseId is missing', () => {
      // Arrange
      const invalidData = { userId: 1 };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is not a number', () => {
      // Arrange
      const invalidData = { userId: 1, courseId: 'not-a-number' };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is not a positive integer', () => {
      // Arrange
      const testCases = [
        { userId: 1, courseId: 0 },
        { userId: 1, courseId: -1 },
        { userId: 1, courseId: 2.5 }
      ];

      testCases.forEach(invalidData => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });
    });

    it('should return multiple errors for multiple invalid fields', () => {
      // Arrange
      const invalidData = { userId: 'invalid', courseId: null };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should handle edge cases with null and undefined values', () => {
      // Arrange
      const testCases = [
        { userId: null, courseId: 1 },
        { userId: undefined, courseId: 1 },
        { userId: 1, courseId: null },
        { userId: 1, courseId: undefined }
      ];

      testCases.forEach(invalidData => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateClaimCertificate', () => {
    it('should validate required courseId field', () => {
      // Arrange
      const validData = { courseId: 1 };

      // Act
      const result = CertificateValidator.validateClaimCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when courseId is missing', () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = CertificateValidator.validateClaimCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is not a number', () => {
      // Arrange
      const invalidData = { courseId: 'not-a-number' };

      // Act
      const result = CertificateValidator.validateClaimCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is not a positive integer', () => {
      // Arrange
      const testCases = [
        { courseId: 0 },
        { courseId: -1 },
        { courseId: 1.5 }
      ];

      testCases.forEach(invalidData => {
        // Act
        const result = CertificateValidator.validateClaimCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });
    });

    it('should handle null and undefined courseId values', () => {
      // Arrange
      const testCases = [
        { courseId: null },
        { courseId: undefined }
      ];

      testCases.forEach(invalidData => {
        // Act
        const result = CertificateValidator.validateClaimCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required'
        });
      });
    });
  });

  describe('validateCertificateCode', () => {
    it('should validate properly formatted certificate codes', () => {
      // Arrange
      const validCodes = [
        'CERT-ABC123-DEF456',
        'CERT-XYZ789-123ABC',
        'CERT-ABCDEF-123456',
        'CERT-123456-ABCDEF',
        'VALID-CERTIFICATE-CODE-FORMAT'
      ];

      validCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should return error when code is missing', () => {
      // Arrange
      const testCases = [null, undefined, ''];

      testCases.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Certificate code is required'
        });
      });
    });

    it('should return error when code is not a string', () => {
      // Arrange
      const testCases = [123, true, {}, []];

      testCases.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Certificate code must be a string'
        });
      });
    });

    it('should return error when code is too short', () => {
      // Arrange
      const shortCodes = [
        'A',
        'AB',
        'ABC',
        'ABCD',
        'ABCDEFGHI' // 9 characters, minimum is 10
      ];

      shortCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Invalid certificate code format'
        });
      });
    });

    it('should return error when code is too long', () => {
      // Arrange
      const longCode = 'A'.repeat(101); // 101 characters, maximum is 100

      // Act
      const result = CertificateValidator.validateCertificateCode(longCode);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    });

    it('should validate codes at boundary lengths', () => {
      // Arrange
      const minLengthCode = 'A'.repeat(10); // Minimum valid length
      const maxLengthCode = 'A'.repeat(100); // Maximum valid length

      // Act
      const minResult = CertificateValidator.validateCertificateCode(minLengthCode);
      const maxResult = CertificateValidator.validateCertificateCode(maxLengthCode);

      // Assert
      expect(minResult.isValid).toBe(true);
      expect(minResult.errors).toHaveLength(0);
      expect(maxResult.isValid).toBe(true);
      expect(maxResult.errors).toHaveLength(0);
    });

    it('should handle whitespace-only codes', () => {
      // Arrange
      const whitespaceCodes = [
        '   ',
        '\t\t\t',
        '\n\n\n',
        '          ' // 10 spaces
      ];

      whitespaceCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        if (code.length >= 10 && code.length <= 100) {
          expect(result.isValid).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
        }
      });
    });

    it('should handle special characters in codes', () => {
      // Arrange
      const specialCharCodes = [
        'CERT-ABC123-DEF456!',
        'CERT@ABC123#DEF456',
        'CERT_ABC123_DEF456',
        'CERT.ABC123.DEF456'
      ];

      specialCharCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should validate complete certificate issuance workflow', () => {
      // Arrange
      const issueData = { userId: 1, courseId: 2 };
      const claimData = { courseId: 2 };
      const code = 'CERT-ABC123-DEF456';

      // Act
      const issueResult = CertificateValidator.validateIssueCertificate(issueData);
      const claimResult = CertificateValidator.validateClaimCertificate(claimData);
      const codeResult = CertificateValidator.validateCertificateCode(code);

      // Assert
      expect(issueResult.isValid).toBe(true);
      expect(claimResult.isValid).toBe(true);
      expect(codeResult.isValid).toBe(true);
    });

    it('should handle completely invalid data across all validators', () => {
      // Arrange
      const invalidIssueData = { userId: 'invalid', courseId: null };
      const invalidClaimData = { courseId: 'invalid' };
      const invalidCode = 123;

      // Act
      const issueResult = CertificateValidator.validateIssueCertificate(invalidIssueData);
      const claimResult = CertificateValidator.validateClaimCertificate(invalidClaimData);
      const codeResult = CertificateValidator.validateCertificateCode(invalidCode);

      // Assert
      expect(issueResult.isValid).toBe(false);
      expect(issueResult.errors.length).toBeGreaterThan(0);
      expect(claimResult.isValid).toBe(false);
      expect(claimResult.errors.length).toBeGreaterThan(0);
      expect(codeResult.isValid).toBe(false);
      expect(codeResult.errors.length).toBeGreaterThan(0);
    });
  });
});
