import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../../src/routes/auth.routes';
import { db } from '../../src/db';
import { AuthService } from '../../src/services/auth.service';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
  sign: jest.fn()
}));
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    version: 'v1.9'
  }
}));

describe('Auth Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req: any, res, next) => {
      req.requestId = 'test-request-id';
      next();
    });
    app.use('/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should complete full registration flow successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      const mockUser = {
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      (AuthService.generateToken as jest.Mock).mockReturnValue('mock.jwt.token');
      (AuthService.createUserProfile as jest.Mock).mockReturnValue({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        createdAt: mockUser.created_at
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBe('mock.jwt.token');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'New User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should complete full login flow successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$hashedpassword',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.verifyPassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateToken as jest.Mock).mockReturnValue('mock.jwt.token');
      (AuthService.createUserProfile as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: mockUser.created_at
      });

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBe('mock.jwt.token');
      expect(response.body.user).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$hashedpassword',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.verifyPassword as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.createUserProfile as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: mockUser.created_at
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid.token.here')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
