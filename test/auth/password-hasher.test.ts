import { 
  PasswordHasher, 
  hashPassword, 
  comparePassword, 
  createPasswordHasher,
  passwordHasher 
} from '../../src/utils/password-hasher';

describe('Password Hasher', () => {
  describe('PasswordHasher class', () => {
    it('should hash password and produce valid bcrypt hash (60 characters)', async () => {
      const hasher = new PasswordHasher();
      const password = 'TestPassword123!';
      const hash = await hasher.hash(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(60);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should successfully compare correct password', async () => {
      const hasher = new PasswordHasher();
      const password = 'TestPassword123!';
      const hash = await hasher.hash(password);
      
      const isMatch = await hasher.compare(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should fail comparison with incorrect password', async () => {
      const hasher = new PasswordHasher();
      const password = 'TestPassword123!';
      const hash = await hasher.hash(password);
      
      const isMatch = await hasher.compare('WrongPassword', hash);
      expect(isMatch).toBe(false);
    });

    it('should use default cost factor of 12', () => {
      const hasher = new PasswordHasher();
      expect(hasher.getCostFactor()).toBe(12);
    });

    it('should allow custom cost factor configuration', () => {
      const hasher = new PasswordHasher({ costFactor: 10 });
      expect(hasher.getCostFactor()).toBe(10);
    });

    it('should allow updating cost factor', () => {
      const hasher = new PasswordHasher();
      hasher.setCostFactor(8);
      expect(hasher.getCostFactor()).toBe(8);
    });

    it('should reject invalid cost factor (too low)', () => {
      const hasher = new PasswordHasher();
      expect(() => {
        hasher.setCostFactor(0);
      }).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should reject invalid cost factor (too high)', () => {
      const hasher = new PasswordHasher();
      expect(() => {
        hasher.setCostFactor(32);
      }).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should reject non-integer cost factor', () => {
      const hasher = new PasswordHasher();
      expect(() => {
        hasher.setCostFactor(10.5);
      }).toThrow('Cost factor must be an integer between 1 and 31');
    });

    it('should throw error for empty password in hash', async () => {
      const hasher = new PasswordHasher();
      await expect(hasher.hash('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password in hash', async () => {
      const hasher = new PasswordHasher();
      await expect(hasher.hash(null as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for empty password in compare', async () => {
      const hasher = new PasswordHasher();
      const hash = await hasher.hash('ValidPassword');
      await expect(hasher.compare('', hash)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for invalid hashed password in compare', async () => {
      const hasher = new PasswordHasher();
      await expect(hasher.compare('password', '')).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should produce different hashes for same password (salt)', async () => {
      const hasher = new PasswordHasher();
      const password = 'TestPassword123!';
      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);
      
      expect(hash1).not.toBe(hash2);
      expect(await hasher.compare(password, hash1)).toBe(true);
      expect(await hasher.compare(password, hash2)).toBe(true);
    });
  });

  describe('Convenience functions', () => {
    it('should hash password using default instance', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(60);
    });

    it('should compare password using default instance', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should create new hasher with custom config', () => {
      const hasher = createPasswordHasher({ costFactor: 8 });
      expect(hasher).toBeInstanceOf(PasswordHasher);
      expect(hasher.getCostFactor()).toBe(8);
    });

    it('should use shared passwordHasher instance', () => {
      expect(passwordHasher).toBeInstanceOf(PasswordHasher);
      expect(passwordHasher.getCostFactor()).toBe(12);
    });
  });

  describe('Performance with different cost factors', () => {
    it('should hash faster with lower cost factor', async () => {
      const password = 'TestPassword123!';
      const lowCostHasher = createPasswordHasher({ costFactor: 4 });
      const highCostHasher = createPasswordHasher({ costFactor: 10 });
      
      const startLow = Date.now();
      await lowCostHasher.hash(password);
      const lowTime = Date.now() - startLow;
      
      const startHigh = Date.now();
      await highCostHasher.hash(password);
      const highTime = Date.now() - startHigh;
      
      expect(lowTime).toBeLessThan(highTime * 2);
    });
  });
});
