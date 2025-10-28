import { EnrollmentValidator } from '../../src/utils/validation';

describe('EnrollmentValidator', () => {
  describe('validateCreateEnrollment', () => {
    it('should validate correct enrollment data', () => {
      const data = {
        courseId: 1,
      };

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing courseId', () => {
      const data = {};

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required',
      });
    });

    it('should reject null courseId', () => {
      const data = {
        courseId: null,
      };

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required',
      });
    });

    it('should reject negative courseId', () => {
      const data = {
        courseId: -1,
      };

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should reject zero courseId', () => {
      const data = {
        courseId: 0,
      };

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should reject non-integer courseId', () => {
      const data = {
        courseId: 3.5,
      };

      const result = EnrollmentValidator.validateCreateEnrollment(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });
  });

  describe('validateStatusUpdate', () => {
    it('should validate active status', () => {
      const data = {
        status: 'active',
      };

      const result = EnrollmentValidator.validateStatusUpdate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate completed status', () => {
      const data = {
        status: 'completed',
      };

      const result = EnrollmentValidator.validateStatusUpdate(data);

      expect(result.isValid).toBe(true);
    });

    it('should validate refunded status', () => {
      const data = {
        status: 'refunded',
      };

      const result = EnrollmentValidator.validateStatusUpdate(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject missing status', () => {
      const data = {};

      const result = EnrollmentValidator.validateStatusUpdate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status is required',
      });
    });

    it('should reject invalid status', () => {
      const data = {
        status: 'invalid',
      };

      const result = EnrollmentValidator.validateStatusUpdate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status must be one of: active, completed, refunded',
      });
    });
  });

  describe('validatePagination', () => {
    it('should return default pagination values', () => {
      const result = EnrollmentValidator.validatePagination({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should parse valid page and limit', () => {
      const result = EnrollmentValidator.validatePagination({
        page: '2',
        limit: '20',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should ignore invalid page', () => {
      const result = EnrollmentValidator.validatePagination({
        page: 'invalid',
      });

      expect(result.page).toBe(1);
    });

    it('should ignore negative page', () => {
      const result = EnrollmentValidator.validatePagination({
        page: '-1',
      });

      expect(result.page).toBe(1);
    });

    it('should cap limit at 100', () => {
      const result = EnrollmentValidator.validatePagination({
        limit: '200',
      });

      expect(result.limit).toBe(10);
    });

    it('should ignore negative limit', () => {
      const result = EnrollmentValidator.validatePagination({
        limit: '-10',
      });

      expect(result.limit).toBe(10);
    });
  });
});
