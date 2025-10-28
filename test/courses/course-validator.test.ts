/**
 * Tests for CourseValidator
 * 
 * Tests validation methods for course creation, updates, pagination,
 * search sanitization, and price normalization.
 */

import { CourseValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate valid course data', () => {
      const validData = {
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript',
        price_cents: 9999
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate course with instructor_id', () => {
      const validData = {
        title: 'React Course',
        description: 'Learn React',
        price_cents: 19999,
        instructor_id: 5
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate course without description', () => {
      const validData = {
        title: 'Node.js Course',
        price_cents: 14999
      };

      const result = CourseValidator.validateCreateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('title validation', () => {
      it('should reject missing title', () => {
        const invalidData = {
          description: 'Course description',
          price_cents: 9999
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
          description: 'Course description',
          price_cents: 9999
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
          description: 'Course description',
          price_cents: 9999
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
          description: 'Course description',
          price_cents: 9999
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });
    });

    describe('description validation', () => {
      it('should accept null description', () => {
        const validData = {
          title: 'Course Title',
          description: null,
          price_cents: 9999
        };

        const result = CourseValidator.validateCreateCourse(validData);

        expect(result.isValid).toBe(true);
      });

      it('should reject non-string description', () => {
        const invalidData = {
          title: 'Course Title',
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

      it('should accept empty string description', () => {
        const validData = {
          title: 'Course Title',
          description: '',
          price_cents: 9999
        };

        const result = CourseValidator.validateCreateCourse(validData);

        expect(result.isValid).toBe(true);
      });
    });

    describe('price validation', () => {
      it('should reject missing price', () => {
        const invalidData = {
          title: 'Course Title',
          description: 'Course description'
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price is required'
        });
      });

      it('should reject null price', () => {
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
          price_cents: null
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price is required'
        });
      });

      it('should reject negative price', () => {
        jest.spyOn(CourseValidator, 'normalizePrice').mockReturnValue(-100);
        
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
          price_cents: -100
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price cannot be negative'
        });

        jest.restoreAllMocks();
      });

      it('should reject invalid price format', () => {
        jest.spyOn(CourseValidator, 'normalizePrice').mockReturnValue(null);
        
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
          price_cents: 'invalid'
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price must be a valid number'
        });

        jest.restoreAllMocks();
      });
    });

    describe('instructor_id validation', () => {
      it('should accept valid instructor_id', () => {
        const validData = {
          title: 'Course Title',
          description: 'Course description',
          price_cents: 9999,
          instructor_id: 5
        };

        const result = CourseValidator.validateCreateCourse(validData);

        expect(result.isValid).toBe(true);
      });

      it('should reject non-integer instructor_id', () => {
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
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

      it('should reject negative instructor_id', () => {
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
          price_cents: 9999,
          instructor_id: -1
        };

        const result = CourseValidator.validateCreateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'instructor_id',
          message: 'Instructor ID must be a positive integer'
        });
      });

      it('should reject zero instructor_id', () => {
        const invalidData = {
          title: 'Course Title',
          description: 'Course description',
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

    it('should return multiple errors for multiple invalid fields', () => {
      const invalidData = {
        title: '',
        description: 123,
        price_cents: null,
        instructor_id: -1
      };

      const result = CourseValidator.validateCreateCourse(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });

  describe('validateUpdateCourse', () => {
    it('should validate empty update data', () => {
      const result = CourseValidator.validateUpdateCourse({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update data', () => {
      const validData = {
        title: 'Updated Title'
      };

      const result = CourseValidator.validateUpdateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate all fields update', () => {
      const validData = {
        title: 'Updated Title',
        description: 'Updated description',
        price_cents: 19999,
        instructor_id: 3
      };

      const result = CourseValidator.validateUpdateCourse(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('title validation for updates', () => {
      it('should reject non-string title', () => {
        const invalidData = { title: 123 };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be a string'
        });
      });

      it('should reject empty title', () => {
        const invalidData = { title: '   ' };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should reject title longer than 255 characters', () => {
        const longTitle = 'a'.repeat(256);
        const invalidData = { title: longTitle };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });
    });

    describe('description validation for updates', () => {
      it('should accept null description', () => {
        const validData = { description: null };

        const result = CourseValidator.validateUpdateCourse(validData);

        expect(result.isValid).toBe(true);
      });

      it('should reject non-string description', () => {
        const invalidData = { description: 123 };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'description',
          message: 'Description must be a string'
        });
      });
    });

    describe('price validation for updates', () => {
      it('should accept null price_cents (no update)', () => {
        const validData = { price_cents: null };

        const result = CourseValidator.validateUpdateCourse(validData);

        expect(result.isValid).toBe(true);
      });

      it('should reject negative price', () => {
        jest.spyOn(CourseValidator, 'normalizePrice').mockReturnValue(-100);
        
        const invalidData = { price_cents: -100 };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price cannot be negative'
        });

        jest.restoreAllMocks();
      });

      it('should reject invalid price format', () => {
        jest.spyOn(CourseValidator, 'normalizePrice').mockReturnValue(null);
        
        const invalidData = { price_cents: 'invalid' };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price must be a valid number'
        });

        jest.restoreAllMocks();
      });
    });

    describe('instructor_id validation for updates', () => {
      it('should accept null instructor_id (no update)', () => {
        const validData = { instructor_id: null };

        const result = CourseValidator.validateUpdateCourse(validData);

        expect(result.isValid).toBe(true);
      });

      it('should reject invalid instructor_id', () => {
        const invalidData = { instructor_id: 'invalid' };

        const result = CourseValidator.validateUpdateCourse(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'instructor_id',
          message: 'Instructor ID must be a positive integer'
        });
      });
    });
  });

  describe('normalizePrice', () => {
    it('should handle integer cents', () => {
      expect(CourseValidator.normalizePrice(9999)).toBe(9999);
      expect(CourseValidator.normalizePrice(0)).toBe(0);
      expect(CourseValidator.normalizePrice(1)).toBe(1);
    });

    it('should convert dollar amounts to cents', () => {
      expect(CourseValidator.normalizePrice(99.99)).toBe(9999);
      expect(CourseValidator.normalizePrice(19.95)).toBe(1995);
      expect(CourseValidator.normalizePrice(0.99)).toBe(99);
    });

    it('should handle string numbers', () => {
      expect(CourseValidator.normalizePrice('9999')).toBe(9999);
      expect(CourseValidator.normalizePrice('99.99')).toBe(9999);
      expect(CourseValidator.normalizePrice('0')).toBe(0);
    });

    it('should handle edge cases with rounding', () => {
      expect(CourseValidator.normalizePrice(99.999)).toBe(10000);
      expect(CourseValidator.normalizePrice(99.994)).toBe(9999);
    });

    it('should return null for invalid inputs', () => {
      expect(CourseValidator.normalizePrice('invalid')).toBeNull();
      expect(CourseValidator.normalizePrice(NaN)).toBeNull();
      expect(CourseValidator.normalizePrice(Infinity)).toBeNull();
      expect(CourseValidator.normalizePrice(-Infinity)).toBeNull();
      expect(CourseValidator.normalizePrice(null)).toBeNull();
      expect(CourseValidator.normalizePrice(undefined)).toBeNull();
      expect(CourseValidator.normalizePrice({})).toBeNull();
      expect(CourseValidator.normalizePrice([])).toBeNull();
    });

    it('should handle negative numbers', () => {
      expect(CourseValidator.normalizePrice(-99.99)).toBe(-9999);
      expect(CourseValidator.normalizePrice(-1)).toBe(-1);
    });

    it('should handle very large numbers', () => {
      expect(CourseValidator.normalizePrice(999999.99)).toBe(99999999);
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = CourseValidator.validatePagination({});

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      const query = { page: '2', limit: '20' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should use default for invalid page', () => {
      const query = { page: 'invalid', limit: '20' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default for negative page', () => {
      const query = { page: '-1', limit: '20' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default for zero page', () => {
      const query = { page: '0', limit: '20' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default for invalid limit', () => {
      const query = { page: '2', limit: 'invalid' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should use default for negative limit', () => {
      const query = { page: '2', limit: '-5' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should use default for zero limit', () => {
      const query = { page: '2', limit: '0' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should cap limit at 100', () => {
      const query = { page: '1', limit: '150' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should accept limit of 100', () => {
      const query = { page: '1', limit: '100' };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 1, limit: 100 });
    });

    it('should handle numeric values instead of strings', () => {
      const query = { page: 3, limit: 25 };

      const result = CourseValidator.validatePagination(query);

      expect(result).toEqual({ page: 3, limit: 25 });
    });
  });

  describe('sanitizeSearch', () => {
    it('should return trimmed search string', () => {
      expect(CourseValidator.sanitizeSearch('  javascript  ')).toBe('javascript');
      expect(CourseValidator.sanitizeSearch('react')).toBe('react');
    });

    it('should return undefined for empty string', () => {
      expect(CourseValidator.sanitizeSearch('')).toBeUndefined();
      expect(CourseValidator.sanitizeSearch('   ')).toBeUndefined();
    });

    it('should return undefined for non-string values', () => {
      expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch({})).toBeUndefined();
      expect(CourseValidator.sanitizeSearch([])).toBeUndefined();
    });

    it('should handle special characters', () => {
      expect(CourseValidator.sanitizeSearch('node.js')).toBe('node.js');
      expect(CourseValidator.sanitizeSearch('C++')).toBe('C++');
      expect(CourseValidator.sanitizeSearch('React & Redux')).toBe('React & Redux');
    });

    it('should handle unicode characters', () => {
      expect(CourseValidator.sanitizeSearch('JavaScript 🚀')).toBe('JavaScript 🚀');
      expect(CourseValidator.sanitizeSearch('Programación')).toBe('Programación');
    });
  });
});
