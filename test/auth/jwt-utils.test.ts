import { signJwt, verifyJwt, decodeJwt, isJwtExpired, JwtPayload } from '../../src/utils/jwt-utils';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
  const TEST_SECRET = 'test-secret-key-for-jest';
  const VALID_PAYLOAD = {
    id: 1,
    email: 'test@example.com',
    role: 'student'
  };

  describe('signJwt', () => {
    it('should generate a valid JWT token with default expiration', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate token with custom expiration', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET, { expiresIn: '1h' });
      const decoded = decodeJwt(token);
      
      expect(decoded).toBeDefined();
      expect(decoded!.sub).toBe(VALID_PAYLOAD.id);
    });

    it('should include correct payload structure', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.sub).toBe(VALID_PAYLOAD.id);
      expect(decoded.email).toBe(VALID_PAYLOAD.email);
      expect(decoded.role).toBe(VALID_PAYLOAD.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should use HS256 algorithm', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      expect(decoded.header.alg).toBe('HS256');
    });
  });

  describe('verifyJwt', () => {
    it('should verify and decode a valid token', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      const decoded = verifyJwt(token, TEST_SECRET);
      
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(VALID_PAYLOAD.id);
      expect(decoded.email).toBe(VALID_PAYLOAD.email);
      expect(decoded.role).toBe(VALID_PAYLOAD.role);
    });

    it('should reject token with invalid signature', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      
      expect(() => {
        verifyJwt(token, 'wrong-secret');
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should reject expired token', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET, { expiresIn: '-1s' });
      expect(() => {
        verifyJwt(token, TEST_SECRET);
      }).toThrow(jwt.TokenExpiredError);
    });

    it('should reject malformed token', () => {
      expect(() => {
        verifyJwt('invalid.token.here', TEST_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should reject token with invalid payload structure', () => {
      const badToken = jwt.sign({ userId: 1 }, TEST_SECRET);
      
      expect(() => {
        verifyJwt(badToken, TEST_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('should throw error if JWT_SECRET is missing', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      
      expect(() => {
        verifyJwt(token, '');
      }).toThrow();
    });
  });

  describe('decodeJwt', () => {
    it('should decode token without verification', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET);
      const decoded = decodeJwt(token);
      
      expect(decoded).toBeDefined();
      expect(decoded!.sub).toBe(VALID_PAYLOAD.id);
      expect(decoded!.email).toBe(VALID_PAYLOAD.email);
    });

    it('should return null for malformed token', () => {
      const decoded = decodeJwt('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should decode expired token without throwing', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET, { expiresIn: '-1s' });
      const decoded = decodeJwt(token);
      expect(decoded).toBeDefined();
      expect(decoded!.sub).toBe(VALID_PAYLOAD.id);
    });
  });

  describe('isJwtExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET, { expiresIn: '1h' });
      const expired = isJwtExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = signJwt(VALID_PAYLOAD, TEST_SECRET, { expiresIn: '-1s' });
      const expired = isJwtExpired(token);
      expect(expired).toBe(true);
    });

    it('should return null for malformed token', () => {
      const expired = isJwtExpired('invalid-token');
      expect(expired).toBeNull();
    });

    it('should return null for token without exp claim', () => {
      const token = jwt.sign({ sub: 1 }, TEST_SECRET, { noTimestamp: true });
      const expired = isJwtExpired(token);
      
      expect(expired).toBeNull();
    });
  });
});
