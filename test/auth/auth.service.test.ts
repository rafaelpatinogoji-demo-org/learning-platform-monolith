import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    version: 'v1.9'
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await AuthService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2b$12$hashedpassword';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2b$12$hashedpassword';
      
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const mockToken = 'mock.jwt.token';
      
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = AuthService.generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          role: user.role,
          iat: expect.any(Number),
          exp: expect.any(Number)
        }),
        'test-jwt-secret',
        { algorithm: 'HS256' }
      );
      expect(result).toBe(mockToken);
    });

    it('should set expiry to 24 hours from now', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const mockToken = 'mock.jwt.token';
      
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const beforeTime = Math.floor(Date.now() / 1000);
      AuthService.generateToken(user);
      const afterTime = Math.floor(Date.now() / 1000);

      const callArgs = (jwt.sign as jest.Mock).mock.calls[0][0];
      expect(callArgs.exp).toBeGreaterThanOrEqual(beforeTime + 24 * 60 * 60);
      expect(callArgs.exp).toBeLessThanOrEqual(afterTime + 24 * 60 * 60);
    });
  });

  describe('verifyToken', () => {
    it('should verify a JWT token', () => {
      const token = 'valid.jwt.token';
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      const result = AuthService.verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret');
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid.jwt.token';
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      expect(() => AuthService.verifyToken(token)).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('createUserProfile', () => {
    it('should create a safe user profile response', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01')
      };

      const result = AuthService.createUserProfile(user);

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01')
      });
    });

    it('should not include password hash or other sensitive fields', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01')
      };

      const result = AuthService.createUserProfile(user);

      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('created_at');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
