import { QuizValidator } from '../../src/utils/validation';

describe('QuizValidator', () => {
  describe('validateCreateQuiz', () => {
    it('should validate valid quiz data', () => {
      const data = { title: 'Test Quiz' };
      const result = QuizValidator.validateCreateQuiz(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const data = {};
      const result = QuizValidator.validateCreateQuiz(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject non-string title', () => {
      const data = { title: 123 };
      const result = QuizValidator.validateCreateQuiz(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      const data = { title: '   ' };
      const result = QuizValidator.validateCreateQuiz(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
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
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCreateQuestion', () => {
    it('should validate valid question data', () => {
      const data = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: 1
      };
      const result = QuizValidator.validateCreateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing prompt', () => {
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

    it('should reject non-string prompt', () => {
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

    it('should reject empty prompt', () => {
      const data = {
        prompt: '   ',
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

    it('should reject missing choices', () => {
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

    it('should reject non-array choices', () => {
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

    it('should reject too few choices', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should reject empty choice strings', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', '   ', 'C'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should reject non-string choices', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 123, 'C'],
        correct_index: 0
      };
      const result = QuizValidator.validateCreateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should reject missing correct_index', () => {
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

    it('should reject non-integer correct_index', () => {
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

    it('should reject negative correct_index', () => {
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

    it('should reject correct_index beyond choices length', () => {
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

    it('should accept correct_index at upper bound', () => {
      const data = {
        prompt: 'Question?',
        choices: ['A', 'B', 'C'],
        correct_index: 2
      };
      const result = QuizValidator.validateCreateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUpdateQuestion', () => {
    it('should validate valid update data', () => {
      const data = {
        prompt: 'Updated question?',
        choices: ['X', 'Y', 'Z'],
        correct_index: 1
      };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept empty update data (all fields optional)', () => {
      const data = {};
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update with only prompt', () => {
      const data = { prompt: 'Updated prompt' };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update with only choices', () => {
      const data = { choices: ['New A', 'New B'] };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid prompt when provided', () => {
      const data = { prompt: '   ' };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should reject non-string prompt when provided', () => {
      const data = { prompt: 123 };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt must be a string'
      });
    });

    it('should reject invalid choices when provided', () => {
      const data = { choices: ['A'] };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should reject non-array choices when provided', () => {
      const data = { choices: 'not an array' };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should reject empty choice strings when provided', () => {
      const data = { choices: ['A', '', 'C'] };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should reject invalid correct_index when provided', () => {
      const data = { correct_index: 1.5 };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should validate correct_index bounds with new choices', () => {
      const data = {
        choices: ['A', 'B'],
        correct_index: 2
      };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should accept valid correct_index with new choices', () => {
      const data = {
        choices: ['A', 'B', 'C'],
        correct_index: 2
      };
      const result = QuizValidator.validateUpdateQuestion(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSubmission', () => {
    it('should validate valid submission', () => {
      const data = { answers: [0, 1, 2] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing answers', () => {
      const data = {};
      const result = QuizValidator.validateSubmission(data, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers array is required'
      });
    });

    it('should reject non-array answers', () => {
      const data = { answers: 'not an array' };
      const result = QuizValidator.validateSubmission(data, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers must be an array'
      });
    });

    it('should reject wrong number of answers (too few)', () => {
      const data = { answers: [0, 1] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 3 answers, got 2'
      });
    });

    it('should reject wrong number of answers (too many)', () => {
      const data = { answers: [0, 1, 2, 3] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 3 answers, got 4'
      });
    });

    it('should reject non-integer answer values', () => {
      const data = { answers: [0, 1.5, 2] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should reject negative answer values', () => {
      const data = { answers: [0, -1, 2] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should accept zero as valid answer', () => {
      const data = { answers: [0, 0, 0] };
      const result = QuizValidator.validateSubmission(data, 3);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate submission with single question', () => {
      const data = { answers: [2] };
      const result = QuizValidator.validateSubmission(data, 1);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty submission for quiz with no questions', () => {
      const data = { answers: [] };
      const result = QuizValidator.validateSubmission(data, 0);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
