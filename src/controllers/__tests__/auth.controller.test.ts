import { Request, Response } from 'express';
import { authController } from '../auth.controller';
import { db } from '../../db';
import { AuthService } from '../../services/auth.service';

jest.mock('../../db');
jest.mock('../../services/auth.service');
jest.mock('../../config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    version: 'v1.9'
  }
}));

const mockedDb = db as jest.Mocked<typeof db>;
const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    body: {},
    user: undefined,
    requestId: 'test-request-id',
    ...overrides
  } as Request;
};

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return 400 when email is missing', async () => {
      const req = mockRequest({ body: { password: 'password123', name: 'Test User' } });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when password is missing', async () => {
      const req = mockRequest({ body: { email: 'test@example.com', name: 'Test User' } });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when name is missing', async () => {
      const req = mockRequest({ body: { email: 'test@example.com', password: 'password123' } });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for invalid email format', async () => {
      const req = mockRequest({ 
        body: { email: 'invalid-email', password: 'password123', name: 'Test User' } 
      });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when password is less than 6 characters', async () => {
      const req = mockRequest({ 
        body: { email: 'test@example.com', password: '12345', name: 'Test User' } 
      });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for invalid role', async () => {
      const req = mockRequest({ 
        body: { 
          email: 'test@example.com', 
          password: 'password123', 
          name: 'Test User',
          role: 'invalid-role'
        } 
      });
      const res = mockResponse();

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be admin, instructor, or student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 409 when email already exists', async () => {
      const req = mockRequest({ 
        body: { email: 'existing@example.com', password: 'password123', name: 'Test User' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({ rows: [{ id: 1 }] } as any);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should successfully register user with default student role', async () => {
      const req = mockRequest({ 
        body: { email: 'new@example.com', password: 'password123', name: 'New User' } 
      });
      const res = mockResponse();

      mockedDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'new@example.com',
            name: 'New User',
            role: 'student',
            created_at: new Date('2024-01-01T00:00:00.000Z')
          }]
        } as any);

      mockedAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'new@example.com',
        name: 'New User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');

      await authController.register(req, res);

      expect(AuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['new@example.com', '$2b$12$hashedPassword', 'New User', 'student']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'User registered successfully',
        token: 'mock.jwt.token',
        user: {
          id: 1,
          email: 'new@example.com',
          name: 'New User',
          role: 'student',
          createdAt: new Date('2024-01-01T00:00:00.000Z')
        },
        version: 'v1.9'
      });
    });

    it('should successfully register user with instructor role', async () => {
      const req = mockRequest({ 
        body: { 
          email: 'instructor@example.com', 
          password: 'password123', 
          name: 'Instructor User',
          role: 'instructor'
        } 
      });
      const res = mockResponse();

      mockedDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            email: 'instructor@example.com',
            name: 'Instructor User',
            role: 'instructor',
            created_at: new Date('2024-01-01T00:00:00.000Z')
          }]
        } as any);

      mockedAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');

      await authController.register(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['instructor@example.com', '$2b$12$hashedPassword', 'Instructor User', 'instructor']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should successfully register user with admin role', async () => {
      const req = mockRequest({ 
        body: { 
          email: 'admin@example.com', 
          password: 'password123', 
          name: 'Admin User',
          role: 'admin'
        } 
      });
      const res = mockResponse();

      mockedDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 3,
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin',
            created_at: new Date('2024-01-01T00:00:00.000Z')
          }]
        } as any);

      mockedAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 3,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');

      await authController.register(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['admin@example.com', '$2b$12$hashedPassword', 'Admin User', 'admin']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should convert email to lowercase', async () => {
      const req = mockRequest({ 
        body: { email: 'Test@Example.COM', password: 'password123', name: 'Test User' } 
      });
      const res = mockResponse();

      mockedDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
            created_at: new Date('2024-01-01T00:00:00.000Z')
          }]
        } as any);

      mockedAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');

      await authController.register(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest({ 
        body: { email: 'test@example.com', password: 'password123', name: 'Test User' } 
      });
      const res = mockResponse();

      mockedDb.query.mockRejectedValue(new Error('Database error'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('login', () => {
    it('should return 400 when email is missing', async () => {
      const req = mockRequest({ body: { password: 'password123' } });
      const res = mockResponse();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 when password is missing', async () => {
      const req = mockRequest({ body: { email: 'test@example.com' } });
      const res = mockResponse();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 when user is not found', async () => {
      const req = mockRequest({ 
        body: { email: 'nonexistent@example.com', password: 'password123' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({ rows: [] } as any);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 when password is incorrect', async () => {
      const req = mockRequest({ 
        body: { email: 'test@example.com', password: 'wrongpassword' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: '$2b$12$hashedPassword',
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01T00:00:00.000Z')
        }]
      } as any);

      mockedAuthService.verifyPassword.mockResolvedValue(false);

      await authController.login(req, res);

      expect(AuthService.verifyPassword).toHaveBeenCalledWith('wrongpassword', '$2b$12$hashedPassword');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should successfully login with correct credentials', async () => {
      const req = mockRequest({ 
        body: { email: 'test@example.com', password: 'password123' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: '$2b$12$hashedPassword',
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01T00:00:00.000Z')
        }]
      } as any);

      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });

      await authController.login(req, res);

      expect(AuthService.verifyPassword).toHaveBeenCalledWith('password123', '$2b$12$hashedPassword');
      expect(AuthService.generateToken).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Login successful',
        token: 'mock.jwt.token',
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date('2024-01-01T00:00:00.000Z')
        },
        version: 'v1.9'
      });
    });

    it('should convert email to lowercase during login', async () => {
      const req = mockRequest({ 
        body: { email: 'Test@Example.COM', password: 'password123' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: '$2b$12$hashedPassword',
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01T00:00:00.000Z')
        }]
      } as any);

      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue('mock.jwt.token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });

      await authController.login(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest({ 
        body: { email: 'test@example.com', password: 'password123' } 
      });
      const res = mockResponse();

      mockedDb.query.mockRejectedValue(new Error('Database error'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('me', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();

      await authController.me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when user is not found in database', async () => {
      const req = mockRequest({ 
        user: { id: 999, email: 'test@example.com', role: 'student' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({ rows: [] } as any);

      await authController.me(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [999]
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should successfully return user profile', async () => {
      const req = mockRequest({ 
        user: { id: 1, email: 'test@example.com', role: 'student' } 
      });
      const res = mockResponse();

      mockedDb.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01T00:00:00.000Z')
        }]
      } as any);

      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });

      await authController.me(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date('2024-01-01T00:00:00.000Z')
        },
        version: 'v1.9'
      });
    });

    it('should return 500 on database error', async () => {
      const req = mockRequest({ 
        user: { id: 1, email: 'test@example.com', role: 'student' } 
      });
      const res = mockResponse();

      mockedDb.query.mockRejectedValue(new Error('Database error'));

      await authController.me(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });
});
