/**
 * Tests for QuizValidator
 * 
 * Tests validation logic for quiz creation, question management, and submissions
 * focusing on MCQ format validation and data integrity.
 */

import { QuizValidator } from '../../src/utils/validation';

describe('QuizValidator', () => {
  describe('validateCreateQuiz', () => {
    it('should validate valid quiz data', () => {
      // Arrange
      const validData = {
        title: 'Introduction to JavaScript'
      };

      // Act
      const result = QuizValidator.validateCreateQuiz(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing title', () => {
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

    it('should reject non-string title', () => {
      // Arrange
      const invalidData = {
        title: 123
      };

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
      const invalidData = {
        title: '   '
      };

      // Act
      const result = QuizValidator.validateCreateQuiz(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject title that is too long', () => {
      // Arrange
      const invalidData = {
        title: 'a'.repeat(256)
      };

      // Act
      const result = QuizValidator.validateCreateQuiz(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept title at maximum length', () => {
      // Arrange
      const validData = {
        title: 'a'.repeat(255)
      };

      // Act
      const result = QuizValidator.validateCreateQuiz(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateCreateQuestion', () => {
    it('should validate valid MCQ question data', () => {
      // Arrange
      const validData = {
        prompt: 'What is the capital of France?',
        choices: ['London', 'Paris', 'Berlin', 'Madrid'],
        correct_index: 1
      };

      // Act
      const result = QuizValidator.validateCreateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing prompt', () => {
      // Arrange
      const invalidData = {
        choices: ['A', 'B'],
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
        choices: ['A', 'B'],
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

    it('should reject missing choices array', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
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
        prompt: 'Test question?',
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

    it('should reject choices array with less than 2 items', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
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

    it('should reject choices with non-string items', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
        choices: ['Valid choice', 123],
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

    it('should reject choices with empty string items', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
        choices: ['Valid choice', '   '],
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

    it('should reject missing correct_index', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
        choices: ['A', 'B']
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
        prompt: 'Test question?',
        choices: ['A', 'B'],
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

    it('should reject correct_index out of bounds (negative)', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
        choices: ['A', 'B'],
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

    it('should reject correct_index out of bounds (too high)', () => {
      // Arrange
      const invalidData = {
        prompt: 'Test question?',
        choices: ['A', 'B'],
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

    it('should accept correct_index at upper bound', () => {
      // Arrange
      const validData = {
        prompt: 'Test question?',
        choices: ['A', 'B', 'C'],
        correct_index: 2
      };

      // Act
      const result = QuizValidator.validateCreateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept correct_index at lower bound', () => {
      // Arrange
      const validData = {
        prompt: 'Test question?',
        choices: ['A', 'B'],
        correct_index: 0
      };

      // Act
      const result = QuizValidator.validateCreateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateUpdateQuestion', () => {
    it('should validate valid partial update data', () => {
      // Arrange
      const validData = {
        prompt: 'Updated question?'
      };

      // Act
      const result = QuizValidator.validateUpdateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate empty update data', () => {
      // Arrange
      const validData = {};

      // Act
      const result = QuizValidator.validateUpdateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid prompt in update', () => {
      // Arrange
      const invalidData = {
        prompt: '   '
      };

      // Act
      const result = QuizValidator.validateUpdateQuestion(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt cannot be empty'
      });
    });

    it('should reject invalid choices in update', () => {
      // Arrange
      const invalidData = {
        choices: ['Only one']
      };

      // Act
      const result = QuizValidator.validateUpdateQuestion(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should reject correct_index out of bounds in update', () => {
      // Arrange
      const invalidData = {
        choices: ['A', 'B'],
        correct_index: 3
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

    it('should validate complete update data', () => {
      // Arrange
      const validData = {
        prompt: 'Updated question?',
        choices: ['New A', 'New B', 'New C'],
        correct_index: 2
      };

      // Act
      const result = QuizValidator.validateUpdateQuestion(validData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('validateSubmission', () => {
    it('should validate valid submission data', () => {
      // Arrange
      const validData = {
        answers: [1, 0, 2]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(validData, questionCount);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing answers array', () => {
      // Arrange
      const invalidData = {};
      const questionCount = 2;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers array is required'
      });
    });

    it('should reject non-array answers', () => {
      // Arrange
      const invalidData = {
        answers: 'not an array'
      };
      const questionCount = 2;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers must be an array'
      });
    });

    it('should reject answers array with wrong length', () => {
      // Arrange
      const invalidData = {
        answers: [1, 0]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 3 answers, got 2'
      });
    });

    it('should reject non-integer answers', () => {
      // Arrange
      const invalidData = {
        answers: [1, 'invalid', 2]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should reject negative answers', () => {
      // Arrange
      const invalidData = {
        answers: [1, -1, 2]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should reject floating point answers', () => {
      // Arrange
      const invalidData = {
        answers: [1, 1.5, 2]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(invalidData, questionCount);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should accept zero as valid answer', () => {
      // Arrange
      const validData = {
        answers: [0, 1, 0]
      };
      const questionCount = 3;

      // Act
      const result = QuizValidator.validateSubmission(validData, questionCount);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate single question submission', () => {
      // Arrange
      const validData = {
        answers: [2]
      };
      const questionCount = 1;

      // Act
      const result = QuizValidator.validateSubmission(validData, questionCount);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate empty submission for zero questions', () => {
      // Arrange
      const validData = {
        answers: []
      };
      const questionCount = 0;

      // Act
      const result = QuizValidator.validateSubmission(validData, questionCount);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
