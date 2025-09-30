/**
 * Tests for AuthController
 * 
 * Pure unit tests for authentication controller methods
 * with mocked dependencies (AuthService, database, config).
 */

import { authController } from '../../src/controllers/auth.controller';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/services/auth.service');
const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));
const mockedDb = db as jest.Mocked<typeof db>;

jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret',
    version: 'v1.2'
  }
}));

describe('authController', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: undefined
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'student'
    };

    describe('Success cases', () => {
      it('should register new user successfully', async () => {
        mockReq.body = validRegisterData;
        const hashedPassword = '$2b$12$hashedPassword';
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };
        const mockProfile = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date()
        };
        const mockToken = 'jwt.token.value';

        mockedAuthService.hashPassword.mockResolvedValue(hashedPassword);
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);
        mockedAuthService.generateToken.mockReturnValue(mockToken);

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', true);
        expect(response).toHaveProperty('user');
        expect(response).toHaveProperty('token', mockToken);
        expect(response.user).toEqual(mockProfile);
      });

      it('should return user profile and JWT token', async () => {
        mockReq.body = validRegisterData;
        const hashedPassword = '$2b$12$hashed';
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };
        const mockProfile = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date()
        };
        const mockToken = 'jwt.token';

        mockedAuthService.hashPassword.mockResolvedValue(hashedPassword);
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);
        mockedAuthService.generateToken.mockReturnValue(mockToken);

        await authController.register(mockReq, mockRes);

        const responseCall = mockRes.json.mock.calls[0][0];
        expect(responseCall).toHaveProperty('ok', true);
        expect(responseCall).toHaveProperty('user');
        expect(responseCall).toHaveProperty('token');
        expect(responseCall.user).toEqual(mockProfile);
        expect(responseCall.token).toBe(mockToken);
      });

      it('should hash password before storing', async () => {
        mockReq.body = validRegisterData;
        const hashedPassword = '$2b$12$hashed';

        mockedAuthService.hashPassword.mockResolvedValue(hashedPassword);
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'student', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.register(mockReq, mockRes);

        expect(mockedAuthService.hashPassword).toHaveBeenCalledWith(validRegisterData.password);
        const insertQueryCall = mockedDb.query.mock.calls[1];
        expect(insertQueryCall![1]![1]).toBe(hashedPassword);
      });

      it('should normalize email to lowercase', async () => {
        mockReq.body = {
          ...validRegisterData,
          email: 'User@Example.COM'
        };

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'student', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.register(mockReq, mockRes);

        const insertQueryCall = mockedDb.query.mock.calls[1];
        expect(insertQueryCall![1]![0]).toBe('user@example.com');
      });

      it('should default role to student if not provided', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123',
          name: 'Test User'
        };

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'student', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.register(mockReq, mockRes);

        const insertQueryCall = mockedDb.query.mock.calls[1];
        expect(insertQueryCall![1]![3]).toBe('student');
      });

      it('should accept valid admin role when provided', async () => {
        mockReq.body = {
          ...validRegisterData,
          role: 'admin'
        };

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'admin', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.register(mockReq, mockRes);

        const insertQueryCall = mockedDb.query.mock.calls[1];
        expect(insertQueryCall![1]![3]).toBe('admin');
      });

      it('should accept valid instructor role when provided', async () => {
        mockReq.body = {
          ...validRegisterData,
          role: 'instructor'
        };

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'instructor', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.register(mockReq, mockRes);

        const insertQueryCall = mockedDb.query.mock.calls[1];
        expect(insertQueryCall![1]![3]).toBe('instructor');
      });
    });

    describe('Validation error cases', () => {
      it('should return 400 when email is missing', async () => {
        mockReq.body = {
          password: 'password123',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });

      it('should return 400 when password is missing', async () => {
        mockReq.body = {
          email: 'user@example.com',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });

      it('should return 400 when name is missing', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });

      it('should return 400 for invalid email format', async () => {
        mockReq.body = {
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format'
        });
      });

      it('should return 400 for password less than 6 characters', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: '12345',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 6 characters long'
        });
      });

      it('should return 400 for invalid role', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'superuser'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be admin, instructor, or student'
        });
      });

      it('should return 400 for empty email', async () => {
        mockReq.body = {
          email: '',
          password: 'password123',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });

      it('should return 400 for empty password', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: '',
          name: 'Test User'
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });

      it('should return 400 for empty name', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: 'password123',
          name: ''
        };

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and name are required'
        });
      });
    });

    describe('Business logic error cases', () => {
      it('should return 409 when email already exists', async () => {
        mockReq.body = validRegisterData;

        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] } as any);

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        });
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.body = validRegisterData;

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockRejectedValue(new Error('Database error'));

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        });
      });

      it('should return 500 on hashing error', async () => {
        mockReq.body = validRegisterData;

        mockedAuthService.hashPassword.mockRejectedValue(new Error('Hashing error'));

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        });
      });

      it('should return 500 on token generation error', async () => {
        mockReq.body = validRegisterData;

        mockedAuthService.hashPassword.mockResolvedValue('hashed');
        mockedDb.query.mockResolvedValueOnce({ rows: [] } as any);
        mockedDb.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@example.com', name: 'Test User', role: 'student', created_at: new Date() }] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockImplementation(() => {
          throw new Error('Token generation error');
        });

        await authController.register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Registration failed'
        });
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'user@example.com',
      password: 'password123'
    };

    describe('Success cases', () => {
      it('should login user successfully with valid credentials', async () => {
        mockReq.body = validLoginData;
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: '$2b$12$hash'
        };
        const mockProfile = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date()
        };
        const mockToken = 'jwt.token';

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockResolvedValue(true);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);
        mockedAuthService.generateToken.mockReturnValue(mockToken);

        await authController.login(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', true);
        expect(response).toHaveProperty('user');
        expect(response).toHaveProperty('token', mockToken);
      });

      it('should return user profile and JWT token', async () => {
        mockReq.body = validLoginData;
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: '$2b$12$hash'
        };
        const mockProfile = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date()
        };
        const mockToken = 'jwt.token';

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockResolvedValue(true);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);
        mockedAuthService.generateToken.mockReturnValue(mockToken);

        await authController.login(mockReq, mockRes);

        const responseCall = mockRes.json.mock.calls[0][0];
        expect(responseCall).toHaveProperty('ok', true);
        expect(responseCall).toHaveProperty('user');
        expect(responseCall).toHaveProperty('token');
        expect(responseCall.user).toEqual(mockProfile);
        expect(responseCall.token).toBe(mockToken);
      });

      it('should verify password against stored hash', async () => {
        mockReq.body = validLoginData;
        const passwordHash = '$2b$12$storedHash';
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: passwordHash
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockResolvedValue(true);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockReturnValue('token');

        await authController.login(mockReq, mockRes);

        expect(mockedAuthService.verifyPassword).toHaveBeenCalledWith(
          validLoginData.password,
          passwordHash
        );
      });
    });

    describe('Validation error cases', () => {
      it('should return 400 when email is missing', async () => {
        mockReq.body = {
          password: 'password123'
        };

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        });
      });

      it('should return 400 when password is missing', async () => {
        mockReq.body = {
          email: 'user@example.com'
        };

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        });
      });

      it('should return 400 when both email and password are missing', async () => {
        mockReq.body = {};

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        });
      });

      it('should return 400 for empty email', async () => {
        mockReq.body = {
          email: '',
          password: 'password123'
        };

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        });
      });

      it('should return 400 for empty password', async () => {
        mockReq.body = {
          email: 'user@example.com',
          password: ''
        };

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        });
      });
    });

    describe('Authentication error cases', () => {
      it('should return 401 when user not found', async () => {
        mockReq.body = validLoginData;

        mockedDb.query.mockResolvedValue({ rows: [] } as any);

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      });

      it('should return 401 when password is incorrect', async () => {
        mockReq.body = validLoginData;
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: '$2b$12$hash'
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockResolvedValue(false);

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      });

      it('should not leak information about user existence', async () => {
        mockReq.body = validLoginData;

        mockedDb.query.mockResolvedValue({ rows: [] } as any);

        await authController.login(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.error.message).toBe('Invalid email or password');
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.body = validLoginData;

        mockedDb.query.mockRejectedValue(new Error('Database error'));

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        });
      });

      it('should return 500 on password verification error', async () => {
        mockReq.body = validLoginData;
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: '$2b$12$hash'
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockRejectedValue(new Error('Verification error'));

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        });
      });

      it('should return 500 on token generation error', async () => {
        mockReq.body = validLoginData;
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date(),
          password_hash: '$2b$12$hash'
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.verifyPassword.mockResolvedValue(true);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);
        mockedAuthService.generateToken.mockImplementation(() => {
          throw new Error('Token generation error');
        });

        await authController.login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        });
      });
    });
  });

  describe('me', () => {
    describe('Success cases', () => {
      it('should return current user profile', async () => {
        mockReq.user = { id: 1 };
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };
        const mockProfile = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          createdAt: new Date()
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);

        await authController.me(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', true);
        expect(response).toHaveProperty('user');
        expect(response.user).toEqual(mockProfile);
      });

      it('should query database with user ID from request', async () => {
        mockReq.user = { id: 42 };
        const mockUser = {
          id: 42,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockReturnValue({} as any);

        await authController.me(mockReq, mockRes);

        expect(mockedDb.query).toHaveBeenCalledTimes(1);
        const queryCall = mockedDb.query.mock.calls[0];
        expect(queryCall[1]).toEqual([42]);
      });

      it('should return profile for admin user', async () => {
        mockReq.user = { id: 1 };
        const mockUser = {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          created_at: new Date()
        };
        const mockProfile = {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          createdAt: new Date()
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockReturnValue(mockProfile);

        await authController.me(mockReq, mockRes);

        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', true);
        expect(response).toHaveProperty('user');
        expect(response.user.role).toBe('admin');
      });
    });

    describe('Authentication error cases', () => {
      it('should return 401 when user not authenticated', async () => {
        mockReq.user = undefined;

        await authController.me(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      });

      it('should return 401 when user object is null', async () => {
        mockReq.user = null;

        await authController.me(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      });

      it('should return 404 when user not found in database', async () => {
        mockReq.user = { id: 999 };

        mockedDb.query.mockResolvedValue({ rows: [] } as any);

        await authController.me(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        });
      });
    });

    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockReq.user = { id: 1 };

        mockedDb.query.mockRejectedValue(new Error('Database error'));

        await authController.me(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile'
        });
      });

      it('should return 500 on profile creation error', async () => {
        mockReq.user = { id: 1 };
        const mockUser = {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };

        mockedDb.query.mockResolvedValue({ rows: [mockUser] } as any);
        mockedAuthService.createUserProfile.mockImplementation(() => {
          throw new Error('Profile creation error');
        });

        await authController.me(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        const response = mockRes.json.mock.calls[0][0];
        expect(response).toHaveProperty('ok', false);
        expect(response.error).toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile'
        });
      });
    });
  });
});
