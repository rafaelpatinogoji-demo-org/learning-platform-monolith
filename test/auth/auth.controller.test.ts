import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';
import { createMockDb, createMockQueryResult, mockUsers } from '../helpers/db-mock';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');

const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockedDb = db as jest.Mocked<typeof db>;

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {},
      requestId: 'test-request-id',
      user: undefined
    } as any;
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registrationData = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };
      
      mockRequest.body = registrationData;
      
      mockedDb.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([{ ...mockUsers.student, email: registrationData.email }]));
      
      mockedAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockedAuthService.generateToken.mockReturnValue('jwt-token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: registrationData.email,
        name: registrationData.name,
        role: 'student',
        createdAt: new Date()
      });
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        message: 'User registered successfully',
        token: 'jwt-token',
        user: expect.any(Object),
        version: expect.any(String)
      });
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.body = { password: 'password123', name: 'Test' };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        })
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { email: 'test@test.com', name: 'Test' };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
    });

    it('should return 400 when name is missing', async () => {
      mockRequest.body = { email: 'test@test.com', password: 'password123' };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test'
      };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        })
      });
    });

    it('should return 400 when password is too short', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: '12345',
        name: 'Test'
      };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long'
        })
      });
    });

    it('should return 400 for invalid role', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
        role: 'invalid_role'
      };
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be admin, instructor, or student'
        })
      });
    });

    it('should default to student role when not specified', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test'
      };
      
      mockedDb.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([mockUsers.student]));
      
      mockedAuthService.hashPassword.mockResolvedValue('hashed');
      mockedAuthService.generateToken.mockReturnValue('token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        role: 'student',
        createdAt: new Date()
      });
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockedDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test@test.com', 'hashed', 'Test', 'student'])
      );
    });

    it('should return 409 when email already exists', async () => {
      mockRequest.body = {
        email: 'existing@test.com',
        password: 'password123',
        name: 'Test'
      };
      
      mockedDb.query.mockResolvedValueOnce(createMockQueryResult([mockUsers.student]));
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        })
      });
    });

    it('should convert email to lowercase', async () => {
      mockRequest.body = {
        email: 'Test@Example.COM',
        password: 'password123',
        name: 'Test'
      };
      
      mockedDb.query
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([mockUsers.student]));
      
      mockedAuthService.hashPassword.mockResolvedValue('hashed');
      mockedAuthService.generateToken.mockReturnValue('token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        role: 'student',
        createdAt: new Date()
      });
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockedDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test@example.com'])
      );
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test'
      };
      
      mockedDb.query.mockRejectedValue(new Error('Database error'));
      
      await authController.register(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        })
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      mockRequest.body = {
        email: 'student@test.com',
        password: 'password123'
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([mockUsers.student]));
      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue('jwt-token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: mockUsers.student.id,
        email: mockUsers.student.email,
        name: mockUsers.student.name,
        role: mockUsers.student.role,
        createdAt: mockUsers.student.created_at
      });
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Login successful',
        token: 'jwt-token',
        user: expect.any(Object),
        version: expect.any(String)
      });
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.body = { password: 'password123' };
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        })
      });
    });

    it('should return 400 when password is missing', async () => {
      mockRequest.body = { email: 'test@test.com' };
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when user not found', async () => {
      mockRequest.body = {
        email: 'nonexistent@test.com',
        password: 'password123'
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([]));
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        })
      });
    });

    it('should return 401 when password is incorrect', async () => {
      mockRequest.body = {
        email: 'student@test.com',
        password: 'wrongpassword'
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([mockUsers.student]));
      mockedAuthService.verifyPassword.mockResolvedValue(false);
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        })
      });
    });

    it('should convert email to lowercase when searching', async () => {
      mockRequest.body = {
        email: 'Student@TEST.com',
        password: 'password123'
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([mockUsers.student]));
      mockedAuthService.verifyPassword.mockResolvedValue(true);
      mockedAuthService.generateToken.mockReturnValue('token');
      mockedAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'student@test.com',
        name: 'Test',
        role: 'student',
        createdAt: new Date()
      });
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockedDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['student@test.com']
      );
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: 'password123'
      };
      
      mockedDb.query.mockRejectedValue(new Error('Database error'));
      
      await authController.login(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        })
      });
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      mockRequest.user = {
        id: mockUsers.student.id,
        email: mockUsers.student.email,
        role: mockUsers.student.role
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([mockUsers.student]));
      mockedAuthService.createUserProfile.mockReturnValue({
        id: mockUsers.student.id,
        email: mockUsers.student.email,
        name: mockUsers.student.name,
        role: mockUsers.student.role,
        createdAt: mockUsers.student.created_at
      });
      
      await authController.me(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        user: expect.any(Object),
        version: expect.any(String)
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      
      await authController.me(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      });
    });

    it('should return 404 when user not found in database', async () => {
      mockRequest.user = {
        id: 999,
        email: 'deleted@test.com',
        role: 'student'
      };
      
      mockedDb.query.mockResolvedValue(createMockQueryResult([]));
      
      await authController.me(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        })
      });
    });

    it('should return 500 on database error', async () => {
      mockRequest.user = {
        id: 1,
        email: 'test@test.com',
        role: 'student'
      };
      
      mockedDb.query.mockRejectedValue(new Error('Database error'));
      
      await authController.me(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile'
        })
      });
    });
  });
});
