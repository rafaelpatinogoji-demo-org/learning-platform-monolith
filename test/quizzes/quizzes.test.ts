import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuizzesService } from '../../src/services/quizzes.service';
import { QuizValidator } from '../../src/utils/validation';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('QuizValidator', () => {
  describe('validateSubmission', () => {
    it('should pass validation for valid submission data', () => {
      const data = {
        answers: [0, 1, 2]
      };

      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when answers is missing', () => {
      const data = {};

      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'answers', message: 'Answers array is required' })
      );
    });

    it('should fail when answers is not an array', () => {
      const data = {
        answers: 'not an array'
      };

      const result = QuizValidator.validateSubmission(data as any, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'answers', message: 'Answers must be an array' })
      );
    });

    it('should fail when answers length does not match questionCount', () => {
      const data = {
        answers: [0, 1]
      };

      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'answers', message: 'Expected 3 answers, got 2' })
      );
    });

    it('should fail when answer is not a number', () => {
      const data = {
        answers: [0, 'invalid', 2]
      };

      const result = QuizValidator.validateSubmission(data as any, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('answers');
      expect(result.errors[0].message).toContain('must be a non-negative integer');
    });

    it('should fail when answer is negative', () => {
      const data = {
        answers: [0, -1, 2]
      };

      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('answers');
      expect(result.errors[0].message).toContain('must be a non-negative integer');
    });

    it('should fail when answer is not an integer', () => {
      const data = {
        answers: [0, 1.5, 2]
      };

      const result = QuizValidator.validateSubmission(data, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('answers');
      expect(result.errors[0].message).toContain('must be a non-negative integer');
    });

    it('should accept empty answers array when questionCount is 0', () => {
      const data = {
        answers: []
      };

      const result = QuizValidator.validateSubmission(data, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitQuiz', () => {
    it('should calculate 100% score for all correct answers', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1, 2], 1);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should calculate 0% score for all wrong answers', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [1, 2, 0], 1);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should calculate 60% score for 3 out of 5 correct', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 },
            { id: 4, correct_index: 0 },
            { id: 5, correct_index: 1 }
          ],
          rowCount: 5
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1, 2, 1, 2], 1);

      expect(result.score).toBe(60);
      expect(result.correct).toBe(3);
      expect(result.total).toBe(5);
    });

    it('should calculate 50% score for 1 out of 2 correct', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 }
          ],
          rowCount: 2
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 0], 1);

      expect(result.score).toBe(50);
      expect(result.correct).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should save submission with JSON stringified answers', async () => {
      const answers = [0, 1, 2];
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      await QuizzesService.submitQuiz(1, answers, 1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quiz_submissions'),
        expect.arrayContaining([1, 1, JSON.stringify(answers), 100])
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.submitQuiz(999, [0, 1], 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN for unpublished course', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, published: false }],
        rowCount: 1
      } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatches', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should handle quiz with single question', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, correct_index: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [2], 1);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should handle quiz with many questions', async () => {
      const questions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        correct_index: i % 4
      }));
      const answers = questions.map(q => q.correct_index);

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: questions,
          rowCount: 10
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, answers, 1);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(10);
      expect(result.total).toBe(10);
    });
  });
});
