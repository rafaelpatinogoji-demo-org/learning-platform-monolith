import {
  CourseValidator,
  QuizValidator,
  LessonValidator,
  EnrollmentValidator,
  ProgressValidator,
  CertificateValidator,
  ValidationResult
} from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should accept valid course data', () => {
      const validData = {
        title: 'Introduction to TypeScript',
        description: 'Learn TypeScript from scratch',
        price_cents: 4999
      };
      const result = CourseValidator.validateCreateCourse(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid course data with instructor_id', () => {
      const validData = {
        title: 'Advanced JavaScript',
        price_cents: 9999,
        instructor_id: 5
      };
      const result = CourseValidator.validateCreateCourse(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when title is missing', () => {
      const data = { price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is not a string', () => {
      const data = { title: 123, price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is empty string', () => {
      const data = { title: '   ', price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should return error when title exceeds 255 characters', () => {
      const data = { title: 'a'.repeat(256), price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title with exactly 255 characters', () => {
      const data = { title: 'a'.repeat(255), price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when description is not a string', () => {
      const data = { title: 'Test', description: 123, price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should accept null description', () => {
      const data = { title: 'Test', description: null, price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept undefined description', () => {
      const data = { title: 'Test', price_cents: 5000 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when price is missing', () => {
      const data = { title: 'Test' };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should return error when price is null', () => {
      const data = { title: 'Test', price_cents: null };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should return error when price is invalid', () => {
      const data = { title: 'Test', price_cents: 'invalid' };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should return error when price is negative', () => {
      const data = { title: 'Test', price_cents: -100 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept zero price', () => {
      const data = { title: 'Free Course', price_cents: 0 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when instructor_id is not a positive integer', () => {
      const data = { title: 'Test', price_cents: 5000, instructor_id: -1 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should return error when instructor_id is zero', () => {
      const data = { title: 'Test', price_cents: 5000, instructor_id: 0 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should return error when instructor_id is not an integer', () => {
      const data = { title: 'Test', price_cents: 5000, instructor_id: 1.5 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const data = { title: '', price_cents: -100 };
      const result = CourseValidator.validateCreateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateUpdateCourse', () => {
    it('should accept valid update data with all fields', () => {
      const data = {
        title: 'Updated Course',
        description: 'Updated description',
        price_cents: 7999
      };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept partial update with only title', () => {
      const data = { title: 'New Title' };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept empty update object', () => {
      const data = {};
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when title is not a string', () => {
      const data = { title: 123 };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be a string'
      });
    });

    it('should return error when title is empty', () => {
      const data = { title: '  ' };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should return error when title exceeds 255 characters', () => {
      const data = { title: 'a'.repeat(256) };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should return error when description is not a string', () => {
      const data = { description: 456 };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should return error when price is invalid', () => {
      const data = { price_cents: NaN };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should return error when price is negative', () => {
      const data = { price_cents: -500 };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should return error when instructor_id is invalid', () => {
      const data = { instructor_id: -5 };
      const result = CourseValidator.validateUpdateCourse(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });
  });

  describe('normalizePrice', () => {
    it('should handle integer cents', () => {
      expect(CourseValidator.normalizePrice(5000)).toBe(5000);
    });

    it('should convert dollar amount to cents', () => {
      expect(CourseValidator.normalizePrice(49.99)).toBe(4999);
    });

    it('should round dollar amounts correctly', () => {
      expect(CourseValidator.normalizePrice(19.995)).toBe(2000);
    });

    it('should handle zero', () => {
      expect(CourseValidator.normalizePrice(0)).toBe(0);
    });

    it('should handle string integer', () => {
      expect(CourseValidator.normalizePrice('5000')).toBe(5000);
    });

    it('should handle string decimal', () => {
      expect(CourseValidator.normalizePrice('49.99')).toBe(4999);
    });

    it('should return null for NaN', () => {
      expect(CourseValidator.normalizePrice(NaN)).toBeNull();
    });

    it('should return null for Infinity', () => {
      expect(CourseValidator.normalizePrice(Infinity)).toBeNull();
    });

    it('should return null for -Infinity', () => {
      expect(CourseValidator.normalizePrice(-Infinity)).toBeNull();
    });

    it('should return null for invalid string', () => {
      expect(CourseValidator.normalizePrice('invalid')).toBeNull();
    });

    it('should return null for null', () => {
      expect(CourseValidator.normalizePrice(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(CourseValidator.normalizePrice(undefined)).toBeNull();
    });

    it('should return null for object', () => {
      expect(CourseValidator.normalizePrice({})).toBeNull();
    });

    it('should return null for array', () => {
      expect(CourseValidator.normalizePrice([])).toBeNull();
    });

    it('should handle negative numbers', () => {
      expect(CourseValidator.normalizePrice(-100)).toBe(-100);
    });

    it('should handle negative decimals', () => {
      expect(CourseValidator.normalizePrice(-19.99)).toBe(-1999);
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = CourseValidator.validatePagination({});
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      const result = CourseValidator.validatePagination({ page: '5', limit: '20' });
      expect(result).toEqual({ page: 5, limit: 20 });
    });

    it('should handle numeric page and limit', () => {
      const result = CourseValidator.validatePagination({ page: 3, limit: 15 });
      expect(result).toEqual({ page: 3, limit: 15 });
    });

    it('should ignore invalid page', () => {
      const result = CourseValidator.validatePagination({ page: 'invalid' });
      expect(result.page).toBe(1);
    });

    it('should ignore negative page', () => {
      const result = CourseValidator.validatePagination({ page: '-1' });
      expect(result.page).toBe(1);
    });

    it('should ignore zero page', () => {
      const result = CourseValidator.validatePagination({ page: '0' });
      expect(result.page).toBe(1);
    });

    it('should ignore invalid limit', () => {
      const result = CourseValidator.validatePagination({ limit: 'invalid' });
      expect(result.limit).toBe(10);
    });

    it('should ignore negative limit', () => {
      const result = CourseValidator.validatePagination({ limit: '-5' });
      expect(result.limit).toBe(10);
    });

    it('should cap limit at 100', () => {
      const result = CourseValidator.validatePagination({ limit: '150' });
      expect(result.limit).toBe(10);
    });

    it('should accept limit of exactly 100', () => {
      const result = CourseValidator.validatePagination({ limit: '100' });
      expect(result.limit).toBe(100);
    });

    it('should ignore zero limit', () => {
      const result = CourseValidator.validatePagination({ limit: '0' });
      expect(result.limit).toBe(10);
    });
  });

  describe('sanitizeSearch', () => {
    it('should return trimmed string for valid search', () => {
      expect(CourseValidator.sanitizeSearch('  typescript  ')).toBe('typescript');
    });

    it('should return string without trimming if no spaces', () => {
      expect(CourseValidator.sanitizeSearch('javascript')).toBe('javascript');
    });

    it('should return undefined for empty string', () => {
      expect(CourseValidator.sanitizeSearch('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(CourseValidator.sanitizeSearch('   ')).toBeUndefined();
    });

    it('should return undefined for non-string', () => {
      expect(CourseValidator.sanitizeSearch(123)).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(CourseValidator.sanitizeSearch(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(CourseValidator.sanitizeSearch(undefined)).toBeUndefined();
    });

    it('should handle special characters', () => {
      expect(CourseValidator.sanitizeSearch('C++ Programming')).toBe('C++ Programming');
    });
  });
});

describe('QuizValidator', () => {
  describe('validateCreateQuiz', () => {
    it('should accept valid quiz data', () => {
      const data = { title: 'Chapter 1 Quiz' };
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when title is missing', () => {
      const data = {};
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is not a string', () => {
      const data = { title: 123 };
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is empty', () => {
      const data = { title: '  ' };
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should return error when title exceeds 255 characters', () => {
      const data = { title: 'a'.repeat(256) };
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title with exactly 255 characters', () => {
      const data = { title: 'a'.repeat(255) };
      const result = QuizValidator.validateCreateQuiz(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCreateQuestion', () => {
    it('should accept valid question data', () => {
      const data = {
        prompt: 'What is TypeScript?',
        choices: ['A programming language', 'A database', 'A framework'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when prompt is missing', () => {
      const data = {
        choices: ['A', 'B'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should return error when prompt is not a string', () => {
      const data = {
        prompt: 123,
        choices: ['A', 'B'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should return error when prompt is empty', () => {
      const data = {
        prompt: '  ',
        choices: ['A', 'B'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should return error when choices is missing', () => {
      const data = {
        prompt: 'Question?',
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices array is required'
      });
    });

    it('should return error when choices is not an array', () => {
      const data = {
        prompt: 'Question?',
        choices: 'not an array',
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should return error when choices has less than 2 items', () => {
      const data = {
        prompt: 'Question?',
        choices: ['Only one'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should return error when choice is not a string', () => {
      const data = {
        prompt: 'Question?',
        choices: ['Valid', 123],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should return error when choice is empty string', () => {
      const data = {
        prompt: 'Question?',
        choices: ['Valid', '  '],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should return error when correct_index is missing', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B']
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index is required'
      });
    });

    it('should return error when correct_index is null', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: null
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index is required'
      });
    });

    it('should return error when correct_index is not an integer', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: 1.5
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should return error when correct_index is negative', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: -1
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should return error when correct_index is out of bounds', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: 2
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should accept correct_index of 0', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUpdateQuestion', () => {
    it('should accept valid update data', () => {
      const data = {
        prompt: 'Updated question?',
        choices: ['New A', 'New B', 'New C'],
        correct_index: 1
      };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept partial update with only prompt', () => {
      const data = { prompt: 'New prompt?' };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept empty update object', () => {
      const data = {};
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when prompt is not a string', () => {
      const data = { prompt: 123 };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt must be a string'
      });
    });

    it('should return error when prompt is empty', () => {
      const data = { prompt: '  ' };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should return error when choices is not an array', () => {
      const data = { choices: 'not an array' };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should return error when choices has less than 2 items', () => {
      const data = { choices: ['Only one'] };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should return error when choice is empty string', () => {
      const data = { choices: ['Valid', '  '] };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should return error when correct_index is not an integer', () => {
      const data = { correct_index: 1.5 };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should return error when correct_index is out of bounds with choices', () => {
      const data = { choices: ['A', 'B'], correct_index: 3 };
      const result = QuizValidator.validateUpdateQuestion(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });
  });

  describe('validateSubmission', () => {
    it('should accept valid submission', () => {
      const data = { answers: [0, 1, 2] };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when answers is missing', () => {
      const data = {};
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers array is required'
      });
    });

    it('should return error when answers is not an array', () => {
      const data = { answers: 'not an array' };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers must be an array'
      });
    });

    it('should return error when answers length does not match question count', () => {
      const data = { answers: [0, 1] };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 3 answers, got 2'
      });
    });

    it('should return error when answer is not an integer', () => {
      const data = { answers: [0, 1.5, 2] };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should return error when answer is negative', () => {
      const data = { answers: [0, -1, 2] };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should accept all zeros as answers', () => {
      const data = { answers: [0, 0, 0] };
      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(true);
    });

    it('should accept empty answers array when question count is 0', () => {
      const data = { answers: [] };
      const result = QuizValidator.validateSubmission(data, 0);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should accept valid lesson data', () => {
      const data = {
        title: 'Introduction to Variables',
        content_md: '# Variables\nLearn about variables',
        video_url: 'https://www.youtube.com/watch?v=example'
      };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept minimal valid lesson data', () => {
      const data = { title: 'Basic Lesson' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when title is missing', () => {
      const data = {};
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is not a string', () => {
      const data = { title: 123 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should return error when title is empty', () => {
      const data = { title: '  ' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should return error when title exceeds 255 characters', () => {
      const data = { title: 'a'.repeat(256) };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title with exactly 255 characters', () => {
      const data = { title: 'a'.repeat(255) };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when content_md is not a string', () => {
      const data = { title: 'Test', content_md: 123 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
    });

    it('should accept null content_md', () => {
      const data = { title: 'Test', content_md: null };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept undefined content_md', () => {
      const data = { title: 'Test' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when video_url is not a string', () => {
      const data = { title: 'Test', video_url: 123 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a string'
      });
    });

    it('should return error when video_url is invalid', () => {
      const data = { title: 'Test', video_url: 'not a valid url' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept valid https URL', () => {
      const data = { title: 'Test', video_url: 'https://example.com/video' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept valid http URL', () => {
      const data = { title: 'Test', video_url: 'http://example.com/video' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject ftp URL', () => {
      const data = { title: 'Test', video_url: 'ftp://example.com/video' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept empty string video_url', () => {
      const data = { title: 'Test', video_url: '' };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept null video_url', () => {
      const data = { title: 'Test', video_url: null };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when position is not a positive integer', () => {
      const data = { title: 'Test', position: 0 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should return error when position is negative', () => {
      const data = { title: 'Test', position: -1 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should return error when position is not an integer', () => {
      const data = { title: 'Test', position: 1.5 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should accept valid position', () => {
      const data = { title: 'Test', position: 5 };
      const result = LessonValidator.validateCreateLesson(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUpdateLesson', () => {
    it('should accept valid update data', () => {
      const data = {
        title: 'Updated Lesson',
        content_md: 'Updated content',
        video_url: 'https://example.com/new-video'
      };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept empty update object', () => {
      const data = {};
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when title is not a string', () => {
      const data = { title: 123 };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be a string'
      });
    });

    it('should return error when title is empty', () => {
      const data = { title: '  ' };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should return error when title exceeds 255 characters', () => {
      const data = { title: 'a'.repeat(256) };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should return error when content_md is not a string', () => {
      const data = { content_md: 123 };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content_md',
        message: 'Content must be a string'
      });
    });

    it('should return error when video_url is not a string', () => {
      const data = { video_url: 123 };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a string'
      });
    });

    it('should return error when video_url is invalid', () => {
      const data = { video_url: 'not a url' };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept empty string video_url', () => {
      const data = { video_url: '' };
      const result = LessonValidator.validateUpdateLesson(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateReorder', () => {
    it('should accept valid lessonIds array', () => {
      const data = { lessonIds: [1, 2, 3, 4] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when lessonIds is missing', () => {
      const data = {};
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array is required'
      });
    });

    it('should return error when lessonIds is not an array', () => {
      const data = { lessonIds: 'not an array' };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must be an array'
      });
    });

    it('should return error when lessonIds is empty', () => {
      const data = { lessonIds: [] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array cannot be empty'
      });
    });

    it('should return error when lessonId is not a positive integer', () => {
      const data = { lessonIds: [1, 0, 3] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should return error when lessonId is negative', () => {
      const data = { lessonIds: [1, -5, 3] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should return error when lessonId is not an integer', () => {
      const data = { lessonIds: [1, 2.5, 3] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should return error when lessonIds contains duplicates', () => {
      const data = { lessonIds: [1, 2, 1, 3] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must not contain duplicates'
      });
    });

    it('should accept single lesson ID', () => {
      const data = { lessonIds: [1] };
      const result = LessonValidator.validateReorder(data);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('EnrollmentValidator', () => {
  describe('validateCreateEnrollment', () => {
    it('should accept valid enrollment data', () => {
      const data = { courseId: 5 };
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when courseId is missing', () => {
      const data = {};
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is null', () => {
      const data = { courseId: null };
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is not an integer', () => {
      const data = { courseId: 1.5 };
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is zero', () => {
      const data = { courseId: 0 };
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is negative', () => {
      const data = { courseId: -5 };
      const result = EnrollmentValidator.validateCreateEnrollment(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });
  });

  describe('validateStatusUpdate', () => {
    it('should accept active status', () => {
      const data = { status: 'active' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept completed status', () => {
      const data = { status: 'completed' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(true);
    });

    it('should accept refunded status', () => {
      const data = { status: 'refunded' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when status is missing', () => {
      const data = {};
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status is required'
      });
    });

    it('should return error when status is invalid', () => {
      const data = { status: 'invalid' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status must be one of: active, completed, refunded'
      });
    });

    it('should return error when status is empty string', () => {
      const data = { status: '' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status is required'
      });
    });

    it('should return error for case-sensitive status', () => {
      const data = { status: 'Active' };
      const result = EnrollmentValidator.validateStatusUpdate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Status must be one of: active, completed, refunded'
      });
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = EnrollmentValidator.validatePagination({});
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should parse valid page and limit', () => {
      const result = EnrollmentValidator.validatePagination({ page: '3', limit: '25' });
      expect(result).toEqual({ page: 3, limit: 25 });
    });

    it('should ignore invalid page', () => {
      const result = EnrollmentValidator.validatePagination({ page: 'invalid' });
      expect(result.page).toBe(1);
    });

    it('should ignore negative page', () => {
      const result = EnrollmentValidator.validatePagination({ page: '-1' });
      expect(result.page).toBe(1);
    });

    it('should cap limit at 100', () => {
      const result = EnrollmentValidator.validatePagination({ limit: '200' });
      expect(result.limit).toBe(10);
    });

    it('should accept limit of exactly 100', () => {
      const result = EnrollmentValidator.validatePagination({ limit: '100' });
      expect(result.limit).toBe(100);
    });
  });
});

describe('ProgressValidator', () => {
  describe('validateMarkProgress', () => {
    it('should accept valid progress data', () => {
      const data = {
        enrollmentId: 10,
        lessonId: 5,
        completed: true
      };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept completed as false', () => {
      const data = {
        enrollmentId: 10,
        lessonId: 5,
        completed: false
      };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(true);
    });

    it('should return error when enrollmentId is missing', () => {
      const data = { lessonId: 5, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID is required'
      });
    });

    it('should return error when enrollmentId is zero', () => {
      const data = { enrollmentId: 0, lessonId: 5, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID is required'
      });
    });

    it('should return error when enrollmentId is negative', () => {
      const data = { enrollmentId: -1, lessonId: 5, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer'
      });
    });

    it('should return error when enrollmentId is not an integer', () => {
      const data = { enrollmentId: 1.5, lessonId: 5, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer'
      });
    });

    it('should return error when lessonId is missing', () => {
      const data = { enrollmentId: 10, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID is required'
      });
    });

    it('should return error when lessonId is zero', () => {
      const data = { enrollmentId: 10, lessonId: 0, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID is required'
      });
    });

    it('should return error when lessonId is negative', () => {
      const data = { enrollmentId: 10, lessonId: -5, completed: true };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonId',
        message: 'Lesson ID must be a positive integer'
      });
    });

    it('should return error when completed is missing', () => {
      const data = { enrollmentId: 10, lessonId: 5 };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed status is required'
      });
    });

    it('should return error when completed is null', () => {
      const data = { enrollmentId: 10, lessonId: 5, completed: null };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed status is required'
      });
    });

    it('should return error when completed is not a boolean', () => {
      const data = { enrollmentId: 10, lessonId: 5, completed: 'true' };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    });

    it('should return error when completed is a number', () => {
      const data = { enrollmentId: 10, lessonId: 5, completed: 1 };
      const result = ProgressValidator.validateMarkProgress(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    });
  });

  describe('validateCourseIdQuery', () => {
    it('should accept valid courseId', () => {
      const query = { courseId: '5' };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept numeric courseId', () => {
      const query = { courseId: 5 };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(true);
    });

    it('should return error when courseId is missing', () => {
      const query = {};
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });

    it('should return error when courseId is not a valid integer', () => {
      const query = { courseId: 'invalid' };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is zero', () => {
      const query = { courseId: '0' };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is negative', () => {
      const query = { courseId: '-5' };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is empty string', () => {
      const query = { courseId: '' };
      const result = ProgressValidator.validateCourseIdQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    });
  });
});

describe('CertificateValidator', () => {
  describe('validateIssueCertificate', () => {
    it('should accept valid certificate data', () => {
      const data = {
        userId: 10,
        courseId: 5
      };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when data is null', () => {
      const result = CertificateValidator.validateIssueCertificate(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when data is undefined', () => {
      const result = CertificateValidator.validateIssueCertificate(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when data is not an object', () => {
      const result = CertificateValidator.validateIssueCertificate('not an object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when userId is missing', () => {
      const data = { courseId: 5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should return error when userId is null', () => {
      const data = { userId: null, courseId: 5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID is required'
      });
    });

    it('should return error when userId is not an integer', () => {
      const data = { userId: 1.5, courseId: 5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
    });

    it('should return error when userId is zero', () => {
      const data = { userId: 0, courseId: 5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
    });

    it('should return error when userId is negative', () => {
      const data = { userId: -1, courseId: 5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
    });

    it('should return error when courseId is missing', () => {
      const data = { userId: 10 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is null', () => {
      const data = { userId: 10, courseId: null };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is not an integer', () => {
      const data = { userId: 10, courseId: 5.5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is zero', () => {
      const data = { userId: 10, courseId: 0 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is negative', () => {
      const data = { userId: 10, courseId: -5 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const data = { userId: 0, courseId: -1 };
      const result = CertificateValidator.validateIssueCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateClaimCertificate', () => {
    it('should accept valid claim data', () => {
      const data = { courseId: 5 };
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when data is null', () => {
      const result = CertificateValidator.validateClaimCertificate(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when data is undefined', () => {
      const result = CertificateValidator.validateClaimCertificate(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when data is not an object', () => {
      const result = CertificateValidator.validateClaimCertificate(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'data',
        message: 'Invalid data provided'
      });
    });

    it('should return error when courseId is missing', () => {
      const data = {};
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is null', () => {
      const data = { courseId: null };
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID is required'
      });
    });

    it('should return error when courseId is not an integer', () => {
      const data = { courseId: 5.5 };
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is zero', () => {
      const data = { courseId: 0 };
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });

    it('should return error when courseId is negative', () => {
      const data = { courseId: -5 };
      const result = CertificateValidator.validateClaimCertificate(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    });
  });

  describe('validateCertificateCode', () => {
    it('should accept valid certificate code', () => {
      const code = 'CERT123456789';
      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept code with exactly 10 characters', () => {
      const code = 'a'.repeat(10);
      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(true);
    });

    it('should accept code with exactly 100 characters', () => {
      const code = 'a'.repeat(100);
      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(true);
    });

    it('should return error when code is missing', () => {
      const result = CertificateValidator.validateCertificateCode(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Certificate code is required'
      });
    });

    it('should return error when code is undefined', () => {
      const result = CertificateValidator.validateCertificateCode(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Certificate code is required'
      });
    });

    it('should return error when code is empty string', () => {
      const result = CertificateValidator.validateCertificateCode('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Certificate code is required'
      });
    });

    it('should return error when code is not a string', () => {
      const result = CertificateValidator.validateCertificateCode(123);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Certificate code must be a string'
      });
    });

    it('should return error when code is less than 10 characters', () => {
      const code = 'SHORT';
      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    });

    it('should return error when code is more than 100 characters', () => {
      const code = 'a'.repeat(101);
      const result = CertificateValidator.validateCertificateCode(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    });
  });
});
