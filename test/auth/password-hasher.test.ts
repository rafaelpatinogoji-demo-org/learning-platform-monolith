import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PasswordHasher, hashPassword, comparePassword, createPasswordHasher } from '../../src/utils/password-hasher';
import bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordHasher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PasswordHasher class', () => {
    it('should create instance with default cost factor 12', () => {
      const hasher = new PasswordHasher();
      expect(hasher.getCostFactor()).toBe(12);
    });

    it('should create instance with custom cost factor', () => {
      const hasher = new PasswordHasher({ costFactor: 10 });
      expect(hasher.getCostFactor()).toBe(10);
    });

    it('should hash password with configured cost factor', async () => {
      const hasher = new PasswordHasher({ costFactor: 8 });
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);
      
      await hasher.hash('password123');
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 8);
    });

    it('should throw error when hashing non-string password', async () => {
      const hasher = new PasswordHasher();
      
      await expect(hasher.hash('' as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(hasher.hash(null as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(hasher.hash(undefined as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should compare passwords correctly', async () => {
      const hasher = new PasswordHasher();
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const result = await hasher.compare('password123', '$2b$12$hashed');
      
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$12$hashed');
    });

    it('should throw error when comparing with invalid inputs', async () => {
      const hasher = new PasswordHasher();
      
      await expect(hasher.compare('', 'hash')).rejects.toThrow('Password must be a non-empty string');
      await expect(hasher.compare('password', '')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should allow updating cost factor', () => {
      const hasher = new PasswordHasher({ costFactor: 10 });
      hasher.setCostFactor(15);
      expect(hasher.getCostFactor()).toBe(15);
    });

    it('should validate cost factor range when setting', () => {
      const hasher = new PasswordHasher();
      
      expect(() => hasher.setCostFactor(0)).toThrow('Cost factor must be an integer between 1 and 31');
      expect(() => hasher.setCostFactor(32)).toThrow('Cost factor must be an integer between 1 and 31');
      expect(() => hasher.setCostFactor(5.5)).toThrow('Cost factor must be an integer between 1 and 31');
    });
  });

  describe('Convenience functions', () => {
    it('hashPassword should use default hasher', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);
      
      const result = await hashPassword('password123');
      
      expect(result).toBe('hashed');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('comparePassword should use default hasher', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const result = await comparePassword('password123', '$2b$12$hashed');
      
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2b$12$hashed');
    });

    it('createPasswordHasher should create new instance with config', () => {
      const hasher = createPasswordHasher({ costFactor: 8 });
      expect(hasher.getCostFactor()).toBe(8);
    });
  });
});
