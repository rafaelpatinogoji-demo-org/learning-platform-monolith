import { describe, it, expect } from '@jest/globals';
import { CourseValidator } from '../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate valid course data', () => {
      const validData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        instructor_id: 1
      };

      const result = CourseValidator.validateCreateCourse(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const invalidData = { price_cents: 1999 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      const invalidData = { title: '  ', price_cents: 1999 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      const invalidData = { title: 'a'.repeat(256), price_cents: 1999 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should reject invalid description type', () => {
      const invalidData = { title: 'Test', price_cents: 1999, description: 123 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should reject missing price', () => {
      const invalidData = { title: 'Test Course' };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should reject negative price', () => {
      const invalidData = { title: 'Test Course', price_cents: -100 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should reject invalid instructor_id', () => {
      const invalidData = { title: 'Test', price_cents: 1999, instructor_id: -1 };
      const result = CourseValidator.validateCreateCourse(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should accept valid course with optional fields', () => {
      const validData = {
        title: 'Test Course',
        price_cents: 1999
      };

      const result = CourseValidator.validateCreateCourse(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUpdateCourse', () => {
    it('should validate empty update data', () => {
      const result = CourseValidator.validateUpdateCourse({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update data', () => {
      const updateData = { title: 'Updated Course' };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid title type', () => {
      const updateData = { title: 123 };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be a string'
      });
    });

    it('should reject empty title string', () => {
      const updateData = { title: '  ' };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      const updateData = { title: 'a'.repeat(256) };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should reject invalid description type', () => {
      const updateData = { description: 123 };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should reject negative price', () => {
      const updateData = { price_cents: -100 };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should reject invalid instructor_id', () => {
      const updateData = { instructor_id: 0 };
      const result = CourseValidator.validateUpdateCourse(updateData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });
  });

  describe('normalizePrice', () => {
    it('should handle dollar amounts with decimals', () => {
      expect(CourseValidator.normalizePrice(19.99)).toBe(1999);
      expect(CourseValidator.normalizePrice('19.99')).toBe(1999);
    });

    it('should handle whole numbers as cents', () => {
      expect(CourseValidator.normalizePrice(1999)).toBe(1999);
      expect(CourseValidator.normalizePrice('1999')).toBe(1999);
    });

    it('should round properly', () => {
      expect(CourseValidator.normalizePrice(19.995)).toBe(2000);
      expect(CourseValidator.normalizePrice('19.995')).toBe(2000);
    });

    it('should return null for invalid input', () => {
      expect(CourseValidator.normalizePrice('invalid')).toBe(null);
      expect(CourseValidator.normalizePrice(null)).toBe(null);
      expect(CourseValidator.normalizePrice(NaN)).toBe(null);
      expect(CourseValidator.normalizePrice(Infinity)).toBe(null);
      expect(CourseValidator.normalizePrice(undefined)).toBe(null);
    });

    it('should handle zero', () => {
      expect(CourseValidator.normalizePrice(0)).toBe(0);
      expect(CourseValidator.normalizePrice('0')).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(CourseValidator.normalizePrice(999.99)).toBe(99999);
      expect(CourseValidator.normalizePrice('999.99')).toBe(99999);
    });
  });

  describe('validatePagination', () => {
    it('should return defaults for empty query', () => {
      const result = CourseValidator.validatePagination({});
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid pagination params', () => {
      const result = CourseValidator.validatePagination({ page: '2', limit: '20' });
      expect(result).toEqual({ page: 2, limit: 20 });
    });

    it('should cap limit at 100', () => {
      const result = CourseValidator.validatePagination({ limit: '200' });
      expect(result.limit).toBe(10);
    });

    it('should ignore negative page numbers', () => {
      const result = CourseValidator.validatePagination({ page: '-1' });
      expect(result.page).toBe(1);
    });

    it('should ignore zero page numbers', () => {
      const result = CourseValidator.validatePagination({ page: '0' });
      expect(result.page).toBe(1);
    });

    it('should ignore negative limits', () => {
      const result = CourseValidator.validatePagination({ limit: '-10' });
      expect(result.limit).toBe(10);
    });

    it('should ignore zero limits', () => {
      const result = CourseValidator.validatePagination({ limit: '0' });
      expect(result.limit).toBe(10);
    });

    it('should ignore invalid page strings', () => {
      const result = CourseValidator.validatePagination({ page: 'invalid' });
      expect(result.page).toBe(1);
    });

    it('should ignore invalid limit strings', () => {
      const result = CourseValidator.validatePagination({ limit: 'invalid' });
      expect(result.limit).toBe(10);
    });
  });

  describe('sanitizeSearch', () => {
    it('should trim and return valid search string', () => {
      expect(CourseValidator.sanitizeSearch('  test query  ')).toBe('test query');
    });

    it('should return undefined for empty string', () => {
      expect(CourseValidator.sanitizeSearch('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(CourseValidator.sanitizeSearch('  ')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
    });

    it('should return undefined for non-string types', () => {
      expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
      expect(CourseValidator.sanitizeSearch({})).toBeUndefined();
      expect(CourseValidator.sanitizeSearch([])).toBeUndefined();
    });

    it('should preserve valid search strings', () => {
      expect(CourseValidator.sanitizeSearch('javascript')).toBe('javascript');
      expect(CourseValidator.sanitizeSearch('web development')).toBe('web development');
    });
  });
});
