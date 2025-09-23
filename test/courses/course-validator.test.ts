/**
 * Tests for CourseValidator
 * 
 * Tests validation logic for course creation, updates, price normalization,
 * pagination, and search sanitization.
 */

import { CourseValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate valid course data', () => {
      // Arrange
      const validData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 2999,
        instructor_id: 1
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate course data without optional fields', () => {
      // Arrange
      const validData = {
        title: 'Test Course',
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title field', () => {
      // Arrange
      const invalidData = {
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject non-string title', () => {
      // Arrange
      const invalidData = {
        title: 123,
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      // Arrange
      const invalidData = {
        title: '   ',
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      // Arrange
      const invalidData = {
        title: 'a'.repeat(256),
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title with exactly 255 characters', () => {
      // Arrange
      const validData = {
        title: 'a'.repeat(255),
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject non-string description', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        description: 123,
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should accept null description', () => {
      // Arrange
      const validData = {
        title: 'Test Course',
        description: null,
        price_cents: 2999
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should require price_cents field', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course'
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should reject null price_cents', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: null
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should reject invalid price_cents', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: 'invalid'
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should reject negative price_cents', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: -100
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept zero price_cents', () => {
      // Arrange
      const validData = {
        title: 'Free Course',
        price_cents: 0
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid instructor_id', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: 2999,
        instructor_id: 'invalid'
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should reject zero instructor_id', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: 2999,
        instructor_id: 0
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should reject negative instructor_id', () => {
      // Arrange
      const invalidData = {
        title: 'Test Course',
        price_cents: 2999,
        instructor_id: -1
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should accept null instructor_id', () => {
      // Arrange
      const validData = {
        title: 'Test Course',
        price_cents: 2999,
        instructor_id: null
      };

      // Act
      const result = CourseValidator.validateCreateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      // Arrange
      const invalidData = {
        title: '',
        description: 123,
        price_cents: -100,
        instructor_id: 'invalid'
      };

      // Act
      const result = CourseValidator.validateCreateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });

  describe('validateUpdateCourse', () => {
    it('should validate valid update data', () => {
      // Arrange
      const validData = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 3999,
        instructor_id: 2
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty update data', () => {
      // Arrange
      const validData = {};

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update data', () => {
      // Arrange
      const validData = {
        title: 'Updated Title Only'
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid title in update', () => {
      // Arrange
      const invalidData = {
        title: 123
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be a string'
      });
    });

    it('should reject empty title in update', () => {
      // Arrange
      const invalidData = {
        title: '   '
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters in update', () => {
      // Arrange
      const invalidData = {
        title: 'a'.repeat(256)
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept null description in update', () => {
      // Arrange
      const validData = {
        description: null
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject non-string description in update', () => {
      // Arrange
      const invalidData = {
        description: 123
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should reject invalid price_cents in update', () => {
      // Arrange
      const invalidData = {
        price_cents: 'invalid'
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should reject negative price_cents in update', () => {
      // Arrange
      const invalidData = {
        price_cents: -100
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept null price_cents in update', () => {
      // Arrange
      const validData = {
        price_cents: null
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid instructor_id in update', () => {
      // Arrange
      const invalidData = {
        instructor_id: 'invalid'
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should accept null instructor_id in update', () => {
      // Arrange
      const validData = {
        instructor_id: null
      };

      // Act
      const result = CourseValidator.validateUpdateCourse(validData);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  describe('normalizePrice', () => {
    it('should convert dollar amount to cents', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(29.99)).toBe(2999);
      expect(CourseValidator.normalizePrice(19.95)).toBe(1995);
      expect(CourseValidator.normalizePrice(0.99)).toBe(99);
      expect(CourseValidator.normalizePrice(100.00)).toBe(100);
    });

    it('should handle integer cents values', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(2999)).toBe(2999);
      expect(CourseValidator.normalizePrice(0)).toBe(0);
      expect(CourseValidator.normalizePrice(1)).toBe(1);
    });

    it('should convert string dollar amounts to cents', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice('29.99')).toBe(2999);
      expect(CourseValidator.normalizePrice('19.95')).toBe(1995);
      expect(CourseValidator.normalizePrice('0.99')).toBe(99);
    });

    it('should handle string integer values', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice('2999')).toBe(2999);
      expect(CourseValidator.normalizePrice('0')).toBe(0);
      expect(CourseValidator.normalizePrice('1')).toBe(1);
    });

    it('should handle edge cases with rounding', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(29.999)).toBe(3000); // Rounds up
      expect(CourseValidator.normalizePrice(29.991)).toBe(2999); // Rounds down
      expect(CourseValidator.normalizePrice(0.001)).toBe(0); // Rounds to 0
    });

    it('should return null for invalid inputs', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice('invalid')).toBeNull();
      expect(CourseValidator.normalizePrice('')).toBeNull();
      expect(CourseValidator.normalizePrice(null)).toBeNull();
      expect(CourseValidator.normalizePrice(undefined)).toBeNull();
      expect(CourseValidator.normalizePrice({})).toBeNull();
      expect(CourseValidator.normalizePrice([])).toBeNull();
    });

    it('should return null for NaN and Infinity', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(NaN)).toBeNull();
      expect(CourseValidator.normalizePrice(Infinity)).toBeNull();
      expect(CourseValidator.normalizePrice(-Infinity)).toBeNull();
    });

    it('should handle negative numbers', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(-29.99)).toBe(-2999);
      expect(CourseValidator.normalizePrice(-100)).toBe(-100);
      expect(CourseValidator.normalizePrice('-19.95')).toBe(-1995);
    });

    it('should handle very large numbers', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(999999.99)).toBe(99999999);
      expect(CourseValidator.normalizePrice('999999.99')).toBe(99999999);
    });

    it('should handle zero values', () => {
      // Act & Assert
      expect(CourseValidator.normalizePrice(0)).toBe(0);
      expect(CourseValidator.normalizePrice(0.0)).toBe(0);
      expect(CourseValidator.normalizePrice('0')).toBe(0);
      expect(CourseValidator.normalizePrice('0.00')).toBe(0);
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      // Act
      const result = CourseValidator.validatePagination({});

      // Assert
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      // Arrange
      const query = { page: '2', limit: '20' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should use default page for invalid page', () => {
      // Arrange
      const query = { page: 'invalid', limit: '20' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default page for zero page', () => {
      // Arrange
      const query = { page: '0', limit: '20' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default page for negative page', () => {
      // Arrange
      const query = { page: '-1', limit: '20' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should use default limit for invalid limit', () => {
      // Arrange
      const query = { page: '2', limit: 'invalid' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should use default limit for zero limit', () => {
      // Arrange
      const query = { page: '2', limit: '0' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should use default limit for negative limit', () => {
      // Arrange
      const query = { page: '2', limit: '-5' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 2, limit: 10 });
    });

    it('should cap limit at 100', () => {
      // Arrange
      const query = { page: '1', limit: '150' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 10 }); // Uses default when over 100
    });

    it('should accept limit of exactly 100', () => {
      // Arrange
      const query = { page: '1', limit: '100' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 100 });
    });

    it('should handle numeric values instead of strings', () => {
      // Arrange
      const query = { page: 3, limit: 25 };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 3, limit: 25 });
    });

    it('should handle mixed valid and invalid values', () => {
      // Arrange
      const query = { page: '5', limit: 'invalid' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 5, limit: 10 });
    });

    it('should handle boundary values', () => {
      // Arrange
      const query = { page: '1', limit: '1' };

      // Act
      const result = CourseValidator.validatePagination(query);

      // Assert
      expect(result).toEqual({ page: 1, limit: 1 });
    });
  });

  describe('sanitizeSearch', () => {
    it('should return trimmed string for valid search', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch('javascript')).toBe('javascript');
      expect(CourseValidator.sanitizeSearch('  react  ')).toBe('react');
      expect(CourseValidator.sanitizeSearch('node.js')).toBe('node.js');
    });

    it('should return undefined for empty string', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch('')).toBeUndefined();
      expect(CourseValidator.sanitizeSearch('   ')).toBeUndefined();
      expect(CourseValidator.sanitizeSearch('\t\n')).toBeUndefined();
    });

    it('should return undefined for non-string values', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch({})).toBeUndefined();
      expect(CourseValidator.sanitizeSearch([])).toBeUndefined();
    });

    it('should handle special characters', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch('C++')).toBe('C++');
      expect(CourseValidator.sanitizeSearch('ASP.NET')).toBe('ASP.NET');
      expect(CourseValidator.sanitizeSearch('React & Redux')).toBe('React & Redux');
    });

    it('should handle unicode characters', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch('Programación')).toBe('Programación');
      expect(CourseValidator.sanitizeSearch('编程')).toBe('编程');
      expect(CourseValidator.sanitizeSearch('🚀 JavaScript')).toBe('🚀 JavaScript');
    });

    it('should handle very long search terms', () => {
      // Arrange
      const longSearch = 'a'.repeat(1000);

      // Act
      const result = CourseValidator.sanitizeSearch(longSearch);

      // Assert
      expect(result).toBe(longSearch);
    });

    it('should preserve internal whitespace', () => {
      // Act & Assert
      expect(CourseValidator.sanitizeSearch('  web development  ')).toBe('web development');
      expect(CourseValidator.sanitizeSearch('machine learning algorithms')).toBe('machine learning algorithms');
    });
  });
});
