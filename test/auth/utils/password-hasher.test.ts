import { PasswordHasher, createPasswordHasher, hashPassword, comparePassword } from '../../../src/utils/password-hasher';

describe('Password Hasher', () => {
  describe('PasswordHasher class', () => {
    describe('hash()', () => {
      it('should hash a password successfully', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const hashed = await hasher.hash(password);

        expect(hashed).toBeDefined();
        expect(typeof hashed).toBe('string');
        expect(hashed).not.toBe(password);
        expect(hashed.startsWith('$2b$')).toBe(true);
      });

      it('should produce different hashes for same password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const hash1 = await hasher.hash(password);
        const hash2 = await hasher.hash(password);

        expect(hash1).not.toBe(hash2);
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

      it('should use default cost factor of 12', async () => {
        const hasher = new PasswordHasher();
        const password = 'testPassword';
        const hashed = await hasher.hash(password);

        expect(hashed.substring(4, 6)).toBe('12');
      });

      it('should use custom cost factor when provided', async () => {
        const hasher = new PasswordHasher({ costFactor: 10 });
        const password = 'testPassword';
        const hashed = await hasher.hash(password);

        expect(hashed.substring(4, 6)).toBe('10');
      });
    });

    describe('compare()', () => {
      it('should return true for correct password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const hashed = await hasher.hash(password);
        const isMatch = await hasher.compare(password, hashed);

        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const wrongPassword = 'wrongPassword456';
        const hashed = await hasher.hash(password);
        const isMatch = await hasher.compare(wrongPassword, hashed);

        expect(isMatch).toBe(false);
      });

      it('should throw error for empty password', async () => {
        const hasher = new PasswordHasher();
        const hashed = await hasher.hash('password');

        await expect(hasher.compare('', hashed)).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for non-string password', async () => {
        const hasher = new PasswordHasher();
        const hashed = await hasher.hash('password');

        await expect(hasher.compare(null as any, hashed)).rejects.toThrow('Password must be a non-empty string');
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

    describe('getCostFactor()', () => {
      it('should return default cost factor', () => {
        const hasher = new PasswordHasher();

        expect(hasher.getCostFactor()).toBe(12);
      });

      it('should return custom cost factor', () => {
        const hasher = new PasswordHasher({ costFactor: 10 });

        expect(hasher.getCostFactor()).toBe(10);
      });
    });

    describe('setCostFactor()', () => {
      it('should update cost factor', () => {
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
      });

      it('should throw error for cost factor above 31', () => {
        const hasher = new PasswordHasher();

        expect(() => hasher.setCostFactor(32)).toThrow('Cost factor must be an integer between 1 and 31');
      });
    });
  });

  describe('Convenience functions', () => {
    it('hashPassword should work with default instance', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed.startsWith('$2b$')).toBe(true);
    });

    it('comparePassword should work with default instance', async () => {
      const password = 'testPassword123';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);

      expect(isMatch).toBe(true);
    });

    it('createPasswordHasher should create new instance with custom config', () => {
      const hasher = createPasswordHasher({ costFactor: 8 });

      expect(hasher.getCostFactor()).toBe(8);
    });
  });
});
