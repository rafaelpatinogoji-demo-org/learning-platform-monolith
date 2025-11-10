/**
 * Unit tests for auth.service
 * 
 * Tests authentication service methods for password hashing, verification,
 * JWT token generation, and user profile creation.
 * 
 * Coverage target: High coverage for all service methods
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service';
import { config } from '../../src/config';

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'mySecurePassword123';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'samePassword';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should hash passwords with special characters', async () => {
      const password = 'p@$$w0rd!#%&*()';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should hash long passwords', async () => {
      const password = 'a'.repeat(100);
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should use bcrypt with 12 rounds', async () => {
      const password = 'testPassword';
      const hash = await AuthService.hashPassword(password);
      
      const rounds = hash.split('$')[2];
      expect(rounds).toBe('12');
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'correctPassword';
      const hash = await AuthService.hashPassword(password);
      
      const result = await AuthService.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'correctPassword';
      const hash = await AuthService.hashPassword(password);
      
      const result = await AuthService.verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'Password123';
      const hash = await AuthService.hashPassword(password);
      
      const result1 = await AuthService.verifyPassword('password123', hash);
      const result2 = await AuthService.verifyPassword('PASSWORD123', hash);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should handle passwords with special characters', async () => {
      const password = 'p@$$w0rd!#%&*()';
      const hash = await AuthService.hashPassword(password);
      
      const result = await AuthService.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(100);
      const hash = await AuthService.hashPassword(password);
      
      const result = await AuthService.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for empty password against valid hash', async () => {
      const password = 'correctPassword';
      const hash = await AuthService.hashPassword(password);
      
      const result = await AuthService.verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with user payload', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload structure', () => {
      const user = { id: 123, email: 'user@test.com', role: 'instructor' };
      const token = AuthService.generateToken(user);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.sub).toBe(123);
      expect(decoded.email).toBe('user@test.com');
      expect(decoded.role).toBe('instructor');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should set expiration to 24 hours', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      const decoded = jwt.decode(token) as any;
      
      const expectedExp = decoded.iat + (24 * 60 * 60);
      expect(decoded.exp).toBe(expectedExp);
    });

    it('should use HS256 algorithm', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      const decoded = jwt.decode(token, { complete: true }) as any;
      
      expect(decoded.header.alg).toBe('HS256');
    });

    it('should handle different user roles', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach(role => {
        const user = { id: 1, email: 'test@example.com', role };
        const token = AuthService.generateToken(user);
        const decoded = jwt.decode(token) as any;
        
        expect(decoded.role).toBe(role);
      });
    });

    it('should handle different user IDs', () => {
      const ids = [1, 999, 123456];
      
      ids.forEach(id => {
        const user = { id, email: 'test@example.com', role: 'student' };
        const token = AuthService.generateToken(user);
        const decoded = jwt.decode(token) as any;
        
        expect(decoded.sub).toBe(id);
      });
    });

    it('should handle email with special characters', () => {
      const user = { id: 1, email: 'test+tag@example.co.uk', role: 'student' };
      const token = AuthService.generateToken(user);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.email).toBe('test+tag@example.co.uk');
    });

    it('should use configured JWT secret', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      
      expect(() => jwt.verify(token, config.jwtSecret)).not.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const user = { id: 1, email: 'test@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      
      const decoded = AuthService.verifyToken(token);
      
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('student');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => AuthService.verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for token with wrong secret', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        'wrong-secret'
      );
      
      expect(() => AuthService.verifyToken(token)).toThrow();
    });

    it('should throw error for expired token', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        config.jwtSecret,
        { expiresIn: -1 }
      );
      
      expect(() => AuthService.verifyToken(token)).toThrow(jwt.TokenExpiredError);
    });

    it('should verify token generated by generateToken', () => {
      const user = { id: 42, email: 'user@example.com', role: 'admin' };
      const token = AuthService.generateToken(user);
      
      expect(() => AuthService.verifyToken(token)).not.toThrow();
      
      const decoded = AuthService.verifyToken(token);
      expect(decoded.sub).toBe(42);
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.role).toBe('admin');
    });
  });

  describe('createUserProfile', () => {
    it('should create safe user profile without sensitive data', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01')
      };
      
      const profile = AuthService.createUserProfile(user);
      
      expect(profile).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        createdAt: new Date('2024-01-01')
      });
    });

    it('should not include password_hash in profile', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date('2024-01-01')
      } as any;
      
      const profile = AuthService.createUserProfile(user);
      
      expect(profile).not.toHaveProperty('password_hash');
    });

    it('should transform created_at to createdAt', () => {
      const createdDate = new Date('2024-06-15T10:30:00Z');
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: createdDate
      };
      
      const profile = AuthService.createUserProfile(user);
      
      expect(profile.createdAt).toBe(createdDate);
      expect(profile).not.toHaveProperty('created_at');
    });

    it('should handle different user roles', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach(role => {
        const user = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role,
          created_at: new Date()
        };
        
        const profile = AuthService.createUserProfile(user);
        expect(profile.role).toBe(role);
      });
    });

    it('should handle different user IDs', () => {
      const ids = [1, 999, 123456];
      
      ids.forEach(id => {
        const user = {
          id,
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          created_at: new Date()
        };
        
        const profile = AuthService.createUserProfile(user);
        expect(profile.id).toBe(id);
      });
    });

    it('should handle names with special characters', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: "O'Brien-Smith Jr.",
        role: 'student',
        created_at: new Date()
      };
      
      const profile = AuthService.createUserProfile(user);
      expect(profile.name).toBe("O'Brien-Smith Jr.");
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete registration workflow', async () => {
      const password = 'userPassword123';
      const user = { id: 1, email: 'newuser@example.com', role: 'student' };
      
      const hash = await AuthService.hashPassword(password);
      const token = AuthService.generateToken(user);
      const verified = AuthService.verifyToken(token);
      
      expect(hash).toBeDefined();
      expect(token).toBeDefined();
      expect(verified.sub).toBe(1);
      expect(verified.email).toBe('newuser@example.com');
    });

    it('should handle complete login workflow', async () => {
      const password = 'userPassword123';
      const hash = await AuthService.hashPassword(password);
      
      const isValid = await AuthService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const user = { id: 1, email: 'user@example.com', role: 'student' };
      const token = AuthService.generateToken(user);
      
      const decoded = AuthService.verifyToken(token);
      expect(decoded.sub).toBe(1);
    });

    it('should handle failed login with wrong password', async () => {
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = await AuthService.hashPassword(correctPassword);
      
      const isValid = await AuthService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle user profile creation after authentication', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      const token = AuthService.generateToken(user);
      const profile = AuthService.createUserProfile(user);
      
      expect(token).toBeDefined();
      expect(profile.id).toBe(1);
      expect(profile.email).toBe('test@example.com');
    });

    it('should handle multiple users with different credentials', async () => {
      const users = [
        { id: 1, email: 'student@example.com', role: 'student', password: 'pass1' },
        { id: 2, email: 'instructor@example.com', role: 'instructor', password: 'pass2' },
        { id: 3, email: 'admin@example.com', role: 'admin', password: 'pass3' }
      ];
      
      for (const user of users) {
        const hash = await AuthService.hashPassword(user.password);
        const isValid = await AuthService.verifyPassword(user.password, hash);
        expect(isValid).toBe(true);
        
        const token = AuthService.generateToken(user);
        const decoded = AuthService.verifyToken(token);
        expect(decoded.sub).toBe(user.id);
        expect(decoded.role).toBe(user.role);
      }
    });

    it('should maintain security through hash-verify cycle', async () => {
      const passwords = ['pass1', 'pass2', 'pass3'];
      const hashes = await Promise.all(passwords.map(p => AuthService.hashPassword(p)));
      
      for (let i = 0; i < passwords.length; i++) {
        expect(await AuthService.verifyPassword(passwords[i], hashes[i])).toBe(true);
        
        for (let j = 0; j < passwords.length; j++) {
          if (i !== j) {
            expect(await AuthService.verifyPassword(passwords[i], hashes[j])).toBe(false);
          }
        }
      }
    });

    it('should maintain token integrity through generate-verify cycle', () => {
      const users = [
        { id: 1, email: 'user1@example.com', role: 'student' },
        { id: 2, email: 'user2@example.com', role: 'instructor' },
        { id: 3, email: 'user3@example.com', role: 'admin' }
      ];
      
      const tokens = users.map(user => AuthService.generateToken(user));
      
      tokens.forEach((token, index) => {
        const decoded = AuthService.verifyToken(token);
        expect(decoded.sub).toBe(users[index].id);
        expect(decoded.email).toBe(users[index].email);
        expect(decoded.role).toBe(users[index].role);
      });
    });
  });
});
