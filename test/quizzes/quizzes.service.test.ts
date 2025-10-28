/**
 * Tests for QuizzesService
 * 
 * Tests business logic, database operations, authorization, scoring algorithms,
 * and JSONB data handling without any actual database dependencies.
 */

import { QuizzesService } from '../../src/services/quizzes.service';
import { QueryResult } from 'pg';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

import { db } from '../../src/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz when user is course owner', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() }],
          rowCount: 1
        } as QueryResult);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 1);

      expect(result).toEqual({
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        created_at: expect.any(Date)
      });
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [1, 'Test Quiz']
      );
    });

    it('should create quiz when user is admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as QueryResult)
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() }],
          rowCount: 1
        } as QueryResult);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 2);

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [1, 'Test Quiz']
      );
    });

    it('should throw FORBIDDEN when user cannot modify course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }], rowCount: 1 } as QueryResult);

      await expect(QuizzesService.createQuiz(1, 'Test Quiz', 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw FORBIDDEN when course does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.createQuiz(999, 'Test Quiz', 1))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should return quizzes for published course without authentication', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: true, instructor_id: 1 }], rowCount: 1 } as QueryResult)
        .mockResolvedValueOnce({ 
          rows: [
            { id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() },
            { id: 2, course_id: 1, title: 'Quiz 2', created_at: new Date() }
          ],
          rowCount: 2
        } as QueryResult);

      const result = await QuizzesService.listQuizzesForCourse(1);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Quiz 1');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
        [1]
      );
    });

    it('should return quizzes for unpublished course when user is owner', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 1 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() }],
          rowCount: 1, command: 'SELECT', oid: 0, fields: []
        } as QueryResult);

      const result = await QuizzesService.listQuizzesForCourse(1, 1);

      expect(result).toHaveLength(1);
    });

    it('should return quizzes for unpublished course when user is admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 999 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() }],
          rowCount: 1, command: 'SELECT', oid: 0, fields: []
        } as QueryResult);

      const result = await QuizzesService.listQuizzesForCourse(1, 2);

      expect(result).toHaveLength(1);
    });

    it('should throw FORBIDDEN for unpublished course without access', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 999 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.listQuizzesForCourse(1, 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw FORBIDDEN when course does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.listQuizzesForCourse(999))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getQuizById', () => {
    const mockQuiz = {
      id: 1,
      course_id: 1,
      title: 'Test Quiz',
      created_at: new Date(),
      published: true,
      instructor_id: 1
    };

    const mockQuestions = [
      {
        id: 1,
        quiz_id: 1,
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1,
        created_at: new Date()
      },
      {
        id: 2,
        quiz_id: 1,
        prompt: 'What is 3+3?',
        choices: ['5', '6', '7'],
        correct_index: 1,
        created_at: new Date()
      }
    ];

    it('should return quiz with questions for instructor', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.getQuizById(1, 1);

      expect(result.quiz).toEqual({
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        created_at: expect.any(Date)
      });
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).toHaveProperty('correct_index');
    });

    it('should return quiz without correct_index for students', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.getQuizById(1, 2);

      expect(result.questions[0]).not.toHaveProperty('correct_index');
      expect(result.questions[0]).toHaveProperty('prompt');
      expect(result.questions[0]).toHaveProperty('choices');
    });

    it('should return quiz with questions for admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.getQuizById(1, 3);

      expect(result.questions[0]).toHaveProperty('correct_index');
    });

    it('should throw NOT_FOUND for students when course is unpublished', async () => {
      const unpublishedQuiz = { ...mockQuiz, published: false };
      mockDb.query
        .mockResolvedValueOnce({ rows: [unpublishedQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.getQuizById(1, 2))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.getQuizById(999, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create question when user is quiz owner', async () => {
      const mockQuiz = { id: 1, instructor_id: 1 };
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.createQuestion(
        1, 'What is 2+2?', ['3', '4', '5'], 1, 1
      );

      expect(result).toEqual(mockQuestion);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [1, 'What is 2+2?', JSON.stringify(['3', '4', '5']), 1]
      );
    });

    it('should create question when user is admin', async () => {
      const mockQuiz = { id: 1, instructor_id: 999 };
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.createQuestion(
        1, 'What is 2+2?', ['3', '4', '5'], 1, 2
      );

      expect(result).toEqual(mockQuestion);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.createQuestion(
        999, 'What is 2+2?', ['3', '4', '5'], 1, 1
      )).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const mockQuiz = { id: 1, instructor_id: 999 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.createQuestion(
        1, 'What is 2+2?', ['3', '4', '5'], 1, 1
      )).rejects.toThrow('FORBIDDEN');
    });

    it('should properly serialize JSONB choices array', async () => {
      const mockQuiz = { id: 1, instructor_id: 1 };
      const choices = ['Option A', 'Option B', 'Option C', 'Option D'];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{}], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.createQuestion(1, 'Test question', choices, 2, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [1, 'Test question', JSON.stringify(choices), 2]
      );
    });
  });

  describe('updateQuestion', () => {
    const mockQuiz = { id: 1, instructor_id: 1 };
    const mockQuestion = { id: 1, quiz_id: 1, prompt: 'Original prompt' };

    it('should update question when user is owner', async () => {
      const updatedQuestion = { 
        id: 1, 
        quiz_id: 1, 
        prompt: 'Updated prompt',
        choices: ['A', 'B'],
        correct_index: 0
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [updatedQuestion], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.updateQuestion(
        1, 1, { prompt: 'Updated prompt', choices: ['A', 'B'], correct_index: 0 }, 1
      );

      expect(result).toEqual(updatedQuestion);
    });

    it('should update only provided fields', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.updateQuestion(1, 1, { prompt: 'New prompt' }, 1);

      const updateCall = mockDb.query.mock.calls[3];
      expect(updateCall[0]).toContain('prompt = $1');
      expect(updateCall[0]).not.toContain('choices');
      expect(updateCall[0]).not.toContain('correct_index');
    });

    it('should return original question when no updates provided', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.updateQuestion(1, 1, {}, 1);

      expect(result).toEqual(mockQuestion);
      expect(mockDb.query).toHaveBeenCalledTimes(3); // No update query
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.updateQuestion(1, 1, { prompt: 'New' }, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.updateQuestion(1, 999, { prompt: 'New' }, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user lacks permission', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.updateQuestion(1, 1, { prompt: 'New' }, 2))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should properly serialize JSONB choices in update', async () => {
      const newChoices = ['New A', 'New B', 'New C'];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{}], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.updateQuestion(1, 1, { choices: newChoices }, 1);

      const updateCall = mockDb.query.mock.calls[3];
      expect(updateCall[1]).toContain(JSON.stringify(newChoices));
    });
  });

  describe('deleteQuestion', () => {
    const mockQuiz = { id: 1, instructor_id: 1 };

    it('should delete question when user is owner', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.deleteQuestion(1, 1, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
        [1, 1]
      );
    });

    it('should delete question when user is admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 999 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.deleteQuestion(1, 1, 2);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
        [1, 1]
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.deleteQuestion(999, 1, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user lacks permission', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.deleteQuestion(1, 1, 2))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.deleteQuestion(1, 999, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('submitQuiz', () => {
    const mockQuiz = {
      id: 1,
      published: true,
      course_id: 1
    };

    const mockEnrollment = {
      id: 1,
      user_id: 1,
      course_id: 1,
      status: 'active'
    };

    const mockQuestions = [
      { id: 1, correct_index: 1 },
      { id: 2, correct_index: 0 },
      { id: 3, correct_index: 2 }
    ];

    it('should submit quiz and calculate correct score', async () => {
      const answers = [1, 0, 2]; // All correct

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.submitQuiz(1, answers, 1);

      expect(result).toEqual({
        total: 3,
        correct: 3,
        score: 100,
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: true },
          { id: 3, correct: true }
        ]
      });
    });

    it('should calculate partial score correctly', async () => {
      const answers = [1, 1, 2]; // 2 out of 3 correct

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.submitQuiz(1, answers, 1);

      expect(result.total).toBe(3);
      expect(result.correct).toBe(2);
      expect(result.score).toBeCloseTo(66.67, 2);
      expect(result.questions[1].correct).toBe(false);
    });

    it('should calculate zero score correctly', async () => {
      const answers = [0, 1, 1]; // All wrong

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.submitQuiz(1, answers, 1);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
    });

    it('should handle empty quiz (no questions)', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.submitQuiz(1, [], 1);

      expect(result.score).toBe(0);
      expect(result.total).toBe(0);
      expect(result.correct).toBe(0);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.submitQuiz(999, [1, 0], 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when course is not published', async () => {
      const unpublishedQuiz = { ...mockQuiz, published: false };
      mockDb.query.mockResolvedValueOnce({ rows: [unpublishedQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.submitQuiz(1, [1, 0], 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.submitQuiz(1, [1, 0], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw NOT_ENROLLED when enrollment is not active', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.submitQuiz(1, [1, 0, 2], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatch', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.submitQuiz(1, [1, 0], 1)) // 2 answers
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should properly serialize JSONB answers array', async () => {
      const answers = [1, 0, 2];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: mockQuestions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] } as QueryResult);

      await QuizzesService.submitQuiz(1, answers, 1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES ($1, $2, $3, $4)',
        [1, 1, JSON.stringify(answers), 100]
      );
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission when exists', async () => {
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [1, 0, 2],
        score: 66.67,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSubmission], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toEqual(mockSubmission);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [1, 1]
      );
    });

    it('should return null when no submission exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    const mockQuiz = { id: 1, instructor_id: 1 };
    const mockSubmissions = [
      {
        id: 1,
        user_id: 1,
        user_name: 'John Doe',
        user_email: 'john@example.com',
        score: '85.5',
        answers: [1, 0, 2],
        created_at: new Date()
      },
      {
        id: 2,
        user_id: 2,
        user_name: 'Jane Smith',
        user_email: 'jane@example.com',
        score: '92.0',
        answers: [1, 1, 2],
        created_at: new Date()
      }
    ];

    it('should return submissions when user is quiz owner', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockSubmissions, rowCount: mockSubmissions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.listSubmissions(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        user: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        },
        score: 85.5,
        answers: [1, 0, 2],
        created_at: expect.any(Date)
      });
    });

    it('should return submissions when user is admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 999 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: mockSubmissions, rowCount: mockSubmissions.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.listSubmissions(1, 2);

      expect(result).toHaveLength(2);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.listSubmissions(999, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user lacks permission', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      await expect(QuizzesService.listSubmissions(1, 2))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should properly parse score as float', async () => {
      const submissionWithStringScore = [{
        ...mockSubmissions[0],
        score: '75.25'
      }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as QueryResult)
        .mockResolvedValueOnce({ rows: submissionWithStringScore, rowCount: submissionWithStringScore.length, command: 'SELECT', oid: 0, fields: [] } as QueryResult);

      const result = await QuizzesService.listSubmissions(1, 1);

      expect(result[0].score).toBe(75.25);
      expect(typeof result[0].score).toBe('number');
    });
  });
});
