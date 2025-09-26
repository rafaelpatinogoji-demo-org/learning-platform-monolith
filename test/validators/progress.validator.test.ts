/**
 * Tests for ProgressValidator
 * 
 * Tests all validation methods for progress-related data
 * including lesson progress marking and course ID queries.
 */

import { ProgressValidator } from '../../src/utils/validation';

describe('ProgressValidator', () => {
  describe('validateMarkProgress', () => {
    it('should validate valid progress data', () => {
      const validData = {
        enrollmentId: 1,
        lessonId: 2,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate with completed as false', () => {
      const validData = {
        enrollmentId: 1,
        lessonId: 2,
        completed: false
      };

      const result = ProgressValidator.validateMarkProgress(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('enrollmentId validation', () => {
      it('should reject missing enrollmentId', () => {
        const invalidData = {
          lessonId: 2,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject null enrollmentId', () => {
        const invalidData = {
          enrollmentId: null,
          lessonId: 2,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject non-integer enrollmentId', () => {
        const invalidData = {
          enrollmentId: 'not-a-number',
          lessonId: 2,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });

      it('should reject negative enrollmentId', () => {
        const invalidData = {
          enrollmentId: -1,
          lessonId: 2,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });

      it('should reject zero enrollmentId', () => {
        const invalidData = {
          enrollmentId: 0,
          lessonId: 2,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });
    });

    describe('lessonId validation', () => {
      it('should reject missing lessonId', () => {
        const invalidData = {
          enrollmentId: 1,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject null lessonId', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: null,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject non-integer lessonId', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: 'invalid',
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });

      it('should reject negative lessonId', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: -5,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });

      it('should reject zero lessonId', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: 0,
          completed: true
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID must be a positive integer'
        });
      });
    });

    describe('completed validation', () => {
      it('should reject missing completed field', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: 2
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject null completed field', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: 2,
          completed: null
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject undefined completed field', () => {
        const invalidData = {
          enrollmentId: 1,
          lessonId: 2,
          completed: undefined
        };

        const result = ProgressValidator.validateMarkProgress(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject non-boolean completed values', () => {
        const invalidValues = ['true', 'false', 1, 0, 'yes', 'no', {}];

        invalidValues.forEach(completed => {
          const invalidData = {
            enrollmentId: 1,
            lessonId: 2,
            completed
          };

          const result = ProgressValidator.validateMarkProgress(invalidData);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContainEqual({
            field: 'completed',
            message: 'Completed must be a boolean value'
          });
        });
      });
    });

    it('should accumulate multiple validation errors', () => {
      const invalidData = {
        enrollmentId: 'invalid',
        lessonId: -1,
        completed: 'not-boolean'
      };

      const result = ProgressValidator.validateMarkProgress(invalidData);

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
  });

  describe('validateCourseIdQuery', () => {
    it('should validate valid courseId query', () => {
      const validQuery = {
        courseId: '1'
      };

      const result = ProgressValidator.validateCourseIdQuery(validQuery);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate numeric courseId', () => {
      const validQuery = {
        courseId: 42
      };

      const result = ProgressValidator.validateCourseIdQuery(validQuery);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing courseId', () => {
      const invalidQuery = {};

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should reject null courseId', () => {
      const invalidQuery = {
        courseId: null
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should reject undefined courseId', () => {
      const invalidQuery = {
        courseId: undefined
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should reject non-numeric courseId strings', () => {
      const invalidQuery = {
        courseId: 'not-a-number'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject negative courseId', () => {
      const invalidQuery = {
        courseId: '-5'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject zero courseId', () => {
      const invalidQuery = {
        courseId: '0'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject decimal courseId', () => {
      const invalidQuery = {
        courseId: '1.5'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject empty string courseId', () => {
      const invalidQuery = {
        courseId: ''
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });
  });
});
