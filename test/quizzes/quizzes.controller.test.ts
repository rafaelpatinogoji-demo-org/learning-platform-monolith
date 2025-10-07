import { quizzesController } from '../../src/controllers/quizzes.controller';
import { QuizzesService } from '../../src/services/quizzes.service';
import { QuizValidator } from '../../src/utils/validation';
import { mockRequest, mockResponse } from '../setup';

jest.mock('../../src/services/quizzes.service');
jest.mock('../../src/utils/validation');

describe('quizzesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz successfully', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'New Quiz' },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      const mockQuiz = { id: 1, course_id: 1, title: 'New Quiz', created_at: new Date() };
      (QuizValidator.validateCreateQuiz as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuiz as jest.Mock).mockResolvedValue(mockQuiz);

      await quizzesController.createQuiz(req, res);

      expect(QuizValidator.validateCreateQuiz).toHaveBeenCalledWith({ title: 'New Quiz' });
      expect(QuizzesService.createQuiz).toHaveBeenCalledWith(1, 'New Quiz', 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuiz,
        version: 'v1.9'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'Quiz' }
      });
      const res = mockResponse();

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          })
        })
      );
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({
        params: { courseId: 'invalid' },
        body: { title: 'Quiz' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_COURSE_ID'
          })
        })
      );
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: '' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuiz as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: [{ field: 'title', message: 'Title cannot be empty' }]
          })
        })
      );
    });

    it('should return 403 when user lacks permission', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'Quiz' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuiz as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuiz as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN'
          })
        })
      );
    });

    it('should return 500 for internal errors', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        body: { title: 'Quiz' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuiz as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuiz as jest.Mock).mockRejectedValue(new Error('Database error'));

      await quizzesController.createQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });
  });

  describe('listCourseQuizzes', () => {
    it('should list quizzes successfully', async () => {
      const req = mockRequest({
        params: { courseId: '1' },
        user: { id: 1, email: 'test@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizzes = [
        { id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() },
        { id: 2, course_id: 1, title: 'Quiz 2', created_at: new Date() }
      ];
      (QuizzesService.listQuizzesForCourse as jest.Mock).mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(req, res);

      expect(QuizzesService.listQuizzesForCourse).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuizzes,
        version: 'v1.9'
      });
    });

    it('should return 404 when course is not found or not accessible', async () => {
      const req = mockRequest({
        params: { courseId: '1' }
      });
      const res = mockResponse();

      (QuizzesService.listQuizzesForCourse as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listCourseQuizzes(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'NOT_FOUND'
          })
        })
      );
    });
  });

  describe('getQuiz', () => {
    it('should get quiz successfully', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'test@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, quiz_id: 1, prompt: 'Q?', choices: ['A', 'B'] }]
      };
      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockData);

      await quizzesController.getQuiz(req, res);

      expect(QuizzesService.getQuizById).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockData,
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent quiz', async () => {
      const req = mockRequest({
        params: { id: '999' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.getQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createQuestion', () => {
    it('should create question successfully', async () => {
      const req = mockRequest({
        params: { quizId: '1' },
        body: {
          prompt: 'What is 2+2?',
          choices: ['3', '4', '5'],
          correct_index: 1
        },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5'],
        correct_index: 1,
        created_at: new Date()
      };
      (QuizValidator.validateCreateQuestion as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuestion as jest.Mock).mockResolvedValue(mockQuestion);

      await quizzesController.createQuestion(req, res);

      expect(QuizzesService.createQuestion).toHaveBeenCalledWith(
        1, 'What is 2+2?', ['3', '4', '5'], 1, 1
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Q?', choices: ['A', 'B'], correct_index: 0 }
      });
      const res = mockResponse();

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        params: { quizId: '1' },
        body: { prompt: '', choices: ['A'], correct_index: 0 },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuestion as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [
          { field: 'prompt', message: 'Prompt cannot be empty' },
          { field: 'choices', message: 'At least 2 choices are required' }
        ]
      });

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when quiz not found', async () => {
      const req = mockRequest({
        params: { quizId: '999' },
        body: { prompt: 'Q?', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuestion as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user lacks permission', async () => {
      const req = mockRequest({
        params: { quizId: '1' },
        body: { prompt: 'Q?', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateCreateQuestion as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.createQuestion as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateQuestion', () => {
    it('should update question successfully', async () => {
      const req = mockRequest({
        params: { quizId: '1', questionId: '1' },
        body: { prompt: 'Updated question?' },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      const mockQuestion = {
        id: 1,
        quiz_id: 1,
        prompt: 'Updated question?',
        choices: ['A', 'B'],
        correct_index: 0,
        created_at: new Date()
      };
      (QuizValidator.validateUpdateQuestion as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.updateQuestion as jest.Mock).mockResolvedValue(mockQuestion);

      await quizzesController.updateQuestion(req, res);

      expect(QuizzesService.updateQuestion).toHaveBeenCalledWith(
        1, 1, { prompt: 'Updated question?' }, 1
      );
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockQuestion,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid IDs', async () => {
      const req = mockRequest({
        params: { quizId: 'invalid', questionId: 'invalid' },
        body: { prompt: 'Updated?' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_ID'
          })
        })
      );
    });

    it('should return 404 when question not found', async () => {
      const req = mockRequest({
        params: { quizId: '1', questionId: '999' },
        body: { prompt: 'Updated?' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizValidator.validateUpdateQuestion as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.updateQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question successfully', async () => {
      const req = mockRequest({
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockResolvedValue(undefined);

      await quizzesController.deleteQuestion(req, res);

      expect(QuizzesService.deleteQuestion).toHaveBeenCalledWith(1, 1, 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Question deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 404 when question not found', async () => {
      const req = mockRequest({
        params: { quizId: '1', questionId: '999' },
        user: { id: 1, email: 'test@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user lacks permission', async () => {
      const req = mockRequest({
        params: { quizId: '1', questionId: '1' },
        user: { id: 2, email: 'other@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.deleteQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('submitQuiz', () => {
    it('should submit quiz successfully', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { answers: [0, 1, 2] },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [
          { id: 1, prompt: 'Q1?', choices: ['A', 'B'] },
          { id: 2, prompt: 'Q2?', choices: ['A', 'B'] },
          { id: 3, prompt: 'Q3?', choices: ['A', 'B'] }
        ]
      };
      const mockResult = {
        total: 3,
        correct: 2,
        score: 66.67,
        questions: [
          { id: 1, correct: true },
          { id: 2, correct: true },
          { id: 3, correct: false }
        ]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);
      (QuizValidator.validateSubmission as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.submitQuiz as jest.Mock).mockResolvedValue(mockResult);

      await quizzesController.submitQuiz(req, res);

      expect(QuizValidator.validateSubmission).toHaveBeenCalledWith({ answers: [0, 1, 2] }, 3);
      expect(QuizzesService.submitQuiz).toHaveBeenCalledWith(1, [0, 1, 2], 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult,
        version: 'v1.9'
      });
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { answers: [0] },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [
          { id: 1, prompt: 'Q1?', choices: ['A', 'B'] },
          { id: 2, prompt: 'Q2?', choices: ['A', 'B'] }
        ]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);
      (QuizValidator.validateSubmission as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'answers', message: 'Expected 2 answers, got 1' }]
      });

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when course is not published', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { answers: [0] },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q?', choices: ['A', 'B'] }]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);
      (QuizValidator.validateSubmission as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.submitQuiz as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: 'Course is not published'
          })
        })
      );
    });

    it('should return 403 when user is not enrolled', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { answers: [0] },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q?', choices: ['A', 'B'] }]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);
      (QuizValidator.validateSubmission as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.submitQuiz as jest.Mock).mockRejectedValue(new Error('NOT_ENROLLED'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'NOT_ENROLLED'
          })
        })
      );
    });

    it('should return 400 for invalid answers length', async () => {
      const req = mockRequest({
        params: { id: '1' },
        body: { answers: [0, 1] },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockQuizData = {
        quiz: { id: 1, course_id: 1, title: 'Quiz', created_at: new Date() },
        questions: [{ id: 1, prompt: 'Q?', choices: ['A', 'B'] }]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);
      (QuizValidator.validateSubmission as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (QuizzesService.submitQuiz as jest.Mock).mockRejectedValue(new Error('INVALID_ANSWERS_LENGTH'));

      await quizzesController.submitQuiz(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_SUBMISSION'
          })
        })
      );
    });
  });

  describe('getMySubmission', () => {
    it('should get user submission successfully', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [0, 1],
        score: 50,
        created_at: new Date()
      };

      (QuizzesService.getLatestSubmission as jest.Mock).mockResolvedValue(mockSubmission);

      await quizzesController.getMySubmission(req, res);

      expect(QuizzesService.getLatestSubmission).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmission,
        version: 'v1.9'
      });
    });

    it('should return 404 when no submission found', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'student@test.com', role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getLatestSubmission as jest.Mock).mockResolvedValue(null);

      await quizzesController.getMySubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: 'No submission found for this quiz'
          })
        })
      );
    });
  });

  describe('listSubmissions', () => {
    it('should list all submissions when authorized', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      const mockSubmissions = [
        {
          id: 1,
          user: { id: 10, name: 'Student 1', email: 'student1@test.com' },
          score: 80,
          answers: [0, 1, 2],
          created_at: new Date()
        },
        {
          id: 2,
          user: { id: 11, name: 'Student 2', email: 'student2@test.com' },
          score: 90,
          answers: [0, 1, 0],
          created_at: new Date()
        }
      ];

      (QuizzesService.listSubmissions as jest.Mock).mockResolvedValue(mockSubmissions);

      await quizzesController.listSubmissions(req, res);

      expect(QuizzesService.listSubmissions).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockSubmissions,
        version: 'v1.9'
      });
    });

    it('should return 403 when user lacks permission', async () => {
      const req = mockRequest({
        params: { id: '1' },
        user: { id: 2, email: 'other@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.listSubmissions as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when quiz not found', async () => {
      const req = mockRequest({
        params: { id: '999' },
        user: { id: 1, email: 'instructor@test.com', role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.listSubmissions as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.listSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
