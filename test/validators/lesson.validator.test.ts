import { LessonValidator } from '../../src/utils/validation';

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should validate valid lesson data', () => {
      const validData = {
        title: 'Test Lesson',
        content_md: '# Test Content',
        video_url: 'https://example.com/video.mp4',
        position: 1
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title', () => {
      const invalidData = {
        content_md: '# Test Content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should validate title type', () => {
      const invalidData = {
        title: 123,
        content_md: '# Test Content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should not allow empty title', () => {
      const invalidData = {
        title: '   ',
        content_md: '# Test Content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should validate title length', () => {
      const invalidData = {
        title: 'a'.repeat(256),
        content_md: '# Test Content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should allow optional content_md', () => {
      const validData = {
        title: 'Test Lesson'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should validate content_md type when provided', () => {
      const invalidData = {
        title: 'Test Lesson',
        content_md: 123
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
    });

    it('should allow optional video_url', () => {
      const validData = {
        title: 'Test Lesson',
        content_md: '# Test Content'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should validate video_url type when provided', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 123
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a string'
      });
    });

    it('should validate video_url format', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'invalid-url'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept valid video URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should accept http URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'http://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should allow empty video_url', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: ''
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should allow optional position', () => {
      const validData = {
        title: 'Test Lesson'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should validate position type when provided', () => {
      const invalidData = {
        title: 'Test Lesson',
        position: 'invalid'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should not allow zero or negative position', () => {
      const invalidData = {
        title: 'Test Lesson',
        position: 0
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should accept valid position', () => {
      const validData = {
        title: 'Test Lesson',
        position: 5
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUpdateLesson', () => {
    it('should validate valid update data', () => {
      const validData = {
        title: 'Updated Lesson',
        content_md: '# Updated Content',
        video_url: 'https://example.com/updated-video.mp4'
      };

      const result = LessonValidator.validateUpdateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty update data', () => {
      const result = LessonValidator.validateUpdateLesson({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate title when provided', () => {
      const invalidData = {
        title: '   '
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should validate title type when provided', () => {
      const invalidData = {
        title: 123
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be a string'
      });
    });

    it('should validate title length when provided', () => {
      const invalidData = {
        title: 'a'.repeat(256)
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should validate content_md when provided', () => {
      const invalidData = {
        content_md: 123
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
    });

    it('should validate video_url when provided', () => {
      const invalidData = {
        video_url: 'invalid-url'
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should allow empty video_url in updates', () => {
      const validData = {
        video_url: ''
      };

      const result = LessonValidator.validateUpdateLesson(validData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateReorder', () => {
    it('should validate valid reorder data', () => {
      const validData = {
        lessonIds: [3, 1, 2]
      };

      const result = LessonValidator.validateReorder(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require lessonIds', () => {
      const invalidData = {};

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array is required'
      });
    });

    it('should validate lessonIds is array', () => {
      const invalidData = {
        lessonIds: 'not-array'
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must be an array'
      });
    });

    it('should not allow empty lessonIds array', () => {
      const invalidData = {
        lessonIds: []
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array cannot be empty'
      });
    });

    it('should validate each lesson ID is positive integer', () => {
      const invalidData = {
        lessonIds: [1, 'invalid', 3]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should not allow zero or negative lesson IDs', () => {
      const invalidData = {
        lessonIds: [1, 0, 3]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should not allow duplicate lesson IDs', () => {
      const invalidData = {
        lessonIds: [1, 2, 1, 3]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must not contain duplicates'
      });
    });

    it('should handle single lesson ID', () => {
      const validData = {
        lessonIds: [1]
      };

      const result = LessonValidator.validateReorder(validData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidUrl (private method testing through public methods)', () => {
    it('should accept https URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should accept http URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'http://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should reject ftp URLs', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'ftp://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should reject malformed URLs', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'not-a-url'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept URLs with paths and query parameters', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://example.com/path/to/video.mp4?param=value&other=123'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });

    it('should accept URLs with ports', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://example.com:8080/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
    });
  });
});
