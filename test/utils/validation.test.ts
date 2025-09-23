/**
 * Tests for Validation Utilities
 * 
 * Comprehensive tests for all validator classes with edge cases, boundary conditions,
 * and error message validation following existing Jest patterns.
 */

import {
  ValidationError,
  ValidationResult,
  CourseValidator,
  QuizValidator,
  LessonValidator,
  EnrollmentValidator,
  ProgressValidator,
  CertificateValidator
} from '../../src/utils/validation';

describe('Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CourseValidator', () => {
    describe('validateCreateCourse', () => {
      it('should validate valid course creation data', () => {
        // Arrange
        const validData = {
          title: 'Introduction to JavaScript',
          description: 'Learn JavaScript fundamentals',
          price_cents: 2999,
          instructor_id: 1
        };

        // Act
        const result = CourseValidator.validateCreateCourse(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require title field', () => {
        // Arrange
        const invalidData = {
          description: 'Course description',
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject non-string title', () => {
        // Arrange
        const invalidData = {
          title: 123,
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject empty title', () => {
        // Arrange
        const invalidData = {
          title: '   ',
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

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
        const invalidData = {
          title: longTitle,
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });

      it('should accept valid description', () => {
        // Arrange
        const validData = {
          title: 'Course Title',
          description: 'Valid description',
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(validData);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should reject non-string description', () => {
        // Arrange
        const invalidData = {
          title: 'Course Title',
          description: 123,
          price_cents: 2999
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'description',
          message: 'Description must be a string'
        });
      });

      it('should require price_cents field', () => {
        // Arrange
        const invalidData = {
          title: 'Course Title'
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price is required'
        });
      });

      it('should reject negative price', () => {
        // Arrange
        const invalidData = {
          title: 'Course Title',
          price_cents: -100
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price cannot be negative'
        });
      });

      it('should validate instructor_id when provided', () => {
        // Arrange
        const validData = {
          title: 'Course Title',
          price_cents: 2999,
          instructor_id: 5
        };

        // Act
        const result = CourseValidator.validateCreateCourse(validData);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid instructor_id', () => {
        // Arrange
        const invalidData = {
          title: 'Course Title',
          price_cents: 2999,
          instructor_id: -1
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'instructor_id',
          message: 'Instructor ID must be a positive integer'
        });
      });

      it('should reject non-integer instructor_id', () => {
        // Arrange
        const invalidData = {
          title: 'Course Title',
          price_cents: 2999,
          instructor_id: 1.5
        };

        // Act
        const result = CourseValidator.validateCreateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'instructor_id',
          message: 'Instructor ID must be a positive integer'
        });
      });
    });

    describe('validateUpdateCourse', () => {
      it('should validate valid update data', () => {
        // Arrange
        const validData = {
          title: 'Updated Title',
          description: 'Updated description',
          price_cents: 3999
        };

        // Act
        const result = CourseValidator.validateUpdateCourse(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow empty update data', () => {
        // Arrange
        const emptyData = {};

        // Act
        const result = CourseValidator.validateUpdateCourse(emptyData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate title when provided', () => {
        // Arrange
        const invalidData = {
          title: ''
        };

        // Act
        const result = CourseValidator.validateUpdateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should validate price when provided', () => {
        // Arrange
        const invalidData = {
          price_cents: -500
        };

        // Act
        const result = CourseValidator.validateUpdateCourse(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'price_cents',
          message: 'Price cannot be negative'
        });
      });
    });

    describe('normalizePrice', () => {
      it('should handle integer cents correctly', () => {
        // Act & Assert
        expect(CourseValidator.normalizePrice(2999)).toBe(2999);
        expect(CourseValidator.normalizePrice(0)).toBe(0);
        expect(CourseValidator.normalizePrice(100)).toBe(100);
      });

      it('should convert dollar amounts to cents', () => {
        // Act & Assert
        expect(CourseValidator.normalizePrice(29.99)).toBe(2999);
        expect(CourseValidator.normalizePrice(0.99)).toBe(99);
        expect(CourseValidator.normalizePrice(100.50)).toBe(10050);
      });

      it('should handle string numbers', () => {
        // Act & Assert
        expect(CourseValidator.normalizePrice('2999')).toBe(2999);
        expect(CourseValidator.normalizePrice('29.99')).toBe(2999);
        expect(CourseValidator.normalizePrice('0')).toBe(0);
      });

      it('should return null for invalid inputs', () => {
        // Act & Assert
        expect(CourseValidator.normalizePrice('invalid')).toBeNull();
        expect(CourseValidator.normalizePrice(NaN)).toBeNull();
        expect(CourseValidator.normalizePrice(Infinity)).toBeNull();
        expect(CourseValidator.normalizePrice(-Infinity)).toBeNull();
        expect(CourseValidator.normalizePrice(null)).toBeNull();
        expect(CourseValidator.normalizePrice(undefined)).toBeNull();
        expect(CourseValidator.normalizePrice({})).toBeNull();
        expect(CourseValidator.normalizePrice([])).toBeNull();
      });

      it('should handle edge cases with rounding', () => {
        // Act & Assert
        expect(CourseValidator.normalizePrice(29.999)).toBe(3000);
        expect(CourseValidator.normalizePrice(29.994)).toBe(2999);
        expect(CourseValidator.normalizePrice(0.001)).toBe(0);
      });
    });

    describe('validatePagination', () => {
      it('should return default values for empty query', () => {
        // Act
        const result = CourseValidator.validatePagination({});

        // Assert
        expect(result).toEqual({ page: 1, limit: 10 });
      });

      it('should parse valid page and limit', () => {
        // Act
        const result = CourseValidator.validatePagination({ page: '2', limit: '20' });

        // Assert
        expect(result).toEqual({ page: 2, limit: 20 });
      });

      it('should handle invalid page values', () => {
        // Act & Assert
        expect(CourseValidator.validatePagination({ page: '0' })).toEqual({ page: 1, limit: 10 });
        expect(CourseValidator.validatePagination({ page: '-1' })).toEqual({ page: 1, limit: 10 });
        expect(CourseValidator.validatePagination({ page: 'invalid' })).toEqual({ page: 1, limit: 10 });
      });

      it('should handle invalid limit values', () => {
        // Act & Assert
        expect(CourseValidator.validatePagination({ limit: '0' })).toEqual({ page: 1, limit: 10 });
        expect(CourseValidator.validatePagination({ limit: '-1' })).toEqual({ page: 1, limit: 10 });
        expect(CourseValidator.validatePagination({ limit: '101' })).toEqual({ page: 1, limit: 10 });
        expect(CourseValidator.validatePagination({ limit: 'invalid' })).toEqual({ page: 1, limit: 10 });
      });

      it('should handle boundary limit values', () => {
        // Act & Assert
        expect(CourseValidator.validatePagination({ limit: '1' })).toEqual({ page: 1, limit: 1 });
        expect(CourseValidator.validatePagination({ limit: '100' })).toEqual({ page: 1, limit: 100 });
      });
    });

    describe('sanitizeSearch', () => {
      it('should return trimmed search string', () => {
        // Act & Assert
        expect(CourseValidator.sanitizeSearch('  javascript  ')).toBe('javascript');
        expect(CourseValidator.sanitizeSearch('react')).toBe('react');
      });

      it('should return undefined for invalid inputs', () => {
        // Act & Assert
        expect(CourseValidator.sanitizeSearch('')).toBeUndefined();
        expect(CourseValidator.sanitizeSearch('   ')).toBeUndefined();
        expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
        expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
        expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
        expect(CourseValidator.sanitizeSearch({})).toBeUndefined();
      });
    });
  });

  describe('QuizValidator', () => {
    describe('validateCreateQuiz', () => {
      it('should validate valid quiz creation data', () => {
        // Arrange
        const validData = {
          title: 'JavaScript Basics Quiz'
        };

        // Act
        const result = QuizValidator.validateCreateQuiz(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require title field', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = QuizValidator.validateCreateQuiz(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject empty title', () => {
        // Arrange
        const invalidData = { title: '   ' };

        // Act
        const result = QuizValidator.validateCreateQuiz(invalidData);

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
        const invalidData = { title: longTitle };

        // Act
        const result = QuizValidator.validateCreateQuiz(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });
    });

    describe('validateCreateQuestion', () => {
      it('should validate valid question creation data', () => {
        // Arrange
        const validData = {
          prompt: 'What is JavaScript?',
          choices: ['A programming language', 'A markup language', 'A database'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require prompt field', () => {
        // Arrange
        const invalidData = {
          choices: ['Choice 1', 'Choice 2'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'prompt',
          message: 'Prompt is required and must be a string'
        });
      });

      it('should reject empty prompt', () => {
        // Arrange
        const invalidData = {
          prompt: '   ',
          choices: ['Choice 1', 'Choice 2'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'prompt',
          message: 'Prompt cannot be empty'
        });
      });

      it('should require choices array', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'Choices array is required'
        });
      });

      it('should reject non-array choices', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: 'not an array',
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'Choices must be an array'
        });
      });

      it('should require at least 2 choices', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Only one choice'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'At least 2 choices are required'
        });
      });

      it('should reject empty choice strings', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Valid choice', '   ', 'Another choice'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'Choice at index 1 must be a non-empty string'
        });
      });

      it('should reject non-string choices', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Valid choice', 123, 'Another choice'],
          correct_index: 0
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'Choice at index 1 must be a non-empty string'
        });
      });

      it('should require correct_index field', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Choice 1', 'Choice 2']
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'correct_index',
          message: 'Correct index is required'
        });
      });

      it('should reject non-integer correct_index', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Choice 1', 'Choice 2'],
          correct_index: 1.5
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'correct_index',
          message: 'Correct index must be an integer'
        });
      });

      it('should reject out-of-bounds correct_index', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Choice 1', 'Choice 2'],
          correct_index: 2
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'correct_index',
          message: 'Correct index must be between 0 and 1'
        });
      });

      it('should reject negative correct_index', () => {
        // Arrange
        const invalidData = {
          prompt: 'Question?',
          choices: ['Choice 1', 'Choice 2'],
          correct_index: -1
        };

        // Act
        const result = QuizValidator.validateCreateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'correct_index',
          message: 'Correct index must be between 0 and 1'
        });
      });
    });

    describe('validateUpdateQuestion', () => {
      it('should allow empty update data', () => {
        // Arrange
        const emptyData = {};

        // Act
        const result = QuizValidator.validateUpdateQuestion(emptyData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate prompt when provided', () => {
        // Arrange
        const invalidData = { prompt: '' };

        // Act
        const result = QuizValidator.validateUpdateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'prompt',
          message: 'Prompt cannot be empty'
        });
      });

      it('should validate choices when provided', () => {
        // Arrange
        const invalidData = { choices: ['Only one'] };

        // Act
        const result = QuizValidator.validateUpdateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'choices',
          message: 'At least 2 choices are required'
        });
      });

      it('should validate correct_index when provided', () => {
        // Arrange
        const invalidData = {
          choices: ['Choice 1', 'Choice 2'],
          correct_index: 5
        };

        // Act
        const result = QuizValidator.validateUpdateQuestion(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'correct_index',
          message: 'Correct index must be between 0 and 1'
        });
      });
    });

    describe('validateSubmission', () => {
      it('should validate valid submission', () => {
        // Arrange
        const validData = {
          answers: [0, 1, 2]
        };

        // Act
        const result = QuizValidator.validateSubmission(validData, 3);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require answers array', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = QuizValidator.validateSubmission(invalidData, 3);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'answers',
          message: 'Answers array is required'
        });
      });

      it('should reject non-array answers', () => {
        // Arrange
        const invalidData = { answers: 'not an array' };

        // Act
        const result = QuizValidator.validateSubmission(invalidData, 3);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'answers',
          message: 'Answers must be an array'
        });
      });

      it('should validate answer count matches question count', () => {
        // Arrange
        const invalidData = { answers: [0, 1] };

        // Act
        const result = QuizValidator.validateSubmission(invalidData, 3);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'answers',
          message: 'Expected 3 answers, got 2'
        });
      });

      it('should reject non-integer answers', () => {
        // Arrange
        const invalidData = { answers: [0, 1.5, 2] };

        // Act
        const result = QuizValidator.validateSubmission(invalidData, 3);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'answers',
          message: 'Answer at index 1 must be a non-negative integer'
        });
      });

      it('should reject negative answers', () => {
        // Arrange
        const invalidData = { answers: [0, -1, 2] };

        // Act
        const result = QuizValidator.validateSubmission(invalidData, 3);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'answers',
          message: 'Answer at index 1 must be a non-negative integer'
        });
      });
    });
  });

  describe('LessonValidator', () => {
    describe('validateCreateLesson', () => {
      it('should validate valid lesson creation data', () => {
        // Arrange
        const validData = {
          title: 'Introduction to Variables',
          content_md: '# Variables\n\nVariables store data...',
          video_url: 'https://youtube.com/watch?v=abc123',
          position: 1
        };

        // Act
        const result = LessonValidator.validateCreateLesson(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require title field', () => {
        // Arrange
        const invalidData = {
          content_md: 'Some content'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title is required and must be a string'
        });
      });

      it('should reject empty title', () => {
        // Arrange
        const invalidData = { title: '   ' };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

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
        const invalidData = { title: longTitle };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title must be 255 characters or less'
        });
      });

      it('should accept valid content_md', () => {
        // Arrange
        const validData = {
          title: 'Lesson Title',
          content_md: '# Heading\n\nParagraph content'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(validData);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should reject non-string content_md', () => {
        // Arrange
        const invalidData = {
          title: 'Lesson Title',
          content_md: 123
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'content_md',
          message: 'Content must be a string'
        });
      });

      it('should accept valid video URLs', () => {
        // Arrange
        const validUrls = [
          'https://youtube.com/watch?v=abc123',
          'http://vimeo.com/123456',
          'https://example.com/video.mp4'
        ];

        validUrls.forEach(url => {
          const validData = {
            title: 'Lesson Title',
            video_url: url
          };

          const result = LessonValidator.validateCreateLesson(validData);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid video URLs', () => {
        // Arrange
        const invalidData = {
          title: 'Lesson Title',
          video_url: 'not-a-url'
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });

      it('should reject non-string video_url', () => {
        // Arrange
        const invalidData = {
          title: 'Lesson Title',
          video_url: 123
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a string'
        });
      });

      it('should accept valid position', () => {
        // Arrange
        const validData = {
          title: 'Lesson Title',
          position: 5
        };

        // Act
        const result = LessonValidator.validateCreateLesson(validData);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid position', () => {
        // Arrange
        const invalidData = {
          title: 'Lesson Title',
          position: 0
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });

      it('should reject non-integer position', () => {
        // Arrange
        const invalidData = {
          title: 'Lesson Title',
          position: 1.5
        };

        // Act
        const result = LessonValidator.validateCreateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'position',
          message: 'Position must be a positive integer'
        });
      });
    });

    describe('validateUpdateLesson', () => {
      it('should allow empty update data', () => {
        // Arrange
        const emptyData = {};

        // Act
        const result = LessonValidator.validateUpdateLesson(emptyData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate title when provided', () => {
        // Arrange
        const invalidData = { title: '' };

        // Act
        const result = LessonValidator.validateUpdateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'title',
          message: 'Title cannot be empty'
        });
      });

      it('should validate video_url when provided', () => {
        // Arrange
        const invalidData = { video_url: 'invalid-url' };

        // Act
        const result = LessonValidator.validateUpdateLesson(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'video_url',
          message: 'Video URL must be a valid URL'
        });
      });
    });

    describe('validateReorder', () => {
      it('should validate valid reorder data', () => {
        // Arrange
        const validData = {
          lessonIds: [1, 2, 3, 4]
        };

        // Act
        const result = LessonValidator.validateReorder(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require lessonIds array', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs array is required'
        });
      });

      it('should reject non-array lessonIds', () => {
        // Arrange
        const invalidData = { lessonIds: 'not an array' };

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must be an array'
        });
      });

      it('should reject empty lessonIds array', () => {
        // Arrange
        const invalidData = { lessonIds: [] };

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs array cannot be empty'
        });
      });

      it('should reject invalid lesson IDs', () => {
        // Arrange
        const invalidData = { lessonIds: [1, -2, 3] };

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should reject non-integer lesson IDs', () => {
        // Arrange
        const invalidData = { lessonIds: [1, 2.5, 3] };

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Invalid lesson ID at index 1: must be a positive integer'
        });
      });

      it('should reject duplicate lesson IDs', () => {
        // Arrange
        const invalidData = { lessonIds: [1, 2, 2, 3] };

        // Act
        const result = LessonValidator.validateReorder(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonIds',
          message: 'Lesson IDs must not contain duplicates'
        });
      });
    });
  });

  describe('EnrollmentValidator', () => {
    describe('validateCreateEnrollment', () => {
      it('should validate valid enrollment creation data', () => {
        // Arrange
        const validData = {
          courseId: 123
        };

        // Act
        const result = EnrollmentValidator.validateCreateEnrollment(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require courseId field', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required'
        });
      });

      it('should reject invalid courseId', () => {
        // Arrange
        const invalidData = { courseId: -1 };

        // Act
        const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });

      it('should reject non-integer courseId', () => {
        // Arrange
        const invalidData = { courseId: 1.5 };

        // Act
        const result = EnrollmentValidator.validateCreateEnrollment(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });
    });

    describe('validateStatusUpdate', () => {
      it('should validate valid status values', () => {
        // Arrange
        const validStatuses = ['active', 'completed', 'refunded'];

        validStatuses.forEach(status => {
          const validData = { status };
          const result = EnrollmentValidator.validateStatusUpdate(validData);
          expect(result.isValid).toBe(true);
        });
      });

      it('should require status field', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = EnrollmentValidator.validateStatusUpdate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'status',
          message: 'Status is required'
        });
      });

      it('should reject invalid status values', () => {
        // Arrange
        const invalidData = { status: 'invalid-status' };

        // Act
        const result = EnrollmentValidator.validateStatusUpdate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'status',
          message: 'Status must be one of: active, completed, refunded'
        });
      });
    });

    describe('validatePagination', () => {
      it('should return default values for empty query', () => {
        // Act
        const result = EnrollmentValidator.validatePagination({});

        // Assert
        expect(result).toEqual({ page: 1, limit: 10 });
      });

      it('should parse valid page and limit', () => {
        // Act
        const result = EnrollmentValidator.validatePagination({ page: '3', limit: '25' });

        // Assert
        expect(result).toEqual({ page: 3, limit: 25 });
      });

      it('should handle invalid values', () => {
        // Act & Assert
        expect(EnrollmentValidator.validatePagination({ page: '0' })).toEqual({ page: 1, limit: 10 });
        expect(EnrollmentValidator.validatePagination({ limit: '101' })).toEqual({ page: 1, limit: 10 });
      });
    });
  });

  describe('ProgressValidator', () => {
    describe('validateMarkProgress', () => {
      it('should validate valid progress marking data', () => {
        // Arrange
        const validData = {
          enrollmentId: 123,
          lessonId: 456,
          completed: true
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require enrollmentId field', () => {
        // Arrange
        const invalidData = {
          lessonId: 456,
          completed: true
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID is required'
        });
      });

      it('should reject invalid enrollmentId', () => {
        // Arrange
        const invalidData = {
          enrollmentId: -1,
          lessonId: 456,
          completed: true
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'enrollmentId',
          message: 'Enrollment ID must be a positive integer'
        });
      });

      it('should require lessonId field', () => {
        // Arrange
        const invalidData = {
          enrollmentId: 123,
          completed: true
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should reject invalid lessonId', () => {
        // Arrange
        const invalidData = {
          enrollmentId: 123,
          lessonId: 0,
          completed: true
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lessonId',
          message: 'Lesson ID is required'
        });
      });

      it('should require completed field', () => {
        // Arrange
        const invalidData = {
          enrollmentId: 123,
          lessonId: 456
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed status is required'
        });
      });

      it('should reject non-boolean completed', () => {
        // Arrange
        const invalidData = {
          enrollmentId: 123,
          lessonId: 456,
          completed: 'yes'
        };

        // Act
        const result = ProgressValidator.validateMarkProgress(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'completed',
          message: 'Completed must be a boolean value'
        });
      });

      it('should accept both true and false for completed', () => {
        const trueResult = ProgressValidator.validateMarkProgress({
          enrollmentId: 123,
          lessonId: 456,
          completed: true
        });

        const falseResult = ProgressValidator.validateMarkProgress({
          enrollmentId: 123,
          lessonId: 456,
          completed: false
        });

        // Assert
        expect(trueResult.isValid).toBe(true);
        expect(falseResult.isValid).toBe(true);
      });
    });

    describe('validateCourseIdQuery', () => {
      it('should validate valid courseId query', () => {
        // Arrange
        const validQuery = { courseId: '123' };

        // Act
        const result = ProgressValidator.validateCourseIdQuery(validQuery);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require courseId field', () => {
        // Arrange
        const invalidQuery = {};

        // Act
        const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required in query parameters'
        });
      });

      it('should reject invalid courseId', () => {
        // Arrange
        const invalidQuery = { courseId: 'invalid' };

        // Act
        const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });

      it('should reject negative courseId', () => {
        // Arrange
        const invalidQuery = { courseId: '-1' };

        // Act
        const result = ProgressValidator.validateCourseIdQuery(invalidQuery);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });
    });
  });

  describe('CertificateValidator', () => {
    describe('validateIssueCertificate', () => {
      it('should validate valid certificate issuance data', () => {
        // Arrange
        const validData = {
          userId: 123,
          courseId: 456
        };

        // Act
        const result = CertificateValidator.validateIssueCertificate(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require userId field', () => {
        // Arrange
        const invalidData = { courseId: 456 };

        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'userId',
          message: 'User ID is required'
        });
      });

      it('should reject invalid userId', () => {
        // Arrange
        const invalidData = {
          userId: -1,
          courseId: 456
        };

        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'userId',
          message: 'User ID must be a positive integer'
        });
      });

      it('should require courseId field', () => {
        // Arrange
        const invalidData = { userId: 123 };

        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required'
        });
      });

      it('should reject invalid courseId', () => {
        // Arrange
        const invalidData = {
          userId: 123,
          courseId: 0
        };

        // Act
        const result = CertificateValidator.validateIssueCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required'
        });
      });
    });

    describe('validateClaimCertificate', () => {
      it('should validate valid certificate claim data', () => {
        // Arrange
        const validData = { courseId: 456 };

        // Act
        const result = CertificateValidator.validateClaimCertificate(validData);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should require courseId field', () => {
        // Arrange
        const invalidData = {};

        // Act
        const result = CertificateValidator.validateClaimCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID is required'
        });
      });

      it('should reject invalid courseId', () => {
        // Arrange
        const invalidData = { courseId: -1 };

        // Act
        const result = CertificateValidator.validateClaimCertificate(invalidData);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      });
    });

    describe('validateCertificateCode', () => {
      it('should validate valid certificate codes', () => {
        // Arrange
        const validCodes = [
          'CERT-123456789',
          'abcdefghij',
          'A'.repeat(50),
          'certificate-code-2023-abc123'
        ];

        validCodes.forEach(code => {
          const result = CertificateValidator.validateCertificateCode(code);
          expect(result.isValid).toBe(true);
        });
      });

      it('should require code field', () => {
        // Act
        const result = CertificateValidator.validateCertificateCode(null);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Certificate code is required'
        });
      });

      it('should reject non-string codes', () => {
        // Act
        const result = CertificateValidator.validateCertificateCode(123);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Certificate code must be a string'
        });
      });

      it('should reject codes that are too short', () => {
        // Arrange
        const shortCode = 'abc';

        // Act
        const result = CertificateValidator.validateCertificateCode(shortCode);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Invalid certificate code format'
        });
      });

      it('should reject codes that are too long', () => {
        // Arrange
        const longCode = 'a'.repeat(101);

        // Act
        const result = CertificateValidator.validateCertificateCode(longCode);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'code',
          message: 'Invalid certificate code format'
        });
      });

      it('should accept boundary length codes', () => {
        const minLengthCode = 'a'.repeat(10);
        const maxLengthCode = 'a'.repeat(100);

        const minResult = CertificateValidator.validateCertificateCode(minLengthCode);
        const maxResult = CertificateValidator.validateCertificateCode(maxLengthCode);

        // Assert
        expect(minResult.isValid).toBe(true);
        expect(maxResult.isValid).toBe(true);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle null and undefined inputs consistently', () => {
      expect(() => CourseValidator.validateCreateCourse(null)).toThrow();
      expect(() => CourseValidator.validateCreateCourse(undefined)).toThrow();
      expect(() => QuizValidator.validateCreateQuiz(null)).toThrow();
      expect(() => LessonValidator.validateCreateLesson(null)).toThrow();
    });

    it('should handle empty objects consistently', () => {
      expect(CourseValidator.validateUpdateCourse({}).isValid).toBe(true);
      expect(QuizValidator.validateUpdateQuestion({}).isValid).toBe(true);
      expect(LessonValidator.validateUpdateLesson({}).isValid).toBe(true);
    });

    it('should handle type coercion edge cases', () => {
      const falsyValues = [false, 0, '', null, undefined, NaN];
      
      falsyValues.forEach(value => {
        const courseResult = CourseValidator.validateCreateCourse({ title: value, price_cents: 100 });
        expect(courseResult.isValid).toBe(false);
      });
    });

    it('should handle very large numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const courseData = {
        title: 'Test Course',
        price_cents: largeNumber,
        instructor_id: largeNumber
      };

      const result = CourseValidator.validateCreateCourse(courseData);
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in strings', () => {
      const specialTitle = 'Course with émojis 🚀 and spëcial chars!';
      const courseData = {
        title: specialTitle,
        price_cents: 100
      };

      const result = CourseValidator.validateCreateCourse(courseData);
      expect(result.isValid).toBe(true);
    });

    it('should handle array edge cases', () => {
      const edgeCases = [
        { choices: [], correct_index: 0 },
        { choices: [null, undefined], correct_index: 0 },
        { choices: ['', '   '], correct_index: 0 },
        { choices: [123, 'valid'], correct_index: 1 }
      ];

      edgeCases.forEach(data => {
        const questionData = {
          prompt: 'Test question?',
          ...data
        };
        const result = QuizValidator.validateCreateQuestion(questionData);
        expect(result.isValid).toBe(false);
      });
    });
  });
});
