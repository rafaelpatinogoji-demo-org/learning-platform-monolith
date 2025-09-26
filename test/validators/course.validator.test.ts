import { CourseValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate valid course data', () => {
      const validData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        instructor_id: 1
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title', () => {
      const invalidData = {
        description: 'Test Description',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should validate title type', () => {
      const invalidData = {
        title: 123,
        description: 'Test Description',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should not allow empty title', () => {
      const invalidData = {
        title: '   ',
        description: 'Test Description',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should validate title length', () => {
      const invalidData = {
        title: 'a'.repeat(256),
        description: 'Test Description',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should allow optional description', () => {
      const validData = {
        title: 'Test Course',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
    });

    it('should validate description type when provided', () => {
      const invalidData = {
        title: 'Test Course',
        description: 123,
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should require price_cents', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test Description'
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should validate price_cents with normalizePrice', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 'invalid'
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should not allow negative price', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: -100
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should validate instructor_id when provided', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        instructor_id: 'invalid'
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should not allow zero or negative instructor_id', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        instructor_id: 0
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });
  });

  describe('validateUpdateCourse', () => {
    it('should validate valid update data', () => {
      const validData = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 19999
      };

      const result = CourseValidator.validateUpdateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty update data', () => {
      const result = CourseValidator.validateUpdateCourse({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate title when provided', () => {
      const invalidData = {
        title: '   '
      };

      const result = CourseValidator.validateUpdateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should validate description when provided', () => {
      const invalidData = {
        description: 123
      };

      const result = CourseValidator.validateUpdateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should validate price_cents when provided', () => {
      const invalidData = {
        price_cents: 'invalid'
      };

      const result = CourseValidator.validateUpdateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should validate instructor_id when provided', () => {
      const invalidData = {
        instructor_id: -1
      };

      const result = CourseValidator.validateUpdateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });
  });

  describe('normalizePrice', () => {
    it('should handle integer cents', () => {
      expect(CourseValidator.normalizePrice(9999)).toBe(9999);
    });

    it('should convert decimal dollars to cents', () => {
      expect(CourseValidator.normalizePrice(99.99)).toBe(9999);
    });

    it('should handle string numbers', () => {
      expect(CourseValidator.normalizePrice('99.99')).toBe(9999);
      expect(CourseValidator.normalizePrice('9999')).toBe(9999);
    });

    it('should handle edge cases with rounding', () => {
      expect(CourseValidator.normalizePrice(99.995)).toBe(10000);
      expect(CourseValidator.normalizePrice(99.994)).toBe(9999);
    });

    it('should return null for invalid inputs', () => {
      expect(CourseValidator.normalizePrice('invalid')).toBeNull();
      expect(CourseValidator.normalizePrice(NaN)).toBeNull();
      expect(CourseValidator.normalizePrice(Infinity)).toBeNull();
      expect(CourseValidator.normalizePrice(null)).toBeNull();
      expect(CourseValidator.normalizePrice(undefined)).toBeNull();
      expect(CourseValidator.normalizePrice({})).toBeNull();
    });

    it('should handle zero', () => {
      expect(CourseValidator.normalizePrice(0)).toBe(0);
      expect(CourseValidator.normalizePrice('0')).toBe(0);
      expect(CourseValidator.normalizePrice(0.0)).toBe(0);
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = CourseValidator.validatePagination({});

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      const result = CourseValidator.validatePagination({
        page: '2',
        limit: '20'
      });

      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should handle invalid page values', () => {
      const result = CourseValidator.validatePagination({
        page: 'invalid',
        limit: '20'
      });

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should handle zero or negative page', () => {
      const result = CourseValidator.validatePagination({
        page: '0',
        limit: '20'
      });

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should handle invalid limit values', () => {
      const result = CourseValidator.validatePagination({
        page: '2',
        limit: 'invalid'
      });

      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should enforce maximum limit', () => {
      const result = CourseValidator.validatePagination({
        page: '1',
        limit: '200'
      });

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should handle zero or negative limit', () => {
      const result = CourseValidator.validatePagination({
        page: '1',
        limit: '0'
      });

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should handle numeric inputs', () => {
      const result = CourseValidator.validatePagination({
        page: 3,
        limit: 50
      });

      expect(result).toEqual({ page: 3, limit: 50 });
    });
  });

  describe('sanitizeSearch', () => {
    it('should return trimmed search string', () => {
      const result = CourseValidator.sanitizeSearch('  test query  ');

      expect(result).toBe('test query');
    });

    it('should return undefined for empty string', () => {
      const result = CourseValidator.sanitizeSearch('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace only', () => {
      const result = CourseValidator.sanitizeSearch('   ');

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-string input', () => {
      expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch({})).toBeUndefined();
    });

    it('should handle valid search strings', () => {
      expect(CourseValidator.sanitizeSearch('javascript')).toBe('javascript');
      expect(CourseValidator.sanitizeSearch('React Course')).toBe('React Course');
    });
  });
});
