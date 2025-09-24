/**
 * Tests for AuthService user-related functionality
 * 
 * Tests password hashing, JWT operations, and user profile creation
 * without any database dependencies.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';
import { config } from '../../src/config';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret-for-jest-testing'
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt with correct rounds', async () => {
      // Arrange
      const password = 'secure-password-123';
      const hashedPassword = 'hashed-password-result';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await AuthService.hashPassword(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12); // 12 is the rounds value from the service
    });

    it('should reject with an error if bcrypt.hash fails', async () => {
      // Arrange
      const password = 'secure-password-123';
      const error = new Error('Bcrypt error');
      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(AuthService.hashPassword(password)).rejects.toThrow('Bcrypt error');
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      // Arrange
      const password = 'secure-password-123';
      const hashedPassword = 'hashed-password-result';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await AuthService.verifyPassword(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false when password does not match hash', async () => {
      // Arrange
      const password = 'wrong-password';
      const hashedPassword = 'hashed-password-result';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await AuthService.verifyPassword(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should reject with an error if bcrypt.compare fails', async () => {
      // Arrange
      const password = 'secure-password-123';
      const hashedPassword = 'hashed-password-result';
      const error = new Error('Bcrypt error');
      (bcrypt.compare as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(AuthService.verifyPassword(password, hashedPassword)).rejects.toThrow('Bcrypt error');
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload and options', () => {
      // Arrange
      const user = {
        id: 123,
        email: 'user@example.com',
        role: 'student'
      };
      const token = 'generated-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(token);
      
      const originalDateNow = Date.now;
      const fixedTimestamp = 1600000000000; // Example timestamp
      global.Date.now = jest.fn(() => fixedTimestamp);

      // Act
      const result = AuthService.generateToken(user);

      // Assert
      expect(result).toBe(token);
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          iat: Math.floor(fixedTimestamp / 1000),
          exp: Math.floor(fixedTimestamp / 1000) + (24 * 60 * 60)
        },
        config.jwtSecret,
        { algorithm: 'HS256' }
      );

      global.Date.now = originalDateNow;
    });

    it('should handle different user roles correctly', () => {
      // Arrange
      const adminUser = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };
      const token = 'admin-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(token);

      // Act
      const result = AuthService.generateToken(adminUser);

      // Assert
      expect(result).toBe(token);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }),
        config.jwtSecret,
        { algorithm: 'HS256' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify a token and return the decoded payload', () => {
      // Arrange
      const token = 'valid-jwt-token';
      const decodedPayload = {
        sub: 123,
        email: 'user@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };
      (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      // Act
      const result = AuthService.verifyToken(token);

      // Assert
      expect(result).toBe(decodedPayload);
      expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
    });

    it('should throw an error when token is invalid', () => {
      // Arrange
      const token = 'invalid-jwt-token';
      const error = new Error('Invalid token');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => AuthService.verifyToken(token)).toThrow('Invalid token');
      expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
    });
  });

  describe('createUserProfile', () => {
    it('should create a user profile with correct properties', () => {
      // Arrange
      const user = {
        id: 123,
        email: 'user@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2023-01-01T00:00:00Z')
      };

      // Act
      const result = AuthService.createUserProfile(user);

      // Assert
      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at
      });
    });

    it('should handle different user roles correctly', () => {
      // Arrange
      const adminUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date('2023-01-01T00:00:00Z')
      };

      // Act
      const result = AuthService.createUserProfile(adminUser);

      // Assert
      expect(result).toEqual({
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        createdAt: adminUser.created_at
      });
    });

    it('should handle instructor role correctly', () => {
      // Arrange
      const instructorUser = {
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        created_at: new Date('2023-01-01T00:00:00Z')
      };

      // Act
      const result = AuthService.createUserProfile(instructorUser);

      // Assert
      expect(result).toEqual({
        id: instructorUser.id,
        email: instructorUser.email,
        name: instructorUser.name,
        role: instructorUser.role,
        createdAt: instructorUser.created_at
      });
    });
  });
});
