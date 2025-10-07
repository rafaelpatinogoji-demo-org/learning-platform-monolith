import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt, decodeJwt, isJwtExpired } from '../../src/utils/jwt-utils';

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn()
  };
});

describe('JWT Utils', () => {
  const mockSecret = 'test-secret';
  const mockPayload = { id: 1, email: 'test@example.com', role: 'student' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signJwt', () => {
    it('should sign a JWT token with default expiry', () => {
      const mockToken = 'mock.jwt.token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = signJwt(mockPayload, mockSecret);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: mockPayload.id,
          email: mockPayload.email,
          role: mockPayload.role
        },
        mockSecret,
        {
          algorithm: 'HS256',
          expiresIn: '24h'
        }
      );
      expect(token).toBe(mockToken);
    });

    it('should sign a JWT token with custom expiry', () => {
      const mockToken = 'mock.jwt.token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = signJwt(mockPayload, mockSecret, { expiresIn: '1h' });

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: mockPayload.id,
          email: mockPayload.email,
          role: mockPayload.role
        },
        mockSecret,
        {
          algorithm: 'HS256',
          expiresIn: '1h'
        }
      );
      expect(token).toBe(mockToken);
    });

    it('should sign a JWT token with numeric expiry', () => {
      const mockToken = 'mock.jwt.token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = signJwt(mockPayload, mockSecret, { expiresIn: 3600 });

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: mockPayload.id,
          email: mockPayload.email,
          role: mockPayload.role
        },
        mockSecret,
        {
          algorithm: 'HS256',
          expiresIn: 3600
        }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('verifyJwt', () => {
    const mockToken = 'mock.jwt.token';

    it('should verify and decode a valid JWT token', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      const result = verifyJwt(mockToken, mockSecret);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockSecret);
      expect(result).toEqual(mockDecoded);
    });

    it('should throw error for string decoded payload', () => {
      (jwt.verify as jest.Mock).mockReturnValue('invalid-string');

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload');
    });

    it('should throw error for null decoded payload', () => {
      (jwt.verify as jest.Mock).mockReturnValue(null);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload');
    });

    it('should throw error for missing sub field', () => {
      const mockDecoded = {
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for invalid sub type', () => {
      const mockDecoded = {
        sub: 'invalid',
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for missing email field', () => {
      const mockDecoded = {
        sub: 1,
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for missing role field', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for missing iat field', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        exp: 1234567900
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });

    it('should throw error for missing exp field', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890
      };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      expect(() => verifyJwt(mockToken, mockSecret)).toThrow(jwt.JsonWebTokenError);
      expect(() => verifyJwt(mockToken, mockSecret)).toThrow('Invalid token payload structure');
    });
  });

  describe('decodeJwt', () => {
    const mockToken = 'mock.jwt.token';

    it('should decode a valid JWT token without verification', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = decodeJwt(mockToken);

      expect(jwt.decode).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockDecoded);
    });

    it('should return null for malformed token', () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      const result = decodeJwt(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for string decoded value', () => {
      (jwt.decode as jest.Mock).mockReturnValue('invalid-string');

      const result = decodeJwt(mockToken);

      expect(result).toBeNull();
    });

    it('should return null when decode throws error', () => {
      (jwt.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Decode error');
      });

      const result = decodeJwt(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('isJwtExpired', () => {
    const mockToken = 'mock.jwt.token';

    it('should return false for non-expired token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: futureTime
      };
      (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = isJwtExpired(mockToken);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: pastTime
      };
      (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = isJwtExpired(mockToken);

      expect(result).toBe(true);
    });

    it('should return null for malformed token', () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      const result = isJwtExpired(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for token without exp field', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000)
      };
      (jwt.decode as jest.Mock).mockReturnValue(mockDecoded);

      const result = isJwtExpired(mockToken);

      expect(result).toBeNull();
    });
  });
});
