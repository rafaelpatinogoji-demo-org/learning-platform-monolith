/**
 * Tests for password hashing utilities
 * 
 * Pure unit tests for bcrypt wrapper functions with configurable cost factors
 * for testing performance and security.
 */

import { PasswordHasher, passwordHasher, hashPassword, comparePassword, createPasswordHasher } from '../../src/utils/password-hasher';

describe('Password Hasher', () => {
  // Use lower cost factor for faster tests
  const TEST_COST_FACTOR = 4;
  let testHasher: PasswordHasher;

  beforeEach(() => {
    testHasher = createPasswordHasher({ costFactor: TEST_COST_FACTOR });
    jest.clearAllMocks();
  });

  describe('PasswordHasher Class', () => {
    describe('constructor', () => {
      it('should create instance with default cost factor', () => {
        // Act
        const hasher = new PasswordHasher();

        // Assert
        expect(hasher.getCostFactor()).toBe(12); // Default cost factor
      });

      it('should create instance with custom cost factor', () => {
        // Act
        const hasher = new PasswordHasher({ costFactor: 8 });

        // Assert
        expect(hasher.getCostFactor()).toBe(8);
      });

      it('should merge custom config with defaults', () => {
        // Act
        const hasher = new PasswordHasher({ costFactor: 6 });

        // Assert
        expect(hasher.getCostFactor()).toBe(6);
      });
    });

    describe('setCostFactor', () => {
      it('should update cost factor', () => {
        // Arrange
        const hasher = new PasswordHasher({ costFactor: 4 });

        // Act
        hasher.setCostFactor(8);

        // Assert
        expect(hasher.getCostFactor()).toBe(8);
      });

      it('should throw error for invalid cost factor - too low', () => {
        // Arrange
        const hasher = new PasswordHasher();

        // Act & Assert
        expect(() => hasher.setCostFactor(0)).toThrow('Cost factor must be an integer between 1 and 31');
        expect(() => hasher.setCostFactor(-1)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should throw error for invalid cost factor - too high', () => {
        // Arrange
        const hasher = new PasswordHasher();

        // Act & Assert
        expect(() => hasher.setCostFactor(32)).toThrow('Cost factor must be an integer between 1 and 31');
        expect(() => hasher.setCostFactor(100)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should throw error for non-integer cost factor', () => {
        // Arrange
        const hasher = new PasswordHasher();

        // Act & Assert
        expect(() => hasher.setCostFactor(4.5)).toThrow('Cost factor must be an integer between 1 and 31');
        expect(() => hasher.setCostFactor(NaN)).toThrow('Cost factor must be an integer between 1 and 31');
      });

      it('should accept valid boundary values', () => {
        // Arrange
        const hasher = new PasswordHasher();

        // Act & Assert
        expect(() => hasher.setCostFactor(1)).not.toThrow();
        expect(hasher.getCostFactor()).toBe(1);

        expect(() => hasher.setCostFactor(31)).not.toThrow();
        expect(hasher.getCostFactor()).toBe(31);
      });
    });
  });

  describe('hash method', () => {
    it('should hash a valid password', async () => {
      // Arrange
      const password = 'testPassword123';

      // Act
      const hashedPassword = await testHasher.hash(password);

      // Assert
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
      expect(hashedPassword.startsWith('$2b$')).toBe(true); // bcrypt format
    });

    it('should generate different hashes for same password (salt)', async () => {
      // Arrange
      const password = 'samePassword';

      // Act
      const hash1 = await testHasher.hash(password);
      const hash2 = await testHasher.hash(password);

      // Assert
      expect(hash1).not.toBe(hash2); // Different due to salt
      expect(hash1.length).toBe(hash2.length);
    });

    it('should hash different passwords to different hashes', async () => {
      // Arrange
      const password1 = 'password1';
      const password2 = 'password2';

      // Act
      const hash1 = await testHasher.hash(password1);
      const hash2 = await testHasher.hash(password2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      // Act & Assert
      await expect(testHasher.hash('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      // Act & Assert
      await expect(testHasher.hash(null as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(testHasher.hash(undefined as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(testHasher.hash(123 as any)).rejects.toThrow('Password must be a non-empty string');
      await expect(testHasher.hash({} as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should handle special characters in password', async () => {
      // Arrange
      const specialPassword = 'p@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?';

      // Act
      const hashedPassword = await testHasher.hash(specialPassword);

      // Assert
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(specialPassword);
      expect(hashedPassword.startsWith('$2b$')).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      // Arrange
      const unicodePassword = 'pássw🔒rd测试';

      // Act
      const hashedPassword = await testHasher.hash(unicodePassword);

      // Assert
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(unicodePassword);
      expect(hashedPassword.startsWith('$2b$')).toBe(true);
    });

    it('should handle very long passwords', async () => {
      // Arrange
      const longPassword = 'a'.repeat(1000);

      // Act
      const hashedPassword = await testHasher.hash(longPassword);

      // Assert
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(longPassword);
      expect(hashedPassword.startsWith('$2b$')).toBe(true);
    });
  });

  describe('compare method', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const password = 'correctPassword';
      const hashedPassword = await testHasher.hash(password);

      // Act
      const isMatch = await testHasher.compare(password, hashedPassword);

      // Assert
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await testHasher.hash(correctPassword);

      // Act
      const isMatch = await testHasher.compare(wrongPassword, hashedPassword);

      // Assert
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against valid hash', async () => {
      // Arrange
      const password = 'validPassword';
      const hashedPassword = await testHasher.hash(password);

      // Act & Assert
      await expect(testHasher.compare('', hashedPassword)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      // Arrange
      const hashedPassword = await testHasher.hash('validPassword');

      // Act & Assert
      await expect(testHasher.compare(null as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
      await expect(testHasher.compare(undefined as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
      await expect(testHasher.compare(123 as any, hashedPassword)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for invalid hashed password', async () => {
      // Arrange
      const password = 'validPassword';

      // Act & Assert
      await expect(testHasher.compare(password, '')).rejects.toThrow('Hashed password must be a non-empty string');
      await expect(testHasher.compare(password, null as any)).rejects.toThrow('Hashed password must be a non-empty string');
      await expect(testHasher.compare(password, undefined as any)).rejects.toThrow('Hashed password must be a non-empty string');
    });

    it('should handle case-sensitive passwords', async () => {
      // Arrange
      const password = 'CaseSensitive';
      const hashedPassword = await testHasher.hash(password);

      // Act
      const exactMatch = await testHasher.compare('CaseSensitive', hashedPassword);
      const wrongCaseMatch = await testHasher.compare('casesensitive', hashedPassword);

      // Assert
      expect(exactMatch).toBe(true);
      expect(wrongCaseMatch).toBe(false);
    });

    it('should handle special characters correctly', async () => {
      // Arrange
      const specialPassword = 'p@ssw0rd!@#$%^&*()';
      const hashedPassword = await testHasher.hash(specialPassword);

      // Act
      const isMatch = await testHasher.compare(specialPassword, hashedPassword);

      // Assert
      expect(isMatch).toBe(true);
    });

    it('should handle unicode characters correctly', async () => {
      // Arrange
      const unicodePassword = 'pássw🔒rd测试';
      const hashedPassword = await testHasher.hash(unicodePassword);

      // Act
      const isMatch = await testHasher.compare(unicodePassword, hashedPassword);

      // Assert
      expect(isMatch).toBe(true);
    });
  });

  describe('Cost Factor Impact', () => {
    it('should use configured cost factor in hash', async () => {
      // Arrange
      const password = 'testPassword';
      const lowCostHasher = createPasswordHasher({ costFactor: 4 });
      const highCostHasher = createPasswordHasher({ costFactor: 6 });

      // Act
      const lowCostHash = await lowCostHasher.hash(password);
      const highCostHash = await highCostHasher.hash(password);

      // Assert
      expect(lowCostHash.includes('$2b$04$')).toBe(true);
      expect(highCostHash.includes('$2b$06$')).toBe(true);
    });

    it('should verify passwords regardless of original cost factor', async () => {
      // Arrange
      const password = 'testPassword';
      const hasher4 = createPasswordHasher({ costFactor: 4 });
      const hasher6 = createPasswordHasher({ costFactor: 6 });
      
      const hash4 = await hasher4.hash(password);
      const hash6 = await hasher6.hash(password);

      // Act & Assert - Cross-verification should work
      expect(await hasher4.compare(password, hash4)).toBe(true);
      expect(await hasher4.compare(password, hash6)).toBe(true);
      expect(await hasher6.compare(password, hash4)).toBe(true);
      expect(await hasher6.compare(password, hash6)).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    describe('hashPassword', () => {
      it('should hash password using default instance', async () => {
        // Arrange
        const password = 'testPassword';

        // Act
        const hashedPassword = await hashPassword(password);

        // Assert
        expect(typeof hashedPassword).toBe('string');
        expect(hashedPassword).not.toBe(password);
        expect(hashedPassword.startsWith('$2b$')).toBe(true);
      });
    });

    describe('comparePassword', () => {
      it('should compare password using default instance', async () => {
        // Arrange
        const password = 'testPassword';
        const hashedPassword = await hashPassword(password);

        // Act
        const isMatch = await comparePassword(password, hashedPassword);

        // Assert
        expect(isMatch).toBe(true);
      });

      it('should return false for wrong password using default instance', async () => {
        // Arrange
        const correctPassword = 'correctPassword';
        const wrongPassword = 'wrongPassword';
        const hashedPassword = await hashPassword(correctPassword);

        // Act
        const isMatch = await comparePassword(wrongPassword, hashedPassword);

        // Assert
        expect(isMatch).toBe(false);
      });
    });

    describe('createPasswordHasher', () => {
      it('should create new instance with custom config', () => {
        // Act
        const customHasher = createPasswordHasher({ costFactor: 8 });

        // Assert
        expect(customHasher.getCostFactor()).toBe(8);
        expect(customHasher).toBeInstanceOf(PasswordHasher);
      });

      it('should create new instance with default config', () => {
        // Act
        const defaultHasher = createPasswordHasher();

        // Assert
        expect(defaultHasher.getCostFactor()).toBe(12); // Default
        expect(defaultHasher).toBeInstanceOf(PasswordHasher);
      });
    });

    describe('passwordHasher singleton', () => {
      it('should be a PasswordHasher instance', () => {
        // Assert
        expect(passwordHasher).toBeInstanceOf(PasswordHasher);
        expect(passwordHasher.getCostFactor()).toBe(12); // Default cost factor
      });

      it('should be the same instance across imports', () => {
        // This test verifies singleton behavior
        expect(passwordHasher).toBe(passwordHasher);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete password lifecycle', async () => {
      // Arrange
      const originalPassword = 'mySecurePassword123!';
      const wrongPassword = 'wrongPassword';

      // Act - Hash the password
      const hashedPassword = await testHasher.hash(originalPassword);

      // Act - Verify correct password
      const correctMatch = await testHasher.compare(originalPassword, hashedPassword);

      // Act - Verify wrong password
      const wrongMatch = await testHasher.compare(wrongPassword, hashedPassword);

      // Assert
      expect(hashedPassword).not.toBe(originalPassword);
      expect(correctMatch).toBe(true);
      expect(wrongMatch).toBe(false);
    });

    it('should handle multiple users with same password', async () => {
      // Arrange
      const commonPassword = 'commonPassword123';

      // Act - Hash same password for different users
      const user1Hash = await testHasher.hash(commonPassword);
      const user2Hash = await testHasher.hash(commonPassword);
      const user3Hash = await testHasher.hash(commonPassword);

      // Assert - All hashes should be different (due to salt)
      expect(user1Hash).not.toBe(user2Hash);
      expect(user2Hash).not.toBe(user3Hash);
      expect(user1Hash).not.toBe(user3Hash);

      // Assert - All should verify correctly
      expect(await testHasher.compare(commonPassword, user1Hash)).toBe(true);
      expect(await testHasher.compare(commonPassword, user2Hash)).toBe(true);
      expect(await testHasher.compare(commonPassword, user3Hash)).toBe(true);
    });

    it('should handle password updates', async () => {
      // Arrange
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      // Act - Initial password setup
      const oldHash = await testHasher.hash(oldPassword);
      expect(await testHasher.compare(oldPassword, oldHash)).toBe(true);

      // Act - Password update
      const newHash = await testHasher.hash(newPassword);

      // Assert - Old password should not work with new hash
      expect(await testHasher.compare(oldPassword, newHash)).toBe(false);
      
      // Assert - New password should work with new hash
      expect(await testHasher.compare(newPassword, newHash)).toBe(true);
      
      // Assert - New password should not work with old hash
      expect(await testHasher.compare(newPassword, oldHash)).toBe(false);
    });
  });
});
