/**
 * Tests for quizzes controller
 * 
 * Tests HTTP request handling, validation integration, authentication,
 * and proper error response formatting for all quiz endpoints.
 */

import { Request, Response } from 'express';
import { quizzesController } from '../../src/controllers/quizzes.controller';
import { testUtils } from '../setup';

jest.mock('../../src/services/quizzes.service', () => ({
  QuizzesService: {
    createQuiz: jest.fn(),
    listQuizzesForCourse: jest.fn(),
    getQuizById: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    submitQuiz: jest.fn(),
    getLatestSubmission: jest.fn(),
    listSubmissions: jest.fn()
  }
}));

jest.mock('../../src/utils/validation', () => ({
  QuizValidator: {
    validateCreateQuiz: jest.fn(),
    validateCreateQuestion: jest.fn(),
    validateUpdateQuestion: jest.fn(),
    validateSubmission: jest.fn()
  }
}));

jest.mock('../../src/config', () => ({
  config: {
    version: 'v1.0'
  }
}));

import { QuizzesService } from '../../src/services/quizzes.service';
import { QuizValidator } from '../../src/utils/validation';

const mockQuizzesService = QuizzesService as jest.Mocked<typeof QuizzesService>;
const mockQuizValidator = QuizValidator as jest.Mocked<typeof QuizValidator>;

describe('quizzesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    beforeEach(() => {
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: 'Test Quiz' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
    });

    it('should create quiz successfully', async () => {
      const mockQuiz = { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() };
      
      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockResolvedValue(mockQuiz);

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuiz,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when courseId is invalid', async () => {
      mockReq.params = { courseId: 'invalid' };

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_COURSE_ID',
          message: 'Course ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when validation fails', async () => {
      const validationErrors = [{ field: 'title', message: 'Title is required' }];
      mockQuizValidator.validateCreateQuiz.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quiz data',
          details: validationErrors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permission', async () => {
      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to create quizzes for this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockQuizValidator.validateCreateQuiz.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuiz.mockRejectedValue(new Error('Database error'));

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create quiz',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('listCourseQuizzes', () => {
    beforeEach(() => {
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
    });

    it('should list quizzes successfully', async () => {
      const mockQuizzes = [
        { id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: 1, title: 'Quiz 2', created_at: new Date() }
      ];

      mockQuizzesService.listQuizzesForCourse.mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizzes,
        version: 'v1.0'
      });
    });

    it('should return 400 when courseId is invalid', async () => {
      mockReq.params = { courseId: 'invalid' };

      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_COURSE_ID',
          message: 'Course ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when course is not accessible', async () => {
      mockQuizzesService.listQuizzesForCourse.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found or not accessible',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle unauthenticated requests', async () => {
      mockReq.user = undefined;
      const mockQuizzes = [{ id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() }];

      mockQuizzesService.listQuizzesForCourse.mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      expect(mockQuizzesService.listQuizzesForCourse).toHaveBeenCalledWith(1, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizzes,
        version: 'v1.0'
      });
    });
  });

  describe('getQuiz', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
    });

    it('should get quiz successfully', async () => {
      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [
          { id: 1, quiz_id: 1, prompt: 'Question 1', choices: ['A', 'B', 'C'] }
        ]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);

      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizData,
        version: 'v1.0'
      });
    });

    it('should return 400 when quiz ID is invalid', async () => {
      mockReq.params = { id: 'invalid' };

      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_QUIZ_ID',
          message: 'Quiz ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when quiz not found', async () => {
      mockQuizzesService.getQuizById.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Quiz not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('createQuestion', () => {
    beforeEach(() => {
      mockReq.params = { quizId: '1' };
      mockReq.body = {
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1
      };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
    });

    it('should create question successfully', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1,
        created_at: new Date()
      };

      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockResolvedValue(mockQuestion);

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when quiz ID is invalid', async () => {
      mockReq.params = { quizId: 'invalid' };

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_QUIZ_ID',
          message: 'Quiz ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when validation fails', async () => {
      const validationErrors = [{ field: 'prompt', message: 'Prompt is required' }];
      mockQuizValidator.validateCreateQuestion.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid question data',
          details: validationErrors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when quiz not found', async () => {
      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Quiz not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permission', async () => {
      mockQuizValidator.validateCreateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.createQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to add questions to this quiz',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('updateQuestion', () => {
    beforeEach(() => {
      mockReq.params = { quizId: '1', questionId: '1' };
      mockReq.body = { prompt: 'Updated question?' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
    });

    it('should update question successfully', async () => {
      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated question?',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockResolvedValue(mockQuestion);

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when IDs are invalid', async () => {
      mockReq.params = { quizId: 'invalid', questionId: '1' };

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_ID',
          message: 'Quiz ID and Question ID must be valid numbers',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when validation fails', async () => {
      const validationErrors = [{ field: 'prompt', message: 'Prompt cannot be empty' }];
      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when question not found', async () => {
      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Quiz or question not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permission', async () => {
      mockQuizValidator.validateUpdateQuestion.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.updateQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteQuestion', () => {
    beforeEach(() => {
      mockReq.params = { quizId: '1', questionId: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
    });

    it('should delete question successfully', async () => {
      mockQuizzesService.deleteQuestion.mockResolvedValue(undefined);

      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Question deleted successfully',
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when IDs are invalid', async () => {
      mockReq.params = { quizId: '1', questionId: 'invalid' };

      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when question not found', async () => {
      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user lacks permission', async () => {
      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('submitQuiz', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.body = { answers: [1, 0, 2] };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
    });

    it('should submit quiz successfully', async () => {
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() },
        questions: [
          { id: 1, prompt: 'Q1', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() },
          { id: 2, prompt: 'Q2', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() },
          { id: 3, prompt: 'Q3', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() }
        ]
      };

      const mockResult = {
        total: 3,
        correct: 2,
        score: 66.67,
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: false },
          { id: 3, correct: true }
        ]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockResolvedValue(mockResult);

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when quiz ID is invalid', async () => {
      mockReq.params = { id: 'invalid' };

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when validation fails', async () => {
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() }]
      };

      const validationErrors = [{ field: 'answers', message: 'Invalid answers' }];

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid submission data',
          details: validationErrors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when quiz not found', async () => {
      mockQuizzesService.getQuizById.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when course is not published', async () => {
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() }]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Course is not published',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user is not enrolled', async () => {
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() }]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('NOT_ENROLLED'));

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_ENROLLED',
          message: 'You must be enrolled in the course to submit this quiz',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when answer count mismatch', async () => {
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q1', quiz_id: 1, choices: ['A', 'B'], created_at: new Date() }]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({ isValid: true, errors: [] });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('INVALID_ANSWERS_LENGTH'));

      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_SUBMISSION',
          message: 'Number of answers does not match number of questions',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getMySubmission', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
    });

    it('should get submission successfully', async () => {
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [1, 0, 2],
        score: 66.67,
        created_at: new Date()
      };

      mockQuizzesService.getLatestSubmission.mockResolvedValue(mockSubmission);

      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmission,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when quiz ID is invalid', async () => {
      mockReq.params = { id: 'invalid' };

      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no submission found', async () => {
      mockQuizzesService.getLatestSubmission.mockResolvedValue(null);

      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No submission found for this quiz',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('listSubmissions', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
    });

    it('should list submissions successfully', async () => {
      const mockSubmissions = [
        {
          id: 1,
          user: { id: 1, name: 'John Doe', email: 'john@example.com' },
          score: 85.5,
          answers: [1, 0, 2],
          created_at: new Date()
        },
        {
          id: 2,
          user: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
          score: 92.0,
          answers: [1, 1, 2],
          created_at: new Date()
        }
      ];

      mockQuizzesService.listSubmissions.mockResolvedValue(mockSubmissions);

      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmissions,
        version: 'v1.0'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when quiz ID is invalid', async () => {
      mockReq.params = { id: 'invalid' };

      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when quiz not found', async () => {
      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Quiz not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permission', async () => {
      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view submissions for this quiz',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Error handling and response format consistency', () => {
    it('should include timestamp in all error responses', async () => {
      mockReq.params = { courseId: 'invalid' };
      mockReq.body = { title: 'Test Quiz' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };

      const beforeTime = new Date().toISOString();
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);
      const afterTime = new Date().toISOString();

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.error.timestamp;
      
      expect(timestamp).toBeDefined();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });

    it('should include requestId in all error responses', async () => {
      const customRequestId = 'custom-request-123';
      mockReq = testUtils.createMockRequest({
        params: { courseId: 'invalid' },
        body: { title: 'Test Quiz' },
        user: { id: 1, email: 'test@example.com', role: 'instructor' },
        requestId: customRequestId
      });

      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.requestId).toBe(customRequestId);
    });

    it('should include version in all success responses', async () => {
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };

      const mockQuizzes = [{ id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() }];
      mockQuizzesService.listQuizzesForCourse.mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.version).toBe('v1.0');
    });
  });
});
