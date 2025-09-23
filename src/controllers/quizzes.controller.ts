import { Request, Response } from 'express';
import { QuizzesService } from '../services/quizzes.service';
import { QuizValidator } from '../utils/validation';
import { config } from '../config';

export const quizzesController = {
  /**
   * POST /api/courses/:courseId/quizzes
   * Create a quiz for a course (instructor owner|admin)
   */
  createQuiz: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_COURSE_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate quiz data
      const validation = QuizValidator.validateCreateQuiz(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid quiz data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quiz = await QuizzesService.createQuiz(
        courseId,
        req.body.title,
        req.user.id
      );

      res.status(201).json({
        ok: true,
        data: quiz,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to create quizzes for this course',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error creating quiz:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create quiz',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/courses/:courseId/quizzes
   * List quizzes for a course
   */
  listCourseQuizzes: async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      if (isNaN(courseId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_COURSE_ID',
            message: 'Course ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizzes = await QuizzesService.listQuizzesForCourse(
        courseId,
        req.user?.id
      );

      res.json({
        ok: true,
        data: quizzes,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Course not found or not accessible',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error listing quizzes:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list quizzes',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/quizzes/:id
   * Get quiz detail with questions metadata
   */
  getQuiz: async (req: Request, res: Response) => {
    try {
      const quizId = parseInt(req.params.id);
      if (isNaN(quizId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_QUIZ_ID',
            message: 'Quiz ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await QuizzesService.getQuizById(quizId, req.user?.id);

      res.json({
        ok: true,
        data: result,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error getting quiz:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get quiz',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * POST /api/quizzes/:quizId/questions
   * Create a question (instructor owner|admin)
   */
  createQuestion: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.quizId);
      if (isNaN(quizId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_QUIZ_ID',
            message: 'Quiz ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate question data
      const validation = QuizValidator.validateCreateQuestion(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid question data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const question = await QuizzesService.createQuestion(
        quizId,
        req.body.prompt,
        req.body.choices,
        req.body.correct_index,
        req.user.id
      );

      res.status(201).json({
        ok: true,
        data: question,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to add questions to this quiz',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error creating question:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create question',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * PUT /api/quizzes/:quizId/questions/:questionId
   * Update question (instructor owner|admin)
   */
  updateQuestion: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.quizId);
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(quizId) || isNaN(questionId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Quiz ID and Question ID must be valid numbers',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate update data
      const validation = QuizValidator.validateUpdateQuestion(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid question data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const question = await QuizzesService.updateQuestion(
        quizId,
        questionId,
        req.body,
        req.user.id
      );

      res.json({
        ok: true,
        data: question,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz or question not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this question',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error updating question:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update question',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * DELETE /api/quizzes/:quizId/questions/:questionId
   * Delete question (instructor owner|admin)
   */
  deleteQuestion: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.quizId);
      const questionId = parseInt(req.params.questionId);
      
      if (isNaN(quizId) || isNaN(questionId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_ID',
            message: 'Quiz ID and Question ID must be valid numbers',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      await QuizzesService.deleteQuestion(quizId, questionId, req.user.id);

      res.json({
        ok: true,
        message: 'Question deleted successfully',
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz or question not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this question',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error deleting question:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete question',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * POST /api/quizzes/:id/submit
   * Submit quiz answers (student)
   */
  submitQuiz: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.id);
      if (isNaN(quizId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_QUIZ_ID',
            message: 'Quiz ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Get quiz to validate answer count
      const quizData = await QuizzesService.getQuizById(quizId, req.user.id);
      const questionCount = quizData.questions.length;

      // Validate submission
      const validation = QuizValidator.validateSubmission(req.body, questionCount);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid submission data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await QuizzesService.submitQuiz(
        quizId,
        req.body.answers,
        req.user.id
      );

      res.json({
        ok: true,
        data: result,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Course is not published',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'NOT_ENROLLED') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'NOT_ENROLLED',
            message: 'You must be enrolled in the course to submit this quiz',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'INVALID_ANSWERS_LENGTH') {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_SUBMISSION',
            message: 'Number of answers does not match number of questions',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error submitting quiz:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit quiz',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/quizzes/:id/submissions/me
   * Get student's latest submission
   */
  getMySubmission: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.id);
      if (isNaN(quizId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_QUIZ_ID',
            message: 'Quiz ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const submission = await QuizzesService.getLatestSubmission(quizId, req.user.id);

      if (!submission) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No submission found for this quiz',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        ok: true,
        data: submission,
        version: config.version
      });
    } catch (error) {
      console.error('Error getting submission:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get submission',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  /**
   * GET /api/quizzes/:id/submissions
   * List all submissions (instructor owner|admin)
   */
  listSubmissions: async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const quizId = parseInt(req.params.id);
      if (isNaN(quizId)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'INVALID_QUIZ_ID',
            message: 'Quiz ID must be a valid number',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const submissions = await QuizzesService.listSubmissions(quizId, req.user.id);

      res.json({
        ok: true,
        data: submissions,
        version: config.version
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quiz not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view submissions for this quiz',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      console.error('Error listing submissions:', error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list submissions',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
