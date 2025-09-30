import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';

jest.mock('../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create a quiz when user is admin', async () => {
      const mockQuiz = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any);

      const result = await QuizzesService.createQuiz(10, 'Test Quiz', 1);

      expect(result).toEqual(mockQuiz);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT role FROM users WHERE id = $1', [1]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [10, 'Test Quiz']
      );
    });

    it('should create a quiz when user is course instructor', async () => {
      const mockQuiz = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any);

      const result = await QuizzesService.createQuiz(10, 'Test Quiz', 1);

      expect(result).toEqual(mockQuiz);
    });

    it('should throw FORBIDDEN when user cannot modify course', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 2 }], rowCount: 1 } as any);

      await expect(QuizzesService.createQuiz(10, 'Test Quiz', 1)).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should list quizzes for published course', async () => {
      const mockQuizzes = [
        { id: 1, course_id: 10, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: 10, title: 'Quiz 2', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: true, instructor_id: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuizzes, rowCount: 2 } as any);

      const result = await QuizzesService.listQuizzesForCourse(10, 1);

      expect(result).toEqual(mockQuizzes);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
        [10]
      );
    });

    it('should throw FORBIDDEN when course not accessible', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.listQuizzesForCourse(10, 1)).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getQuizById', () => {
    it('should return quiz with questions for instructor', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: 1
      };

      const mockQuestions = [
        {
          id: 1,
          quiz_id: 1,
          prompt: 'Question 1',
          choices: ['A', 'B', 'C'],
          correct_index: 0,
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 1 } as any);

      const result = await QuizzesService.getQuizById(1, 1);

      expect(result.quiz.id).toBe(1);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toHaveProperty('correct_index');
    });

    it('should hide correct_index for students', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: 2
      };

      const mockQuestions = [
        {
          id: 1,
          quiz_id: 1,
          prompt: 'Question 1',
          choices: ['A', 'B', 'C'],
          correct_index: 0,
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 1 } as any);

      const result = await QuizzesService.getQuizById(1, 1);

      expect(result.questions[0]).not.toHaveProperty('correct_index');
      expect(result.questions[0]).toHaveProperty('prompt');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.getQuizById(999, 1)).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND when student tries to access unpublished course quiz', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date(),
        published: false,
        instructor_id: 2
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.getQuizById(1, 1)).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create a question when user is course instructor', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Test Question',
        choices: ['A', 'B', 'C'],
        correct_index: 0,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.createQuestion(1, 'Test Question', ['A', 'B', 'C'], 0, 1);

      expect(result).toEqual(mockQuestion);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [1, 'Test Question', JSON.stringify(['A', 'B', 'C']), 0]
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.createQuestion(999, 'Test', ['A', 'B'], 0, 1)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.createQuestion(1, 'Test', ['A', 'B'], 0, 1)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update question prompt', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated Question',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, quiz_id: 1, prompt: 'Old', choices: ['A', 'B'], correct_index: 0 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.updateQuestion(1, 1, { prompt: 'Updated Question' }, 1);

      expect(result.prompt).toBe('Updated Question');
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.updateQuestion(1, 999, { prompt: 'Test' }, 1)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should return unchanged question when no updates provided', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Question',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.updateQuestion(1, 1, {}, 1);

      expect(result).toEqual(mockQuestion);
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      await expect(QuizzesService.deleteQuestion(1, 1, 1)).resolves.toBeUndefined();
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 0 } as any);

      await expect(QuizzesService.deleteQuestion(1, 999, 1)).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user lacks permission', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.deleteQuestion(1, 1, 1)).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('submitQuiz', () => {
    it('should submit quiz and calculate correct score', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        published: true
      };

      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 },
        { id: 3, correct_index: 2 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 10, status: 'active' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 3 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1, 1], 1);

      expect(result.total).toBe(3);
      expect(result.correct).toBe(2);
      expect(result.score).toBeCloseTo(66.67, 1);
      expect(result.questions).toHaveLength(3);
      expect(result.questions[0].correct).toBe(true);
      expect(result.questions[1].correct).toBe(true);
      expect(result.questions[2].correct).toBe(false);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.submitQuiz(999, [0, 1], 1)).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when course is not published', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 10, published: false }],
        rowCount: 1
      } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1)).rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1)).rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count does not match', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 10, status: 'active' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, correct_index: 0 }, { id: 2, correct_index: 1 }],
          rowCount: 2
        } as any);

      await expect(QuizzesService.submitQuiz(1, [0], 1)).rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should calculate 0% score for all wrong answers', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        published: true
      };

      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 10, status: 'active' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [1, 0], 1);

      expect(result.correct).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should calculate 100% score for all correct answers', async () => {
      const mockQuizData = {
        id: 1,
        course_id: 10,
        published: true
      };

      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuizData], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ user_id: 1, course_id: 10, status: 'active' }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1], 1);

      expect(result.correct).toBe(2);
      expect(result.score).toBe(100);
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission', async () => {
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [0, 1, 2],
        score: 75.5,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSubmission], rowCount: 1 } as any);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toEqual(mockSubmission);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [1, 1]
      );
    });

    it('should return null when no submission exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should list all submissions for quiz when user is instructor', async () => {
      const mockSubmissions = [
        {
          id: 1,
          quiz_id: 1,
          user_id: 10,
          user_name: 'John Doe',
          user_email: 'john@example.com',
          answers: [0, 1],
          score: '85.5',
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockSubmissions, rowCount: 1 } as any);

      const result = await QuizzesService.listSubmissions(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('user');
      expect(result[0].user.name).toBe('John Doe');
      expect(result[0].score).toBe(85.5);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.listSubmissions(999, 1)).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 10, instructor_id: 2 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.listSubmissions(1, 1)).rejects.toThrow('FORBIDDEN');
    });
  });
});
