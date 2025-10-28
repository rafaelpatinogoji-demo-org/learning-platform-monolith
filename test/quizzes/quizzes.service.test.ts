/**
 * Tests for QuizzesService
 * 
 * Tests all business logic methods for quiz management, question CRUD,
 * submission handling, and permission validation using mocked database operations.
 */

import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

const createMockQueryResult = (rows: any[], rowCount?: number) => ({
  rows,
  rowCount: rowCount ?? rows.length,
  command: '',
  oid: 0,
  fields: []
});

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz when user is course owner', async () => {
      const courseId = 1;
      const title = 'Test Quiz';
      const userId = 2;
      const mockQuiz = { id: 1, course_id: courseId, title, created_at: new Date() };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]));

      const result = await QuizzesService.createQuiz(courseId, title, userId);

      expect(result).toEqual(mockQuiz);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [courseId, title]
      );
    });

    it('should create quiz when user is admin', async () => {
      const courseId = 1;
      const title = 'Test Quiz';
      const userId = 3;
      const mockQuiz = { id: 1, course_id: courseId, title, created_at: new Date() };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]));

      const result = await QuizzesService.createQuiz(courseId, title, userId);

      expect(result).toEqual(mockQuiz);
    });

    it('should throw FORBIDDEN when user cannot modify course', async () => {
      const courseId = 1;
      const title = 'Test Quiz';
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]))
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 999 }]));

      await expect(QuizzesService.createQuiz(courseId, title, userId))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw FORBIDDEN when course does not exist', async () => {
      const courseId = 999;
      const title = 'Test Quiz';
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.createQuiz(courseId, title, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should list quizzes for published course without authentication', async () => {
      const courseId = 1;
      const mockQuizzes = [
        { id: 1, course_id: courseId, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: courseId, title: 'Quiz 2', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ published: true, instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuizzes));

      const result = await QuizzesService.listQuizzesForCourse(courseId);

      expect(result).toEqual(mockQuizzes);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
        [courseId]
      );
    });

    it('should list quizzes for unpublished course when user is owner', async () => {
      const courseId = 1;
      const userId = 2;
      const mockQuizzes = [{ id: 1, course_id: courseId, title: 'Quiz 1', created_at: new Date() }];

      mockDb.query.mockClear();
      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ published: false, instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuizzes));

      const result = await QuizzesService.listQuizzesForCourse(courseId, userId);

      expect(result).toEqual(mockQuizzes);
    });

    it('should list quizzes for unpublished course when user is admin', async () => {
      const courseId = 1;
      const userId = 3;
      const mockQuizzes = [{ id: 1, course_id: courseId, title: 'Quiz 1', created_at: new Date() }];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ published: false, instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuizzes));

      const result = await QuizzesService.listQuizzesForCourse(courseId, userId);

      expect(result).toEqual(mockQuizzes);
    });

    it('should throw FORBIDDEN for unpublished course when user has no access', async () => {
      const courseId = 1;
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ published: false, instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.listQuizzesForCourse(courseId, userId))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw FORBIDDEN when course does not exist', async () => {
      const courseId = 999;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.listQuizzesForCourse(courseId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getQuizById', () => {
    it('should return quiz with questions for instructor', async () => {
      const quizId = 1;
      const userId = 2;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        title: 'Test Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: userId
      };
      const mockQuestions = [
        { id: 1, quiz_id: quizId, prompt: 'Question 1', choices: ['A', 'B'], correct_index: 0, created_at: new Date() },
        { id: 2, quiz_id: quizId, prompt: 'Question 2', choices: ['C', 'D'], correct_index: 1, created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions));

      const result = await QuizzesService.getQuizById(quizId, userId);

      expect(result.quiz).toEqual({
        id: mockQuiz.id,
        course_id: mockQuiz.course_id,
        title: mockQuiz.title,
        created_at: mockQuiz.created_at
      });
      expect(result.questions).toEqual(mockQuestions);
    });

    it('should return quiz with questions without correct_index for students', async () => {
      const quizId = 1;
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        title: 'Test Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: 2
      };
      const mockQuestions = [
        { id: 1, quiz_id: quizId, prompt: 'Question 1', choices: ['A', 'B'], correct_index: 0, created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions));

      const result = await QuizzesService.getQuizById(quizId, userId);

      expect(result.questions[0]).not.toHaveProperty('correct_index');
      expect(result.questions[0]).toEqual({
        id: 1,
        quiz_id: quizId,
        prompt: 'Question 1',
        choices: ['A', 'B'],
        created_at: mockQuestions[0].created_at
      });
    });

    it('should return quiz with questions for admin', async () => {
      const quizId = 1;
      const userId = 4;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        title: 'Test Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: 2
      };
      const mockQuestions = [
        { id: 1, quiz_id: quizId, prompt: 'Question 1', choices: ['A', 'B'], correct_index: 0, created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions));

      const result = await QuizzesService.getQuizById(quizId, userId);

      expect(result.questions).toEqual(mockQuestions);
    });

    it('should throw NOT_FOUND for students when course is not published', async () => {
      const quizId = 1;
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        title: 'Test Quiz',
        created_at: new Date(),
        published: false,
        instructor_id: 2
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.getQuizById(quizId, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.getQuizById(quizId))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create question when user is quiz owner', async () => {
      const quizId = 1;
      const prompt = 'Test question?';
      const choices = ['A', 'B', 'C'];
      const correctIndex = 1;
      const userId = 2;
      const mockQuestion = {
        id: 1,
        quiz_id: quizId,
        prompt,
        choices: JSON.stringify(choices),
        correct_index: correctIndex,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([mockQuestion]));

      const result = await QuizzesService.createQuestion(quizId, prompt, choices, correctIndex, userId);

      expect(result).toEqual(mockQuestion);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [quizId, prompt, JSON.stringify(choices), correctIndex]
      );
    });

    it('should create question when user is admin', async () => {
      const quizId = 1;
      const prompt = 'Test question?';
      const choices = ['A', 'B'];
      const correctIndex = 0;
      const userId = 3;
      const mockQuestion = {
        id: 1,
        quiz_id: quizId,
        prompt,
        choices: JSON.stringify(choices),
        correct_index: correctIndex,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult([mockQuestion]));

      const result = await QuizzesService.createQuestion(quizId, prompt, choices, correctIndex, userId);

      expect(result).toEqual(mockQuestion);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;
      const prompt = 'Test question?';
      const choices = ['A', 'B'];
      const correctIndex = 0;
      const userId = 2;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.createQuestion(quizId, prompt, choices, correctIndex, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const quizId = 1;
      const prompt = 'Test question?';
      const choices = ['A', 'B'];
      const correctIndex = 0;
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.createQuestion(quizId, prompt, choices, correctIndex, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update question when user is owner', async () => {
      const quizId = 1;
      const questionId = 1;
      const updates = { prompt: 'Updated question?', choices: ['X', 'Y'], correct_index: 1 };
      const userId = 2;
      const mockUpdatedQuestion = {
        id: questionId,
        quiz_id: quizId,
        prompt: updates.prompt,
        choices: JSON.stringify(updates.choices),
        correct_index: updates.correct_index,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([{ id: questionId, quiz_id: quizId }]))
        .mockResolvedValueOnce(createMockQueryResult([mockUpdatedQuestion]));

      const result = await QuizzesService.updateQuestion(quizId, questionId, updates, userId);

      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should update question partially', async () => {
      const quizId = 1;
      const questionId = 1;
      const updates = { prompt: 'Only prompt updated' };
      const userId = 2;
      const mockUpdatedQuestion = {
        id: questionId,
        quiz_id: quizId,
        prompt: updates.prompt,
        choices: '["A", "B"]',
        correct_index: 0,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([{ id: questionId, quiz_id: quizId }]))
        .mockResolvedValueOnce(createMockQueryResult([mockUpdatedQuestion]));

      const result = await QuizzesService.updateQuestion(quizId, questionId, updates, userId);

      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should return existing question when no updates provided', async () => {
      const quizId = 1;
      const questionId = 1;
      const updates = {};
      const userId = 2;
      const existingQuestion = {
        id: questionId,
        quiz_id: quizId,
        prompt: 'Existing question',
        choices: '["A", "B"]',
        correct_index: 0,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([existingQuestion]));

      const result = await QuizzesService.updateQuestion(quizId, questionId, updates, userId);

      expect(result).toEqual(existingQuestion);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;
      const questionId = 1;
      const updates = { prompt: 'Updated' };
      const userId = 2;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.updateQuestion(quizId, questionId, updates, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      const quizId = 1;
      const questionId = 999;
      const updates = { prompt: 'Updated' };
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.updateQuestion(quizId, questionId, updates, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const quizId = 1;
      const questionId = 1;
      const updates = { prompt: 'Updated' };
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.updateQuestion(quizId, questionId, updates, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question when user is owner', async () => {
      const quizId = 1;
      const questionId = 1;
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([], 1));

      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .resolves.toBeUndefined();

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
        [questionId, quizId]
      );
    });

    it('should delete question when user is admin', async () => {
      const quizId = 1;
      const questionId = 1;
      const userId = 3;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult([], 1));

      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .resolves.toBeUndefined();
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;
      const questionId = 1;
      const userId = 2;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      const quizId = 1;
      const questionId = 999;
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult([], 0));

      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const quizId = 1;
      const questionId = 1;
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('submitQuiz', () => {
    it('should submit quiz and calculate score correctly', async () => {
      const quizId = 1;
      const answers = [0, 1, 2];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 },
        { id: 3, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: userId, course_id: 1, status: 'active' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      expect(result).toEqual({
        total: 3,
        correct: 2,
        score: expect.closeTo(66.67, 1),
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: true },
          { id: 3, correct: false }
        ]
      });

      expect(mockDb.query).toHaveBeenLastCalledWith(
        'INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES ($1, $2, $3, $4)',
        [quizId, userId, JSON.stringify(answers), expect.closeTo(66.67, 1)]
      );
    });

    it('should calculate perfect score', async () => {
      const quizId = 1;
      const answers = [0, 1];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: userId, course_id: 1, status: 'active' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should calculate zero score', async () => {
      const quizId = 1;
      const answers = [1, 0];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: userId, course_id: 1, status: 'active' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should handle empty quiz', async () => {
      const quizId = 1;
      const answers: number[] = [];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: userId, course_id: 1, status: 'active' }]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(0);
      expect(result.questions).toEqual([]);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;
      const answers = [0];
      const userId = 3;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when course is not published', async () => {
      const quizId = 1;
      const answers = [0];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: false
      };

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([mockQuiz]));

      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      const quizId = 1;
      const answers = [0];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatch', async () => {
      const quizId = 1;
      const answers = [0, 1];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        published: true
      };
      const mockQuestions = [
        { id: 1, correct_index: 0 }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([mockQuiz]))
        .mockResolvedValueOnce(createMockQueryResult([{ user_id: userId, course_id: 1, status: 'active' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockQuestions));

      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission when it exists', async () => {
      const quizId = 1;
      const userId = 3;
      const mockSubmission = {
        id: 1,
        quiz_id: quizId,
        user_id: userId,
        answers: [0, 1, 2],
        score: 66.67,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([mockSubmission]));

      const result = await QuizzesService.getLatestSubmission(quizId, userId);

      expect(result).toEqual(mockSubmission);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [quizId, userId]
      );
    });

    it('should return null when no submission exists', async () => {
      const quizId = 1;
      const userId = 3;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await QuizzesService.getLatestSubmission(quizId, userId);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should list submissions when user is quiz owner', async () => {
      const quizId = 1;
      const userId = 2;
      const mockSubmissions = [
        {
          id: 1,
          user_id: 3,
          user_name: 'Student One',
          user_email: 'student1@example.com',
          score: '85.5',
          answers: [0, 1, 2],
          created_at: new Date()
        },
        {
          id: 2,
          user_id: 4,
          user_name: 'Student Two',
          user_email: 'student2@example.com',
          score: '92.0',
          answers: [0, 1, 1],
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: userId }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'instructor' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockSubmissions));

      const result = await QuizzesService.listSubmissions(quizId, userId);

      expect(result).toEqual([
        {
          id: 1,
          user: {
            id: 3,
            name: 'Student One',
            email: 'student1@example.com'
          },
          score: 85.5,
          answers: [0, 1, 2],
          created_at: mockSubmissions[0].created_at
        },
        {
          id: 2,
          user: {
            id: 4,
            name: 'Student Two',
            email: 'student2@example.com'
          },
          score: 92.0,
          answers: [0, 1, 1],
          created_at: mockSubmissions[1].created_at
        }
      ]);
    });

    it('should list submissions when user is admin', async () => {
      const quizId = 1;
      const userId = 5;
      const mockSubmissions = [
        {
          id: 1,
          user_id: 3,
          user_name: 'Student One',
          user_email: 'student1@example.com',
          score: '75.0',
          answers: [0, 1],
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'admin' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockSubmissions));

      const result = await QuizzesService.listSubmissions(quizId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(75.0);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const quizId = 999;
      const userId = 2;

      mockDb.query.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(QuizzesService.listSubmissions(quizId, userId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const quizId = 1;
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce(createMockQueryResult([{ instructor_id: 2 }]))
        .mockResolvedValueOnce(createMockQueryResult([{ role: 'student' }]));

      await expect(QuizzesService.listSubmissions(quizId, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });
});
