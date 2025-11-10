import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { db } from '../../src/db';
import { AuthService } from '../../src/services/auth.service';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');

const mockDb = db as jest.Mocked<typeof db>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('authController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      body: {},
      requestId: 'test-request-id'
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };
      
      mockRequest.body = userData;
      
      const hashedPassword = '$2b$12$hashedPassword';
      const createdUser = {
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        created_at: new Date()
      };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [createdUser] } as any);
      
      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockAuthService.generateToken.mockReturnValue('jwt-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        createdAt: createdUser.created_at
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['newuser@example.com']
      );
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          message: 'User registered successfully',
          token: 'jwt-token',
          user: expect.objectContaining({
            email: 'newuser@example.com',
            name: 'New User'
          })
        })
      );
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = { password: 'password123', name: 'User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Email, password, and name are required'
          })
        })
      );
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = { email: 'user@example.com', name: 'User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Email, password, and name are required'
          })
        })
      );
    });

    it('should return 400 if name is missing', async () => {
      mockRequest.body = { email: 'user@example.com', password: 'password123' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Email, password, and name are required'
          })
        })
      );
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password123',
        name: 'User'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format'
          })
        })
      );
    });

    it('should return 400 if password is too short', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: '12345',
        name: 'User'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 6 characters long'
          })
        })
      );
    });

    it('should return 400 for invalid role', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
        role: 'invalid-role'
      };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be admin, instructor, or student'
          })
        })
      );
    });

    it('should return 409 if email already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'User'
      };

      mockDb.query.mockResolvedValue({ rows: [{ id: 1 }] } as any);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'EMAIL_EXISTS',
            message: 'Email already registered'
          })
        })
      );
    });

    it('should register user with specified role', async () => {
      mockRequest.body = {
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor User',
        role: 'instructor'
      };

      const createdUser = {
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [createdUser] } as any);

      mockAuthService.hashPassword.mockResolvedValue('$2b$12$hash');
      mockAuthService.generateToken.mockReturnValue('token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        createdAt: createdUser.created_at
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['instructor@example.com', expect.any(String), 'Instructor User', 'instructor'])
      );
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123',
        name: 'User'
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Registration failed'
          })
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123'
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        password_hash: '$2b$12$hashedPassword',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [user] } as any);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockAuthService.generateToken.mockReturnValue('jwt-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: user.created_at
      });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user@example.com']
      );
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('password123', user.password_hash);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          message: 'Login successful',
          token: 'jwt-token',
          user: expect.objectContaining({
            email: 'user@example.com'
          })
        })
      );
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = { password: 'password123' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          })
        })
      );
    });

    it('should return 400 if password is missing', async () => {
      mockRequest.body = { email: 'user@example.com' };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          })
        })
      );
    });

    it('should return 401 if user not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      mockDb.query.mockResolvedValue({ rows: [] } as any);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          })
        })
      );
    });

    it('should return 401 if password is incorrect', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        password_hash: '$2b$12$hashedPassword',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [user] } as any);
      mockAuthService.verifyPassword.mockResolvedValue(false);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          })
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123'
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Login failed'
          })
        })
      );
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        role: 'student'
      };

      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [user] } as any);
      mockAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: user.created_at
      });

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [1]
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          user: expect.objectContaining({
            email: 'user@example.com',
            name: 'Test User'
          })
        })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          })
        })
      );
    });

    it('should return 404 if user not found in database', async () => {
      mockRequest.user = {
        id: 999,
        email: 'deleted@example.com',
        role: 'student'
      };

      mockDb.query.mockResolvedValue({ rows: [] } as any);

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          })
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        role: 'student'
      };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'Failed to get user profile'
          })
        })
      );
    });
  });
});
