/**
 * Tests for QuizzesService
 * 
 * Tests quiz CRUD operations, submissions, scoring, and access control
 * with mocked database dependencies.
 */

import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz when user owns course', async () => {
      // Arrange
      const courseId = 1;
      const title = 'Test Quiz';
      const userId = 2;
      const mockQuiz = {
        id: 1,
        course_id: courseId,
        title,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any);

      // Act
      const result = await QuizzesService.createQuiz(courseId, title, userId);

      // Assert
      expect(result).toEqual(mockQuiz);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [courseId, title]
      );
    });

    it('should create quiz when user is admin', async () => {
      // Arrange
      const courseId = 1;
      const title = 'Admin Quiz';
      const userId = 3;
      const mockQuiz = {
        id: 2,
        course_id: courseId,
        title,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }] } as any)
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any);

      // Act
      const result = await QuizzesService.createQuiz(courseId, title, userId);

      // Assert
      expect(result).toEqual(mockQuiz);
    });

    it('should throw FORBIDDEN when user cannot modify course', async () => {
      // Arrange
      const courseId = 1;
      const title = 'Forbidden Quiz';
      const userId = 4;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }] } as any);

      // Act & Assert
      await expect(QuizzesService.createQuiz(courseId, title, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should list quizzes for published course without authentication', async () => {
      // Arrange
      const courseId = 1;
      const mockQuizzes = [
        { id: 1, course_id: courseId, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: courseId, title: 'Quiz 2', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: true, instructor_id: 1 }] } as any)
        .mockResolvedValueOnce({ rows: mockQuizzes } as any);

      // Act
      const result = await QuizzesService.listQuizzesForCourse(courseId);

      // Assert
      expect(result).toEqual(mockQuizzes);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
        [courseId]
      );
    });

    it('should list quizzes for unpublished course when user is instructor', async () => {
      // Arrange
      const courseId = 1;
      const userId = 2;
      const mockQuizzes = [
        { id: 1, course_id: courseId, title: 'Draft Quiz', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: mockQuizzes } as any);

      // Act
      const result = await QuizzesService.listQuizzesForCourse(courseId, userId);

      // Assert
      expect(result).toEqual(mockQuizzes);
    });

    it('should throw FORBIDDEN for unpublished course when user is student', async () => {
      // Arrange
      const courseId = 1;
      const userId = 3;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any);

      // Act & Assert
      await expect(QuizzesService.listQuizzesForCourse(courseId, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getQuizById', () => {
    it('should return quiz with questions for instructor', async () => {
      // Arrange
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
        {
          id: 1,
          quiz_id: quizId,
          prompt: 'What is 2+2?',
          choices: ['3', '4', '5'],
          correct_index: 1,
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any);

      // Act
      const result = await QuizzesService.getQuizById(quizId, userId);

      // Assert
      expect(result.quiz).toEqual({
        id: mockQuiz.id,
        course_id: mockQuiz.course_id,
        title: mockQuiz.title,
        created_at: mockQuiz.created_at
      });
      expect(result.questions).toEqual(mockQuestions);
      expect(result.questions[0]).toHaveProperty('correct_index');
    });

    it('should hide correct_index from students', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        course_id: 1,
        title: 'Student Quiz',
        created_at: new Date(),
        published: true,
        instructor_id: 999
      };
      const mockQuestions = [
        {
          id: 1,
          quiz_id: quizId,
          prompt: 'What is 2+2?',
          choices: ['3', '4', '5'],
          correct_index: 1,
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any);

      // Act
      const result = await QuizzesService.getQuizById(quizId, userId);

      // Assert
      expect(result.questions[0]).not.toHaveProperty('correct_index');
      expect(result.questions[0]).toHaveProperty('prompt');
      expect(result.questions[0]).toHaveProperty('choices');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      // Arrange
      const quizId = 999;

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(QuizzesService.getQuizById(quizId))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND for students accessing unpublished quiz', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        published: false,
        instructor_id: 999
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any);

      // Act & Assert
      await expect(QuizzesService.getQuizById(quizId, userId))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create question when user owns quiz', async () => {
      // Arrange
      const quizId = 1;
      const prompt = 'What is the capital of France?';
      const choices = ['London', 'Paris', 'Berlin'];
      const correctIndex = 1;
      const userId = 2;
      const mockQuestion = {
        id: 1,
        quiz_id: quizId,
        prompt,
        choices,
        correct_index: correctIndex,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: [mockQuestion] } as any);

      // Act
      const result = await QuizzesService.createQuestion(quizId, prompt, choices, correctIndex, userId);

      // Assert
      expect(result).toEqual(mockQuestion);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [quizId, prompt, JSON.stringify(choices), correctIndex]
      );
    });

    it('should throw FORBIDDEN when user does not own quiz', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any);

      // Act & Assert
      await expect(QuizzesService.createQuestion(quizId, 'prompt', ['a', 'b'], 0, userId))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      // Arrange
      const quizId = 999;
      const userId = 2;

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(QuizzesService.createQuestion(quizId, 'prompt', ['a', 'b'], 0, userId))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('submitQuiz', () => {
    it('should calculate score correctly and return submission result', async () => {
      // Arrange
      const quizId = 1;
      const answers = [1, 0, 2];
      const userId = 3;
      const mockQuiz = {
        id: quizId,
        published: true,
        course_id: 1
      };
      const mockEnrollment = {
        user_id: userId,
        course_id: 1,
        status: 'active'
      };
      const mockQuestions = [
        { id: 1, correct_index: 1 },
        { id: 2, correct_index: 0 },
        { id: 3, correct_index: 1 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      // Assert
      expect(result.total).toBe(3);
      expect(result.correct).toBe(2);
      expect(result.score).toBe(66.66666666666666);
      expect(result.questions).toEqual([
        { id: 1, correct: true },
        { id: 2, correct: true },
        { id: 3, correct: false }
      ]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES ($1, $2, $3, $4)',
        [quizId, userId, JSON.stringify(answers), 66.66666666666666]
      );
    });

    it('should calculate 100% score when all answers correct', async () => {
      // Arrange
      const quizId = 1;
      const answers = [1, 0];
      const userId = 3;
      const mockQuiz = { published: true, course_id: 1 };
      const mockEnrollment = { status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 1 },
        { id: 2, correct_index: 0 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      // Assert
      expect(result.score).toBe(100);
      expect(result.correct).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should calculate 0% score when all answers wrong', async () => {
      // Arrange
      const quizId = 1;
      const answers = [0, 1];
      const userId = 3;
      const mockQuiz = { published: true, course_id: 1 };
      const mockEnrollment = { status: 'active' };
      const mockQuestions = [
        { id: 1, correct_index: 1 },
        { id: 2, correct_index: 0 }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await QuizzesService.submitQuiz(quizId, answers, userId);

      // Assert
      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(2);
    });

    it('should throw FORBIDDEN when course is not published', async () => {
      // Arrange
      const quizId = 1;
      const answers = [1];
      const userId = 3;
      const mockQuiz = { published: false };

      mockDb.query.mockResolvedValueOnce({ rows: [mockQuiz] } as any);

      // Act & Assert
      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      // Arrange
      const quizId = 1;
      const answers = [1];
      const userId = 3;
      const mockQuiz = { published: true, course_id: 1 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatch', async () => {
      // Arrange
      const quizId = 1;
      const answers = [1, 0];
      const userId = 3;
      const mockQuiz = { published: true, course_id: 1 };
      const mockEnrollment = { status: 'active' };
      const mockQuestions = [{ id: 1, correct_index: 1 }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockQuiz] } as any)
        .mockResolvedValueOnce({ rows: [mockEnrollment] } as any)
        .mockResolvedValueOnce({ rows: mockQuestions } as any);

      // Act & Assert
      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      // Arrange
      const quizId = 999;
      const answers = [1];
      const userId = 3;

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act & Assert
      await expect(QuizzesService.submitQuiz(quizId, answers, userId))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission for user', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;
      const mockSubmission = {
        id: 1,
        quiz_id: quizId,
        user_id: userId,
        answers: [1, 0],
        score: 50,
        created_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSubmission] } as any);

      // Act
      const result = await QuizzesService.getLatestSubmission(quizId, userId);

      // Assert
      expect(result).toEqual(mockSubmission);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [quizId, userId]
      );
    });

    it('should return null when no submission exists', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      // Act
      const result = await QuizzesService.getLatestSubmission(quizId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should list submissions when user owns quiz', async () => {
      // Arrange
      const quizId = 1;
      const userId = 2;
      const mockSubmissions = [
        {
          id: 1,
          user_id: 3,
          user_name: 'John Doe',
          user_email: 'john@example.com',
          score: '85.5',
          answers: [1, 0, 2],
          created_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: mockSubmissions } as any);

      // Act
      const result = await QuizzesService.listSubmissions(quizId, userId);

      // Assert
      expect(result).toEqual([{
        id: 1,
        user: {
          id: 3,
          name: 'John Doe',
          email: 'john@example.com'
        },
        score: 85.5,
        answers: [1, 0, 2],
        created_at: mockSubmissions[0].created_at
      }]);
    });

    it('should throw FORBIDDEN when user does not own quiz', async () => {
      // Arrange
      const quizId = 1;
      const userId = 3;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any);

      // Act & Assert
      await expect(QuizzesService.listSubmissions(quizId, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update question when user owns quiz', async () => {
      // Arrange
      const quizId = 1;
      const questionId = 1;
      const updates = { prompt: 'Updated prompt' };
      const userId = 2;
      const mockUpdatedQuestion = {
        id: questionId,
        quiz_id: quizId,
        prompt: 'Updated prompt',
        choices: ['A', 'B'],
        correct_index: 1,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: questionId }] } as any)
        .mockResolvedValueOnce({ rows: [mockUpdatedQuestion] } as any);

      // Act
      const result = await QuizzesService.updateQuestion(quizId, questionId, updates, userId);

      // Assert
      expect(result).toEqual(mockUpdatedQuestion);
    });

    it('should throw FORBIDDEN when user does not own quiz', async () => {
      // Arrange
      const quizId = 1;
      const questionId = 1;
      const updates = { prompt: 'Updated' };
      const userId = 3;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }] } as any);

      // Act & Assert
      await expect(QuizzesService.updateQuestion(quizId, questionId, updates, userId))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question when user owns quiz', async () => {
      // Arrange
      const quizId = 1;
      const questionId = 1;
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      // Act
      await QuizzesService.deleteQuestion(quizId, questionId, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
        [questionId, quizId]
      );
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      // Arrange
      const quizId = 1;
      const questionId = 999;
      const userId = 2;

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ instructor_id: userId }] } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }] } as any)
        .mockResolvedValueOnce({ rowCount: 0 } as any);

      // Act & Assert
      await expect(QuizzesService.deleteQuestion(quizId, questionId, userId))
        .rejects.toThrow('NOT_FOUND');
    });
  });
});
