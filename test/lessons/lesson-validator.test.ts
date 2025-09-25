/**
 * Tests for LessonValidator
 * 
 * Unit tests for lesson validation methods without external dependencies
 */

import { LessonValidator } from '../../src/utils/validation';

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should validate valid lesson creation data', () => {
      const validData = {
        title: 'Introduction to Variables',
        content_md: '# Variables\n\nVariables are containers for data.',
        video_url: 'https://youtube.com/watch?v=example',
        position: 1
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require title field', () => {
      const invalidData = {
        content_md: 'Some content',
        video_url: 'https://youtube.com/watch?v=example'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject non-string title', () => {
      const invalidData = {
        title: 123,
        content_md: 'Some content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '   ',
        content_md: 'Some content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      const longTitle = 'a'.repeat(256);
      const invalidData = {
        title: longTitle,
        content_md: 'Some content'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept null content_md', () => {
      const validData = {
        title: 'Test Lesson',
        content_md: null
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string content_md', () => {
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

    it('should accept valid video URL', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://youtube.com/watch?v=example'
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept empty string video URL', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: ''
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid video URL', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'not-a-valid-url'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should reject non-string video URL', () => {
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

    it('should accept valid position', () => {
      const validData = {
        title: 'Test Lesson',
        position: 5
      };

      const result = LessonValidator.validateCreateLesson(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid position', () => {
      const invalidData = {
        title: 'Test Lesson',
        position: -1
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should reject non-integer position', () => {
      const invalidData = {
        title: 'Test Lesson',
        position: 1.5
      };

      const result = LessonValidator.validateCreateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });
  });

  describe('validateUpdateLesson', () => {
    it('should validate empty update data', () => {
      const result = LessonValidator.validateUpdateLesson({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update with title', () => {
      const updateData = {
        title: 'Updated Lesson Title'
      };

      const result = LessonValidator.validateUpdateLesson(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title in update', () => {
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

    it('should validate partial update with content', () => {
      const updateData = {
        content_md: '# Updated Content\n\nThis is updated content.'
      };

      const result = LessonValidator.validateUpdateLesson(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update with video URL', () => {
      const updateData = {
        video_url: 'https://vimeo.com/123456789'
      };

      const result = LessonValidator.validateUpdateLesson(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid video URL in update', () => {
      const invalidData = {
        video_url: 'ftp://invalid-protocol.com'
      };

      const result = LessonValidator.validateUpdateLesson(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });
  });

  describe('validateReorder', () => {
    it('should validate valid reorder data', () => {
      const validData = {
        lessonIds: [3, 1, 2, 4]
      };

      const result = LessonValidator.validateReorder(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require lessonIds field', () => {
      const invalidData = {};

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array is required'
      });
    });

    it('should reject non-array lessonIds', () => {
      const invalidData = {
        lessonIds: 'not-an-array'
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must be an array'
      });
    });

    it('should reject empty lessonIds array', () => {
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

    it('should reject invalid lesson ID in array', () => {
      const invalidData = {
        lessonIds: [1, 2, -3, 4]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 2: must be a positive integer'
      });
    });

    it('should reject non-integer lesson ID', () => {
      const invalidData = {
        lessonIds: [1, 2, 3.5, 4]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 2: must be a positive integer'
      });
    });

    it('should reject duplicate lesson IDs', () => {
      const invalidData = {
        lessonIds: [1, 2, 3, 2]
      };

      const result = LessonValidator.validateReorder(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must not contain duplicates'
      });
    });
  });

  describe('isValidUrl (private method testing through public methods)', () => {
    it('should accept https URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'https://example.com/video'
      };

      const result = LessonValidator.validateCreateLesson(validData);
      expect(result.isValid).toBe(true);
    });

    it('should accept http URLs', () => {
      const validData = {
        title: 'Test Lesson',
        video_url: 'http://example.com/video'
      };

      const result = LessonValidator.validateCreateLesson(validData);
      expect(result.isValid).toBe(true);
    });

    it('should reject ftp URLs', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'ftp://example.com/video'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);
      expect(result.isValid).toBe(false);
    });

    it('should reject malformed URLs', () => {
      const invalidData = {
        title: 'Test Lesson',
        video_url: 'not-a-url'
      };

      const result = LessonValidator.validateCreateLesson(invalidData);
      expect(result.isValid).toBe(false);
    });
  });
});
