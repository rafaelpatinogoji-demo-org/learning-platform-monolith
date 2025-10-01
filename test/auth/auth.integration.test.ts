import app from '../../src/app';
import { db } from '../../src/db';
import { signJwt } from '../../src/utils/jwt-utils';
import { Server } from 'http';
import bcrypt from 'bcrypt';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue(true),
    smokeTest: jest.fn().mockResolvedValue({ success: true, userCount: 0 }),
  },
}));

jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    version: 'v1.9',
    appName: 'learnlite',
    nodeEnv: 'test',
  },
}));

describe('Auth Controller Integration Tests', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const port = 4001;
    server = app.listen(port);
    baseUrl = `http://localhost:${port}`;

    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'newuser@test.com',
            name: 'New User',
            role: 'student',
            created_at: new Date('2024-01-01'),
          }],
        });

      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.ok).toBe(true);
      expect(data.message).toBe('User registered successfully');
      expect(data.token).toBeTruthy();
      expect(data.user.email).toBe('newuser@test.com');
      expect(data.user.name).toBe('New User');
      expect(data.user.role).toBe('student');
      expect(data.version).toBe('v1.9');
    });

    it('should register user with custom role', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            email: 'instructor@test.com',
            name: 'Instructor User',
            role: 'instructor',
            created_at: new Date('2024-01-01'),
          }],
        });

      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'instructor@test.com',
          password: 'password123',
          name: 'Instructor User',
          role: 'instructor',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.user.role).toBe('instructor');
    });

    it('should reject missing email', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'password123',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.ok).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Email, password, and name are required');
    });

    it('should reject missing password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing name', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email format', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid email format');
    });

    it('should reject short password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: '12345',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Password must be at least 6 characters long');
    });

    it('should reject duplicate email', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@test.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json() as any;
      expect(data.error.code).toBe('EMAIL_EXISTS');
      expect(data.error.message).toBe('Email already registered');
    });

    it('should reject invalid role', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test User',
          role: 'invalid-role',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid role. Must be admin, instructor, or student');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01'),
        }],
      });

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Login successful');
      expect(data.token).toBeTruthy();
      expect(data.user.email).toBe('user@test.com');
      expect(data.user.name).toBe('Test User');
      expect(data.version).toBe('v1.9');
    });

    it('should reject missing email', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'password123',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Email and password are required');
    });

    it('should reject missing password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-existent user', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('Invalid email or password');
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01'),
        }],
      });

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should handle case-insensitive email', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          password_hash: hashedPassword,
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01'),
        }],
      });

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'USER@TEST.COM',
          password: 'password123',
        }),
      });

      expect(response.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user@test.com']
      );
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const token = signJwt({ id: 1, email: 'user@test.com', role: 'student' }, 'test-secret-key');

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date('2024-01-01'),
        }],
      });

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.ok).toBe(true);
      expect(data.user.email).toBe('user@test.com');
      expect(data.user.name).toBe('Test User');
      expect(data.user.role).toBe('student');
      expect(data.version).toBe('v1.9');
    });

    it('should reject unauthenticated request', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired token', async () => {
      const token = signJwt({ id: 1, email: 'user@test.com', role: 'student' }, 'test-secret-key', { expiresIn: '0s' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found in database', async () => {
      const token = signJwt({ id: 999, email: 'missing@test.com', role: 'student' }, 'test-secret-key');

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(404);
      const data = await response.json() as any;
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should fetch fresh user data from database', async () => {
      const token = signJwt({ id: 1, email: 'user@test.com', role: 'student' }, 'test-secret-key');

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          name: 'Updated Name',
          role: 'instructor',
          created_at: new Date('2024-01-01'),
        }],
      });

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.user.name).toBe('Updated Name');
      expect(data.user.role).toBe('instructor');
    });
  });
});
