import { signJwt, verifyJwt, decodeJwt, isJwtExpired, JwtPayload } from '../../src/utils/jwt-utils';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  const testSecret = 'test-secret-key-for-jwt';
  const testPayload = { id: 1, email: 'test@example.com', role: 'student' };

  describe('signJwt', () => {
    it('should sign a valid JWT token with default expiration', () => {
      const token = signJwt(testPayload, testSecret);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('student');
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
    });

    it('should sign token with custom expiration (1h)', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '1h' });
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe(1);
      expect(decoded.exp - decoded.iat).toBe(3600);
    });

    it('should sign token with custom expiration in seconds', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: 7200 });
      
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp - decoded.iat).toBe(7200);
    });

    it('should include all required payload fields', () => {
      const token = signJwt(testPayload, testSecret);
      
      const decoded = jwt.decode(token) as any;
      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('verifyJwt', () => {
    it('should verify and decode a valid token', () => {
      const token = signJwt(testPayload, testSecret);
      const verified = verifyJwt(token, testSecret);
      
      expect(verified.sub).toBe(1);
      expect(verified.email).toBe('test@example.com');
      expect(verified.role).toBe('student');
      expect(typeof verified.iat).toBe('number');
      expect(typeof verified.exp).toBe('number');
    });

    it('should throw on expired token', async () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '0s' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(() => verifyJwt(token, testSecret)).toThrow(jwt.TokenExpiredError);
    });

    it('should throw on invalid signature', () => {
      const token = signJwt(testPayload, testSecret);
      
      expect(() => verifyJwt(token, 'wrong-secret')).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw on malformed token', () => {
      expect(() => verifyJwt('not-a-valid-token', testSecret)).toThrow();
    });

    it('should throw on invalid payload structure - string payload', () => {
      const token = jwt.sign('string-payload', testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload');
    });

    it('should throw on invalid payload structure - missing sub field', () => {
      const token = jwt.sign({ email: 'test@test.com', role: 'student' }, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw on invalid payload structure - missing email field', () => {
      const token = jwt.sign({ sub: 1, role: 'student' }, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw on invalid payload structure - missing role field', () => {
      const token = jwt.sign({ sub: 1, email: 'test@test.com' }, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw on invalid payload structure - wrong types', () => {
      const token = jwt.sign({ sub: 'not-a-number', email: 'test@test.com', role: 'student' }, testSecret);
      
      expect(() => verifyJwt(token, testSecret)).toThrow('Invalid token payload structure');
    });
  });

  describe('decodeJwt', () => {
    it('should decode a valid token without verification', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = decodeJwt(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded!.sub).toBe(1);
      expect(decoded!.email).toBe('test@example.com');
      expect(decoded!.role).toBe('student');
    });

    it('should decode token even with wrong secret', () => {
      const token = signJwt(testPayload, testSecret);
      const decoded = decodeJwt(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded!.sub).toBe(1);
    });

    it('should return null for malformed token', () => {
      const decoded = decodeJwt('not-a-valid-jwt-token');
      
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeJwt('');
      
      expect(decoded).toBeNull();
    });

    it('should decode expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '0s' });
      const decoded = decodeJwt(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded!.sub).toBe(1);
    });
  });

  describe('isJwtExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '1h' });
      const expired = isJwtExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for expired token', async () => {
      const token = signJwt(testPayload, testSecret, { expiresIn: '0s' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const expired = isJwtExpired(token);
      expect(expired).toBe(true);
    });

    it('should return null for malformed token', () => {
      const expired = isJwtExpired('not-a-valid-token');
      
      expect(expired).toBeNull();
    });

    it('should return null for token without exp field', () => {
      const tokenWithoutExp = jwt.sign({ sub: 1, email: 'test@test.com' }, testSecret, { noTimestamp: true });
      const expired = isJwtExpired(tokenWithoutExp);
      
      expect(expired).toBeNull();
    });

    it('should handle edge case of token expiring exactly now', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = jwt.sign({ sub: 1, email: 'test@test.com', role: 'student', exp: now }, testSecret);
      const expired = isJwtExpired(token);
      
      expect(expired).toBe(false);
    });
  });
});
