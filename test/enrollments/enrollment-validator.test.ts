import { EnrollmentValidator } from '../../src/utils/validation';

describe('EnrollmentValidator', () => {
  describe('validateCreateEnrollment', () => {
    it('should validate valid enrollment data', () => {
      const validData = {
        courseId: 1
      };

      const result = EnrollmentValidator.validateCreateEnrollment(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing courseId', () => {
      const invalidData = {};

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject null courseId', () => {
      const invalidData = {
        courseId: null
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject non-integer courseId', () => {
      const invalidData = {
        courseId: 'not-a-number'
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject float courseId', () => {
      const invalidData = {
        courseId: 1.5
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject zero courseId', () => {
      const invalidData = {
        courseId: 0
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject negative courseId', () => {
      const invalidData = {
        courseId: -1
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should accept large positive integers', () => {
      const validData = {
        courseId: 999999
      };

      const result = EnrollmentValidator.validateCreateEnrollment(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateStatusUpdate', () => {
    it('should validate valid status updates', () => {
      const validStatuses = ['active', 'completed', 'refunded'];

      validStatuses.forEach(status => {
        const data = { status };
        const result = EnrollmentValidator.validateStatusUpdate(data);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject missing status', () => {
      const invalidData = {};

      const result = EnrollmentValidator.validateStatusUpdate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status is required'
      });
    });

    it('should reject null status', () => {
      const invalidData = {
        status: null
      };

      const result = EnrollmentValidator.validateStatusUpdate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status is required'
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['invalid', 'pending', 'cancelled', '', 123, true];

      invalidStatuses.forEach(status => {
        const data = { status };
        const result = EnrollmentValidator.validateStatusUpdate(data);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual({
          field: 'status',
          message: 'Status must be one of: active, completed, refunded'
        });
      });
    });

    it('should be case-sensitive for status values', () => {
      const invalidStatuses = ['Active', 'COMPLETED', 'Refunded'];

      invalidStatuses.forEach(status => {
        const data = { status };
        const result = EnrollmentValidator.validateStatusUpdate(data);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toEqual({
          field: 'status',
          message: 'Status must be one of: active, completed, refunded'
        });
      });
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = EnrollmentValidator.validatePagination({});

      expect(result).toEqual({
        page: 1,
        limit: 10
      });
    });

    it('should parse valid page and limit', () => {
      const query = {
        page: '2',
        limit: '20'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 20
      });
    });

    it('should use default for invalid page', () => {
      const invalidPages = ['invalid', '0', '-1', '1.5', null, undefined];

      invalidPages.forEach(page => {
        const query = { page, limit: '10' };
        const result = EnrollmentValidator.validatePagination(query);

        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });
    });

    it('should use default for invalid limit', () => {
      const invalidLimits = ['invalid', '0', '-1', '1.5', '101', null, undefined];

      invalidLimits.forEach(limit => {
        const query = { page: '1', limit };
        const result = EnrollmentValidator.validatePagination(query);

        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });
    });

    it('should enforce maximum limit of 100', () => {
      const query = {
        page: '1',
        limit: '150'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 10
      });
    });

    it('should handle edge case values', () => {
      const query = {
        page: '1',
        limit: '100'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 100
      });
    });

    it('should handle large page numbers', () => {
      const query = {
        page: '999999',
        limit: '50'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 999999,
        limit: 50
      });
    });

    it('should ignore extra properties', () => {
      const query = {
        page: '2',
        limit: '20',
        extraProperty: 'ignored'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 20
      });
    });
  });
});
