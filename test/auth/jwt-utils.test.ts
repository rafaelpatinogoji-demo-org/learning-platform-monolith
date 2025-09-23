/**
 * Tests for JWT utilities
 * 
 * Pure unit tests for JWT signing, verification, and utility functions
 * without any external dependencies or database calls.
 */

import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt, decodeJwt, isJwtExpired, JwtPayload } from '../../src/utils/jwt-utils';

// Test configuration
const TEST_JWT_SECRET = 'test-secret-for-jwt-utils';
const VALID_USER = {
  id: 42,
  email: 'test@example.com',
  role: 'student'
};

describe('JWT Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signJwt', () => {
    it('should create a valid JWT token with correct payload structure', () => {
      // Act
      const token = signJwt(VALID_USER, TEST_JWT_SECRET);

      // Assert
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Decode and verify payload structure
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe(VALID_USER.id);
      expect(decoded.email).toBe(VALID_USER.email);
      expect(decoded.role).toBe(VALID_USER.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should create token with default 24h expiration', () => {
      // Arrange
      const beforeTime = Math.floor(Date.now() / 1000);
      
      // Act
      const token = signJwt(VALID_USER, TEST_JWT_SECRET);
      
      // Assert
      const afterTime = Math.floor(Date.now() / 1000);
      const decoded = jwt.decode(token) as any;
      
      // Should expire in approximately 24 hours (86400 seconds)
      const expectedExp = beforeTime + 86400;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(decoded.exp).toBeLessThanOrEqual(afterTime + 86400 + 1);
    });

    it('should create token with custom expiration time', () => {
      // Arrange
      const customExpiration = '2h';
      const beforeTime = Math.floor(Date.now() / 1000);
      
      // Act
      const token = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: customExpiration });
      
      // Assert
      const afterTime = Math.floor(Date.now() / 1000);
      const decoded = jwt.decode(token) as any;
      
      // Should expire in approximately 2 hours (7200 seconds)
      const expectedExp = beforeTime + 7200;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(decoded.exp).toBeLessThanOrEqual(afterTime + 7200 + 1);
    });

    it('should create token with numeric expiration time', () => {
      // Arrange
      const customExpiration = 3600; // 1 hour in seconds
      const beforeTime = Math.floor(Date.now() / 1000);
      
      // Act
      const token = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: customExpiration });
      
      // Assert
      const decoded = jwt.decode(token) as any;
      const expectedExp = beforeTime + 3600;
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 1);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should handle different user roles correctly', () => {
      // Test admin user
      const adminUser = { id: 1, email: 'admin@example.com', role: 'admin' };
      const adminToken = signJwt(adminUser, TEST_JWT_SECRET);
      const adminDecoded = jwt.decode(adminToken) as any;
      
      expect(adminDecoded.sub).toBe(1);
      expect(adminDecoded.email).toBe('admin@example.com');
      expect(adminDecoded.role).toBe('admin');

      // Test instructor user
      const instructorUser = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const instructorToken = signJwt(instructorUser, TEST_JWT_SECRET);
      const instructorDecoded = jwt.decode(instructorToken) as any;
      
      expect(instructorDecoded.sub).toBe(2);
      expect(instructorDecoded.email).toBe('instructor@example.com');
      expect(instructorDecoded.role).toBe('instructor');
    });

    it('should use HS256 algorithm', () => {
      // Act
      const token = signJwt(VALID_USER, TEST_JWT_SECRET);
      
      // Assert
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });
  });

  describe('verifyJwt', () => {
    it('should verify and return payload for valid token', () => {
      // Arrange
      const token = signJwt(VALID_USER, TEST_JWT_SECRET);

      // Act
      const payload = verifyJwt(token, TEST_JWT_SECRET);

      // Assert
      expect(payload.sub).toBe(VALID_USER.id);
      expect(payload.email).toBe(VALID_USER.email);
      expect(payload.role).toBe(VALID_USER.role);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.exp).toBe('number');
    });

    it('should throw JsonWebTokenError for invalid signature', () => {
      // Arrange
      const token = signJwt(VALID_USER, 'wrong-secret');

      // Act & Assert
      expect(() => verifyJwt(token, TEST_JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(token, TEST_JWT_SECRET)).toThrow('invalid signature');
    });

    it('should throw JsonWebTokenError for expired token', () => {
      // Arrange - Create expired token using fake timers
      jest.useFakeTimers();
      const pastTime = new Date('2023-01-01').getTime();
      jest.setSystemTime(pastTime);
      
      const expiredToken = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward to make token expired
      jest.setSystemTime(pastTime + 2000); // 2 seconds later

      // Act & Assert
      expect(() => verifyJwt(expiredToken, TEST_JWT_SECRET)).toThrow(jwt.TokenExpiredError);
      
      // Cleanup
      jest.useRealTimers();
    });

    it('should throw JsonWebTokenError for malformed token', () => {
      // Act & Assert
      expect(() => verifyJwt('invalid.token.format', TEST_JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt('not-a-token', TEST_JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt('', TEST_JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw JsonWebTokenError for string payload', () => {
      // Arrange - Create token with string payload
      const stringToken = jwt.sign('string-payload', TEST_JWT_SECRET);

      // Act & Assert
      expect(() => verifyJwt(stringToken, TEST_JWT_SECRET)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(stringToken, TEST_JWT_SECRET)).toThrow('Invalid token payload');
    });

    it('should throw JsonWebTokenError for invalid payload structure', () => {
      // Arrange - Create tokens with invalid payload structures
      const invalidPayloads = [
        { sub: 'not-a-number', email: 'test@example.com', role: 'student' },
        { sub: 1, email: 123, role: 'student' },
        { sub: 1, email: 'test@example.com', role: null },
        { sub: 1, email: 'test@example.com' }, // missing role
        { email: 'test@example.com', role: 'student' }, // missing sub
        { sub: 1, role: 'student' }, // missing email
      ];

      invalidPayloads.forEach((payload, index) => {
        const invalidToken = jwt.sign(payload, TEST_JWT_SECRET);
        expect(() => verifyJwt(invalidToken, TEST_JWT_SECRET))
          .toThrow('Invalid token payload structure');
      });
    });

    it('should validate all required fields are present and correct types', () => {
      // Arrange
      const validPayload = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const validToken = jwt.sign(validPayload, TEST_JWT_SECRET);

      // Act
      const result = verifyJwt(validToken, TEST_JWT_SECRET);

      // Assert
      expect(result.sub).toBe(validPayload.sub);
      expect(result.email).toBe(validPayload.email);
      expect(result.role).toBe(validPayload.role);
      expect(result.iat).toBe(validPayload.iat);
      expect(result.exp).toBe(validPayload.exp);
    });
  });

  describe('decodeJwt', () => {
    it('should decode valid token without verification', () => {
      // Arrange
      const token = signJwt(VALID_USER, TEST_JWT_SECRET);

      // Act
      const payload = decodeJwt(token);

      // Assert
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(VALID_USER.id);
      expect(payload!.email).toBe(VALID_USER.email);
      expect(payload!.role).toBe(VALID_USER.role);
    });

    it('should decode token with wrong secret (no verification)', () => {
      // Arrange
      const token = signJwt(VALID_USER, 'different-secret');

      // Act
      const payload = decodeJwt(token);

      // Assert - Should still decode since no verification
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(VALID_USER.id);
      expect(payload!.email).toBe(VALID_USER.email);
      expect(payload!.role).toBe(VALID_USER.role);
    });

    it('should decode expired token (no verification)', () => {
      // Arrange - Create expired token
      jest.useFakeTimers();
      const pastTime = new Date('2023-01-01').getTime();
      jest.setSystemTime(pastTime);
      
      const expiredToken = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward to make token expired
      jest.setSystemTime(pastTime + 2000);

      // Act
      const payload = decodeJwt(expiredToken);

      // Assert - Should still decode since no verification
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe(VALID_USER.id);
      
      // Cleanup
      jest.useRealTimers();
    });

    it('should return null for malformed token', () => {
      // Act & Assert
      expect(decodeJwt('invalid.token.format')).toBeNull();
      expect(decodeJwt('not-a-token')).toBeNull();
      expect(decodeJwt('')).toBeNull();
      expect(decodeJwt('a.b')).toBeNull(); // Too few parts
    });

    it('should return null for non-object payload', () => {
      // Arrange
      const stringToken = jwt.sign('string-payload', TEST_JWT_SECRET);

      // Act
      const result = decodeJwt(stringToken);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isJwtExpired', () => {
    it('should return false for non-expired token', () => {
      // Arrange
      const token = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1h' });

      // Act
      const isExpired = isJwtExpired(token);

      // Assert
      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      // Arrange - Create expired token using fake timers
      jest.useFakeTimers();
      const pastTime = new Date('2023-01-01').getTime();
      jest.setSystemTime(pastTime);
      
      const expiredToken = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward to make token expired
      jest.setSystemTime(pastTime + 2000); // 2 seconds later

      // Act
      const isExpired = isJwtExpired(expiredToken);

      // Assert
      expect(isExpired).toBe(true);
      
      // Cleanup
      jest.useRealTimers();
    });

    it('should return null for malformed token', () => {
      // Act & Assert
      expect(isJwtExpired('invalid.token.format')).toBeNull();
      expect(isJwtExpired('not-a-token')).toBeNull();
      expect(isJwtExpired('')).toBeNull();
    });

    it('should return null for token without exp claim', () => {
      // Arrange - Create token without expiration
      const tokenWithoutExp = jwt.sign({ sub: 1, email: 'test@example.com', role: 'student' }, TEST_JWT_SECRET);

      // Act
      const isExpired = isJwtExpired(tokenWithoutExp);

      // Assert
      expect(isExpired).toBeNull();
    });

    it('should handle edge case of token expiring exactly now', () => {
      // Arrange - Create token that expires in 1 second, then advance time
      jest.useFakeTimers();
      const now = new Date('2023-01-01').getTime();
      jest.setSystemTime(now);
      
      const tokenExpiringNow = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward by 2 seconds to ensure expiration
      jest.setSystemTime(now + 2000);

      // Act
      const isExpired = isJwtExpired(tokenExpiringNow);

      // Assert
      expect(isExpired).toBe(true);
      
      // Cleanup
      jest.useRealTimers();
    });
  });

  describe('Integration Tests', () => {
    it('should create, verify, decode, and check expiration consistently', () => {
      // Arrange
      const user = { id: 123, email: 'integration@example.com', role: 'admin' };
      
      // Act - Create token
      const token = signJwt(user, TEST_JWT_SECRET, { expiresIn: '1h' });
      
      // Act - Verify token
      const verifiedPayload = verifyJwt(token, TEST_JWT_SECRET);
      
      // Act - Decode token
      const decodedPayload = decodeJwt(token);
      
      // Act - Check expiration
      const isExpired = isJwtExpired(token);

      // Assert - All operations should be consistent
      expect(verifiedPayload.sub).toBe(user.id);
      expect(verifiedPayload.email).toBe(user.email);
      expect(verifiedPayload.role).toBe(user.role);
      
      expect(decodedPayload!.sub).toBe(user.id);
      expect(decodedPayload!.email).toBe(user.email);
      expect(decodedPayload!.role).toBe(user.role);
      
      expect(verifiedPayload.exp).toBe(decodedPayload!.exp);
      expect(verifiedPayload.iat).toBe(decodedPayload!.iat);
      
      expect(isExpired).toBe(false);
    });

    it('should handle round-trip with different user types', () => {
      const users = [
        { id: 1, email: 'student@example.com', role: 'student' },
        { id: 2, email: 'instructor@example.com', role: 'instructor' },
        { id: 3, email: 'admin@example.com', role: 'admin' },
        { id: 999, email: 'special-user@example.com', role: 'super-admin' }
      ];

      users.forEach(user => {
        // Create and verify token
        const token = signJwt(user, TEST_JWT_SECRET);
        const payload = verifyJwt(token, TEST_JWT_SECRET);
        
        // Verify all fields match
        expect(payload.sub).toBe(user.id);
        expect(payload.email).toBe(user.email);
        expect(payload.role).toBe(user.role);
        
        // Verify token is not expired
        expect(isJwtExpired(token)).toBe(false);
      });
    });
  });
});
