import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
    healthCheck: jest.fn(),
    smokeTest: jest.fn()
  }
}));

jest.mock('../../src/middleware/auth.middleware', () => {
  const authenticate = jest.fn((req: any, res: any, next: any) => next());
  const requireRole = jest.fn(() => (req: any, res: any, next: any) => next());
  const authenticateOptional = jest.fn((req: any, res: any, next: any) => next());
  
  return {
    authenticate,
    requireRole,
    authenticateOptional,
    authMiddleware: {
      required: authenticate,
      optional: authenticateOptional
    }
  };
});

import app from '../../src/app';
import { db } from '../../src/db';
import * as authMiddleware from '../../src/middleware/auth.middleware';

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const mockHealthCheck = db.healthCheck as jest.MockedFunction<typeof db.healthCheck>;
const mockSmokeTest = db.smokeTest as jest.MockedFunction<typeof db.smokeTest>;

const mockAuthMiddleware = (user: any) => {
  mockHealthCheck.mockResolvedValue(true);
  mockSmokeTest.mockResolvedValue({ success: true, userCount: 0 });
  
  jest.spyOn(authMiddleware, 'authenticate').mockImplementation((req: any, res: any, next: any) => {
    if (user) {
      req.user = user;
      return next();
    } else {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header'
        }
      });
    }
  });

  jest.spyOn(authMiddleware, 'requireRole').mockImplementation((...roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Required role(s): ${roles.join(', ')}`
          }
        });
      }
      next();
    };
  });

  jest.spyOn(authMiddleware, 'authenticateOptional').mockImplementation((req: any, res: any, next: any) => {
    if (user) {
      req.user = user;
    }
    return next();
  });
};

describe('Quizzes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/courses/:courseId/quizzes', () => {
    it('should create quiz successfully as instructor', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'New Quiz', course_id: 1, created_at: new Date() }],
          rowCount: 1
        } as any);

      const response = await request(app)
        .post('/api/courses/1/quizzes')
        .send({ title: 'New Quiz' });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('title', 'New Quiz');
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthMiddleware(null);

      const response = await request(app)
        .post('/api/courses/1/quizzes')
        .send({ title: 'New Quiz' });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });

    it('should return 403 when user is student', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }], rowCount: 1 } as any);

      const response = await request(app)
        .post('/api/courses/1/quizzes')
        .send({ title: 'New Quiz' });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
    });

    it('should return 400 with validation errors for invalid data', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      const response = await request(app)
        .post('/api/courses/1/quizzes')
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid course ID', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      const response = await request(app)
        .post('/api/courses/invalid/quizzes')
        .send({ title: 'New Quiz' });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('GET /api/courses/:courseId/quizzes', () => {
    it('should list quizzes without authentication for published course', async () => {
      mockAuthMiddleware(null);

      mockQuery.mockResolvedValueOnce({
        rows: [{ published: true, instructor_id: 1 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Quiz 1', course_id: 1 },
          { id: 2, title: 'Quiz 2', course_id: 1 }
        ],
        rowCount: 2
      } as any);

      const response = await request(app)
        .get('/api/courses/1/quizzes');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should list quizzes with authentication', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ published: true, instructor_id: 1 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Quiz 1', course_id: 1 }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .get('/api/courses/1/quizzes');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('should return 404 for non-existent course', async () => {
      mockAuthMiddleware(null);
      
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .get('/api/courses/999/quizzes');

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('POST /api/quizzes/:quizId/questions', () => {
    it('should create question successfully', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      const questionData = {
        prompt: 'What is 2 + 2?',
        choices: ['3', '4', '5'],
        correct_index: 1
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'instructor' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          prompt: 'What is 2 + 2?',
          choices: ['3', '4', '5'],
          correct_index: 1,
          quiz_id: 1
        }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .post('/api/quizzes/1/questions')
        .send(questionData);

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.choices).toEqual(['3', '4', '5']);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthMiddleware(null);

      const response = await request(app)
        .post('/api/quizzes/1/questions')
        .send({ prompt: 'Test?', choices: ['A', 'B'], correct_index: 0 });

      expect(response.status).toBe(401);
    });

    it('should return 403 for wrong role', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'student' }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .post('/api/quizzes/1/questions')
        .send({ prompt: 'Test?', choices: ['A', 'B'], correct_index: 0 });

      expect(response.status).toBe(403);
    });

    it('should return 400 with validation errors', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      const response = await request(app)
        .post('/api/quizzes/1/questions')
        .send({ prompt: '', choices: ['A'], correct_index: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent quiz', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .post('/api/quizzes/999/questions')
        .send({ prompt: 'Test?', choices: ['A', 'B'], correct_index: 0 });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should return quiz with questions', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Quiz 1',
          course_id: 1,
          published: true,
          instructor_id: 999,
          created_at: new Date()
        }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'student' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            prompt: 'Question 1',
            choices: ['A', 'B', 'C'],
            correct_index: 1,
            quiz_id: 1,
            created_at: new Date()
          }
        ],
        rowCount: 1
      } as any);

      const response = await request(app)
        .get('/api/quizzes/1');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.quiz).toHaveProperty('id', 1);
      expect(response.body.data.questions).toHaveLength(1);
      expect(response.body.data.questions[0]).not.toHaveProperty('correct_index');
    });

    it('should return 400 for invalid quiz ID', async () => {
      const response = await request(app)
        .get('/api/quizzes/invalid');

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent quiz', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .get('/api/quizzes/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/quizzes/:id/submit', () => {
    it('should submit quiz and return score', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, title: 'Test Quiz', published: true, instructor_id: 1, created_at: new Date() }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'student' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 0, created_at: new Date() },
          { id: 2, quiz_id: 1, prompt: 'Q2', choices: ['C', 'D'], correct_index: 1, created_at: new Date() }
        ],
        rowCount: 2
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, published: true }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 }
        ],
        rowCount: 2
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          quiz_id: 1,
          user_id: 2,
          answers: [0, 1],
          score: 100.0,
          created_at: new Date()
        }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .post('/api/quizzes/1/submit')
        .send({ answers: [0, 1] });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.score).toBe(100.0);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthMiddleware(null);

      const response = await request(app)
        .post('/api/quizzes/1/submit')
        .send({ answers: [0, 1] });

      expect(response.status).toBe(401);
    });

    it('should return 400 with validation errors for invalid answers', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, published: true }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 }
        ],
        rowCount: 2
      } as any);

      const response = await request(app)
        .post('/api/quizzes/1/submit')
        .send({ answers: 'not an array' });

      expect(response.status).toBe(400);
    });

    it('should return 403 for unpublished course', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, title: 'Test Quiz', published: false, instructor_id: 1, created_at: new Date() }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'instructor' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, quiz_id: 1, prompt: 'Q1', choices: ['A', 'B'], correct_index: 0, created_at: new Date() },
          { id: 2, quiz_id: 1, prompt: 'Q2', choices: ['C', 'D'], correct_index: 1, created_at: new Date() }
        ],
        rowCount: 2
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, published: false }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .post('/api/quizzes/1/submit')
        .send({ answers: [0, 1] });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent quiz', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .post('/api/quizzes/999/submit')
        .send({ answers: [0, 1] });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quizzes/:id/submissions/me', () => {
    it('should return student submission', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          quiz_id: 1,
          user_id: 2,
          answers: [0, 1],
          score: 100.0,
          created_at: new Date()
        }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .get('/api/quizzes/1/submissions/me');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('score', 100.0);
      expect(response.body.data.answers).toEqual([0, 1]);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthMiddleware(null);

      const response = await request(app)
        .get('/api/quizzes/1/submissions/me');

      expect(response.status).toBe(401);
    });

    it('should return 404 when no submission exists', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .get('/api/quizzes/1/submissions/me');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quizzes/:id/submissions', () => {
    it('should return all submissions for instructor', async () => {
      const instructorUser = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockAuthMiddleware(instructorUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'instructor' }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            quiz_id: 1,
            user_id: 2,
            answers: [0, 1],
            score: '100.0',
            created_at: new Date(),
            user_name: 'Student 1',
            user_email: 'student1@test.com'
          },
          {
            id: 2,
            quiz_id: 1,
            user_id: 3,
            answers: [1, 0],
            score: '50.0',
            created_at: new Date(),
            user_name: 'Student 2',
            user_email: 'student2@test.com'
          }
        ],
        rowCount: 2
      } as any);

      const response = await request(app)
        .get('/api/quizzes/1/submissions');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthMiddleware(null);

      const response = await request(app)
        .get('/api/quizzes/1/submissions');

      expect(response.status).toBe(401);
    });

    it('should return 403 for student trying to view all submissions', async () => {
      const studentUser = { id: 2, email: 'student@test.com', role: 'student' };
      mockAuthMiddleware(studentUser);

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
        rowCount: 1
      } as any);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{ role: 'student' }],
        rowCount: 1
      } as any);

      const response = await request(app)
        .get('/api/quizzes/1/submissions');

      expect(response.status).toBe(403);
    });
  });
});
