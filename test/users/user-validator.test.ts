/**
 * Tests for UserValidator
 * 
 * Tests input validation for user creation and update operations
 * following the established validation patterns.
 */

import { UserValidator } from '../../src/utils/validation';

describe('UserValidator', () => {
  describe('validateCreateUser', () => {
    it('should validate valid user creation data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'student'
      };

      const result = UserValidator.validateCreateUser(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require email field', () => {
      const invalidData = {
        password: 'password123',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email is required and must be a string'
      });
    });

    it('should validate email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email must be a valid email address'
      });
    });

    it('should validate various invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain',
        'spaces @domain.com',
        'double@@domain.com'
      ];

      invalidEmails.forEach(email => {
        const invalidData = {
          email,
          password: 'password123',
          name: 'Test User'
        };

        const result = UserValidator.validateCreateUser(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email must be a valid email address'
        });
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const validData = {
          email,
          password: 'password123',
          name: 'Test User'
        };

        const result = UserValidator.validateCreateUser(validData);
        expect(result.isValid).toBe(true);
      });
    });

    it('should require password field', () => {
      const invalidData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password is required and must be a string'
      });
    });

    it('should validate password length', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must be at least 6 characters long'
      });
    });

    it('should accept password with exactly 6 characters', () => {
      const validData = {
        email: 'test@example.com',
        password: '123456',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(validData);
      expect(result.isValid).toBe(true);
    });

    it('should require name field', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name is required and must be a string'
      });
    });

    it('should not allow empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: '   '
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name cannot be empty'
      });
    });

    it('should validate name length', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(256)
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name must be 255 characters or less'
      });
    });

    it('should accept name with exactly 255 characters', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(255)
      };

      const result = UserValidator.validateCreateUser(validData);
      expect(result.isValid).toBe(true);
    });

    it('should validate role values', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'invalid-role'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'role',
        message: 'Role must be one of: admin, instructor, student'
      });
    });

    it('should allow valid roles', () => {
      const roles = ['admin', 'instructor', 'student'];

      roles.forEach(role => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          role
        };

        const result = UserValidator.validateCreateUser(validData);
        expect(result.isValid).toBe(true);
      });
    });

    it('should allow undefined role (defaults to student)', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const result = UserValidator.validateCreateUser(validData);
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple errors at once', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        name: '',
        role: 'invalid-role'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email must be a valid email address'
      });
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must be at least 6 characters long'
      });
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name cannot be empty'
      });
      expect(result.errors).toContainEqual({
        field: 'role',
        message: 'Role must be one of: admin, instructor, student'
      });
    });

    it('should validate field types', () => {
      const invalidData = {
        email: 123,
        password: true,
        name: null,
        role: 'student'
      };

      const result = UserValidator.validateCreateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email is required and must be a string'
      });
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password is required and must be a string'
      });
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name is required and must be a string'
      });
    });
  });

  describe('validateUpdateUser', () => {
    it('should validate valid update data', () => {
      const validData = {
        email: 'updated@example.com',
        name: 'Updated Name'
      };

      const result = UserValidator.validateUpdateUser(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow partial updates', () => {
      const validData = {
        name: 'Updated Name'
      };

      const result = UserValidator.validateUpdateUser(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty update data', () => {
      const validData = {};

      const result = UserValidator.validateUpdateUser(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email format when provided', () => {
      const invalidData = {
        email: 'invalid-email'
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email must be a valid email address'
      });
    });

    it('should validate email type when provided', () => {
      const invalidData = {
        email: 123
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Email must be a string'
      });
    });

    it('should validate password length when provided', () => {
      const invalidData = {
        password: '123'
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must be at least 6 characters long'
      });
    });

    it('should validate password type when provided', () => {
      const invalidData = {
        password: 123
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must be a string'
      });
    });

    it('should validate name when provided', () => {
      const invalidData = {
        name: ''
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name cannot be empty'
      });
    });

    it('should validate name type when provided', () => {
      const invalidData = {
        name: 123
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name must be a string'
      });
    });

    it('should validate name length when provided', () => {
      const invalidData = {
        name: 'a'.repeat(256)
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Name must be 255 characters or less'
      });
    });

    it('should validate role when provided', () => {
      const invalidData = {
        role: 'invalid-role'
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'role',
        message: 'Role must be one of: admin, instructor, student'
      });
    });

    it('should allow valid roles when provided', () => {
      const roles = ['admin', 'instructor', 'student'];

      roles.forEach(role => {
        const validData = {
          role
        };

        const result = UserValidator.validateUpdateUser(validData);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate multiple update fields', () => {
      const validData = {
        email: 'updated@example.com',
        password: 'newpassword123',
        name: 'Updated Name',
        role: 'instructor'
      };

      const result = UserValidator.validateUpdateUser(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple errors in update', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        name: '',
        role: 'invalid-role'
      };

      const result = UserValidator.validateUpdateUser(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });
});
