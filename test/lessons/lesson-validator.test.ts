/**
 * Tests for LessonValidator
 * 
 * Tests validation logic for lesson creation, updates, and reordering
 * including URL validation and duplicate detection.
 */

import { LessonValidator } from '../../src/utils/validation';

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should validate valid lesson data', () => {
      // Arrange
      const validData = {
        title: 'Introduction to JavaScript',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Introduction\n\nThis lesson covers JavaScript basics.',
        position: 1
      };

      // Act
      const result = LessonValidator.validateCreateLesson(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate lesson with minimal required data', () => {
      // Arrange
      const minimalData = {
        title: 'Basic Lesson'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(minimalData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('title validation', () => {
      it('should reject missing title', () => {
        // Arrange
        const data = {};

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject null title', () => {
        // Arrange
        const data = { title: null };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject non-string title', () => {
        // Arrange
        const data = { title: 123 };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject empty title', () => {
        // Arrange
        const data = { title: '' };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject whitespace-only title', () => {
        // Arrange
        const data = { title: '   ' };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should reject title longer than 255 characters', () => {
        // Arrange
        const longTitle = 'a'.repeat(256);
        const data = { title: longTitle };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });

      it('should accept title with exactly 255 characters', () => {
        // Arrange
        const maxTitle = 'a'.repeat(255);
        const data = { title: maxTitle };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('content_md validation', () => {
      it('should accept valid markdown content', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          content_md: '# Heading\n\n**Bold text** and *italic text*.'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept null content_md', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          content_md: null
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept undefined content_md', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          content_md: undefined
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string content_md', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          content_md: 123
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'content_md',
          message: 'Content must be a string'
        });
      });

      it('should accept empty string content_md', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          content_md: ''
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('video_url validation', () => {
      it('should accept valid HTTPS URL', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 'https://example.com/video.mp4'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid HTTP URL', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 'http://example.com/video.mp4'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept null video_url', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: null
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept undefined video_url', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: undefined
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept empty string video_url', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: ''
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string video_url', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 123
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a string'
        });
      });

      it('should reject invalid URL format', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 'not-a-url'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });

      it('should reject FTP URLs', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 'ftp://example.com/video.mp4'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });

      it('should reject URLs without protocol', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          video_url: 'example.com/video.mp4'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });
    });

    describe('position validation', () => {
      it('should accept valid positive integer position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: 5
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept null position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: null
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept undefined position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: undefined
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject zero position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: 0
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });

      it('should reject negative position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: -1
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });

      it('should reject decimal position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: 1.5
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });

      it('should reject string position', () => {
        // Arrange
        const data = {
          title: 'Test Lesson',
          position: '1'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });
    });

    it('should collect multiple validation errors', () => {
      // Arrange
      const invalidData = {
        title: '',
        video_url: 'invalid-url',
        content_md: 123,
        position: -1
      };

      // Act
      const result = LessonValidator.validateCreateLesson(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });
  });

  describe('validateUpdateLesson', () => {
    it('should validate valid update data', () => {
      // Arrange
      const validData = {
        title: 'Updated Lesson Title',
        video_url: 'https://example.com/new-video.mp4',
        content_md: '# Updated Content\n\nThis is the updated lesson content.'
      };

      // Act
      const result = LessonValidator.validateUpdateLesson(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty update data', () => {
      // Arrange
      const emptyData = {};

      // Act
      const result = LessonValidator.validateUpdateLesson(emptyData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update data', () => {
      // Arrange
      const partialData = {
        title: 'New Title Only'
      };

      // Act
      const result = LessonValidator.validateUpdateLesson(partialData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('title validation for updates', () => {
      it('should accept valid title update', () => {
        // Arrange
        const data = { title: 'Updated Title' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string title', () => {
        // Arrange
        const data = { title: 123 };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be a string'
        });
      });

      it('should reject empty title', () => {
        // Arrange
        const data = { title: '' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should reject whitespace-only title', () => {
        // Arrange
        const data = { title: '   ' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should reject title longer than 255 characters', () => {
        // Arrange
        const longTitle = 'a'.repeat(256);
        const data = { title: longTitle };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });
    });

    describe('content_md validation for updates', () => {
      it('should accept valid content_md update', () => {
        // Arrange
        const data = { content_md: '# Updated Content' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept null content_md', () => {
        // Arrange
        const data = { content_md: null };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string content_md', () => {
        // Arrange
        const data = { content_md: 123 };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'content_md',
          message: 'Content must be a string'
        });
      });
    });

    describe('video_url validation for updates', () => {
      it('should accept valid video_url update', () => {
        // Arrange
        const data = { video_url: 'https://example.com/updated-video.mp4' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept null video_url', () => {
        // Arrange
        const data = { video_url: null };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept empty string video_url', () => {
        // Arrange
        const data = { video_url: '' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject non-string video_url', () => {
        // Arrange
        const data = { video_url: 123 };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a string'
        });
      });

      it('should reject invalid URL format', () => {
        // Arrange
        const data = { video_url: 'not-a-valid-url' };

        // Act
        const result = LessonValidator.validateUpdateLesson(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });
    });

    it('should collect multiple validation errors for updates', () => {
      // Arrange
      const invalidData = {
        title: '',
        video_url: 'invalid-url',
        content_md: 123
      };

      // Act
      const result = LessonValidator.validateUpdateLesson(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
    });
  });

  describe('validateReorder', () => {
    it('should validate valid reorder data', () => {
      // Arrange
      const validData = {
        lessonIds: [3, 1, 2, 4]
      };

      // Act
      const result = LessonValidator.validateReorder(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate single lesson reorder', () => {
      // Arrange
      const singleData = {
        lessonIds: [1]
      };

      // Act
      const result = LessonValidator.validateReorder(singleData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('lessonIds validation', () => {
      it('should reject missing lessonIds', () => {
        // Arrange
        const data = {};

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs array is required'
        });
      });

      it('should reject null lessonIds', () => {
        // Arrange
        const data = { lessonIds: null };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs array is required'
        });
      });

      it('should reject non-array lessonIds', () => {
        // Arrange
        const data = { lessonIds: 'not-an-array' };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must be an array'
        });
      });

      it('should reject empty lessonIds array', () => {
        // Arrange
        const data = { lessonIds: [] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs array cannot be empty'
        });
      });

      it('should reject non-integer lesson IDs', () => {
        // Arrange
        const data = { lessonIds: [1, 'not-a-number', 3] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should reject zero lesson IDs', () => {
        // Arrange
        const data = { lessonIds: [1, 0, 3] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should reject negative lesson IDs', () => {
        // Arrange
        const data = { lessonIds: [1, -2, 3] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should reject decimal lesson IDs', () => {
        // Arrange
        const data = { lessonIds: [1, 2.5, 3] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should stop at first invalid lesson ID', () => {
        // Arrange
        const data = { lessonIds: [1, 'invalid', 'also-invalid'] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should detect duplicate lesson IDs', () => {
        // Arrange
        const data = { lessonIds: [1, 2, 3, 2, 4] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must not contain duplicates'
        });
      });

      it('should detect duplicate lesson IDs with same value multiple times', () => {
        // Arrange
        const data = { lessonIds: [1, 1, 1] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must not contain duplicates'
        });
      });

      it('should detect both invalid ID and duplicate errors', () => {
        // Arrange
        const data = { lessonIds: [1, 'invalid', 1] };

        // Act
        const result = LessonValidator.validateReorder(data);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must not contain duplicates'
        });
      });
    });

    it('should handle large arrays efficiently', () => {
      // Arrange
      const largeArray = Array.from({ length: 1000 }, (_, i) => i + 1);
      const data = { lessonIds: largeArray };

      // Act
      const result = LessonValidator.validateReorder(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isValidUrl (private method behavior)', () => {
    it('should accept HTTPS URLs through validateCreateLesson', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'https://example.com/video.mp4'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should accept HTTP URLs through validateCreateLesson', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'http://example.com/video.mp4'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject URLs with unsupported protocols through validateCreateLesson', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'ftp://example.com/video.mp4'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should handle URLs with query parameters and fragments', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'https://example.com/video.mp4?quality=hd&autoplay=1#start'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with ports', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'https://example.com:8080/video.mp4'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with authentication', () => {
      // Arrange
      const data = {
        title: 'Test',
        video_url: 'https://user:pass@example.com/video.mp4'
      };

      // Act
      const result = LessonValidator.validateCreateLesson(data);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });
});
