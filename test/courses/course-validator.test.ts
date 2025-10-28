/**
 * Tests for CourseValidator
 * 
 * Unit tests for course validation methods without external dependencies
 */

import { CourseValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate valid course creation data', () => {
      const validData = {
        title: 'Introduction to JavaScript',
        description: 'Learn the basics of JavaScript programming',
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title field', () => {
      const invalidData = {
        description: 'Test description',
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject non-string title', () => {
      const invalidData = {
        title: 123,
        description: 'Test description',
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '   ',
        description: 'Test description',
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      const longTitle = 'a'.repeat(256);
      const invalidData = {
        title: longTitle,
        description: 'Test description',
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept null description', () => {
      const validData = {
        title: 'Test Course',
        description: null,
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string description', () => {
      const invalidData = {
        title: 'Test Course',
        description: 123,
        price_cents: 2999
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should require price_cents field', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test description'
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should reject negative price', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: -100
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept valid instructor_id', () => {
      const validData = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: 2999,
        instructor_id: 5
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid instructor_id', () => {
      const invalidData = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: 2999,
        instructor_id: -1
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
    it('should validate empty update data', () => {
      const result = CourseValidator.validateUpdateCourse({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update with title', () => {
      const updateData = {
        title: 'Updated Course Title'
      };

      const result = CourseValidator.validateUpdateCourse(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title in update', () => {
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

    it('should validate partial update with price', () => {
      const updateData = {
        price_cents: 3999
      };

      const result = CourseValidator.validateUpdateCourse(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative price in update', () => {
      const invalidData = {
        price_cents: -500
      };

      const result = CourseValidator.validateUpdateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });
  });

  describe('normalizePrice', () => {
    it('should normalize integer price', () => {
      const result = CourseValidator.normalizePrice(2999);
      expect(result).toBe(2999);
    });

    it('should normalize string price', () => {
      const result = CourseValidator.normalizePrice('2999');
      expect(result).toBe(2999);
    });

    it('should normalize float price by converting to cents', () => {
      const result = CourseValidator.normalizePrice(29.99);
      expect(result).toBe(2999);
    });

    it('should return null for invalid price', () => {
      const result = CourseValidator.normalizePrice('invalid');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = CourseValidator.normalizePrice(null);
      expect(result).toBeNull();
    });
  });

  describe('validatePagination', () => {
    it('should return default pagination for empty query', () => {
      const result = CourseValidator.validatePagination({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should parse valid page and limit', () => {
      const query = { page: '2', limit: '20' };
      const result = CourseValidator.validatePagination(query);
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should use default for invalid page', () => {
      const query = { page: 'invalid', limit: '20' };
      const result = CourseValidator.validatePagination(query);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should use default limit for values over 100', () => {
      const query = { page: '1', limit: '200' };
      const result = CourseValidator.validatePagination(query);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should use default for negative values', () => {
      const query = { page: '-1', limit: '-5' };
      const result = CourseValidator.validatePagination(query);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('sanitizeSearch', () => {
    it('should return undefined for undefined input', () => {
      const result = CourseValidator.sanitizeSearch(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = CourseValidator.sanitizeSearch('');
      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      const result = CourseValidator.sanitizeSearch('   ');
      expect(result).toBeUndefined();
    });

    it('should trim and return non-empty string', () => {
      const result = CourseValidator.sanitizeSearch('  javascript  ');
      expect(result).toBe('javascript');
    });

    it('should return string as-is if already clean', () => {
      const result = CourseValidator.sanitizeSearch('react course');
      expect(result).toBe('react course');
    });
  });
});
