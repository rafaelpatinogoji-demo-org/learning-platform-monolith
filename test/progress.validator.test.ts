import { ProgressValidator } from '../src/utils/validation';

describe('ProgressValidator', () => {
  describe('validateMarkProgress', () => {
    it('should validate correct input', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate when completed is false', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: false
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when enrollmentId is missing', () => {
      const data = {
        lessonId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID is required'
      });
    });

    it('should fail when enrollmentId is not an integer', () => {
      const data = {
        enrollmentId: 1.5,
        lessonId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer'
      });
    });

    it('should fail when enrollmentId is negative', () => {
      const data = {
        enrollmentId: -1,
        lessonId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer'
      });
    });

    it('should fail when enrollmentId is zero', () => {
      const data = {
        enrollmentId: 0,
        lessonId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID is required'
      });
    });

    it('should fail when lessonId is missing', () => {
      const data = {
        enrollmentId: 1,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID is required'
      });
    });

    it('should fail when lessonId is not an integer', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 'abc',
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID must be a positive integer'
      });
    });

    it('should fail when lessonId is negative', () => {
      const data = {
        enrollmentId: 1,
        lessonId: -5,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID must be a positive integer'
      });
    });

    it('should fail when lessonId is zero', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 0,
        completed: true
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID is required'
      });
    });

    it('should fail when completed is missing', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed status is required'
      });
    });

    it('should fail when completed is null', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: null
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed status is required'
      });
    });

    it('should fail when completed is not a boolean', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: 'true'
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    });

    it('should fail when completed is a number', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: 1
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    });

    it('should accumulate multiple errors', () => {
      const data = {
        enrollmentId: -1,
        lessonId: 0,
        completed: 'invalid'
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors.some(e => e.field === 'enrollmentId')).toBe(true);
      expect(result.errors.some(e => e.field === 'lessonId')).toBe(true);
      expect(result.errors.some(e => e.field === 'completed')).toBe(true);
    });
  });

  describe('validateCourseIdQuery', () => {
    it('should validate correct courseId', () => {
      const query = {
        courseId: '1'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate large courseId', () => {
      const query = {
        courseId: '999999'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when courseId is missing', () => {
      const query = {};

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should fail when courseId is undefined', () => {
      const query = {
        courseId: undefined
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should fail when courseId is null', () => {
      const query = {
        courseId: null
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should fail when courseId is empty string', () => {
      const query = {
        courseId: ''
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should fail when courseId is not a number', () => {
      const query = {
        courseId: 'abc'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should fail when courseId is negative', () => {
      const query = {
        courseId: '-1'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should fail when courseId is zero', () => {
      const query = {
        courseId: '0'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should accept courseId with decimal that parses to valid integer', () => {
      const query = {
        courseId: '1.5'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept courseId with trailing non-numeric that parses to valid integer', () => {
      const query = {
        courseId: '123abc'
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
