import { QuizzesService } from '../../../src/services/quizzes.service';
import { db } from '../../../src/db';

jest.mock('../../../src/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create a quiz when user is admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, title: 'Test Quiz' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', userId);

      expect(result).toEqual(mockQuiz);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should create a quiz when user is course owner', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, title: 'Test Quiz' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', userId);

      expect(result).toEqual(mockQuiz);
    });

    it('should throw FORBIDDEN when user is not admin or course owner', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ id: 1, instructor_id: 2 }], rowCount: 1 } as any);

      await expect(
        QuizzesService.createQuiz(1, 'Test Quiz', userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should list quizzes for published course', async () => {
      const userId = 1;
      const mockQuizzes = [
        { id: 1, course_id: 1, title: 'Quiz 1' },
        { id: 2, course_id: 1, title: 'Quiz 2' }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, published: true, instructor_id: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuizzes, rowCount: 2 } as any);

      const result = await QuizzesService.listQuizzesForCourse(1, userId);

      expect(result).toEqual(mockQuizzes);
    });

    it('should list quizzes for unpublished course when user is owner', async () => {
      const userId = 1;
      const mockQuizzes = [{ id: 1, course_id: 1, title: 'Quiz 1' }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, published: false, instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuizzes, rowCount: 1 } as any);

      const result = await QuizzesService.listQuizzesForCourse(1, userId);

      expect(result).toEqual(mockQuizzes);
    });

    it('should throw FORBIDDEN for unpublished course when user is not owner', async () => {
      const userId = 1;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1, published: false, instructor_id: 2 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.listQuizzesForCourse(1, userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getQuizById', () => {
    it('should mask correct_index for students', async () => {
      const userId = 1;
      const mockQuiz = {
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        published: true,
        instructor_id: 2,
        created_at: new Date()
      };
      const mockQuestions = [
        { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        { id: 2, quiz_id: 1, prompt: 'Q2', choices: ['C', 'D'], correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any);

      const result = await QuizzesService.getQuizById(1, userId);

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]).not.toHaveProperty('correct_index');
      expect(result.questions[1]).not.toHaveProperty('correct_index');
    });

    it('should not mask correct_index for instructor owner', async () => {
      const userId = 1;
      const mockQuiz = {
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        published: true,
        instructor_id: 1,
        created_at: new Date()
      };
      const mockQuestions = [
        { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 1 } as any);

      const result = await QuizzesService.getQuizById(1, userId);

      expect(result.questions[0]).toHaveProperty('correct_index', 0);
    });

    it('should not mask correct_index for admin', async () => {
      const userId = 1;
      const mockQuiz = {
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        published: true,
        instructor_id: 2,
        created_at: new Date()
      };
      const mockQuestions = [
        { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 1 } as any);

      const result = await QuizzesService.getQuizById(1, userId);

      expect(result.questions[0]).toHaveProperty('correct_index', 1);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.getQuizById(1, userId)
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create a question when user is admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Test Question',
        choices: ['A', 'B', 'C'],
        correct_index: 1
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.createQuestion(1, 'Test Question', ['A', 'B', 'C'], 1, userId);

      expect(result).toEqual(mockQuestion);
    });

    it('should create a question when user is quiz owner', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 1 };
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Test Question',
        choices: ['A', 'B'],
        correct_index: 0
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.createQuestion(1, 'Test Question', ['A', 'B'], 0, userId);

      expect(result).toEqual(mockQuestion);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.createQuestion(1, 'Test', ['A', 'B'], 0, userId)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.createQuestion(1, 'Test', ['A', 'B'], 0, userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update a question when user is admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };
      const mockQuestion = { id: 1, quiz_id: 1, prompt: 'Old', choices: ['A'], correct_index: 0 };
      const mockUpdatedQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated',
        choices: ['A', 'B'],
        correct_index: 1
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.updateQuestion(1, 1, {
        prompt: 'Updated',
        choices: ['A', 'B'],
        correct_index: 1
      }, userId);

      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should update a question when user is quiz owner', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 1 };
      const mockQuestion = { id: 1, quiz_id: 1, prompt: 'Old', choices: ['A'], correct_index: 0 };
      const mockUpdatedQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated',
        choices: ['A', 'B'],
        correct_index: 0
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedQuestion], rowCount: 1 } as any);

      const result = await QuizzesService.updateQuestion(1, 1, {
        prompt: 'Updated',
        choices: ['A', 'B']
      }, userId);

      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.updateQuestion(1, 1, { prompt: 'Updated' }, userId)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.updateQuestion(1, 1, { prompt: 'Updated' }, userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete a question when user is admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await QuizzesService.deleteQuestion(1, 1, userId);

      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should delete a question when user is quiz owner', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await QuizzesService.deleteQuestion(1, 1, userId);

      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.deleteQuestion(1, 1, userId)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.deleteQuestion(1, 1, userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('submitQuiz', () => {
    it('should calculate 100% score when all answers are correct', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: true };
      const mockEnrollment = { user_id: 1, course_id: 1, status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1], userId);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should calculate 50% score when half answers are correct', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: true };
      const mockEnrollment = { user_id: 1, course_id: 1, status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 0], userId);

      expect(result.score).toBe(50);
      expect(result.correct).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should calculate 0% score when all answers are wrong', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: true };
      const mockEnrollment = { user_id: 1, course_id: 1, status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [1, 0], userId);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should throw FORBIDDEN when course is not published', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: false };

      mockDb.query.mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any);

      await expect(
        QuizzesService.submitQuiz(1, [0, 1], userId)
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: true };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.submitQuiz(1, [0, 1], userId)
      ).rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatches', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, published: true };
      const mockEnrollment = { user_id: 1, course_id: 1, status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 0 },
        { id: 2, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockQuestions, rowCount: 2 } as any);

      await expect(
        QuizzesService.submitQuiz(1, [0], userId)
      ).rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.submitQuiz(1, [0, 1], userId)
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('getLatestSubmission', () => {
    it('should return the latest submission', async () => {
      const userId = 1;
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [0, 1],
        score: 100,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSubmission], rowCount: 1 } as any);

      const result = await QuizzesService.getLatestSubmission(1, userId);

      expect(result).toEqual(mockSubmission);
    });

    it('should return null when no submission exists', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await QuizzesService.getLatestSubmission(1, userId);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should list submissions when user is admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };
      const mockSubmissions = [
        { id: 1, user_id: 1, user_name: 'User 1', user_email: 'user1@test.com', score: '100', answers: [0, 1], created_at: new Date() },
        { id: 2, user_id: 2, user_name: 'User 2', user_email: 'user2@test.com', score: '50', answers: [0, 0], created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockSubmissions, rowCount: 2 } as any);

      const result = await QuizzesService.listSubmissions(1, userId);

      expect(result).toHaveLength(2);
      expect(result[0].user.id).toBe(1);
      expect(result[0].score).toBe(100);
    });

    it('should list submissions when user is quiz owner', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 1 };
      const mockSubmissions = [
        { id: 1, user_id: 2, user_name: 'User 2', user_email: 'user2@test.com', score: '75', answers: [0, 1], created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockSubmissions, rowCount: 1 } as any);

      const result = await QuizzesService.listSubmissions(1, userId);

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe(2);
      expect(result[0].score).toBe(75);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      const userId = 1;

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(
        QuizzesService.listSubmissions(1, userId)
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      const userId = 1;
      const mockQuiz = { id: 1, course_id: 1, instructor_id: 2 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any);

      await expect(
        QuizzesService.listSubmissions(1, userId)
      ).rejects.toThrow('FORBIDDEN');
    });
  });
});
