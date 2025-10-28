import { Request, Response } from 'express';
import { quizzesController } from '../../../src/controllers/quizzes.controller';
import { QuizzesService } from '../../../src/services/quizzes.service';

jest.mock('../../../src/services/quizzes.service');

const mockRequest = (overrides: any = {}) => ({
  params: {},
  body: {},
  query: {},
  user: undefined,
  requestId: 'test-req-id',
  ...overrides
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('quizzesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ params: { courseId: '1' }, body: { title: 'Test Quiz' } });
      const res = mockResponse();

      await quizzesController.createQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' })
      }));
    });

    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({ 
        params: { courseId: 'invalid' }, 
        body: { title: 'Test Quiz' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.createQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'INVALID_COURSE_ID' })
      }));
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({ 
        params: { courseId: '1' }, 
        body: {},
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.createQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      }));
    });

    it('should return 403 for forbidden access', async () => {
      const req = mockRequest({ 
        params: { courseId: '1' }, 
        body: { title: 'Test Quiz' },
        user: { id: 1, role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.createQuiz as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' })
      }));
    });

    it('should return 201 for successful quiz creation', async () => {
      const req = mockRequest({ 
        params: { courseId: '1' }, 
        body: { title: 'Test Quiz' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();
      const mockQuiz = { id: 1, course_id: 1, title: 'Test Quiz' };

      (QuizzesService.createQuiz as jest.Mock).mockResolvedValue(mockQuiz);

      await quizzesController.createQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockQuiz
      }));
    });
  });

  describe('listCourseQuizzes', () => {
    it('should return 400 for invalid course ID', async () => {
      const req = mockRequest({ params: { courseId: 'invalid' } });
      const res = mockResponse();

      await quizzesController.listCourseQuizzes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'INVALID_COURSE_ID' })
      }));
    });

    it('should return 404 when FORBIDDEN error', async () => {
      const req = mockRequest({ params: { courseId: '1' } });
      const res = mockResponse();

      (QuizzesService.listQuizzesForCourse as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listCourseQuizzes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 200 for successful quiz list', async () => {
      const req = mockRequest({ params: { courseId: '1' } });
      const res = mockResponse();
      const mockQuizzes = [{ id: 1, title: 'Quiz 1' }, { id: 2, title: 'Quiz 2' }];

      (QuizzesService.listQuizzesForCourse as jest.Mock).mockResolvedValue(mockQuizzes);

      await quizzesController.listCourseQuizzes(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockQuizzes
      }));
    });
  });

  describe('getQuiz', () => {
    it('should return 400 for invalid quiz ID', async () => {
      const req = mockRequest({ params: { id: 'invalid' } });
      const res = mockResponse();

      await quizzesController.getQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'INVALID_QUIZ_ID' })
      }));
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.getQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 200 for successful quiz retrieval', async () => {
      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();
      const mockQuizData = {
        quiz: { id: 1, title: 'Test Quiz' },
        questions: [{ id: 1, prompt: 'Q1' }]
      };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue(mockQuizData);

      await quizzesController.getQuiz(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockQuizData
      }));
    });
  });

  describe('createQuestion', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ 
        params: { quizId: '1' }, 
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 }
      });
      const res = mockResponse();

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quiz ID', async () => {
      const req = mockRequest({ 
        params: { quizId: 'invalid' }, 
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'INVALID_QUIZ_ID' })
      }));
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({ 
        params: { quizId: '1' }, 
        body: {},
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      }));
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1' }, 
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      (QuizzesService.createQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1' }, 
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.createQuestion as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 201 for successful question creation', async () => {
      const req = mockRequest({ 
        params: { quizId: '1' }, 
        body: { prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();
      const mockQuestion = { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 0 };

      (QuizzesService.createQuestion as jest.Mock).mockResolvedValue(mockQuestion);

      await quizzesController.createQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockQuestion
      }));
    });
  });

  describe('updateQuestion', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' }, 
        body: { prompt: 'Updated' }
      });
      const res = mockResponse();

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid IDs', async () => {
      const req = mockRequest({ 
        params: { quizId: 'invalid', questionId: '1' }, 
        body: { prompt: 'Updated' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'INVALID_ID' })
      }));
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' }, 
        body: { correct_index: 'invalid' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' }, 
        body: { prompt: 'Updated' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      (QuizzesService.updateQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' }, 
        body: { prompt: 'Updated' },
        user: { id: 1, role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.updateQuestion as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 for successful update', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' }, 
        body: { prompt: 'Updated' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();
      const mockQuestion = { id: 1, quiz_id: 1, prompt: 'Updated', choices: ['A', 'B'], correct_index: 0 };

      (QuizzesService.updateQuestion as jest.Mock).mockResolvedValue(mockQuestion);

      await quizzesController.updateQuestion(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockQuestion
      }));
    });
  });

  describe('deleteQuestion', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ params: { quizId: '1', questionId: '1' } });
      const res = mockResponse();

      await quizzesController.deleteQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid IDs', async () => {
      const req = mockRequest({ 
        params: { quizId: 'invalid', questionId: '1' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.deleteQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.deleteQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.deleteQuestion(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 for successful deletion', async () => {
      const req = mockRequest({ 
        params: { quizId: '1', questionId: '1' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      (QuizzesService.deleteQuestion as jest.Mock).mockResolvedValue(undefined);

      await quizzesController.deleteQuestion(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true
      }));
    });
  });

  describe('submitQuiz', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0, 1] }
      });
      const res = mockResponse();

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quiz ID', async () => {
      const req = mockRequest({ 
        params: { id: 'invalid' }, 
        body: { answers: [0, 1] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for validation errors', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: 'invalid' },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue({
        quiz: { id: 1 },
        questions: [{ id: 1 }, { id: 2 }]
      });

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0, 1] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0, 1] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue({
        quiz: { id: 1 },
        questions: [{ id: 1 }, { id: 2 }]
      });
      (QuizzesService.submitQuiz as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 for NOT_ENROLLED error', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0, 1] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue({
        quiz: { id: 1 },
        questions: [{ id: 1 }, { id: 2 }]
      });
      (QuizzesService.submitQuiz as jest.Mock).mockRejectedValue(new Error('NOT_ENROLLED'));

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'NOT_ENROLLED' })
      }));
    });

    it('should return 400 for wrong answer count', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue({
        quiz: { id: 1 },
        questions: [{ id: 1 }, { id: 2 }]
      });

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      }));
    });

    it('should return 200 for successful submission', async () => {
      const req = mockRequest({ 
        params: { id: '1' }, 
        body: { answers: [0, 1] },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();
      const mockResult = { total: 2, correct: 2, score: 100, questions: [] };

      (QuizzesService.getQuizById as jest.Mock).mockResolvedValue({
        quiz: { id: 1 },
        questions: [{ id: 1 }, { id: 2 }]
      });
      (QuizzesService.submitQuiz as jest.Mock).mockResolvedValue(mockResult);

      await quizzesController.submitQuiz(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockResult
      }));
    });
  });

  describe('getMySubmission', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await quizzesController.getMySubmission(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quiz ID', async () => {
      const req = mockRequest({ 
        params: { id: 'invalid' },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      await quizzesController.getMySubmission(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when no submission found', async () => {
      const req = mockRequest({ 
        params: { id: '1' },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();

      (QuizzesService.getLatestSubmission as jest.Mock).mockResolvedValue(null);

      await quizzesController.getMySubmission(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 200 for successful retrieval', async () => {
      const req = mockRequest({ 
        params: { id: '1' },
        user: { id: 1, role: 'student' }
      });
      const res = mockResponse();
      const mockSubmission = { id: 1, quiz_id: 1, user_id: 1, answers: [0, 1], score: 100 };

      (QuizzesService.getLatestSubmission as jest.Mock).mockResolvedValue(mockSubmission);

      await quizzesController.getMySubmission(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockSubmission
      }));
    });
  });

  describe('listSubmissions', () => {
    it('should return 401 when no authentication', async () => {
      const req = mockRequest({ params: { id: '1' } });
      const res = mockResponse();

      await quizzesController.listSubmissions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid quiz ID', async () => {
      const req = mockRequest({ 
        params: { id: 'invalid' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      await quizzesController.listSubmissions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for NOT_FOUND error', async () => {
      const req = mockRequest({ 
        params: { id: '1' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();

      (QuizzesService.listSubmissions as jest.Mock).mockRejectedValue(new Error('NOT_FOUND'));

      await quizzesController.listSubmissions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 for FORBIDDEN error', async () => {
      const req = mockRequest({ 
        params: { id: '1' },
        user: { id: 1, role: 'instructor' }
      });
      const res = mockResponse();

      (QuizzesService.listSubmissions as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

      await quizzesController.listSubmissions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 200 for successful submissions list', async () => {
      const req = mockRequest({ 
        params: { id: '1' },
        user: { id: 1, role: 'admin' }
      });
      const res = mockResponse();
      const mockSubmissions = [
        { id: 1, user: { id: 1, name: 'User 1' }, score: 100, answers: [0, 1] }
      ];

      (QuizzesService.listSubmissions as jest.Mock).mockResolvedValue(mockSubmissions);

      await quizzesController.listSubmissions(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: mockSubmissions
      }));
    });
  });
});
