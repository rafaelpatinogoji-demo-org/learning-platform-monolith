import { describe, it, expect } from '@jest/globals';
import { QuizValidator } from '../../src/utils/validation';

describe('QuizValidator', () => {
  describe('validateCreateQuiz', () => {
    it('should pass validation with valid quiz data', () => {
      const validData = {
        title: 'Introduction to JavaScript',
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when title is missing', () => {
      const invalidData = {
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should fail when title is not a string', () => {
      const invalidData = {
        title: 123,
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should fail when title is empty string', () => {
      const invalidData = {
        title: '',
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should fail when title is only whitespace', () => {
      const invalidData = {
        title: '   ',
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should fail when title exceeds 255 characters', () => {
      const invalidData = {
        title: 'a'.repeat(256),
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should pass when title is exactly 255 characters', () => {
      const validData = {
        title: 'a'.repeat(255),
        course_id: 1
      };

      const result = QuizValidator.validateCreateQuiz(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCreateQuestion', () => {
    it('should pass validation with valid question data', () => {
      const validData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5', '6'],
        correct_index: 1,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when prompt is missing', () => {
      const invalidData = {
        choices: ['A', 'B'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should fail when prompt is not a string', () => {
      const invalidData = {
        prompt: 123,
        choices: ['A', 'B'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should fail when prompt is empty string', () => {
      const invalidData = {
        prompt: '',
        choices: ['A', 'B'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'prompt',
        message: 'Prompt is required and must be a string'
      });
    });

    it('should fail when choices is missing', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices array is required'
      });
    });

    it('should fail when choices is not an array', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: 'not an array',
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choices must be an array'
      });
    });

    it('should fail when choices has less than 2 elements', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['Only one'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'At least 2 choices are required'
      });
    });

    it('should pass when choices has exactly 2 elements', () => {
      const validData = {
        prompt: 'True or False?',
        choices: ['True', 'False'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when choices contains non-string elements', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', 4, '5'],
        correct_index: 1,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should fail when choices contains empty strings', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '', '5'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should fail when correct_index is missing', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index is required'
      });
    });

    it('should fail when correct_index is not an integer', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: 1.5,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be an integer'
      });
    });

    it('should fail when correct_index is negative', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: -1,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 2'
      });
    });

    it('should fail when correct_index equals choices length', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: 3,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 2'
      });
    });

    it('should fail when correct_index exceeds choices length', () => {
      const invalidData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: 10,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 2'
      });
    });

    it('should pass when correct_index is 0 (first element)', () => {
      const validData = {
        prompt: 'What is 2 + 2?',
        choices: ['4', '3', '5'],
        correct_index: 0,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when correct_index is last element', () => {
      const validData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '5', '4'],
        correct_index: 2,
        quiz_id: 1
      };

      const result = QuizValidator.validateCreateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUpdateQuestion', () => {
    it('should pass validation with valid partial update', () => {
      const validData = {
        prompt: 'Updated prompt'
      };

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when updating only choices and correct_index', () => {
      const validData = {
        choices: ['New A', 'New B', 'New C'],
        correct_index: 1
      };

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when prompt is not a string', () => {
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

    it('should fail when prompt is empty string', () => {
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

    it('should fail when choices is provided but not an array', () => {
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

    it('should fail when choices has less than 2 elements', () => {
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

    it('should fail when choices contains non-strings', () => {
      const invalidData = {
        choices: ['Valid', 123, 'Another']
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'choices',
        message: 'Choice at index 1 must be a non-empty string'
      });
    });

    it('should pass when correct_index is provided without choices', () => {
      const invalidData = {
        correct_index: 1
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail when correct_index is out of bounds for provided choices', () => {
      const invalidData = {
        choices: ['A', 'B', 'C'],
        correct_index: 5
      };

      const result = QuizValidator.validateUpdateQuestion(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'correct_index',
        message: 'Correct index must be between 0 and 2'
      });
    });

    it('should pass when no fields are provided', () => {
      const validData = {};

      const result = QuizValidator.validateUpdateQuestion(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSubmission', () => {
    it('should pass validation with valid submission', () => {
      const validData = {
        answers: [0, 1, 2, 0, 1]
      };

      const result = QuizValidator.validateSubmission(validData, 5);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when answers is missing', () => {
      const invalidData = {};

      const result = QuizValidator.validateSubmission(invalidData, 5);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers array is required'
      });
    });

    it('should fail when answers is not an array', () => {
      const invalidData = {
        answers: 'not an array'
      };

      const result = QuizValidator.validateSubmission(invalidData, 5);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answers must be an array'
      });
    });

    it('should fail when answers length does not match questionCount', () => {
      const invalidData = {
        answers: [0, 1, 2]
      };

      const result = QuizValidator.validateSubmission(invalidData, 5);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Expected 5 answers, got 3'
      });
    });

    it('should fail when answers contains non-integer values', () => {
      const invalidData = {
        answers: [0, 1.5, 2]
      };

      const result = QuizValidator.validateSubmission(invalidData, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should fail when answers contains negative values', () => {
      const invalidData = {
        answers: [0, -1, 2]
      };

      const result = QuizValidator.validateSubmission(invalidData, 3);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'answers',
        message: 'Answer at index 1 must be a non-negative integer'
      });
    });

    it('should pass with all zero answers', () => {
      const validData = {
        answers: [0, 0, 0]
      };

      const result = QuizValidator.validateSubmission(validData, 3);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass with empty answers array when questionCount is 0', () => {
      const validData = {
        answers: []
      };

      const result = QuizValidator.validateSubmission(validData, 0);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
