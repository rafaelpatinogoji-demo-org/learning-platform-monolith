import { AuthService } from '../../src/services/auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with 12 rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_12_rounds');

      const result = await AuthService.hashPassword('mypassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
      expect(result).toBe('hashed_password_12_rounds');
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'p@$$w0rd!#%&*()';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_special_password');

      const result = await AuthService.hashPassword(specialPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 12);
      expect(result).toBe('hashed_special_password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password using bcrypt.compare', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await AuthService.verifyPassword('plainpassword', 'hashed_password');

      expect(bcrypt.compare).toHaveBeenCalledWith('plainpassword', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await AuthService.verifyPassword('wrongpassword', 'hashed_password');

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token with correct payload', () => {
      const user = { id: 1, email: 'test@test.com', role: 'student' };
      const token = AuthService.generateToken(user);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('student');
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
    });

    it('should generate token with 24 hour expiration', () => {
      const user = { id: 1, email: 'test@test.com', role: 'student' };
      const token = AuthService.generateToken(user);

      const decoded = jwt.decode(token) as any;
      const expirationDuration = decoded.exp - decoded.iat;
      
      expect(expirationDuration).toBe(24 * 60 * 60);
    });

    it('should handle different user roles', () => {
      const roles = ['student', 'instructor', 'admin'];

      roles.forEach(role => {
        const user = { id: 1, email: 'user@test.com', role };
        const token = AuthService.generateToken(user);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBe(role);
      });
    });

    it('should generate different tokens for different users', () => {
      const user1 = { id: 1, email: 'user1@test.com', role: 'student' };
      const user2 = { id: 2, email: 'user2@test.com', role: 'instructor' };

      const token1 = AuthService.generateToken(user1);
      const token2 = AuthService.generateToken(user2);

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;

      expect(decoded1.sub).toBe(1);
      expect(decoded2.sub).toBe(2);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const user = { id: 1, email: 'test@test.com', role: 'student' };
      const token = AuthService.generateToken(user);

      const decoded = AuthService.verifyToken(token);

      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('student');
    });

    it('should throw on invalid token', () => {
      expect(() => AuthService.verifyToken('invalid-token')).toThrow();
    });

    it('should throw on expired token', async () => {
      const payload = {
        sub: 1,
        email: 'test@test.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) - 50,
      };
      const expiredToken = jwt.sign(payload, 'test-secret-key', { algorithm: 'HS256' });

      expect(() => AuthService.verifyToken(expiredToken)).toThrow();
    });
  });

  describe('createUserProfile', () => {
    it('should create safe user profile with all fields', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      };

      const profile = AuthService.createUserProfile(user);

      expect(profile).toEqual({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: 'student',
        createdAt: user.created_at,
      });
    });

    it('should transform created_at to createdAt', () => {
      const user = {
        id: 2,
        email: 'user2@test.com',
        name: 'User Two',
        role: 'instructor',
        created_at: new Date('2023-06-15T10:30:00.000Z'),
      };

      const profile = AuthService.createUserProfile(user);

      expect(profile.createdAt).toEqual(user.created_at);
      expect(profile).not.toHaveProperty('created_at');
    });

    it('should handle different roles', () => {
      const roles = ['student', 'instructor', 'admin'];

      roles.forEach(role => {
        const user = {
          id: 1,
          email: 'user@test.com',
          name: 'Test User',
          role,
          created_at: new Date(),
        };

        const profile = AuthService.createUserProfile(user);

        expect(profile.role).toBe(role);
      });
    });

    it('should not expose sensitive data', () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date(),
      };

      const profile = AuthService.createUserProfile(user);

      expect(profile).not.toHaveProperty('password_hash');
      expect(profile).not.toHaveProperty('password');
    });
  });
});
