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

    it('should validate with completed false', () => {
      const validData = {
        enrollmentId: 1,
        lessonId: 2,
        completed: false
      };

      const result = ProgressValidator.validateMarkProgress(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

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
        message: 'Enrollment ID is required'
      });
    });

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

    it('should reject non-integer lessonId', () => {
      const invalidData = {
        enrollmentId: 1,
        lessonId: 'not-a-number',
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
        lessonId: -1,
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
        message: 'Lesson ID is required'
      });
    });

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

    it('should reject non-boolean completed field', () => {
      const invalidData = {
        enrollmentId: 1,
        lessonId: 2,
        completed: 'true'
      };

      const result = ProgressValidator.validateMarkProgress(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    });

    it('should collect multiple validation errors', () => {
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

    it('should reject missing courseId', () => {
      const invalidQuery = {};

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should reject non-numeric courseId', () => {
      const invalidQuery = {
        courseId: 'not-a-number'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should reject negative courseId', () => {
      const invalidQuery = {
        courseId: '-1'
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
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
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should accept decimal courseId as valid integer', () => {
      const validQuery = {
        courseId: '1.0'
      };

      const result = ProgressValidator.validateCourseIdQuery(validQuery);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept decimal courseId with fractional part', () => {
      const validQuery = {
        courseId: '1.5'
      };

      const result = ProgressValidator.validateCourseIdQuery(validQuery);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty string courseId', () => {
      const invalidQuery = {
        courseId: ''
      };

      const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });
  });
});
