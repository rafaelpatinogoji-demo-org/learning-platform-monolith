/**
 * Tests for AuthService
 * 
 * Pure unit tests for authentication service methods
 * with mocked external dependencies (bcrypt, jsonwebtoken, config).
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';
import { config } from '../../src/config';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret-for-auth-service',
    version: 'v1.2'
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with 12 rounds', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordValue';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should return different hashes for same password (due to salt)', async () => {
      const password = 'samePassword';
      const hash1 = '$2b$12$hash1Value';
      const hash2 = '$2b$12$hash2Value';

      mockedBcrypt.hash
        .mockResolvedValueOnce(hash1 as never)
        .mockResolvedValueOnce(hash2 as never);

      const result1 = await AuthService.hashPassword(password);
      const result2 = await AuthService.hashPassword(password);

      expect(result1).toBe(hash1);
      expect(result2).toBe(hash2);
      expect(result1).not.toBe(result2);
    });

    it('should use BCRYPT_ROUNDS constant (12)', async () => {
      const password = 'password';
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);

      await AuthService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should handle bcrypt errors', async () => {
      const password = 'password';
      const error = new Error('Bcrypt error');
      
      mockedBcrypt.hash.mockRejectedValue(error as never);

      await expect(AuthService.hashPassword(password)).rejects.toThrow('Bcrypt error');
    });

    it('should hash special characters correctly', async () => {
      const password = 'p@ssw0rd!@#$%^&*()';
      const hashedPassword = '$2b$12$specialCharsHashed';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should hash unicode characters correctly', async () => {
      const password = 'pássw🔒rd测试';
      const hashedPassword = '$2b$12$unicodeHashed';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'correctPassword';
      const hashedPassword = '$2b$12$hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2b$12$hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });

    it('should call bcrypt.compare with correct arguments', async () => {
      const password = 'testPassword';
      const hashedPassword = '$2b$12$hash';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await AuthService.verifyPassword(password, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should handle bcrypt compare errors', async () => {
      const password = 'password';
      const hashedPassword = '$2b$12$hash';
      const error = new Error('Bcrypt compare error');
      
      mockedBcrypt.compare.mockRejectedValue(error as never);

      await expect(AuthService.verifyPassword(password, hashedPassword)).rejects.toThrow('Bcrypt compare error');
    });

    it('should handle case-sensitive passwords', async () => {
      const password = 'CaseSensitive';
      const hashedPassword = '$2b$12$hash';
      
      mockedBcrypt.compare
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);

      const exactMatch = await AuthService.verifyPassword('CaseSensitive', hashedPassword);
      const wrongCase = await AuthService.verifyPassword('casesensitive', hashedPassword);

      expect(exactMatch).toBe(true);
      expect(wrongCase).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = 'p@ssw0rd!@#$%';
      const hashedPassword = '$2b$12$hash';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });
  });

  describe('generateToken', () => {
    const mockUser = {
      id: 42,
      email: 'test@example.com',
      role: 'student'
    };

    it('should generate JWT token with correct payload structure', () => {
      const mockToken = 'jwt.token.here';
      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = AuthService.generateToken(mockUser);

      expect(result).toBe(mockToken);
      expect(mockedJwt.sign).toHaveBeenCalledTimes(1);
    });

    it('should include sub, email, and role in payload', () => {
      mockedJwt.sign.mockReturnValue('token' as any);

      AuthService.generateToken(mockUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
    });

    it('should use HS256 algorithm', () => {
      mockedJwt.sign.mockReturnValue('token' as any);

      AuthService.generateToken(mockUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const options = signCall[2] as jwt.SignOptions;
      
      expect(options.algorithm).toBe('HS256');
    });

    it('should set 24 hour expiration in payload', () => {
      const now = Math.floor(Date.now() / 1000);
      mockedJwt.sign.mockReturnValue('token' as any);

      AuthService.generateToken(mockUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      
      const expectedExp = now + (24 * 60 * 60);
      expect(payload.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(payload.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should use config.jwtSecret', () => {
      mockedJwt.sign.mockReturnValue('token' as any);

      AuthService.generateToken(mockUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const secret = signCall[1];
      
      expect(secret).toBe('test-jwt-secret-for-auth-service');
    });

    it('should generate token for admin user', () => {
      const adminUser = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };
      
      mockedJwt.sign.mockReturnValue('admin-token' as any);

      AuthService.generateToken(adminUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      
      expect(payload.sub).toBe(1);
      expect(payload.email).toBe('admin@example.com');
      expect(payload.role).toBe('admin');
    });

    it('should generate token for instructor user', () => {
      const instructorUser = {
        id: 2,
        email: 'instructor@example.com',
        role: 'instructor'
      };
      
      mockedJwt.sign.mockReturnValue('instructor-token' as any);

      AuthService.generateToken(instructorUser);

      const signCall = mockedJwt.sign.mock.calls[0];
      const payload = signCall[0] as any;
      
      expect(payload.sub).toBe(2);
      expect(payload.email).toBe('instructor@example.com');
      expect(payload.role).toBe('instructor');
    });

    it('should handle jwt sign errors', () => {
      const error = new Error('JWT sign error');
      mockedJwt.sign.mockImplementation(() => {
        throw error;
      });

      expect(() => AuthService.generateToken(mockUser)).toThrow('JWT sign error');
    });
  });

  describe('verifyToken', () => {
    const validToken = 'valid.jwt.token';
    const mockPayload = {
      sub: 42,
      email: 'test@example.com',
      role: 'student',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    };

    it('should verify and return decoded payload for valid token', () => {
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      const result = AuthService.verifyToken(validToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, 'test-jwt-secret-for-auth-service');
      expect(result).toEqual(mockPayload);
    });

    it('should use config.jwtSecret for verification', () => {
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      AuthService.verifyToken(validToken);

      expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, 'test-jwt-secret-for-auth-service');
    });

    it('should throw error for invalid token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => AuthService.verifyToken('invalid.token')).toThrow('invalid signature');
      
      mockedJwt.verify.mockReset();
    });

    it('should throw error for expired token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => AuthService.verifyToken(validToken)).toThrow('jwt expired');
      
      mockedJwt.verify.mockReset();
    });

    it('should throw error for malformed token', () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => AuthService.verifyToken('malformed-token')).toThrow('jwt malformed');
      
      mockedJwt.verify.mockReset();
    });

    it('should return payload with correct structure', () => {
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      const result = AuthService.verifyToken(validToken);

      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('iat');
      expect(result).toHaveProperty('exp');
    });

    it('should handle different user roles in token', () => {
      const adminPayload = { ...mockPayload, role: 'admin' };
      mockedJwt.verify.mockReturnValue(adminPayload as any);

      const result = AuthService.verifyToken(validToken);

      expect(result.role).toBe('admin');
    });
  });

  describe('createUserProfile', () => {
    const mockDbUser = {
      id: 42,
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
      created_at: new Date('2023-01-01T00:00:00Z'),
      password_hash: '$2b$12$hashedPassword'
    };

    it('should create safe user profile without password', () => {
      const profile = AuthService.createUserProfile(mockDbUser);

      expect(profile).not.toHaveProperty('password_hash');
      expect(profile).not.toHaveProperty('password');
    });

    it('should include id, email, name, role, createdAt', () => {
      const profile = AuthService.createUserProfile(mockDbUser);

      expect(profile).toHaveProperty('id', 42);
      expect(profile).toHaveProperty('email', 'test@example.com');
      expect(profile).toHaveProperty('name', 'Test User');
      expect(profile).toHaveProperty('role', 'student');
      expect(profile).toHaveProperty('createdAt');
    });

    it('should transform created_at to createdAt', () => {
      const profile = AuthService.createUserProfile(mockDbUser);

      expect(profile).toHaveProperty('createdAt');
      expect(profile).not.toHaveProperty('created_at');
      expect(profile.createdAt).toEqual(mockDbUser.created_at);
    });

    it('should work with admin user', () => {
      const adminUser = {
        ...mockDbUser,
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      };

      const profile = AuthService.createUserProfile(adminUser);

      expect(profile.id).toBe(1);
      expect(profile.email).toBe('admin@example.com');
      expect(profile.name).toBe('Admin User');
      expect(profile.role).toBe('admin');
    });

    it('should work with instructor user', () => {
      const instructorUser = {
        ...mockDbUser,
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor'
      };

      const profile = AuthService.createUserProfile(instructorUser);

      expect(profile.id).toBe(2);
      expect(profile.email).toBe('instructor@example.com');
      expect(profile.name).toBe('Instructor User');
      expect(profile.role).toBe('instructor');
    });

    it('should handle user with different created_at format', () => {
      const userWithDate = {
        ...mockDbUser,
        created_at: new Date('2024-06-15T10:30:00Z')
      };

      const profile = AuthService.createUserProfile(userWithDate);

      expect(profile.createdAt).toEqual(new Date('2024-06-15T10:30:00Z'));
    });

    it('should preserve all safe fields exactly', () => {
      const profile = AuthService.createUserProfile(mockDbUser);

      expect(profile.id).toBe(mockDbUser.id);
      expect(profile.email).toBe(mockDbUser.email);
      expect(profile.name).toBe(mockDbUser.name);
      expect(profile.role).toBe(mockDbUser.role);
    });
  });

  describe('Integration scenarios', () => {
    it('should complete full authentication flow - hash and verify', async () => {
      const password = 'userPassword123';
      const hashedPassword = '$2b$12$hashedValue';

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const hashed = await AuthService.hashPassword(password);
      const isValid = await AuthService.verifyPassword(password, hashed);

      expect(hashed).toBe(hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should complete full JWT flow - generate and verify', () => {
      const user = { id: 42, email: 'user@example.com', role: 'student' };
      const mockToken = 'jwt.token.value';
      const mockPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };

      mockedJwt.sign.mockReturnValue(mockToken as any);
      mockedJwt.verify.mockReturnValue(mockPayload as any);

      const token = AuthService.generateToken(user);
      const decoded = AuthService.verifyToken(token);

      expect(token).toBe(mockToken);
      expect(decoded.sub).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should create safe profile after authentication', async () => {
      const dbUser = {
        id: 42,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date(),
        password_hash: '$2b$12$hash'
      };

      const profile = AuthService.createUserProfile(dbUser);

      expect(profile).not.toHaveProperty('password_hash');
      expect(profile.id).toBe(dbUser.id);
      expect(profile.email).toBe(dbUser.email);
    });
  });
});
