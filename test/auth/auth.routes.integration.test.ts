import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { authenticate } from '../../src/middleware/auth.middleware';
import { db } from '../../src/db';
import { AuthService } from '../../src/services/auth.service';
import jwt from 'jsonwebtoken';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');
jest.mock('jsonwebtoken');

const mockDb = db as jest.Mocked<typeof db>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Routes Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextFunction = jest.fn();

    mockRequest = {
      body: {},
      headers: {},
      requestId: 'test-request-id'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('POST /auth/register - Full Integration', () => {
    it('should complete full registration flow with all layers', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      mockRequest.body = userData;

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

      mockAuthService.hashPassword.mockResolvedValue('$2b$12$hashedPassword');
      mockAuthService.generateToken.mockReturnValue('jwt-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        createdAt: createdUser.created_at
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockAuthService.generateToken).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          token: 'jwt-token',
          user: expect.objectContaining({
            email: 'newuser@example.com'
          })
        })
      );
    });

    it('should handle validation errors in registration flow', async () => {
      mockRequest.body = { email: 'invalid-email', password: '123', name: 'User' };

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should handle duplicate email in registration flow', async () => {
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
            code: 'EMAIL_EXISTS'
          })
        })
      );
    });
  });

  describe('POST /auth/login - Full Integration', () => {
    it('should complete full login flow with authentication', async () => {
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

      expect(mockDb.query).toHaveBeenCalled();
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('password123', user.password_hash);
      expect(mockAuthService.generateToken).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          token: 'jwt-token',
          user: expect.objectContaining({
            email: 'user@example.com'
          })
        })
      );
    });

    it('should handle invalid credentials in login flow', async () => {
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
            code: 'INVALID_CREDENTIALS'
          })
        })
      );
    });

    it('should handle non-existent user in login flow', async () => {
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
            code: 'INVALID_CREDENTIALS'
          })
        })
      );
    });
  });

  describe('GET /auth/me - Full Integration with Middleware', () => {
    it('should complete full authentication flow with middleware and controller', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      const decodedPayload = {
        sub: 1,
        email: 'user@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };

      mockJwt.verify.mockReturnValue(decodedPayload as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'user@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();

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

    it('should reject request without authentication token', async () => {
      mockRequest.headers = {};

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should reject request with invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Complete Authentication Workflow', () => {
    it('should simulate complete user journey: register -> login -> access protected route', async () => {
      const userData = {
        email: 'journey@example.com',
        password: 'password123',
        name: 'Journey User'
      };

      mockRequest.body = userData;

      const createdUser = {
        id: 5,
        email: 'journey@example.com',
        name: 'Journey User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [createdUser] } as any);

      mockAuthService.hashPassword.mockResolvedValue('$2b$12$hash');
      mockAuthService.generateToken.mockReturnValue('registration-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 5,
        email: 'journey@example.com',
        name: 'Journey User',
        role: 'student',
        createdAt: createdUser.created_at
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          token: 'registration-token'
        })
      );

      jest.clearAllMocks();

      mockRequest.body = {
        email: 'journey@example.com',
        password: 'password123'
      };

      const userWithHash = {
        ...createdUser,
        password_hash: '$2b$12$hash'
      };

      mockDb.query.mockResolvedValue({ rows: [userWithHash] } as any);
      mockAuthService.verifyPassword.mockResolvedValue(true);
      mockAuthService.generateToken.mockReturnValue('login-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 5,
        email: 'journey@example.com',
        name: 'Journey User',
        role: 'student',
        createdAt: createdUser.created_at
      });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          token: 'login-token'
        })
      );

      jest.clearAllMocks();

      mockRequest.headers = {
        authorization: 'Bearer login-token'
      };

      const decodedPayload = {
        sub: 5,
        email: 'journey@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };

      mockJwt.verify.mockReturnValue(decodedPayload as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toEqual({
        id: 5,
        email: 'journey@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();

      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);
      mockAuthService.createUserProfile.mockReturnValue({
        id: 5,
        email: 'journey@example.com',
        name: 'Journey User',
        role: 'student',
        createdAt: createdUser.created_at
      });

      await authController.me(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          user: expect.objectContaining({
            email: 'journey@example.com'
          })
        })
      );
    });

    it('should handle role-based access control in complete flow', async () => {
      const adminData = {
        email: 'admin@example.com',
        password: 'adminpass',
        name: 'Admin User',
        role: 'admin'
      };

      mockRequest.body = adminData;

      const createdAdmin = {
        id: 100,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [createdAdmin] } as any);

      mockAuthService.hashPassword.mockResolvedValue('$2b$12$adminhash');
      mockAuthService.generateToken.mockReturnValue('admin-token');
      mockAuthService.createUserProfile.mockReturnValue({
        id: 100,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: createdAdmin.created_at
      });

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          user: expect.objectContaining({
            role: 'admin'
          })
        })
      );
    });
  });
});
