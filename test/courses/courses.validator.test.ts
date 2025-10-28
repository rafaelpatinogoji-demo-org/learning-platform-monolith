import { CourseValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate correct course data', () => {
      const data = {
        title: 'Introduction to TypeScript',
        description: 'Learn TypeScript basics',
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const data = {
        description: 'Test description',
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string',
      });
    });

    it('should reject empty title', () => {
      const data = {
        title: '   ',
        description: 'Test description',
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty',
      });
    });

    it('should reject title longer than 255 characters', () => {
      const data = {
        title: 'a'.repeat(256),
        description: 'Test description',
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less',
      });
    });

    it('should reject missing price', () => {
      const data = {
        title: 'Test Course',
        description: 'Test description',
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required',
      });
    });

    it('should reject negative price', () => {
      const data = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: -100,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative',
      });
    });

    it('should accept price as string and normalize it', () => {
      const data = {
        title: 'Test Course',
        description: 'Test description',
        price_cents: '9900',
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid instructor_id', () => {
      const data = {
        title: 'Test Course',
        price_cents: 9900,
        instructor_id: -1,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer',
      });
    });

    it('should accept valid optional description', () => {
      const data = {
        title: 'Test Course',
        description: 'A great course about testing',
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid description type', () => {
      const data = {
        title: 'Test Course',
        description: 123,
        price_cents: 9900,
      };

      const result = CourseValidator.validateCreateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string',
      });
    });
  });

  describe('validateUpdateCourse', () => {
    it('should allow partial updates', () => {
      const data = {
        title: 'Updated Title',
      };

      const result = CourseValidator.validateUpdateCourse(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate title if provided', () => {
      const data = {
        title: '',
      };

      const result = CourseValidator.validateUpdateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty',
      });
    });

    it('should allow empty updates', () => {
      const data = {};

      const result = CourseValidator.validateUpdateCourse(data);

      expect(result.isValid).toBe(true);
    });

    it('should validate price_cents if provided', () => {
      const data = {
        price_cents: -100,
      };

      const result = CourseValidator.validateUpdateCourse(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative',
      });
    });

    it('should allow updating multiple fields', () => {
      const data = {
        title: 'New Title',
        description: 'New Description',
        price_cents: 5000,
      };

      const result = CourseValidator.validateUpdateCourse(data);

      expect(result.isValid).toBe(true);
    });
  });
});
