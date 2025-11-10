/**
 * Integration tests for auth.controller
 * 
 * Tests authentication controller endpoints (register, login, me) with light integration
 * using mocked database and real Express request/response objects.
 * 
 * Coverage target: Comprehensive coverage of all controller methods
 */

import { Request, Response } from 'express';
import { authController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/db');

describe('authController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      body: {},
      requestId: 'test-request-id'
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    describe('successful registration', () => {
      it('should register new user and return token', async () => {
        mockReq.body = {
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] }) // Email check
          .mockResolvedValueOnce({ // User creation
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              name: 'New User',
              role: 'student',
              created_at: new Date('2024-01-01')
            }]
          });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: true,
          message: 'User registered successfully',
          token: expect.any(String),
          user: {
            id: 1,
            email: 'newuser@example.com',
            name: 'New User',
            role: 'student',
            createdAt: new Date('2024-01-01')
          },
          version: expect.any(String)
        });
      });

      it('should register user with instructor role when specified', async () => {
        mockReq.body = {
          email: 'instructor@example.com',
          password: 'password123',
          name: 'Instructor User',
          role: 'instructor'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 2,
              email: 'instructor@example.com',
              name: 'Instructor User',
              role: 'instructor',
              created_at: new Date()
            }]
          });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(201);
        const call = jsonMock.mock.calls[0][0];
        expect(call.user.role).toBe('instructor');
      });

      it('should register user with admin role when specified', async () => {
        mockReq.body = {
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
          role: 'admin'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 3,
              email: 'admin@example.com',
              name: 'Admin User',
              role: 'admin',
              created_at: new Date()
            }]
          });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(201);
        const call = jsonMock.mock.calls[0][0];
        expect(call.user.role).toBe('admin');
      });

      it('should default to student role when role not specified', async () => {
        mockReq.body = {
          email: 'student@example.com',
          password: 'password123',
          name: 'Student User'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 4,
              email: 'student@example.com',
              name: 'Student User',
              role: 'student',
              created_at: new Date()
            }]
          });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(201);
        const call = jsonMock.mock.calls[0][0];
        expect(call.user.role).toBe('student');
      });

      it('should convert email to lowercase', async () => {
        mockReq.body = {
          email: 'NewUser@Example.COM',
          password: 'password123',
          name: 'New User'
        };

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'newuser@example.com',
              name: 'New User',
              role: 'student',
              created_at: new Date()
            }]
          });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['newuser@example.com'])
        );
      });
    });

    describe('validation errors', () => {
      it('should return 400 when email is missing', async () => {
        mockReq.body = {
          password: 'password123',
          name: 'User'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
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
        mockReq.body = {
          email: 'test@example.com',
          name: 'User'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
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
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
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
        mockReq.body = {
          email: 'invalid-email',
          password: 'password123',
          name: 'User'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });

      it('should return 400 for password shorter than 6 characters', async () => {
        mockReq.body = {
          email: 'test@example.com',
          password: '12345',
          name: 'User'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
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
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'User',
          role: 'invalid-role'
        };

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be admin, instructor, or student',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('duplicate email', () => {
      it('should return 409 when email already exists', async () => {
        mockReq.body = {
          email: 'existing@example.com',
          password: 'password123',
          name: 'User'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{ id: 1 }]
        });

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already registered',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'User'
        };

        (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

        await authController.register(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
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
  });

  describe('login', () => {
    describe('successful login', () => {
      it('should login user with valid credentials', async () => {
        const hashedPassword = await AuthService.hashPassword('password123');
        
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            name: 'Test User',
            role: 'student',
            created_at: new Date('2024-01-01')
          }]
        });

        await authController.login(mockReq as Request, mockRes as Response);

        expect(jsonMock).toHaveBeenCalledWith({
          ok: true,
          message: 'Login successful',
          token: expect.any(String),
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'Test User',
            role: 'student',
            createdAt: new Date('2024-01-01')
          },
          version: expect.any(String)
        });
      });

      it('should convert email to lowercase for lookup', async () => {
        const hashedPassword = await AuthService.hashPassword('password123');
        
        mockReq.body = {
          email: 'User@Example.COM',
          password: 'password123'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            name: 'Test User',
            role: 'student',
            created_at: new Date()
          }]
        });

        await authController.login(mockReq as Request, mockRes as Response);

        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['user@example.com'])
        );
      });
    });

    describe('validation errors', () => {
      it('should return 400 when email is missing', async () => {
        mockReq.body = {
          password: 'password123'
        };

        await authController.login(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
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
        mockReq.body = {
          email: 'user@example.com'
        };

        await authController.login(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('authentication failures', () => {
      it('should return 401 when user not found', async () => {
        mockReq.body = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await authController.login(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
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
        const hashedPassword = await AuthService.hashPassword('correctPassword');
        
        mockReq.body = {
          email: 'user@example.com',
          password: 'wrongPassword'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            password_hash: hashedPassword,
            name: 'Test User',
            role: 'student',
            created_at: new Date()
          }]
        });

        await authController.login(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123'
        };

        (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

        await authController.login(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
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
  });

  describe('me', () => {
    describe('successful profile retrieval', () => {
      it('should return user profile when authenticated', async () => {
        mockReq.user = {
          id: 1,
          email: 'user@example.com',
          role: 'student'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            name: 'Test User',
            role: 'student',
            created_at: new Date('2024-01-01')
          }]
        });

        await authController.me(mockReq as Request, mockRes as Response);

        expect(jsonMock).toHaveBeenCalledWith({
          ok: true,
          user: {
            id: 1,
            email: 'user@example.com',
            name: 'Test User',
            role: 'student',
            createdAt: new Date('2024-01-01')
          },
          version: expect.any(String)
        });
      });

      it('should fetch fresh data from database', async () => {
        mockReq.user = {
          id: 42,
          email: 'user@example.com',
          role: 'instructor'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({
          rows: [{
            id: 42,
            email: 'user@example.com',
            name: 'Updated Name',
            role: 'instructor',
            created_at: new Date()
          }]
        });

        await authController.me(mockReq as Request, mockRes as Response);

        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          [42]
        );
      });
    });

    describe('authentication errors', () => {
      it('should return 401 when user not authenticated', async () => {
        mockReq.user = undefined;

        await authController.me(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });

      it('should return 404 when user not found in database', async () => {
        mockReq.user = {
          id: 999,
          email: 'deleted@example.com',
          role: 'student'
        };

        (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

        await authController.me(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            requestId: 'test-request-id',
            timestamp: expect.any(String)
          }
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.user = {
          id: 1,
          email: 'user@example.com',
          role: 'student'
        };

        (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

        await authController.me(mockReq as Request, mockRes as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
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

  describe('Integration scenarios', () => {
    it('should handle complete registration and login flow', async () => {
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email,
            name,
            role: 'student',
            created_at: new Date()
          }]
        });

      mockReq.body = { email, password, name };
      await authController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      const registerCall = jsonMock.mock.calls[0][0];
      expect(registerCall.token).toBeDefined();

      jest.clearAllMocks();

      const hashedPassword = await AuthService.hashPassword(password);
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email,
          password_hash: hashedPassword,
          name,
          role: 'student',
          created_at: new Date()
        }]
      });

      mockReq.body = { email, password };
      await authController.login(mockReq as Request, mockRes as Response);

      const loginCall = jsonMock.mock.calls[0][0];
      expect(loginCall.ok).toBe(true);
      expect(loginCall.token).toBeDefined();
    });

    it('should handle different user roles throughout flow', async () => {
      const roles = ['student', 'instructor', 'admin'];

      for (const role of roles) {
        jest.clearAllMocks();

        (db.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: `${role}@example.com`,
              name: `${role} User`,
              role,
              created_at: new Date()
            }]
          });

        mockReq.body = {
          email: `${role}@example.com`,
          password: 'password123',
          name: `${role} User`,
          role
        };

        await authController.register(mockReq as Request, mockRes as Response);

        const call = jsonMock.mock.calls[0][0];
        expect(call.user.role).toBe(role);
      }
    });
  });
});
