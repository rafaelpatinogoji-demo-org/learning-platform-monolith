import { describe, it, expect } from '@jest/globals';
import { EnrollmentValidator } from '../src/utils/validation';

describe('EnrollmentValidator', () => {
  describe('validateCreateEnrollment', () => {
    it('should return valid for correct courseId (positive integer)', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: 5 });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return error when courseId is missing', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required',
      });
    });

    it('should return error when courseId is null', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: null });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('courseId');
    });

    it('should return error when courseId is not a number', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: 'invalid' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should return error when courseId is zero', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: 0 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should return error when courseId is negative', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: -5 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should return error when courseId is a float', () => {
      const result = EnrollmentValidator.validateCreateEnrollment({ courseId: 5.5 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });
  });

  describe('validateStatusUpdate', () => {
    it('should return valid for active status', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: 'active' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for completed status', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: 'completed' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for refunded status', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: 'refunded' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return error when status is missing', () => {
      const result = EnrollmentValidator.validateStatusUpdate({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status is required',
      });
    });

    it('should return error when status is null', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: null });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status is required',
      });
    });

    it('should return error when status is invalid string', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: 'invalid' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status must be one of: active, completed, refunded',
      });
    });

    it('should return error when status is empty string', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: '' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'status',
        message: 'Status is required',
      });
    });

    it('should return error when status is not a string', () => {
      const result = EnrollmentValidator.validateStatusUpdate({ status: 123 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('status');
    });
  });

  describe('validatePagination', () => {
    it('should return default values (page=1, limit=10) for empty query', () => {
      const result = EnrollmentValidator.validatePagination({});

      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should correctly parse valid page and limit', () => {
      const result = EnrollmentValidator.validatePagination({ page: '3', limit: '20' });

      expect(result).toEqual({ page: 3, limit: 20 });
    });

    it('should use default for invalid page', () => {
      const result = EnrollmentValidator.validatePagination({ page: 'invalid', limit: '10' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should use default for invalid limit', () => {
      const result = EnrollmentValidator.validatePagination({ page: '2', limit: 'invalid' });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should enforce maximum limit of 100', () => {
      const result = EnrollmentValidator.validatePagination({ page: '1', limit: '150' });

      expect(result.limit).toBe(10);
    });

    it('should enforce maximum limit of 100 when exactly 100', () => {
      const result = EnrollmentValidator.validatePagination({ page: '1', limit: '100' });

      expect(result.limit).toBe(100);
    });

    it('should use default for zero page', () => {
      const result = EnrollmentValidator.validatePagination({ page: '0', limit: '10' });

      expect(result.page).toBe(1);
    });

    it('should use default for negative page', () => {
      const result = EnrollmentValidator.validatePagination({ page: '-1', limit: '10' });

      expect(result.page).toBe(1);
    });

    it('should use default for zero limit', () => {
      const result = EnrollmentValidator.validatePagination({ page: '1', limit: '0' });

      expect(result.limit).toBe(10);
    });

    it('should use default for negative limit', () => {
      const result = EnrollmentValidator.validatePagination({ page: '1', limit: '-5' });

      expect(result.limit).toBe(10);
    });

    it('should handle numeric values instead of strings', () => {
      const result = EnrollmentValidator.validatePagination({ page: 5, limit: 25 });

      expect(result).toEqual({ page: 5, limit: 25 });
    });
  });
});
