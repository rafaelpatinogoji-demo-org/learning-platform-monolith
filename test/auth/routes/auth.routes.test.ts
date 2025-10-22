import request from 'supertest';
import app from '../../../src/app';
import { db } from '../../../src/db';
import { signJwt } from '../../../src/utils/jwt-utils';
import { config } from '../../../src/config';

jest.mock('../../../src/db');

describe('Auth Routes', () => {
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
            created_at: new Date()
          }]
        } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: expect.any(String)
      });
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should default to student role when role not provided', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
            created_at: new Date()
          }]
        } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('student');
    });

    it('should accept valid role assignment', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'instructor@example.com',
            name: 'Instructor User',
            role: 'instructor',
            created_at: new Date()
          }]
        } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'instructor@example.com',
          password: 'password123',
          name: 'Instructor User',
          role: 'instructor'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('instructor');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Email, password, and name are required');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid email format');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Password must be at least 6 characters long');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'invalid-role'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid role. Must be admin, instructor, or student');
    });

    it('should return 409 for duplicate email', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
      expect(response.body.error.message).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const hashedPassword = '$2b$12$hashedPasswordExample';
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        }]
      } as any);

      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: expect.any(String)
      });
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Email and password are required');
    });

    it('should return 401 for non-existent user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for incorrect password', async () => {
      const hashedPassword = '$2b$12$hashedPasswordExample';
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        }]
      } as any);

      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile with valid token', async () => {
      const token = signJwt({ id: 1, email: 'test@example.com', role: 'student' }, config.jwtSecret);
      
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        }]
      } as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: expect.any(String)
      });
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 404 if user not found in database', async () => {
      const token = signJwt({ id: 999, email: 'nonexistent@example.com', role: 'student' }, config.jwtSecret);
      
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
