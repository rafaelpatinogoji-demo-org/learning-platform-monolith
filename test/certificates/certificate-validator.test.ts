/**
 * Tests for CertificateValidator
 * 
 * Unit tests for certificate validation logic including code format validation,
 * user/course ID validation, and all validation methods.
 */

import { CertificateValidator, ValidationResult, ValidationError } from '../../src/utils/validation';

describe('CertificateValidator', () => {
  describe('validateIssueCertificate', () => {
    it('should validate correct certificate issuance data', () => {
      // Arrange
      const validData = {
        userId: 1,
        courseId: 1
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing userId', () => {
      // Arrange
      const invalidData = {
        courseId: 1
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should reject null userId', () => {
      // Arrange
      const invalidData = {
        userId: null,
        courseId: 1
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should reject undefined userId', () => {
      // Arrange
      const invalidData = {
        userId: undefined,
        courseId: 1
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should reject non-integer userId', () => {
      // Arrange
      const testCases = [
        { userId: 'string', courseId: 1 },
        { userId: 1.5, courseId: 1 },
        { userId: true, courseId: 1 },
        { userId: {}, courseId: 1 },
        { userId: [], courseId: 1 }
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

    it('should reject zero or negative userId', () => {
      // Arrange
      const testCases = [
        { userId: 0, courseId: 1 },
        { userId: -1, courseId: 1 },
        { userId: -100, courseId: 1 }
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

    it('should reject missing courseId', () => {
      // Arrange
      const invalidData = {
        userId: 1
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject null courseId', () => {
      // Arrange
      const invalidData = {
        userId: 1,
        courseId: null
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject non-integer courseId', () => {
      // Arrange
      const testCases = [
        { userId: 1, courseId: 'string' },
        { userId: 1, courseId: 1.5 },
        { userId: 1, courseId: true },
        { userId: 1, courseId: {} },
        { userId: 1, courseId: [] }
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

    it('should reject zero or negative courseId', () => {
      // Arrange
      const testCases = [
        { userId: 1, courseId: 0 },
        { userId: 1, courseId: -1 },
        { userId: 1, courseId: -100 }
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

    it('should collect multiple validation errors', () => {
      // Arrange
      const invalidData = {
        userId: 'invalid',
        courseId: -1
      };

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
        message: 'Course ID must be a positive integer'
      });
    });

    it('should accept large positive integers', () => {
      // Arrange
      const validData = {
        userId: 999999,
        courseId: 888888
      };

      // Act
      const result = CertificateValidator.validateIssueCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty object', () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });
  });

  describe('validateClaimCertificate', () => {
    it('should validate correct certificate claim data', () => {
      // Arrange
      const validData = {
        courseId: 1
      };

      // Act
      const result = CertificateValidator.validateClaimCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing courseId', () => {
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

    it('should reject null courseId', () => {
      // Arrange
      const invalidData = {
        courseId: null
      };

      // Act
      const result = CertificateValidator.validateClaimCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject undefined courseId', () => {
      // Arrange
      const invalidData = {
        courseId: undefined
      };

      // Act
      const result = CertificateValidator.validateClaimCertificate(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject non-integer courseId', () => {
      // Arrange
      const testCases = [
        { courseId: 'string' },
        { courseId: 1.5 },
        { courseId: true },
        { courseId: {} },
        { courseId: [] }
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

    it('should reject zero or negative courseId', () => {
      // Arrange
      const testCases = [
        { courseId: 0 },
        { courseId: -1 },
        { courseId: -100 }
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

    it('should accept large positive integers', () => {
      // Arrange
      const validData = {
        courseId: 999999
      };

      // Act
      const result = CertificateValidator.validateClaimCertificate(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateCertificateCode', () => {
    it('should validate correct certificate code format', () => {
      // Arrange
      const validCodes = [
        'CERT-ABC123-DEF456',
        'CERT-XYZ789-GHI012',
        'CERT-123456-789012',
        'CERT-ABCDEF-123456',
        'CERT-A1B2C3-D4E5F6',
        'cert-abc123-def456', // lowercase should be valid
        'Cert-AbC123-DeF456'  // mixed case should be valid
      ];

      validCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should reject missing certificate code', () => {
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

    it('should reject non-string certificate code', () => {
      // Arrange
      const testCases = [123, true, {}, [], 1.5];

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

    it('should reject certificate codes that are too short', () => {
      // Arrange
      const shortCodes = [
        'CERT-ABC',
        'C-A-B',
        'SHORT',
        '123456789' // 9 characters, less than 10
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

    it('should reject certificate codes that are too long', () => {
      // Arrange
      const longCode = 'CERT-' + 'A'.repeat(100) + '-' + 'B'.repeat(100); // Over 100 characters

      // Act
      const result = CertificateValidator.validateCertificateCode(longCode);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    });

    it('should accept codes at boundary lengths', () => {
      // Arrange
      const boundaryCode10 = '1234567890'; // Exactly 10 characters
      const boundaryCode100 = 'CERT-' + 'A'.repeat(45) + '-' + 'B'.repeat(45); // Exactly 100 characters

      // Act
      const result10 = CertificateValidator.validateCertificateCode(boundaryCode10);
      const result100 = CertificateValidator.validateCertificateCode(boundaryCode100);

      // Assert
      expect(result10.isValid).toBe(true);
      expect(result100.isValid).toBe(true);
    });

    it('should handle whitespace in certificate codes', () => {
      // Arrange
      const codesWithWhitespace = [
        ' CERT-ABC123-DEF456',
        'CERT-ABC123-DEF456 ',
        ' CERT-ABC123-DEF456 ',
        'CERT ABC123 DEF456',
        'CERT-ABC 123-DEF456'
      ];

      codesWithWhitespace.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        // These should be valid as the validator only checks length and type
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle special characters in certificate codes', () => {
      // Arrange
      const codesWithSpecialChars = [
        'CERT-ABC123-DEF456!',
        'CERT@ABC123#DEF456',
        'CERT-ABC123_DEF456',
        'CERT.ABC123.DEF456'
      ];

      codesWithSpecialChars.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        // These should be valid as the validator only checks length and type
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle unicode characters in certificate codes', () => {
      // Arrange
      const unicodeCodes = [
        'CERT-ABC123-DEF456é',
        'CERT-ABC123-DEF456中',
        'CERT-ABC123-DEF456🎓'
      ];

      unicodeCodes.forEach(code => {
        // Act
        const result = CertificateValidator.validateCertificateCode(code);

        // Assert
        // These should be valid as the validator only checks length and type
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle null input objects gracefully', () => {
      // Act & Assert
      expect(() => CertificateValidator.validateIssueCertificate(null)).not.toThrow();
      expect(() => CertificateValidator.validateClaimCertificate(null)).not.toThrow();
      expect(() => CertificateValidator.validateCertificateCode(null)).not.toThrow();
    });

    it('should handle undefined input objects gracefully', () => {
      // Act & Assert
      expect(() => CertificateValidator.validateIssueCertificate(undefined)).not.toThrow();
      expect(() => CertificateValidator.validateClaimCertificate(undefined)).not.toThrow();
      expect(() => CertificateValidator.validateCertificateCode(undefined)).not.toThrow();
    });

    it('should return consistent ValidationResult structure', () => {
      // Arrange
      const validData = { userId: 1, courseId: 1 };
      const invalidData = { userId: 'invalid', courseId: null };

      // Act
      const validResult = CertificateValidator.validateIssueCertificate(validData);
      const invalidResult = CertificateValidator.validateIssueCertificate(invalidData);

      // Assert
      expect(validResult).toHaveProperty('isValid');
      expect(validResult).toHaveProperty('errors');
      expect(Array.isArray(validResult.errors)).toBe(true);

      expect(invalidResult).toHaveProperty('isValid');
      expect(invalidResult).toHaveProperty('errors');
      expect(Array.isArray(invalidResult.errors)).toBe(true);

      // Check error structure
      invalidResult.errors.forEach(error => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
      });
    });

    it('should validate complete certificate workflow data', () => {
      // Arrange - Simulate complete workflow
      const issueData = { userId: 1, courseId: 1 };
      const claimData = { courseId: 1 };
      const verifyCode = 'CERT-ABC123-DEF456';

      // Act
      const issueResult = CertificateValidator.validateIssueCertificate(issueData);
      const claimResult = CertificateValidator.validateClaimCertificate(claimData);
      const verifyResult = CertificateValidator.validateCertificateCode(verifyCode);

      // Assert
      expect(issueResult.isValid).toBe(true);
      expect(claimResult.isValid).toBe(true);
      expect(verifyResult.isValid).toBe(true);
    });

    it('should handle mixed valid and invalid data in workflow', () => {
      // Arrange
      const validIssueData = { userId: 1, courseId: 1 };
      const invalidClaimData = { courseId: 'invalid' };
      const invalidCode = 'SHORT';

      // Act
      const issueResult = CertificateValidator.validateIssueCertificate(validIssueData);
      const claimResult = CertificateValidator.validateClaimCertificate(invalidClaimData);
      const verifyResult = CertificateValidator.validateCertificateCode(invalidCode);

      // Assert
      expect(issueResult.isValid).toBe(true);
      expect(claimResult.isValid).toBe(false);
      expect(verifyResult.isValid).toBe(false);

      expect(claimResult.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
      expect(verifyResult.errors).toContainEqual({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    });

    it('should maintain error message consistency', () => {
      // Arrange
      const testCases = [
        { data: { userId: null, courseId: 1 }, expectedField: 'userId', expectedMessage: 'User ID is required' },
        { data: { userId: 1, courseId: null }, expectedField: 'courseId', expectedMessage: 'Course ID is required' },
        { data: { userId: 'invalid', courseId: 1 }, expectedField: 'userId', expectedMessage: 'User ID must be a positive integer' },
        { data: { userId: 1, courseId: 'invalid' }, expectedField: 'courseId', expectedMessage: 'Course ID must be a positive integer' }
      ];

      testCases.forEach(testCase => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(testCase.data);

        // Assert
        expect(result.errors).toContainEqual({
          field: testCase.expectedField,
          message: testCase.expectedMessage
        });
      });
    });

    it('should handle extreme values correctly', () => {
      // Arrange
      const extremeValues = [
        { userId: Number.MAX_SAFE_INTEGER, courseId: Number.MAX_SAFE_INTEGER },
        { userId: 1, courseId: Number.MAX_SAFE_INTEGER },
        { userId: Number.MAX_SAFE_INTEGER, courseId: 1 }
      ];

      extremeValues.forEach(data => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should reject floating point numbers that are not integers', () => {
      // Arrange
      const floatingPointData = [
        { userId: 1.1, courseId: 1 },
        { userId: 1, courseId: 2.5 },
        { userId: 1.999, courseId: 2.001 }
      ];

      floatingPointData.forEach(data => {
        // Act
        const result = CertificateValidator.validateIssueCertificate(data);

        // Assert
        expect(result.isValid).toBe(false);
      });
    });
  });
});
