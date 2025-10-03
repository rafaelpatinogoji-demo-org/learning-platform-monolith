import { describe, it, expect, beforeEach } from '@jest/globals';
import { signJwt, verifyJwt, decodeJwt, isJwtExpired } from '../../src/utils/jwt-utils';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  const testSecret = 'test-jwt-secret';
  const testPayload = {
    id: 1,
    email: 'test@example.com',
    role: 'student'
  };

  describe('signJwt', () => {
    it('should sign a JWT token with default expiration', () => {
      const token = signJwt(testPayload, testSecret);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should use HS256 algorithm', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      expect(decoded.header.alg).toBe('HS256');
    });

    it('should default to 24h expiration', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (24 * 60 * 60);
      
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });

    it('should accept custom expiration time', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '1h' });
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + (60 * 60);
      
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });

    it('should accept numeric expiration in seconds', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: 3600 });
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 3600;
      
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExpiry - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExpiry + 5);
    });
  });

  describe('verifyJwt', () => {
    it('should verify a valid token', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = verifyJwt(token, testSecret);
      
      expect(decoded.sub).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyJwt('invalid.token.here', testSecret)).toThrow();
    });

    it('should throw error for token with wrong secret', () => {
      const token = signJwt(testPayload, testSecret);
      expect(() => verifyJwt(token, 'wrong-secret')).toThrow();
    });

    it('should throw error for expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: -1 });
      expect(() => verifyJwt(token, testSecret)).toThrow();
    });

    it('should throw error for token with invalid payload structure', () => {
      const invalidPayload = { sub: 'not-a-number', email: 'test@test.com', role: 'student' };
      const token = jwt.sign(invalidPayload, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for token with missing fields', () => {
      const incompletePayload = { sub: 1, email: 'test@test.com' };
      const token = jwt.sign(incompletePayload, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for string token payload', () => {
      const token = jwt.sign('string-payload', testSecret);
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload');
    });
  });

  describe('decodeJwt', () => {
    it('should decode a valid token without verification', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = decodeJwt(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.id);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should return null for malformed token', () => {
      const result = decodeJwt('malformed.token');
      expect(result).toBeNull();
    });

    it('should decode expired token without throwing error', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: -1 });
      const decoded = decodeJwt(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.id);
    });
  });

  describe('isJwtExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = signJwt(testPayload, testSecret);
      const expired = isJwtExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: -1 });
      const expired = isJwtExpired(token);
      
      expect(expired).toBe(true);
    });

    it('should return null for malformed token', () => {
      const expired = isJwtExpired('malformed.token');
      expect(expired).toBeNull();
    });

    it('should return null for token without expiration', () => {
      const tokenWithoutExp = jwt.sign({ sub: 1, email: 'test@test.com', role: 'student' }, testSecret, { noTimestamp: true });
      const expired = isJwtExpired(tokenWithoutExp);
      
      expect(expired).toBeNull();
    });
  });
});
