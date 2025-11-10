import { AuthService } from '../../src/services/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt with 12 rounds', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2b$12$hashedPasswordExample';
      
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should return different hashes for the same password on multiple calls', async () => {
      const password = 'myPassword';
      const hash1 = '$2b$12$hash1';
      const hash2 = '$2b$12$hash2';
      
      mockBcrypt.hash
        .mockResolvedValueOnce(hash1 as never)
        .mockResolvedValueOnce(hash2 as never);

      const result1 = await AuthService.hashPassword(password);
      const result2 = await AuthService.hashPassword(password);

      expect(result1).toBe(hash1);
      expect(result2).toBe(hash2);
      expect(result1).not.toBe(result2);
    });

    it('should handle bcrypt errors', async () => {
      const password = 'myPassword';
      const error = new Error('Bcrypt error');
      
      mockBcrypt.hash.mockRejectedValue(error as never);

      await expect(AuthService.hashPassword(password)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      const password = 'correctPassword';
      const hashedPassword = '$2b$12$hashedPassword';
      
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2b$12$hashedPassword';
      
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle bcrypt comparison errors', async () => {
      const password = 'myPassword';
      const hashedPassword = '$2b$12$hashedPassword';
      const error = new Error('Comparison error');
      
      mockBcrypt.compare.mockRejectedValue(error as never);

      await expect(AuthService.verifyPassword(password, hashedPassword)).rejects.toThrow('Comparison error');
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload structure', () => {
      const user = {
        id: 123,
        email: 'user@example.com',
        role: 'student'
      };
      const token = 'generated.jwt.token';
      
      mockJwt.sign.mockReturnValue(token as never);

      const result = AuthService.generateToken(user);

      expect(mockJwt.sign).toHaveBeenCalled();
      const callArgs = mockJwt.sign.mock.calls[0];
      const payload = callArgs[0] as any;
      
      expect(payload.sub).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.role).toBe(user.role);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
      
      expect(result).toBe(token);
    });

    it('should set token expiration to 24 hours from now', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'instructor'
      };
      
      const now = Math.floor(Date.now() / 1000);
      mockJwt.sign.mockReturnValue('token' as never);

      AuthService.generateToken(user);

      const callArgs = mockJwt.sign.mock.calls[0];
      const payload = callArgs[0] as any;
      
      const expectedExp = now + (24 * 60 * 60);
      expect(payload.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(payload.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should use HS256 algorithm for signing', () => {
      const user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };
      
      mockJwt.sign.mockReturnValue('token' as never);

      AuthService.generateToken(user);

      const callArgs = mockJwt.sign.mock.calls[0];
      const options = callArgs[2] as any;
      
      expect(options.algorithm).toBe('HS256');
    });

    it('should generate tokens for different user roles', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      mockJwt.sign.mockReturnValue('token' as never);

      roles.forEach(role => {
        const user = { id: 1, email: 'user@example.com', role };
        AuthService.generateToken(user);
        
        const callArgs = mockJwt.sign.mock.calls[mockJwt.sign.mock.calls.length - 1];
        const payload = callArgs[0] as any;
        
        expect(payload.role).toBe(role);
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify and return decoded token payload', () => {
      const token = 'valid.jwt.token';
      const decodedPayload = {
        sub: 123,
        email: 'user@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };
      
      mockJwt.verify.mockReturnValue(decodedPayload as never);

      const result = AuthService.verifyToken(token);

      expect(mockJwt.verify).toHaveBeenCalled();
      expect(result).toEqual(decodedPayload);
    });

    it('should verify token with correct secret', () => {
      const token = 'valid.token';
      const decodedPayload = { sub: 1, email: 'test@example.com', role: 'student' };
      
      mockJwt.verify.mockReturnValue(decodedPayload as never);

      AuthService.verifyToken(token);

      const callArgs = mockJwt.verify.mock.calls[0];
      expect(callArgs[0]).toBe(token);
      expect(callArgs[1]).toBeDefined();
    });
  });

  describe('createUserProfile', () => {
    it('should create a safe user profile without sensitive data', () => {
      const user = {
        id: 123,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'student',
        created_at: new Date('2024-01-01T00:00:00Z')
      };

      const profile = AuthService.createUserProfile(user);

      expect(profile).toEqual({
        id: 123,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'student',
        createdAt: user.created_at
      });
    });

    it('should transform created_at to createdAt', () => {
      const createdDate = new Date('2023-06-15T10:30:00Z');
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
        created_at: createdDate
      };

      const profile = AuthService.createUserProfile(user);

      expect(profile.createdAt).toBe(createdDate);
      expect((profile as any).created_at).toBeUndefined();
    });

    it('should handle different user roles correctly', () => {
      const roles = ['student', 'instructor', 'admin'];

      roles.forEach(role => {
        const user = {
          id: 1,
          email: 'user@example.com',
          name: 'User Name',
          role,
          created_at: new Date()
        };

        const profile = AuthService.createUserProfile(user);

        expect(profile.role).toBe(role);
      });
    });

    it('should not include password_hash or other sensitive fields', () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User Name',
        role: 'student',
        created_at: new Date(),
        password_hash: '$2b$12$secrethash'
      } as any;

      const profile = AuthService.createUserProfile(user);

      expect((profile as any).password_hash).toBeUndefined();
    });
  });
});
