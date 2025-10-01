import { PasswordHasher, hashPassword, comparePassword, createPasswordHasher } from '../../src/utils/password-hasher';
import bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn((password: string, rounds: number) => 
    Promise.resolve(`hashed_${password}_rounds${rounds}`)
  ),
  compare: jest.fn((password: string, hash: string) => {
    const match = hash.match(/^hashed_(.+)_rounds(\d+)$/);
    if (match) {
      return Promise.resolve(password === match[1]);
    }
    return Promise.resolve(false);
  }),
}));

describe('Password Hasher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PasswordHasher class', () => {
    describe('hash', () => {
      it('should hash password with default cost factor (12)', async () => {
        const hasher = new PasswordHasher();
        const hashed = await hasher.hash('mypassword');
        
        expect(hashed).toBe('hashed_mypassword_rounds12');
        expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
      });

      it('should hash password with custom cost factor', async () => {
        const hasher = new PasswordHasher({ costFactor: 8 });
        const hashed = await hasher.hash('mypassword');
        
        expect(hashed).toBe('hashed_mypassword_rounds8');
        expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 8);
      });

      it('should throw error for empty password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.hash('')).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for non-string password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.hash(null as any)).rejects.toThrow('Password must be a non-empty string');
        await expect(hasher.hash(undefined as any)).rejects.toThrow('Password must be a non-empty string');
        await expect(hasher.hash(123 as any)).rejects.toThrow('Password must be a non-empty string');
      });

      it('should handle special characters in password', async () => {
        const hasher = new PasswordHasher();
        const specialPassword = 'p@$$w0rd!#%&*()';
        const hashed = await hasher.hash(specialPassword);
        
        expect(hashed).toBe(`hashed_${specialPassword}_rounds12`);
      });
    });

    describe('compare', () => {
      it('should return true for matching passwords', async () => {
        const hasher = new PasswordHasher();
        const result = await hasher.compare('mypassword', 'hashed_mypassword_rounds12');
        
        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith('mypassword', 'hashed_mypassword_rounds12');
      });

      it('should return false for non-matching passwords', async () => {
        const hasher = new PasswordHasher();
        const result = await hasher.compare('wrongpassword', 'hashed_mypassword_rounds12');
        
        expect(result).toBe(false);
      });

      it('should throw error for empty password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.compare('', 'some-hash')).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for non-string password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.compare(null as any, 'some-hash')).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for empty hashed password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.compare('password', '')).rejects.toThrow('Hashed password must be a non-empty string');
      });

      it('should throw error for non-string hashed password', async () => {
        const hasher = new PasswordHasher();
        
        await expect(hasher.compare('password', null as any)).rejects.toThrow('Hashed password must be a non-empty string');
      });
    });

    describe('getCostFactor', () => {
      it('should return default cost factor', () => {
        const hasher = new PasswordHasher();
        
        expect(hasher.getCostFactor()).toBe(12);
      });

      it('should return custom cost factor', () => {
        const hasher = new PasswordHasher({ costFactor: 10 });
        
        expect(hasher.getCostFactor()).toBe(10);
      });
    });

    describe('setCostFactor', () => {
      it('should update cost factor', async () => {
        const hasher = new PasswordHasher();
        hasher.setCostFactor(8);
        
        expect(hasher.getCostFactor()).toBe(8);
        
        await hasher.hash('test');
        expect(bcrypt.hash).toHaveBeenCalledWith('test', 8);
      });

      it('should throw error for non-integer cost factor', () => {
        const hasher = new PasswordHasher();
        
        expect(() => hasher.setCostFactor(10.5)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should throw error for cost factor below 1', () => {
        const hasher = new PasswordHasher();
        
        expect(() => hasher.setCostFactor(0)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should throw error for cost factor above 31', () => {
        const hasher = new PasswordHasher();
        
        expect(() => hasher.setCostFactor(32)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should accept valid cost factors at boundaries', () => {
        const hasher = new PasswordHasher();
        
        expect(() => hasher.setCostFactor(1)).not.toThrow();
        expect(() => hasher.setCostFactor(31)).not.toThrow();
      });
    });
  });

  describe('Default exports', () => {
    describe('hashPassword', () => {
      it('should hash using default instance', async () => {
        const hashed = await hashPassword('testpassword');
        
        expect(hashed).toBe('hashed_testpassword_rounds12');
        expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 12);
      });
    });

    describe('comparePassword', () => {
      it('should compare using default instance', async () => {
        const result = await comparePassword('testpassword', 'hashed_testpassword_rounds12');
        
        expect(result).toBe(true);
      });

      it('should return false for wrong password', async () => {
        const result = await comparePassword('wrongpassword', 'hashed_testpassword_rounds12');
        
        expect(result).toBe(false);
      });
    });

    describe('createPasswordHasher', () => {
      it('should create new instance with default config', () => {
        const hasher = createPasswordHasher();
        
        expect(hasher).toBeInstanceOf(PasswordHasher);
        expect(hasher.getCostFactor()).toBe(12);
      });

      it('should create new instance with custom config', () => {
        const hasher = createPasswordHasher({ costFactor: 6 });
        
        expect(hasher).toBeInstanceOf(PasswordHasher);
        expect(hasher.getCostFactor()).toBe(6);
      });

      it('should create independent instances', async () => {
        const hasher1 = createPasswordHasher({ costFactor: 8 });
        const hasher2 = createPasswordHasher({ costFactor: 10 });
        
        expect(hasher1.getCostFactor()).toBe(8);
        expect(hasher2.getCostFactor()).toBe(10);
      });
    });
  });
});
