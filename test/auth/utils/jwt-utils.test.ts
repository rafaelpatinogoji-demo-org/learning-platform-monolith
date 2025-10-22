import { signJwt, verifyJwt, decodeJwt, isJwtExpired, JwtPayload } from '../../../src/utils/jwt-utils';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  const testSecret = 'test-secret-key';
  const testPayload = { id: 1, email: 'test@example.com', role: 'student' };

  describe('signJwt()', () => {
    it('should generate a valid JWT token', () => {
      const token = signJwt(testPayload, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in token', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = jwt.decode(token) as any;

      expect(decoded.sub).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should use default expiration of 24h', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = jwt.decode(token) as any;

      const expectedExpiration = decoded.iat + (24 * 60 * 60);
      expect(decoded.exp).toBe(expectedExpiration);
    });

    it('should accept custom expiration time', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '1h' });
      const decoded = jwt.decode(token) as any;

      const expectedExpiration = decoded.iat + (60 * 60);
      expect(decoded.exp).toBe(expectedExpiration);
    });

    it('should use HS256 algorithm', () => {
      const token = signJwt(testPayload, testSecret);
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());

      expect(header.alg).toBe('HS256');
    });
  });

  describe('verifyJwt()', () => {
    it('should verify and decode valid token', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = verifyJwt(token, testSecret);

      expect(decoded.sub).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token signature', () => {
      const token = signJwt(testPayload, testSecret);
      const wrongSecret = 'wrong-secret';

      expect(() => verifyJwt(token, wrongSecret)).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw error for expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '-1h' });

      expect(() => verifyJwt(token, testSecret)).toThrow(jwt.TokenExpiredError);
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyJwt('invalid.token', testSecret)).toThrow();
    });

    it('should throw error for token with invalid payload structure', () => {
      const invalidToken = jwt.sign({ data: 'invalid' }, testSecret);

      expect(() => verifyJwt(invalidToken, testSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(invalidToken, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for string payload', () => {
      const stringToken = jwt.sign('string-payload', testSecret);

      expect(() => verifyJwt(stringToken, testSecret)).toThrow(jwt.JsonWebTokenError);
    });
  });

  describe('decodeJwt()', () => {
    it('should decode valid token without verification', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = decodeJwt(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.id);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should decode token with wrong secret', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = decodeJwt(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testPayload.id);
    });

    it('should return null for malformed token', () => {
      const decoded = decodeJwt('not.a.valid.token');

      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeJwt('');

      expect(decoded).toBeNull();
    });
  });

  describe('isJwtExpired()', () => {
    it('should return false for valid non-expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '1h' });
      const isExpired = isJwtExpired(token);

      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '-1h' });
      const isExpired = isJwtExpired(token);

      expect(isExpired).toBe(true);
    });

    it('should return null for malformed token', () => {
      const isExpired = isJwtExpired('invalid.token');

      expect(isExpired).toBeNull();
    });

    it('should return null for token without exp field', () => {
      const tokenWithoutExp = jwt.sign({ sub: 1, email: 'test@example.com' }, testSecret);
      const isExpired = isJwtExpired(tokenWithoutExp);

      expect(isExpired).toBeNull();
    });
  });
});
