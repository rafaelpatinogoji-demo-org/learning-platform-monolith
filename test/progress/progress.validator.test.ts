/**
 * Tests for ProgressValidator
 * 
 * Tests validation logic for progress-related data without any database dependencies.
 */

import { ProgressValidator } from '../../src/utils/validation';

describe('ProgressValidator', () => {
  describe('validateMarkProgress', () => {
    it('should validate valid progress data', () => {
      const result = ProgressValidator.validateMarkProgress({
        enrollmentId: 1,
        lessonId: 2,
        completed: true
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid progress data with completed false', () => {
      const result = ProgressValidator.validateMarkProgress({
        enrollmentId: 5,
        lessonId: 10,
        completed: false
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('enrollmentId validation', () => {
      it('should reject missing enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject null enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: null,
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject zero enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 0,
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject negative enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: -1,
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });

      it('should reject non-integer enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1.5,
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });

      it('should reject string enrollmentId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: '1',
          lessonId: 2,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });
    });

    describe('lessonId validation', () => {
      it('should reject missing lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject null lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: null,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject zero lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 0,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject negative lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: -5,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });

      it('should reject non-integer lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2.7,
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });

      it('should reject string lessonId', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 'lesson-1',
          completed: true
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });
    });

    describe('completed validation', () => {
      it('should reject missing completed field', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject null completed field', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2,
          completed: null
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject undefined completed field', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2,
          completed: undefined
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject string completed field', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2,
          completed: 'true'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed must be a boolean value'
        });
      });

      it('should reject number completed field', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: 1,
          lessonId: 2,
          completed: 1
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed must be a boolean value'
        });
      });
    });

    describe('multiple validation errors', () => {
      it('should return multiple errors for invalid data', () => {
        const result = ProgressValidator.validateMarkProgress({
          enrollmentId: -1,
          lessonId: 'invalid',
          completed: 'not-boolean'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed must be a boolean value'
        });
      });

      it('should return all missing field errors', () => {
        const result = ProgressValidator.validateMarkProgress({});
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });
    });
  });

  describe('validateCourseIdQuery', () => {
    it('should validate valid courseId query parameter', () => {
      const result = ProgressValidator.validateCourseIdQuery({
        courseId: '1'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid courseId with large number', () => {
      const result = ProgressValidator.validateCourseIdQuery({
        courseId: '999999'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('courseId validation', () => {
      it('should reject missing courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({});
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required in query parameters'
        });
      });

      it('should reject null courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: null
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required in query parameters'
        });
      });

      it('should reject undefined courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: undefined
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required in query parameters'
        });
      });

      it('should reject empty string courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: ''
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required in query parameters'
        });
      });

      it('should reject zero courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: '0'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });

      it('should reject negative courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: '-1'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });

      it('should reject non-numeric courseId', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: 'not-a-number'
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });

      it('should accept decimal courseId (parseInt behavior)', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: '1.5'
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept courseId with extra characters (parseInt behavior)', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: '1abc'
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should handle query object with other parameters', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: '1',
          otherParam: 'ignored'
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle numeric courseId (not string)', () => {
        const result = ProgressValidator.validateCourseIdQuery({
          courseId: 1
        });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
