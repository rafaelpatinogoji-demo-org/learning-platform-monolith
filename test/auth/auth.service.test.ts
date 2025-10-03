import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthService } from '../../src/services/auth.service';
import { config } from '../../src/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordValue';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      
      const result = await AuthService.hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should use bcrypt with 12 rounds', async () => {
      const password = 'testPassword123';
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);
      
      await AuthService.hashPassword(password);
      
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordValue';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const result = await AuthService.verifyPassword(password, hashedPassword);
      
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2b$12$hashedPasswordValue';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);
      
      const result = await AuthService.verifyPassword(password, hashedPassword);
      
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'student'
      };
      
      const token = AuthService.generateToken(user);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      expect(decoded.sub).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should create token with 24 hour expiration', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      
      const token = AuthService.generateToken(user);
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      const expirationTime = decoded.exp - decoded.iat;
      expect(expirationTime).toBe(24 * 60 * 60);
    });

    it('should use HS256 algorithm', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      
      const token = AuthService.generateToken(user);
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      expect(decoded.header.alg).toBe('HS256');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      
      const decoded = AuthService.verifyToken(token);
      
      expect(decoded.sub).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => AuthService.verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const payload = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) - 50
      };
      const expiredToken = jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' });
      
      expect(() => AuthService.verifyToken(expiredToken)).toThrow();
    });
  });

  describe('createUserProfile', () => {
    it('should create a safe user profile without sensitive data', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01'),
      };
      
      const profile = AuthService.createUserProfile(user);
      
      expect(profile).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: user.created_at
      });
    });

    it('should not include password_hash in profile', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01'),
      };
      
      const profile = AuthService.createUserProfile(user);
      
      expect(profile).not.toHaveProperty('password_hash');
    });
  });
});
