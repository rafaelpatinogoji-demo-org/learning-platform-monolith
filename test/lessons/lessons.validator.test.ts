import { LessonValidator } from '../../src/utils/validation';

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should validate correct lesson data', () => {
      const data = {
        title: 'Lesson 1: Introduction',
        content_md: '# Introduction\nWelcome to the course',
        video_url: 'https://youtube.com/watch?v=example',
        position: 1,
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const data = {
        content_md: 'Some content',
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string',
      });
    });

    it('should reject empty title', () => {
      const data = {
        title: '   ',
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty',
      });
    });

    it('should reject title longer than 255 characters', () => {
      const data = {
        title: 'a'.repeat(256),
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less',
      });
    });

    it('should reject invalid video URL', () => {
      const data = {
        title: 'Lesson 1',
        video_url: 'not-a-url',
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL',
      });
    });

    it('should accept valid http and https URLs', () => {
      const dataHttp = {
        title: 'Lesson 1',
        video_url: 'http://example.com/video',
      };

      const dataHttps = {
        title: 'Lesson 2',
        video_url: 'https://youtube.com/watch?v=123',
      };

      expect(LessonValidator.validateCreateLesson(dataHttp).isValid).toBe(true);
      expect(LessonValidator.validateCreateLesson(dataHttps).isValid).toBe(true);
    });

    it('should reject negative position', () => {
      const data = {
        title: 'Lesson 1',
        position: -1,
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer',
      });
    });

    it('should reject zero position', () => {
      const data = {
        title: 'Lesson 1',
        position: 0,
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer',
      });
    });

    it('should allow optional content_md', () => {
      const data = {
        title: 'Lesson 1',
        content_md: '# Markdown content',
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid content_md type', () => {
      const data = {
        title: 'Lesson 1',
        content_md: 123,
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string',
      });
    });
  });

  describe('validateUpdateLesson', () => {
    it('should allow partial updates', () => {
      const data = {
        title: 'Updated Title',
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate title if provided', () => {
      const data = {
        title: '',
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty',
      });
    });

    it('should allow empty updates', () => {
      const data = {};

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
    });

    it('should validate video URL if provided', () => {
      const data = {
        video_url: 'invalid-url',
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL',
      });
    });

    it('should allow updating multiple fields', () => {
      const data = {
        title: 'New Title',
        content_md: 'New content',
        video_url: 'https://example.com/video',
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateReorder', () => {
    it('should validate correct reorder data', () => {
      const data = {
        lessonIds: [1, 2, 3, 4],
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing lessonIds', () => {
      const data = {};

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array is required',
      });
    });

    it('should reject non-array lessonIds', () => {
      const data = {
        lessonIds: 'not-an-array',
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must be an array',
      });
    });

    it('should reject empty array', () => {
      const data = {
        lessonIds: [],
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array cannot be empty',
      });
    });

    it('should reject duplicate lesson IDs', () => {
      const data = {
        lessonIds: [1, 2, 2, 3],
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must not contain duplicates',
      });
    });

    it('should reject invalid lesson ID', () => {
      const data = {
        lessonIds: [1, 2, -1, 4],
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatchObject({
        field: 'lessonIds',
        message: expect.stringContaining('must be a positive integer'),
      });
    });

    it('should reject non-integer lesson ID', () => {
      const data = {
        lessonIds: [1, 2, 3.5, 4],
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
    });
  });
});
