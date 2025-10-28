/**
 * Tests for QuizValidator
 * 
 * Tests all validation methods for quiz creation, question management,
 * and submission validation without any external dependencies.
 */

import { QuizValidator } from '../../src/utils/validation';

describe('QuizValidator', () => {
  describe('validateCreateQuiz', () => {
    it('should validate valid quiz creation data', () => {
      const validData = {
        title: 'Introduction to JavaScript'
      };

      const result = QuizValidator.validateCreateQuiz(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing title', () => {
      const invalidData = {};

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject non-string title', () => {
      const invalidData = {
        title: 123
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '   '
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title longer than 255 characters', () => {
      const invalidData = {
        title: 'a'.repeat(256)
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title with exactly 255 characters', () => {
      const validData = {
        title: 'a'.repeat(255)
      };

      const result = QuizValidator.validateCreateQuiz(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCreateQuestion', () => {
    it('should validate valid question creation data', () => {
      const validData = {
        prompt: 'What is the capital of France?',
        choices: ['London', 'Berlin', 'Paris', 'Madrid'],
        correct_index: 2
      };

      const result = QuizValidator.validateCreateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing prompt', () => {
      const invalidData = {
        choices: ['A', 'B'],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should reject non-string prompt', () => {
      const invalidData = {
        prompt: 123,
        choices: ['A', 'B'],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should reject empty prompt', () => {
      const invalidData = {
        prompt: '   ',
        choices: ['A', 'B'],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should reject missing choices', () => {
      const invalidData = {
        prompt: 'Question?',
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices array is required'
      });
    });

    it('should reject non-array choices', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: 'not an array',
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should reject choices with less than 2 options', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['Only one'],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should reject choices with non-string elements', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['Valid choice', 123],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should reject choices with empty string elements', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['Valid choice', '   '],
        correct_index: 0
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should reject missing correct_index', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['A', 'B']
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index is required'
      });
    });

    it('should reject null correct_index', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: null
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index is required'
      });
    });

    it('should reject non-integer correct_index', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: 1.5
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should reject correct_index out of bounds (negative)', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: -1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should reject correct_index out of bounds (too high)', () => {
      const invalidData = {
        prompt: 'Question?',
        choices: ['A', 'B'],
        correct_index: 2
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should accept correct_index at boundary values', () => {
      const validData1 = {
        prompt: 'Question?',
        choices: ['A', 'B', 'C'],
        correct_index: 0
      };

      const validData2 = {
        prompt: 'Question?',
        choices: ['A', 'B', 'C'],
        correct_index: 2
      };

      expect(QuizValidator.validateCreateQuestion(validData1).isValid).toBe(true);
      expect(QuizValidator.validateCreateQuestion(validData2).isValid).toBe(true);
    });
  });

  describe('validateUpdateQuestion', () => {
    it('should validate valid question update data', () => {
      const validData = {
        prompt: 'Updated question?',
        choices: ['New A', 'New B', 'New C'],
        correct_index: 1
      };

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate partial update data', () => {
      const validData = {
        prompt: 'Updated question only'
      };

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty update data', () => {
      const validData = {};

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string prompt when provided', () => {
      const invalidData = {
        prompt: 123
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt must be a string'
      });
    });

    it('should reject empty prompt when provided', () => {
      const invalidData = {
        prompt: '   '
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should reject non-array choices when provided', () => {
      const invalidData = {
        choices: 'not an array'
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should reject choices with less than 2 options when provided', () => {
      const invalidData = {
        choices: ['Only one']
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should reject non-integer correct_index when provided', () => {
      const invalidData = {
        correct_index: 1.5
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should validate correct_index bounds when choices are also provided', () => {
      const invalidData = {
        choices: ['A', 'B'],
        correct_index: 2
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 1'
      });
    });

    it('should allow correct_index without choices validation', () => {
      const validData = {
        correct_index: 5
      };

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSubmission', () => {
    it('should validate valid submission data', () => {
      const validData = {
        answers: [0, 1, 2, 0]
      };
      const questionCount = 4;

      const result = QuizValidator.validateSubmission(validData, questionCount);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing answers', () => {
      const invalidData = {};
      const questionCount = 2;

      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers array is required'
      });
    });

    it('should reject non-array answers', () => {
      const invalidData = {
        answers: 'not an array'
      };
      const questionCount = 2;

      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers must be an array'
      });
    });

    it('should reject answers with wrong length', () => {
      const invalidData = {
        answers: [0, 1]
      };
      const questionCount = 3;

      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 3 answers, got 2'
      });
    });

    it('should reject non-integer answers', () => {
      const invalidData = {
        answers: [0, 1.5]
      };
      const questionCount = 2;

      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should reject negative answers', () => {
      const invalidData = {
        answers: [0, -1]
      };
      const questionCount = 2;

      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should accept zero as valid answer', () => {
      const validData = {
        answers: [0, 0, 0]
      };
      const questionCount = 3;

      const result = QuizValidator.validateSubmission(validData, questionCount);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty quiz (zero questions)', () => {
      const validData = {
        answers: []
      };
      const questionCount = 0;

      const result = QuizValidator.validateSubmission(validData, questionCount);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
