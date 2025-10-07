import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    version: 'v1.9'
  }
}));

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined
    } as any;
    (mockRequest as any).requestId = 'test-request-id';
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };
      mockRequest.body = userData;

      const mockHashedPassword = '$2b$12$hashedpassword';
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      const mockToken = 'mock.jwt.token';
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: mockUser.created_at
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
      (AuthService.generateToken as jest.Mock).mockReturnValue(mockToken);
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(mockProfile);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith('SELECT id FROM users WHERE email = $1', ['test@example.com']);
      expect(AuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['test@example.com', mockHashedPassword, 'Test User', 'student']
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        message: 'User registered successfully',
        token: mockToken,
        user: mockProfile,
        version: 'v1.9'
      });
    });

    it('should register user with specified role', async () => {
      const userData = {
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor User',
        role: 'instructor'
      };
      mockRequest.body = userData;

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'instructor@example.com', name: 'Instructor User', role: 'instructor', created_at: new Date() }] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('$2b$12$hashedpassword');
      (AuthService.generateToken as jest.Mock).mockReturnValue('token');
      (AuthService.createUserProfile as jest.Mock).mockReturnValue({});

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['instructor@example.com', expect.any(String), 'Instructor User', 'instructor']
      );
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = { password: 'password123', name: 'Test User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for missing password', async () => {
      mockRequest.body = { email: 'test@example.com', name: 'Test User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for missing name', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
      mockRequest.body = { email: 'invalid-email', password: 'password123', name: 'Test User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for password too short', async () => {
      mockRequest.body = { email: 'test@example.com', password: '12345', name: 'Test User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'invalid-role'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be admin, instructor, or student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 409 for existing email', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for database errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
    it('should successfully login user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      mockRequest.body = credentials;

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: '$2b$12$hashedpassword',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      const mockToken = 'mock.jwt.token';
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: mockUser.created_at
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.verifyPassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateToken as jest.Mock).mockReturnValue(mockToken);
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(mockProfile);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(AuthService.verifyPassword).toHaveBeenCalledWith('password123', mockUser.password_hash);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Login successful',
        token: mockToken,
        user: mockProfile,
        version: 'v1.9'
      });
    });

    it('should return 400 for missing email', async () => {
      mockRequest.body = { password: 'password123' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for missing password', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 for non-existent user', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 401 for wrong password', async () => {
      mockRequest.body = {
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

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for database errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
    it('should return user profile for authenticated user', async () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'student' };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: mockUser.created_at
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(mockProfile);

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [1]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        user: mockProfile,
        version: 'v1.9'
      });
    });

    it('should return 401 for missing req.user', async () => {
      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for user not found in database', async () => {
      mockRequest.user = { id: 999, email: 'deleted@example.com', role: 'student' };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 500 for database errors', async () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'student' };

      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
