/**
 * Tests for user operations in auth controller
 * 
 * Tests user registration, login, and profile retrieval
 * with mocked database operations.
 */

import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';
import { testUtils } from '../setup';
import { config } from '../../src/config';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');
jest.mock('../../src/config', () => ({
  config: {
    version: 'v0.5'
  }
}));

describe('User Operations (Auth Controller)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    
    // Ensure clean environment
    jest.clearAllMocks();
  });

  describe('register method', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };
      
      mockReq.body = userData;
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      
      const hashedPassword = 'hashed-password-123';
      (AuthService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      
      const createdUser = {
        id: 123,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [createdUser],
        rowCount: 1
      });
      
      const userProfile = {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role,
        createdAt: createdUser.created_at
      };
      
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(userProfile);
      
      const token = 'jwt-token-123';
      (AuthService.generateToken as jest.Mock).mockReturnValue(token);
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM users WHERE email = $1',
        [userData.email.toLowerCase()]
      );
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        [userData.email.toLowerCase(), hashedPassword, userData.name, userData.role]
      );
      
      expect(AuthService.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(AuthService.createUserProfile).toHaveBeenCalledWith(createdUser);
      expect(AuthService.generateToken).toHaveBeenCalledWith({
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role
      });
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'User registered successfully',
        token,
        user: userProfile,
        version: config.version
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        name: 'Test User'
      };
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
      expect(AuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should return 400 when email format is invalid', async () => {
      // Arrange
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
      expect(AuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should return 400 when password is too short', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        password: '12345', // Too short (less than 6 characters)
        name: 'Test User'
      };
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
      expect(AuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should return 400 when role is invalid', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'invalid-role' // Not one of admin, instructor, student
      };
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be admin, instructor, or student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
      expect(AuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should return 409 when email already exists', async () => {
      // Arrange
      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 456 }],
        rowCount: 1
      });
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['existing@example.com']
      );
      expect(AuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should return 500 when database query fails', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User'
      };
      
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should use default student role when role is not provided', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };
      
      mockReq.body = userData;
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      
      const hashedPassword = 'hashed-password-123';
      (AuthService.hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      
      const createdUser = {
        id: 123,
        email: userData.email,
        name: userData.name,
        role: 'student', // Default role
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [createdUser],
        rowCount: 1
      });
      
      (AuthService.createUserProfile as jest.Mock).mockReturnValue({});
      (AuthService.generateToken as jest.Mock).mockReturnValue('token');
      
      // Act
      await authController.register(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        [userData.email.toLowerCase(), hashedPassword, userData.name, 'student']
      );
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('login method', () => {
    it('should login a user successfully', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };
      
      mockReq.body = loginData;
      
      const user = {
        id: 123,
        email: loginData.email,
        password_hash: 'hashed-password',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [user],
        rowCount: 1
      });
      
      (AuthService.verifyPassword as jest.Mock).mockResolvedValue(true);
      
      const token = 'jwt-token-123';
      (AuthService.generateToken as jest.Mock).mockReturnValue(token);
      
      const userProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      };
      
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(userProfile);
      
      // Act
      await authController.login(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1',
        [loginData.email.toLowerCase()]
      );
      
      expect(AuthService.verifyPassword).toHaveBeenCalledWith(
        loginData.password,
        user.password_hash
      );
      
      expect(AuthService.generateToken).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      expect(AuthService.createUserProfile).toHaveBeenCalledWith(user);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Login successful',
        token,
        user: userProfile,
        version: config.version
      });
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com'
      };
      
      // Act
      await authController.login(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      // Arrange
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      
      // Act
      await authController.login(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(AuthService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        password: 'wrong-password'
      };
      
      const user = {
        id: 123,
        email: 'user@example.com',
        password_hash: 'hashed-password',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [user],
        rowCount: 1
      });
      
      (AuthService.verifyPassword as jest.Mock).mockResolvedValue(false);
      
      // Act
      await authController.login(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(AuthService.verifyPassword).toHaveBeenCalledTimes(1);
      expect(AuthService.generateToken).not.toHaveBeenCalled();
    });

    it('should return 500 when database query fails', async () => {
      // Arrange
      mockReq.body = {
        email: 'user@example.com',
        password: 'password123'
      };
      
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      // Act
      await authController.login(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('me method', () => {
    it('should return the current user profile', async () => {
      // Arrange
      mockReq.user = {
        id: 123,
        email: 'user@example.com',
        role: 'student'
      };
      
      const user = {
        id: 123,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [user],
        rowCount: 1
      });
      
      const userProfile = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      };
      
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(userProfile);
      
      // Act
      await authController.me(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [mockReq.user.id]
      );
      
      expect(AuthService.createUserProfile).toHaveBeenCalledWith(user);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        user: userProfile,
        version: config.version
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      
      // Act
      await authController.me(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found in database', async () => {
      // Arrange
      mockReq.user = {
        id: 999, // Non-existent user ID
        email: 'deleted@example.com',
        role: 'student'
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });
      
      // Act
      await authController.me(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(AuthService.createUserProfile).not.toHaveBeenCalled();
    });

    it('should return 500 when database query fails', async () => {
      // Arrange
      mockReq.user = {
        id: 123,
        email: 'user@example.com',
        role: 'student'
      };
      
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      
      // Act
      await authController.me(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should handle different user roles correctly', async () => {
      // Arrange
      mockReq.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };
      
      const adminUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [adminUser],
        rowCount: 1
      });
      
      const adminProfile = {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        createdAt: adminUser.created_at
      };
      
      (AuthService.createUserProfile as jest.Mock).mockReturnValue(adminProfile);
      
      // Act
      await authController.me(mockReq as Request, mockRes as Response);
      
      // Assert
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [mockReq.user.id]
      );
      
      expect(AuthService.createUserProfile).toHaveBeenCalledWith(adminUser);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        user: adminProfile,
        version: config.version
      });
    });
  });
});
