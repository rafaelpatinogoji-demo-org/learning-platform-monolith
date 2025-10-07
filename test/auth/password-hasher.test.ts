import bcrypt from 'bcrypt';
import {
  PasswordHasher,
  passwordHasher,
  hashPassword,
  comparePassword,
  createPasswordHasher
} from '../../src/utils/password-hasher';

jest.mock('bcrypt');

describe('PasswordHasher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PasswordHasher class', () => {
    describe('constructor', () => {
      it('should create instance with default cost factor', () => {
        const hasher = new PasswordHasher();
        expect(hasher.getCostFactor()).toBe(12);
      });

      it('should create instance with custom cost factor', () => {
        const hasher = new PasswordHasher({ costFactor: 10 });
        expect(hasher.getCostFactor()).toBe(10);
      });
    });

    describe('hash', () => {
      it('should hash a valid password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const hashedPassword = '$2b$12$hashedpassword';
        
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

        const result = await hasher.hash(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(hashedPassword);
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
    });

    describe('compare', () => {
      it('should return true for matching passwords', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';
        const hashedPassword = '$2b$12$hashedpassword';
        
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await hasher.compare(password, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(true);
      });

      it('should return false for non-matching passwords', async () => {
        const hasher = new PasswordHasher();
        const password = 'wrongPassword';
        const hashedPassword = '$2b$12$hashedpassword';
        
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await hasher.compare(password, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(false);
      });

      it('should throw error for empty password', async () => {
        const hasher = new PasswordHasher();
        const hashedPassword = '$2b$12$hashedpassword';

        await expect(hasher.compare('', hashedPassword)).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for non-string password', async () => {
        const hasher = new PasswordHasher();
        const hashedPassword = '$2b$12$hashedpassword';

        await expect(hasher.compare(null as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
        await expect(hasher.compare(123 as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
      });

      it('should throw error for empty hashed password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';

        await expect(hasher.compare(password, '')).rejects.toThrow('Hashed password must be a non-empty string');
      });

      it('should throw error for non-string hashed password', async () => {
        const hasher = new PasswordHasher();
        const password = 'mySecurePassword123';

        await expect(hasher.compare(password, null as any)).rejects.toThrow('Hashed password must be a non-empty string');
        await expect(hasher.compare(password, 123 as any)).rejects.toThrow('Hashed password must be a non-empty string');
      });
    });

    describe('getCostFactor', () => {
      it('should return the current cost factor', () => {
        const hasher = new PasswordHasher({ costFactor: 10 });
        expect(hasher.getCostFactor()).toBe(10);
      });
    });

    describe('setCostFactor', () => {
      it('should update the cost factor', () => {
        const hasher = new PasswordHasher({ costFactor: 10 });
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

  describe('default instance', () => {
    it('should export a default password hasher instance', () => {
      expect(passwordHasher).toBeInstanceOf(PasswordHasher);
      expect(passwordHasher.getCostFactor()).toBe(12);
    });
  });

  describe('convenience functions', () => {
    describe('hashPassword', () => {
      it('should hash password using default instance', async () => {
        const password = 'mySecurePassword123';
        const hashedPassword = '$2b$12$hashedpassword';
        
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

        const result = await hashPassword(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(hashedPassword);
      });
    });

    describe('comparePassword', () => {
      it('should compare password using default instance', async () => {
        const password = 'mySecurePassword123';
        const hashedPassword = '$2b$12$hashedpassword';
        
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await comparePassword(password, hashedPassword);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(true);
      });
    });
  });

  describe('createPasswordHasher', () => {
    it('should create new instance with default config', () => {
      const hasher = createPasswordHasher();
      expect(hasher).toBeInstanceOf(PasswordHasher);
      expect(hasher.getCostFactor()).toBe(12);
    });

    it('should create new instance with custom config', () => {
      const hasher = createPasswordHasher({ costFactor: 4 });
      expect(hasher).toBeInstanceOf(PasswordHasher);
      expect(hasher.getCostFactor()).toBe(4);
    });
  });
});
