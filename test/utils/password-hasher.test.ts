/**
 * Unit tests for password-hasher utility
 * 
 * Tests password hashing and comparison using bcrypt with various scenarios
 * including edge cases, error conditions, and configuration options.
 * 
 * Coverage target: 90%+
 */

import {
  PasswordHasher,
  passwordHasher,
  hashPassword,
  comparePassword,
  createPasswordHasher
} from '../../src/utils/password-hasher';

describe('PasswordHasher', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const hasher = new PasswordHasher();
      expect(hasher.getCostFactor()).toBe(12);
    });

    it('should create instance with custom cost factor', () => {
      const hasher = new PasswordHasher({ costFactor: 8 });
      expect(hasher.getCostFactor()).toBe(8);
    });

    it('should merge custom config with defaults', () => {
      const hasher = new PasswordHasher({ costFactor: 10 });
      expect(hasher.getCostFactor()).toBe(10);
    });
  });

  describe('hash', () => {
    it('should hash a valid password', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 }); // Low cost for speed
      const password = 'mySecurePassword123';
      const hash = await hasher.hash(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should generate different hashes for same password', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'samePassword';
      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);
      
      expect(hash1).not.toBe(hash2); // Different salts
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

    it('should hash passwords with special characters', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'p@$$w0rd!#%&*()';
      const hash = await hasher.hash(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should hash long passwords', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'a'.repeat(100);
      const hash = await hasher.hash(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('compare', () => {
    it('should return true for matching password and hash', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'correctPassword';
      const hash = await hasher.hash(password);
      
      const result = await hasher.compare(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'correctPassword';
      const hash = await hasher.hash(password);
      
      const result = await hasher.compare('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'correctPassword';
      const hash = await hasher.hash(password);
      
      await expect(hasher.compare('', hash)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      const hasher = new PasswordHasher();
      const validHash = '$2b$12$abcdefghijklmnopqrstuv';
      
      await expect(hasher.compare(null as any, validHash)).rejects.toThrow('Password must be a non-empty string');
      await expect(hasher.compare(undefined as any, validHash)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for empty hashed password', async () => {
      const hasher = new PasswordHasher();
      await expect(hasher.compare('password', '')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should throw error for non-string hashed password', async () => {
      const hasher = new PasswordHasher();
      await expect(hasher.compare('password', null as any)).rejects.toThrow('Hashed password must be a non-empty string');
      await expect(hasher.compare('password', undefined as any)).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should handle passwords with special characters', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'p@$$w0rd!#%&*()';
      const hash = await hasher.hash(password);
      
      const result = await hasher.compare(password, hash);
      expect(result).toBe(true);
    });

    it('should be case-sensitive', async () => {
      const hasher = new PasswordHasher({ costFactor: 4 });
      const password = 'Password123';
      const hash = await hasher.hash(password);
      
      const result1 = await hasher.compare('password123', hash);
      const result2 = await hasher.compare('PASSWORD123', hash);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('getCostFactor', () => {
    it('should return current cost factor', () => {
      const hasher = new PasswordHasher({ costFactor: 10 });
      expect(hasher.getCostFactor()).toBe(10);
    });

    it('should return default cost factor when not specified', () => {
      const hasher = new PasswordHasher();
      expect(hasher.getCostFactor()).toBe(12);
    });
  });

  describe('setCostFactor', () => {
    it('should update cost factor with valid value', () => {
      const hasher = new PasswordHasher();
      hasher.setCostFactor(8);
      expect(hasher.getCostFactor()).toBe(8);
    });

    it('should throw error for non-integer cost factor', () => {
      const hasher = new PasswordHasher();
      expect(() => hasher.setCostFactor(10.5)).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should throw error for cost factor below 1', () => {
      const hasher = new PasswordHasher();
      expect(() => hasher.setCostFactor(0)).toThrow('Cost factor must be an integer between 1 and 31');
      expect(() => hasher.setCostFactor(-1)).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should throw error for cost factor above 31', () => {
      const hasher = new PasswordHasher();
      expect(() => hasher.setCostFactor(32)).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should accept boundary values 1 and 31', () => {
      const hasher = new PasswordHasher();
      expect(() => hasher.setCostFactor(1)).not.toThrow();
      expect(() => hasher.setCostFactor(31)).not.toThrow();
    });
  });
});

describe('Default passwordHasher instance', () => {
  it('should be a PasswordHasher instance', () => {
    expect(passwordHasher).toBeInstanceOf(PasswordHasher);
  });

  it('should have default cost factor', () => {
    expect(passwordHasher.getCostFactor()).toBe(12);
  });
});

describe('Convenience functions', () => {
  describe('hashPassword', () => {
    it('should hash password using default instance', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should throw error for invalid password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('comparePassword', () => {
    it('should compare password using default instance', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const result = await comparePassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should throw error for invalid inputs', async () => {
      await expect(comparePassword('', 'hash')).rejects.toThrow('Password must be a non-empty string');
      await expect(comparePassword('password', '')).rejects.toThrow('Hashed password must be a non-empty string');
    });
  });

  describe('createPasswordHasher', () => {
    it('should create new hasher with default config', () => {
      const hasher = createPasswordHasher();
      expect(hasher).toBeInstanceOf(PasswordHasher);
      expect(hasher.getCostFactor()).toBe(12);
    });

    it('should create new hasher with custom config', () => {
      const hasher = createPasswordHasher({ costFactor: 6 });
      expect(hasher).toBeInstanceOf(PasswordHasher);
      expect(hasher.getCostFactor()).toBe(6);
    });

    it('should create independent instances', () => {
      const hasher1 = createPasswordHasher({ costFactor: 8 });
      const hasher2 = createPasswordHasher({ costFactor: 10 });
      
      expect(hasher1.getCostFactor()).toBe(8);
      expect(hasher2.getCostFactor()).toBe(10);
    });
  });
});

describe('Integration scenarios', () => {
  it('should handle complete hash and verify workflow', async () => {
    const hasher = new PasswordHasher({ costFactor: 4 });
    const password = 'userPassword123!';
    
    const hash = await hasher.hash(password);
    const isValid = await hasher.compare(password, hash);
    const isInvalid = await hasher.compare('wrongPassword', hash);
    
    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('should work with different cost factors', async () => {
    const hasher1 = new PasswordHasher({ costFactor: 4 });
    const hasher2 = new PasswordHasher({ costFactor: 6 });
    
    const password = 'testPassword';
    const hash1 = await hasher1.hash(password);
    const hash2 = await hasher2.hash(password);
    
    expect(await hasher1.compare(password, hash1)).toBe(true);
    expect(await hasher2.compare(password, hash2)).toBe(true);
    expect(await hasher1.compare(password, hash2)).toBe(true);
    expect(await hasher2.compare(password, hash1)).toBe(true);
  });

  it('should handle multiple sequential operations', async () => {
    const hasher = new PasswordHasher({ costFactor: 4 });
    const passwords = ['pass1', 'pass2', 'pass3'];
    
    const hashes = await Promise.all(passwords.map(p => hasher.hash(p)));
    
    for (let i = 0; i < passwords.length; i++) {
      expect(await hasher.compare(passwords[i], hashes[i])).toBe(true);
    }
  });
});
