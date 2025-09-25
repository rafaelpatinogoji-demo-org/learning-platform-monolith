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
      expect(result.errors).toContainEqual({
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
      expect(result.errors).toContainEqual({
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
      expect(result.errors).toContainEqual({
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
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should reject decimal courseId', () => {
      const invalidData = {
        courseId: 1.5
      };

      const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });
  });

  describe('validateStatusUpdate', () => {
    it('should validate valid status updates', () => {
      const validStatuses = ['active', 'completed', 'refunded'];

      validStatuses.forEach(status => {
        const result = EnrollmentValidator.validateStatusUpdate({ status });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject missing status', () => {
      const invalidData = {};

      const result = EnrollmentValidator.validateStatusUpdate(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status is required'
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['invalid', 'pending', 'cancelled'];

      invalidStatuses.forEach(status => {
        const result = EnrollmentValidator.validateStatusUpdate({ status });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'status',
          message: 'Status must be one of: active, completed, refunded'
        });
      });
    });

    it('should reject empty string status', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status is required'
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
      const query = {
        page: 'invalid',
        limit: '20'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should use default for negative page', () => {
      const query = {
        page: '-1',
        limit: '20'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should use default for zero page', () => {
      const query = {
        page: '0',
        limit: '20'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 1,
        limit: 20
      });
    });

    it('should use default for invalid limit', () => {
      const query = {
        page: '2',
        limit: 'invalid'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 10
      });
    });

    it('should use default for negative limit', () => {
      const query = {
        page: '2',
        limit: '-5'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 10
      });
    });

    it('should use default for zero limit', () => {
      const query = {
        page: '2',
        limit: '0'
      };

      const result = EnrollmentValidator.validatePagination(query);

      expect(result).toEqual({
        page: 2,
        limit: 10
      });
    });

    it('should cap limit at 100', () => {
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

    it('should allow limit of 100', () => {
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
  });
});
