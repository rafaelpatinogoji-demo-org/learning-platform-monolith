import { describe, it, expect } from '@jest/globals';
import { LessonValidator } from '../src/utils/validation';

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should return valid for correct lesson data', () => {
      const data = {
        title: 'Introduction to TypeScript',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Introduction\n\nThis lesson covers TypeScript basics.',
        position: 1
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when optional fields are omitted', () => {
      const data = {
        title: 'Introduction to TypeScript'
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when video_url is empty string', () => {
      const data = {
        title: 'Introduction to TypeScript',
        video_url: ''
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when title is missing', () => {
      const data = {
        content_md: 'Some content'
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title is required and must be a string');
    });

    it('should return invalid when title is not a string', () => {
      const data = {
        title: 123
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title is required and must be a string');
    });

    it('should return invalid when title is empty', () => {
      const data = {
        title: '   '
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title cannot be empty');
    });

    it('should return invalid when title exceeds 255 characters', () => {
      const data = {
        title: 'a'.repeat(256)
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title must be 255 characters or less');
    });

    it('should return invalid when content_md is not a string', () => {
      const data = {
        title: 'Valid Title',
        content_md: 123
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('content_md');
      expect(result.errors[0].message).toBe('Content must be a string');
    });

    it('should return invalid when video_url is not a string', () => {
      const data = {
        title: 'Valid Title',
        video_url: 123
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('video_url');
      expect(result.errors[0].message).toBe('Video URL must be a string');
    });

    it('should return invalid when video_url is not a valid URL', () => {
      const data = {
        title: 'Valid Title',
        video_url: 'not-a-valid-url'
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('video_url');
      expect(result.errors[0].message).toBe('Video URL must be a valid URL');
    });

    it('should return invalid when video_url uses non-http protocol', () => {
      const data = {
        title: 'Valid Title',
        video_url: 'ftp://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('video_url');
      expect(result.errors[0].message).toBe('Video URL must be a valid URL');
    });

    it('should return valid when video_url uses https protocol', () => {
      const data = {
        title: 'Valid Title',
        video_url: 'https://example.com/video.mp4'
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when position is not an integer', () => {
      const data = {
        title: 'Valid Title',
        position: 1.5
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('position');
      expect(result.errors[0].message).toBe('Position must be a positive integer');
    });

    it('should return invalid when position is zero', () => {
      const data = {
        title: 'Valid Title',
        position: 0
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('position');
      expect(result.errors[0].message).toBe('Position must be a positive integer');
    });

    it('should return invalid when position is negative', () => {
      const data = {
        title: 'Valid Title',
        position: -1
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('position');
      expect(result.errors[0].message).toBe('Position must be a positive integer');
    });

    it('should accumulate multiple validation errors', () => {
      const data = {
        title: '',
        video_url: 'invalid-url',
        content_md: 123,
        position: -1
      };

      const result = LessonValidator.validateCreateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateLesson', () => {
    it('should return valid for correct update data', () => {
      const data = {
        title: 'Updated Title',
        video_url: 'https://example.com/new-video.mp4',
        content_md: '# Updated Content'
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when no fields are provided', () => {
      const data = {};

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when only title is provided', () => {
      const data = {
        title: 'Updated Title'
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when title is not a string', () => {
      const data = {
        title: 123
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title must be a string');
    });

    it('should return invalid when title is empty', () => {
      const data = {
        title: '   '
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title cannot be empty');
    });

    it('should return invalid when title exceeds 255 characters', () => {
      const data = {
        title: 'a'.repeat(256)
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('title');
      expect(result.errors[0].message).toBe('Title must be 255 characters or less');
    });

    it('should return invalid when content_md is not a string', () => {
      const data = {
        content_md: 123
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('content_md');
      expect(result.errors[0].message).toBe('Content must be a string');
    });

    it('should return invalid when video_url is not a string', () => {
      const data = {
        video_url: 123
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('video_url');
      expect(result.errors[0].message).toBe('Video URL must be a string');
    });

    it('should return invalid when video_url is not a valid URL', () => {
      const data = {
        video_url: 'not-a-valid-url'
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('video_url');
      expect(result.errors[0].message).toBe('Video URL must be a valid URL');
    });

    it('should return valid when video_url is empty string', () => {
      const data = {
        video_url: ''
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when video_url is null', () => {
      const data = {
        video_url: null
      };

      const result = LessonValidator.validateUpdateLesson(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateReorder', () => {
    it('should return valid for correct reorder data', () => {
      const data = {
        lessonIds: [1, 2, 3, 4, 5]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for single lesson', () => {
      const data = {
        lessonIds: [1]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when lessonIds is missing', () => {
      const data = {};

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toBe('Lesson IDs array is required');
    });

    it('should return invalid when lessonIds is not an array', () => {
      const data = {
        lessonIds: 'not-an-array'
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toBe('Lesson IDs must be an array');
    });

    it('should return invalid when lessonIds is empty array', () => {
      const data = {
        lessonIds: []
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toBe('Lesson IDs array cannot be empty');
    });

    it('should return invalid when lessonIds contains non-integer', () => {
      const data = {
        lessonIds: [1, 2, 3.5, 4]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toContain('Invalid lesson ID at index 2');
    });

    it('should return invalid when lessonIds contains zero', () => {
      const data = {
        lessonIds: [1, 0, 3]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toContain('Invalid lesson ID at index 1');
    });

    it('should return invalid when lessonIds contains negative number', () => {
      const data = {
        lessonIds: [1, 2, -1]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toContain('Invalid lesson ID at index 2');
    });

    it('should return invalid when lessonIds contains duplicates', () => {
      const data = {
        lessonIds: [1, 2, 3, 2, 4]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toBe('Lesson IDs must not contain duplicates');
    });

    it('should return invalid when lessonIds contains string', () => {
      const data = {
        lessonIds: [1, 2, '3', 4]
      };

      const result = LessonValidator.validateReorder(data);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('lessonIds');
      expect(result.errors[0].message).toContain('Invalid lesson ID at index 2');
    });
  });
});
