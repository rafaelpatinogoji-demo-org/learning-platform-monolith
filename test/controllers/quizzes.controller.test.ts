import { Request, Response } from 'express';
import { quizzesController } from '../../src/controllers/quizzes.controller';
import { QuizzesService } from '../../src/services/quizzes.service';
import { QuizValidator } from '../../src/utils/validation';

jest.mock('../../src/services/quizzes.service');
jest.mock('../../src/utils/validation');

const mockQuizzesService = QuizzesService as jest.Mocked<typeof QuizzesService>;
const mockQuizValidator = QuizValidator as jest.Mocked<typeof QuizValidator>;

const createMockRequest = (overrides?: any): Request => {
  return {
    params: {},
    body: {},
    query: {},
    user: undefined,
    requestId: 'test-request-id',
    ...overrides
  } as Request;
};

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('quizzesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should return 401 when no user authentication', async () => {
      const req = createMockRequest({ params: { courseId: '10' }, body: { title: 'Test' } });
      const res = createMockResponse();

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      });
    });

    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest({
        params: { courseId: 'invalid' },
        body: { title: 'Test' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_COURSE_ID',
          message: 'Course ID must be a valid number'
        })
      });
    });

    it('should return 400 for validation errors', async () => {
      const req = createMockRequest({
        params: { courseId: '10' },
        body: { title: '' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuiz.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid quiz data',
          details: [{ field: 'title', message: 'Title cannot be empty' }]
        })
      });
    });

    it('should return 201 with quiz data on success', async () => {
      const mockQuiz = {
        id: 1,
        course_id: 10,
        title: 'Test Quiz',
        created_at: new Date()
      };

      const req = createMockRequest({
        params: { courseId: '10' },
        body: { title: 'Test Quiz' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockResolvedValue(mockQuiz);

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuiz,
        version: expect.any(String)
      });
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = createMockRequest({
        params: { courseId: '10' },
        body: { title: 'Test Quiz' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN'
        })
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { courseId: '10' },
        body: { title: 'Test Quiz' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockRejectedValue(new Error('Database error'));

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR'
        })
      });
    });
  });

  describe('listCourseQuizzes', () => {
    it('should return 400 for invalid courseId', async () => {
      const req = createMockRequest({ params: { courseId: 'invalid' } });
      const res = createMockResponse();

      await quizzesController.listCourseQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_COURSE_ID'
        })
      });
    });

    it('should return 200 with quiz list on success', async () => {
      const mockQuizzes = [
        { id: 1, course_id: 10, title: 'Quiz 1', created_at: new Date() }
      ];

      const req = createMockRequest({ params: { courseId: '10' } });
      const res = createMockResponse();

      mockQuizzesService.listQuizzesForCourse.mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizzes,
        version: expect.any(String)
      });
    });

    it('should return 404 for FORBIDDEN error', async () => {
      const req = createMockRequest({ params: { courseId: '10' } });
      const res = createMockResponse();

      mockQuizzesService.listQuizzesForCourse.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listCourseQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Course not found or not accessible'
        })
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({ params: { courseId: '10' } });
      const res = createMockResponse();

      mockQuizzesService.listQuizzesForCourse.mockRejectedValue(new Error('Database error'));

      await quizzesController.listCourseQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getQuiz', () => {
    it('should return 400 for invalid quizId', async () => {
      const req = createMockRequest({ params: { id: 'invalid' } });
      const res = createMockResponse();

      await quizzesController.getQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_QUIZ_ID'
        })
      });
    });

    it('should return 200 with quiz data on success', async () => {
      const mockQuizData = {
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      };

      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);

      await quizzesController.getQuiz(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizData,
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({ params: { id: '999' } });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.getQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Quiz not found'
        })
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockRejectedValue(new Error('Database error'));

      await quizzesController.getQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createQuestion', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 }
      });
      const res = createMockResponse();

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quizId', async () => {
      const req = createMockRequest({
        params: { quizId: 'invalid' },
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for validation errors', async () => {
      const req = createMockRequest({
        params: { quizId: '1' },
        body: { prompt: '', choices: ['A'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuestion.mockReturnValue({
        isValid: false,
        errors: [{ field: 'choices', message: 'At least 2 choices are required' }]
      });

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 201 with question data on success', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Test Question',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };

      const req = createMockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Test Question', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockResolvedValue(mockQuestion);

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({
        params: { quizId: '999' },
        body: { prompt: 'Test', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = createMockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Test', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Test', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockRejectedValue(new Error('Database error'));

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateQuestion', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: 'Updated' }
      });
      const res = createMockResponse();

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid IDs', async () => {
      const req = createMockRequest({
        params: { quizId: 'invalid', questionId: '1' },
        body: { prompt: 'Updated' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_ID'
        })
      });
    });

    it('should return 400 for validation errors', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: '' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({
        isValid: false,
        errors: [{ field: 'prompt', message: 'Prompt cannot be empty' }]
      });

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with updated question on success', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated Question',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };

      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: 'Updated Question' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockResolvedValue(mockQuestion);

      await quizzesController.updateQuestion(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '999' },
        body: { prompt: 'Updated' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: 'Updated' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: 'Updated' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockRejectedValue(new Error('Database error'));

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteQuestion', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' }
      });
      const res = createMockResponse();

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid IDs', async () => {
      const req = createMockRequest({
        params: { quizId: 'invalid', questionId: 'invalid' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 on successful deletion', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.deleteQuestion.mockResolvedValue(undefined);

      await quizzesController.deleteQuestion(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Question deleted successfully',
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '999' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('Database error'));

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('submitQuiz', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] }
      });
      const res = createMockResponse();

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quizId', async () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for validation errors', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({
        isValid: false,
        errors: [{ field: 'answers', message: 'Expected 1 answers, got 0' }]
      });

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with submission result on success', async () => {
      const mockResult = {
        total: 2,
        correct: 2,
        score: 100,
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: true }
        ]
      };

      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [
          { id: 1, prompt: 'Q1', choices: ['A', 'B'] },
          { id: 2, prompt: 'Q2', choices: ['C', 'D'] }
        ]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockResolvedValue(mockResult);

      await quizzesController.submitQuiz(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult,
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({
        params: { id: '999' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error (not published)', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: 'Course is not published'
        })
      });
    });

    it('should return 403 for NOT_ENROLLED error', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('NOT_ENROLLED'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_ENROLLED'
        })
      });
    });

    it('should return 400 for INVALID_ANSWERS_LENGTH error', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('INVALID_ANSWERS_LENGTH'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_SUBMISSION'
        })
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getQuizById.mockResolvedValue({
        quiz: { id: 1, course_id: 10, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', choices: ['A', 'B'] }]
      });

      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('Database error'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMySubmission', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();

      await quizzesController.getMySubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quizId', async () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      await quizzesController.getMySubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with submission on success', async () => {
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [0, 1],
        score: 85.5,
        created_at: new Date()
      };

      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getLatestSubmission.mockResolvedValue(mockSubmission);

      await quizzesController.getMySubmission(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmission,
        version: expect.any(String)
      });
    });

    it('should return 404 when no submission found', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getLatestSubmission.mockResolvedValue(null);

      await quizzesController.getMySubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'No submission found for this quiz'
        })
      });
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.getLatestSubmission.mockRejectedValue(new Error('Database error'));

      await quizzesController.getMySubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('listSubmissions', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quizId', async () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with submissions list on success', async () => {
      const mockSubmissions = [
        {
          id: 1,
          user: { id: 10, name: 'John Doe', email: 'john@example.com' },
          score: 85.5,
          answers: [0, 1],
          created_at: new Date()
        }
      ];

      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.listSubmissions.mockResolvedValue(mockSubmissions);

      await quizzesController.listSubmissions(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmissions,
        version: expect.any(String)
      });
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = createMockRequest({
        params: { id: '999' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'student' }
      });
      const res = createMockResponse();

      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for unexpected errors', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' }
      });
      const res = createMockResponse();

      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('Database error'));

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
