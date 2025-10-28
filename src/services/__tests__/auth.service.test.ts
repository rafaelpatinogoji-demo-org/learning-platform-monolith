import { AuthService } from '../auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    verify: jest.fn(),
    sign: jest.fn()
  };
});
jest.mock('../../config', () => ({
  config: {
    jwtSecret: 'test-secret-key'
  }
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt using 12 rounds', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordExample';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should return different hashes for same password on different calls', async () => {
      const password = 'testPassword123';
      mockedBcrypt.hash
        .mockResolvedValueOnce('$2b$12$hash1' as never)
        .mockResolvedValueOnce('$2b$12$hash2' as never);

      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordExample';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2b$12$hashedPasswordExample';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1609459200000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate JWT token with correct payload structure', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'student'
      };
      const mockToken = 'mock.jwt.token';
      
      mockedJwt.sign.mockReturnValue(mockToken as never);

      const result = AuthService.generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: 1,
          email: 'test@example.com',
          role: 'student',
          iat: 1609459200,
          exp: 1609459200 + (24 * 60 * 60)
        },
        'test-secret-key',
        { algorithm: 'HS256' }
      );
      expect(result).toBe(mockToken);
    });

    it('should set expiration to 24 hours from now', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'admin'
      };
      
      mockedJwt.sign.mockReturnValue('token' as never);

      AuthService.generateToken(user);

      const callArgs = mockedJwt.sign.mock.calls[0][0] as any;
      const expectedExp = 1609459200 + (24 * 60 * 60);
      
      expect(callArgs.exp).toBe(expectedExp);
      expect(callArgs.exp - callArgs.iat).toBe(24 * 60 * 60);
    });

    it('should include user id as sub claim', () => {
      const user = {
        id: 42,
        email: 'instructor@example.com',
        role: 'instructor'
      };
      
      mockedJwt.sign.mockReturnValue('token' as never);

      AuthService.generateToken(user);

      const callArgs = mockedJwt.sign.mock.calls[0][0] as any;
      expect(callArgs.sub).toBe(42);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return decoded token payload', () => {
      const token = 'valid.jwt.token';
      const decodedPayload = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1609459200,
        exp: 1609545600
      };
      
      mockedJwt.verify.mockReturnValue(decodedPayload as never);

      const result = AuthService.verifyToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
      expect(result).toEqual(decodedPayload);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid.jwt.token';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      expect(() => AuthService.verifyToken(token)).toThrow('invalid token');
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
    });

    it('should throw error for expired token', () => {
      const token = 'expired.jwt.token';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      expect(() => AuthService.verifyToken(token)).toThrow('jwt expired');
      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret-key');
    });
  });

  describe('createUserProfile', () => {
    it('should create sanitized user profile without password', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01T00:00:00.000Z')
      };

      const result = AuthService.createUserProfile(user);

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01T00:00:00.000Z')
      });
    });

    it('should convert created_at to createdAt', () => {
      const user = {
        id: 2,
        email: 'user@example.com',
        name: 'Another User',
        role: 'instructor',
        created_at: new Date('2024-06-15T12:30:00.000Z')
      };

      const result = AuthService.createUserProfile(user);

      expect(result).toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('created_at');
      expect(result.createdAt).toEqual(new Date('2024-06-15T12:30:00.000Z'));
    });

    it('should not include password_hash field', () => {
      const user = {
        id: 3,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date('2024-01-01T00:00:00.000Z')
      };

      const result = AuthService.createUserProfile(user);

      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('password');
    });

    it('should preserve all user roles correctly', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach(role => {
        const user = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role,
          created_at: new Date()
        };

        const result = AuthService.createUserProfile(user);
        expect(result.role).toBe(role);
      });
    });
  });
});
