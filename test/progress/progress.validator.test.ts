import { ProgressValidator } from '../../src/utils/validation';

describe('ProgressValidator', () => {
  describe('validateMarkProgress', () => {
    it('should validate correct progress data', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: true,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept completed as false', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: false,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject missing enrollmentId', () => {
      const data = {
        lessonId: 1,
        completed: true,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID is required',
      });
    });

    it('should reject invalid enrollmentId', () => {
      const data = {
        enrollmentId: -1,
        lessonId: 1,
        completed: true,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer',
      });
    });

    it('should reject missing lessonId', () => {
      const data = {
        enrollmentId: 1,
        completed: true,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID is required',
      });
    });

    it('should reject invalid lessonId', () => {
      const data = {
        enrollmentId: 1,
        lessonId: -1,
        completed: true,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID must be a positive integer',
      });
    });

    it('should reject missing completed flag', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed status is required',
      });
    });

    it('should reject non-boolean completed', () => {
      const data = {
        enrollmentId: 1,
        lessonId: 1,
        completed: 'yes',
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value',
      });
    });

    it('should reject multiple invalid fields', () => {
      const data = {
        enrollmentId: -1,
        lessonId: 0,
        completed: 'invalid',
      };

      const result = ProgressValidator.validateMarkProgress(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateCourseIdQuery', () => {
    it('should validate correct courseId query', () => {
      const query = {
        courseId: '1',
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing courseId', () => {
      const query = {};

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters',
      });
    });

    it('should reject invalid courseId', () => {
      const query = {
        courseId: 'invalid',
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should reject negative courseId', () => {
      const query = {
        courseId: '-1',
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });

    it('should reject zero courseId', () => {
      const query = {
        courseId: '0',
      };

      const result = ProgressValidator.validateCourseIdQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer',
      });
    });
  });
});
