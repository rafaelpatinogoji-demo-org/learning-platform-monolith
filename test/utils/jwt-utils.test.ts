/**
 * Unit tests for jwt-utils utility
 * 
 * Tests JWT token signing, verification, decoding, and expiration checking
 * with various scenarios including edge cases and error conditions.
 * 
 * Coverage target: 90%+
 */

import jwt from 'jsonwebtoken';
import {
  signJwt,
  verifyJwt,
  decodeJwt,
  isJwtExpired,
  JwtPayload
} from '../../src/utils/jwt-utils';

const TEST_SECRET = 'test-secret-key';

describe('signJwt', () => {
  it('should sign JWT with valid payload', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should include correct payload structure', () => {
    const payload = { id: 123, email: 'user@test.com', role: 'instructor' };
    const token = signJwt(payload, TEST_SECRET);
    const decoded = jwt.decode(token) as any;
    
    expect(decoded.sub).toBe(123);
    expect(decoded.email).toBe('user@test.com');
    expect(decoded.role).toBe('instructor');
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should use default expiration of 24h', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    const decoded = jwt.decode(token) as any;
    
    const expectedExp = decoded.iat + (24 * 60 * 60);
    expect(decoded.exp).toBe(expectedExp);
  });

  it('should accept custom expiration as string', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: '1h' });
    const decoded = jwt.decode(token) as any;
    
    const expectedExp = decoded.iat + (60 * 60);
    expect(decoded.exp).toBe(expectedExp);
  });

  it('should accept custom expiration as number (seconds)', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: 3600 });
    const decoded = jwt.decode(token) as any;
    
    const expectedExp = decoded.iat + 3600;
    expect(decoded.exp).toBe(expectedExp);
  });

  it('should use HS256 algorithm', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    const decoded = jwt.decode(token, { complete: true }) as any;
    
    expect(decoded.header.alg).toBe('HS256');
  });

  it('should handle different user roles', () => {
    const roles = ['student', 'instructor', 'admin'];
    
    roles.forEach(role => {
      const payload = { id: 1, email: 'test@example.com', role };
      const token = signJwt(payload, TEST_SECRET);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.role).toBe(role);
    });
  });

  it('should handle different user IDs', () => {
    const ids = [1, 999, 123456];
    
    ids.forEach(id => {
      const payload = { id, email: 'test@example.com', role: 'student' };
      const token = signJwt(payload, TEST_SECRET);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.sub).toBe(id);
    });
  });

  it('should handle email with special characters', () => {
    const payload = { id: 1, email: 'test+tag@example.co.uk', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    const decoded = jwt.decode(token) as any;
    
    expect(decoded.email).toBe('test+tag@example.co.uk');
  });
});

describe('verifyJwt', () => {
  it('should verify valid token', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    
    const decoded = verifyJwt(token, TEST_SECRET);
    
    expect(decoded.sub).toBe(1);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('student');
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should throw error for invalid token', () => {
    const invalidToken = 'invalid.token.here';
    
    expect(() => verifyJwt(invalidToken, TEST_SECRET)).toThrow();
  });

  it('should throw error for token with wrong secret', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    
    expect(() => verifyJwt(token, 'wrong-secret')).toThrow();
  });

  it('should throw error for expired token', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: -1 });
    
    expect(() => verifyJwt(token, TEST_SECRET)).toThrow(jwt.TokenExpiredError);
  });

  it('should throw error for malformed token', () => {
    expect(() => verifyJwt('not-a-jwt', TEST_SECRET)).toThrow();
    expect(() => verifyJwt('', TEST_SECRET)).toThrow();
  });

  it('should throw error for token with invalid payload structure (string)', () => {
    const token = jwt.sign('string-payload', TEST_SECRET);
    
    expect(() => verifyJwt(token, TEST_SECRET)).toThrow('Invalid token payload');
  });

  it('should throw error for token missing required fields', () => {
    const invalidPayloads = [
      { email: 'test@example.com', role: 'student' }, // missing sub
      { sub: 1, role: 'student' }, // missing email
      { sub: 1, email: 'test@example.com' }, // missing role
      { sub: 'not-a-number', email: 'test@example.com', role: 'student' }, // wrong type for sub
      { sub: 1, email: 123, role: 'student' }, // wrong type for email
      { sub: 1, email: 'test@example.com', role: 123 }, // wrong type for role
    ];

    invalidPayloads.forEach(payload => {
      const token = jwt.sign(payload, TEST_SECRET);
      expect(() => verifyJwt(token, TEST_SECRET)).toThrow('Invalid token payload structure');
    });
  });

  it('should verify token with all required fields', () => {
    const payload = { id: 42, email: 'user@example.com', role: 'admin' };
    const token = signJwt(payload, TEST_SECRET);
    
    const decoded = verifyJwt(token, TEST_SECRET);
    
    expect(typeof decoded.sub).toBe('number');
    expect(typeof decoded.email).toBe('string');
    expect(typeof decoded.role).toBe('string');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('should handle tokens with different expiration times', () => {
    const expirations = ['1h', '24h', '7d'];
    
    expirations.forEach(exp => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const token = signJwt(payload, TEST_SECRET, { expiresIn: exp });
      
      expect(() => verifyJwt(token, TEST_SECRET)).not.toThrow();
    });
  });
});

describe('decodeJwt', () => {
  it('should decode valid token without verification', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    
    const decoded = decodeJwt(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(1);
    expect(decoded?.email).toBe('test@example.com');
    expect(decoded?.role).toBe('student');
  });

  it('should decode token even with wrong secret', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET);
    
    const decoded = decodeJwt(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(1);
  });

  it('should decode expired token', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: -1 });
    
    const decoded = decodeJwt(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(1);
  });

  it('should return null for malformed token', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('invalid.token')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(decodeJwt('')).toBeNull();
  });

  it('should return null for token with string payload', () => {
    const token = jwt.sign('string-payload', TEST_SECRET);
    const decoded = decodeJwt(token);
    
    expect(decoded).toBeNull();
  });

  it('should decode token with all fields', () => {
    const payload = { id: 99, email: 'admin@example.com', role: 'admin' };
    const token = signJwt(payload, TEST_SECRET);
    
    const decoded = decodeJwt(token);
    
    expect(decoded?.sub).toBe(99);
    expect(decoded?.email).toBe('admin@example.com');
    expect(decoded?.role).toBe('admin');
    expect(decoded?.iat).toBeDefined();
    expect(decoded?.exp).toBeDefined();
  });
});

describe('isJwtExpired', () => {
  it('should return false for valid non-expired token', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: '1h' });
    
    expect(isJwtExpired(token)).toBe(false);
  });

  it('should return true for expired token', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: -1 });
    
    expect(isJwtExpired(token)).toBe(true);
  });

  it('should return null for malformed token', () => {
    expect(isJwtExpired('not-a-jwt')).toBeNull();
    expect(isJwtExpired('invalid.token')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(isJwtExpired('')).toBeNull();
  });

  it('should return null for token without exp field', () => {
    const token = jwt.sign({ sub: 1, email: 'test@example.com' }, TEST_SECRET, { noTimestamp: true });
    expect(isJwtExpired(token)).toBeNull();
  });

  it('should check expiration without verifying signature', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: '1h' });
    
    expect(isJwtExpired(token)).toBe(false);
  });

  it('should handle token expiring soon', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const token = signJwt(payload, TEST_SECRET, { expiresIn: 1 }); // 1 second
    
    expect(isJwtExpired(token)).toBe(false);
  });

  it('should correctly identify just-expired token', () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      sub: 1,
      email: 'test@example.com',
      role: 'student',
      iat: now - 3600,
      exp: now - 1 // Expired 1 second ago
    };
    const token = jwt.sign(expiredPayload, TEST_SECRET);
    
    expect(isJwtExpired(token)).toBe(true);
  });

  it('should correctly identify token expiring in future', () => {
    const now = Math.floor(Date.now() / 1000);
    const futurePayload = {
      sub: 1,
      email: 'test@example.com',
      role: 'student',
      iat: now,
      exp: now + 3600 // Expires in 1 hour
    };
    const token = jwt.sign(futurePayload, TEST_SECRET);
    
    expect(isJwtExpired(token)).toBe(false);
  });
});

describe('Integration scenarios', () => {
  it('should handle complete sign-verify-decode workflow', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    
    const token = signJwt(payload, TEST_SECRET);
    const verified = verifyJwt(token, TEST_SECRET);
    const decoded = decodeJwt(token);
    const expired = isJwtExpired(token);
    
    expect(verified.sub).toBe(1);
    expect(decoded?.sub).toBe(1);
    expect(expired).toBe(false);
  });

  it('should handle token lifecycle from creation to expiration', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    
    const token = signJwt(payload, TEST_SECRET, { expiresIn: 1 });
    
    expect(isJwtExpired(token)).toBe(false);
    expect(() => verifyJwt(token, TEST_SECRET)).not.toThrow();
    
    const expiredToken = signJwt(payload, TEST_SECRET, { expiresIn: -1 });
    
    expect(isJwtExpired(expiredToken)).toBe(true);
    expect(() => verifyJwt(expiredToken, TEST_SECRET)).toThrow();
  });

  it('should handle multiple tokens with different payloads', () => {
    const users = [
      { id: 1, email: 'student@example.com', role: 'student' },
      { id: 2, email: 'instructor@example.com', role: 'instructor' },
      { id: 3, email: 'admin@example.com', role: 'admin' }
    ];
    
    const tokens = users.map(user => signJwt(user, TEST_SECRET));
    
    tokens.forEach((token, index) => {
      const verified = verifyJwt(token, TEST_SECRET);
      expect(verified.sub).toBe(users[index].id);
      expect(verified.email).toBe(users[index].email);
      expect(verified.role).toBe(users[index].role);
    });
  });

  it('should maintain payload integrity through sign-verify cycle', () => {
    const payload = { id: 12345, email: 'complex+email@sub.example.com', role: 'instructor' };
    
    const token = signJwt(payload, TEST_SECRET);
    const verified = verifyJwt(token, TEST_SECRET);
    
    expect(verified.sub).toBe(payload.id);
    expect(verified.email).toBe(payload.email);
    expect(verified.role).toBe(payload.role);
  });

  it('should handle different secrets correctly', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'student' };
    const secret1 = 'secret-one';
    const secret2 = 'secret-two';
    
    const token1 = signJwt(payload, secret1);
    const token2 = signJwt(payload, secret2);
    
    expect(() => verifyJwt(token1, secret1)).not.toThrow();
    expect(() => verifyJwt(token2, secret2)).not.toThrow();
    
    expect(() => verifyJwt(token1, secret2)).toThrow();
    expect(() => verifyJwt(token2, secret1)).toThrow();
  });
});
