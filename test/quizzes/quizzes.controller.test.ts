/**
 * Tests for quizzesController
 * 
 * Tests HTTP request handling, authentication, validation, and service integration
 * with mocked service layer.
 */

import { Request, Response } from 'express';
import { quizzesController } from '../../src/controllers/quizzes.controller';
import { QuizzesService } from '../../src/services/quizzes.service';
import { QuizValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/quizzes.service');
jest.mock('../../src/utils/validation');

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
    it('should create quiz successfully with valid data', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: 'Test Quiz' };

      const mockQuiz = {
        id: 1,
        course_id: 1,
        title: 'Test Quiz',
        created_at: new Date()
      };

      mockQuizValidator.validateCreateQuiz.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.createQuiz.mockResolvedValue(mockQuiz);

      // Act
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizValidator.validateCreateQuiz).toHaveBeenCalledWith(mockReq.body);
      expect(mockQuizzesService.createQuiz).toHaveBeenCalledWith(1, 'Test Quiz', 1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuiz,
        version: expect.any(String)
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { courseId: '1' };

      // Act
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      // Assert
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
      expect(mockQuizzesService.createQuiz).not.toHaveBeenCalled();
    });

    it('should return 400 when courseId is invalid', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: 'invalid' };

      // Act
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: '' };

      mockQuizValidator.validateCreateQuiz.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      // Act
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quiz data',
          details: [{ field: 'title', message: 'Title cannot be empty' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.params = { courseId: '1' };
      mockReq.body = { title: 'Test Quiz' };

      mockQuizValidator.validateCreateQuiz.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.createQuiz.mockRejectedValue(new Error('FORBIDDEN'));

      // Act
      await quizzesController.createQuiz(mockReq as Request, mockRes as Response);

      // Assert
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
  });

  describe('listCourseQuizzes', () => {
    it('should list quizzes for course successfully', async () => {
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      const mockQuizzes = [
        { id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: 1, title: 'Quiz 2', created_at: new Date() }
      ];

      mockQuizzesService.listQuizzesForCourse.mockResolvedValue(mockQuizzes);

      // Act
      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.listQuizzesForCourse).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizzes,
        version: expect.any(String)
      });
    });

    it('should return 400 when courseId is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'not-a-number' };

      // Act
      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.params = { courseId: '1' };
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      mockQuizzesService.listQuizzesForCourse.mockRejectedValue(new Error('FORBIDDEN'));

      // Act
      await quizzesController.listCourseQuizzes(mockReq as Request, mockRes as Response);

      // Assert
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
  });

  describe('getQuiz', () => {
    it('should return quiz with questions for instructor (including correct_index)', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [
          {
            id: 1,
            quiz_id: 1,
            prompt: 'What is 2+2?',
            choices: ['3', '4', '5'],
            correct_index: 1,
            created_at: new Date()
          }
        ]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);

      // Act
      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.getQuizById).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizData,
        version: expect.any(String)
      });
    });

    it('should return quiz without correct_index for students', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [
          {
            id: 1,
            quiz_id: 1,
            prompt: 'What is 2+2?',
            choices: ['3', '4', '5'],
            created_at: new Date()
          }
        ]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);

      // Act
      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.getQuizById).toHaveBeenCalledWith(1, 3);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizData,
        version: expect.any(String)
      });
    });

    it('should return 400 when quiz ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 when quiz is not found', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      mockQuizzesService.getQuizById.mockRejectedValue(new Error('NOT_FOUND'));

      // Act
      await quizzesController.getQuiz(mockReq as Request, mockRes as Response);

      // Assert
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
    it('should create question successfully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: '1' };
      mockReq.body = {
        prompt: 'What is the capital of France?',
        choices: ['London', 'Paris', 'Berlin'],
        correct_index: 1
      };

      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'What is the capital of France?',
        choices: ['London', 'Paris', 'Berlin'],
        correct_index: 1,
        created_at: new Date()
      };

      mockQuizValidator.validateCreateQuestion.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.createQuestion.mockResolvedValue(mockQuestion);

      // Act
      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizValidator.validateCreateQuestion).toHaveBeenCalledWith(mockReq.body);
      expect(mockQuizzesService.createQuestion).toHaveBeenCalledWith(
        1,
        'What is the capital of France?',
        ['London', 'Paris', 'Berlin'],
        1,
        1
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: expect.any(String)
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { quizId: '1' };

      // Act
      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 400 when validation fails', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: '1' };
      mockReq.body = { prompt: '', choices: ['A'], correct_index: 0 };

      mockQuizValidator.validateCreateQuestion.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'prompt', message: 'Prompt cannot be empty' },
          { field: 'choices', message: 'At least 2 choices are required' }
        ]
      });

      // Act
      await quizzesController.createQuestion(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid question data',
          details: [
            { field: 'prompt', message: 'Prompt cannot be empty' },
            { field: 'choices', message: 'At least 2 choices are required' }
          ],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('submitQuiz', () => {
    it('should submit quiz successfully and return score', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };
      mockReq.body = { answers: [1, 0, 2] };

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [
          { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], created_at: new Date() },
          { id: 2, quiz_id: 1, prompt: 'Q2', choices: ['A', 'B'], created_at: new Date() },
          { id: 3, quiz_id: 1, prompt: 'Q3', choices: ['A', 'B'], created_at: new Date() }
        ]
      };

      const mockSubmissionResult = {
        total: 3,
        correct: 2,
        score: 66.67,
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: true },
          { id: 3, correct: false }
        ]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.submitQuiz.mockResolvedValue(mockSubmissionResult);

      // Act
      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.getQuizById).toHaveBeenCalledWith(1, 3);
      expect(mockQuizValidator.validateSubmission).toHaveBeenCalledWith(mockReq.body, 3);
      expect(mockQuizzesService.submitQuiz).toHaveBeenCalledWith(1, [1, 0, 2], 3);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmissionResult,
        version: expect.any(String)
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      // Act
      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 403 when user is not enrolled', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };
      mockReq.body = { answers: [1] };

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [{ id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], created_at: new Date() }]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.submitQuiz.mockRejectedValue(new Error('NOT_ENROLLED'));

      // Act
      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 400 when answer count does not match question count', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };
      mockReq.body = { answers: [1, 0] };

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() },
        questions: [{ id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], created_at: new Date() }]
      };

      mockQuizzesService.getQuizById.mockResolvedValue(mockQuizData);
      mockQuizValidator.validateSubmission.mockReturnValue({
        isValid: false,
        errors: [{ field: 'answers', message: 'Expected 1 answers, got 2' }]
      });

      // Act
      await quizzesController.submitQuiz(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid submission data',
          details: [{ field: 'answers', message: 'Expected 1 answers, got 2' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('getMySubmission', () => {
    it('should return user submission successfully', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };

      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 3,
        answers: [1, 0],
        score: 50,
        created_at: new Date()
      };

      mockQuizzesService.getLatestSubmission.mockResolvedValue(mockSubmission);

      // Act
      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.getLatestSubmission).toHaveBeenCalledWith(1, 3);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmission,
        version: expect.any(String)
      });
    });

    it('should return 404 when no submission exists', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };

      mockQuizzesService.getLatestSubmission.mockResolvedValue(null);

      // Act
      await quizzesController.getMySubmission(mockReq as Request, mockRes as Response);

      // Assert
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
    it('should list submissions when user owns quiz', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      const mockSubmissions = [
        {
          id: 1,
          user: { id: 3, name: 'John Doe', email: 'john@example.com' },
          score: 85.5,
          answers: [1, 0, 2],
          created_at: new Date()
        }
      ];

      mockQuizzesService.listSubmissions.mockResolvedValue(mockSubmissions);

      // Act
      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.listSubmissions).toHaveBeenCalledWith(1, 2);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmissions,
        version: expect.any(String)
      });
    });

    it('should return 403 when user does not own quiz', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '1' };

      mockQuizzesService.listSubmissions.mockRejectedValue(new Error('FORBIDDEN'));

      // Act
      await quizzesController.listSubmissions(mockReq as Request, mockRes as Response);

      // Assert
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

  describe('updateQuestion', () => {
    it('should update question successfully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: '1', questionId: '1' };
      mockReq.body = { prompt: 'Updated prompt' };

      const mockUpdatedQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated prompt',
        choices: ['A', 'B'],
        correct_index: 1,
        created_at: new Date()
      };

      mockQuizValidator.validateUpdateQuestion.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockQuizzesService.updateQuestion.mockResolvedValue(mockUpdatedQuestion);

      // Act
      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizValidator.validateUpdateQuestion).toHaveBeenCalledWith(mockReq.body);
      expect(mockQuizzesService.updateQuestion).toHaveBeenCalledWith(1, 1, mockReq.body, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockUpdatedQuestion,
        version: expect.any(String)
      });
    });

    it('should return 400 when IDs are invalid', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: 'invalid', questionId: 'invalid' };

      // Act
      await quizzesController.updateQuestion(mockReq as Request, mockRes as Response);

      // Assert
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
  });

  describe('deleteQuestion', () => {
    it('should delete question successfully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: '1', questionId: '1' };

      mockQuizzesService.deleteQuestion.mockResolvedValue(undefined);

      // Act
      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockQuizzesService.deleteQuestion).toHaveBeenCalledWith(1, 1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Question deleted successfully',
        version: expect.any(String)
      });
    });

    it('should return 404 when question not found', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { quizId: '1', questionId: '999' };

      mockQuizzesService.deleteQuestion.mockRejectedValue(new Error('NOT_FOUND'));

      // Act
      await quizzesController.deleteQuestion(mockReq as Request, mockRes as Response);

      // Assert
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
  });
});
