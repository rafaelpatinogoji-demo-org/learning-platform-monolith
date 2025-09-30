/**
 * Tests for AuthValidator
 * 
 * Pure unit tests for authentication input validation
 * without any external dependencies or database calls.
 */

import { AuthValidator } from '../../src/utils/validation';

describe('AuthValidator', () => {
  describe('validateRegister', () => {
    describe('Valid registration data', () => {
      it('should return valid for correct registration data with all fields', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: 'student'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid for registration data without optional role', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept admin role', () => {
        const validData = {
          email: 'admin@example.com',
          password: 'adminpass',
          name: 'Admin User',
          role: 'admin'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept instructor role', () => {
        const validData = {
          email: 'instructor@example.com',
          password: 'instructorpass',
          name: 'Instructor User',
          role: 'instructor'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept student role', () => {
        const validData = {
          email: 'student@example.com',
          password: 'studentpass',
          name: 'Student User',
          role: 'student'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Email validation', () => {
      it('should return error for missing email', () => {
        const invalidData = {
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for null email', () => {
        const invalidData = {
          email: null,
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for undefined email', () => {
        const invalidData = {
          email: undefined,
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for non-string email', () => {
        const invalidData = {
          email: 12345,
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for invalid email format - no @', () => {
        const invalidData = {
          email: 'notanemail.com',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
        });
      });

      it('should return error for invalid email format - no domain', () => {
        const invalidData = {
          email: 'user@',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
        });
      });

      it('should return error for invalid email format - no TLD', () => {
        const invalidData = {
          email: 'user@domain',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
        });
      });

      it('should return error for invalid email format - spaces', () => {
        const invalidData = {
          email: 'user @example.com',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
        });
      });

      it('should accept valid email with subdomain', () => {
        const validData = {
          email: 'user@mail.example.com',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept valid email with plus sign', () => {
        const validData = {
          email: 'user+tag@example.com',
          password: 'password123',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Password validation', () => {
      it('should return error for missing password', () => {
        const invalidData = {
          email: 'user@example.com',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for null password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: null,
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for undefined password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: undefined,
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for non-string password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 12345678,
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for password with less than 6 characters', () => {
        const invalidData = {
          email: 'user@example.com',
          password: '12345',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must be at least 6 characters long'
        });
      });

      it('should return error for empty password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: '',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should accept password with exactly 6 characters', () => {
        const validData = {
          email: 'user@example.com',
          password: '123456',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password with special characters', () => {
        const validData = {
          email: 'user@example.com',
          password: 'p@ssw0rd!',
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept long password', () => {
        const validData = {
          email: 'user@example.com',
          password: 'a'.repeat(100),
          name: 'John Doe'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Name validation', () => {
      it('should return error for missing name', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'name',
          message: 'Name is required and must be a string'
        });
      });

      it('should return error for null name', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: null
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'name',
          message: 'Name is required and must be a string'
        });
      });

      it('should return error for undefined name', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: undefined
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'name',
          message: 'Name is required and must be a string'
        });
      });

      it('should return error for non-string name', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: 12345
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'name',
          message: 'Name is required and must be a string'
        });
      });

      it('should return error for empty name after trim', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: '   '
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'name',
          message: 'Name cannot be empty'
        });
      });

      it('should accept name with leading/trailing spaces', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: '  John Doe  '
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept name with special characters', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: "John O'Doe-Smith Jr."
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept name with unicode characters', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'José García'
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Role validation', () => {
      it('should return error for invalid role', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: 'superuser'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'role',
          message: 'Invalid role. Must be admin, instructor, or student'
        });
      });

      it('should return error for empty string role', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: ''
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'role',
          message: 'Invalid role. Must be admin, instructor, or student'
        });
      });

      it('should return error for numeric role', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: 123
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'role',
          message: 'Invalid role. Must be admin, instructor, or student'
        });
      });

      it('should allow undefined role', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: undefined
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow null role', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          name: 'John Doe',
          role: null
        };

        const result = AuthValidator.validateRegister(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Multiple errors', () => {
      it('should return multiple errors for multiple invalid fields', () => {
        const invalidData = {
          email: 'invalid-email',
          password: '123',
          name: '   ',
          role: 'invalid-role'
        };

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
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
          message: 'Invalid role. Must be admin, instructor, or student'
        });
      });

      it('should return all required field errors when all missing', () => {
        const invalidData = {};

        const result = AuthValidator.validateRegister(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
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
  });

  describe('validateLogin', () => {
    describe('Valid login data', () => {
      it('should return valid for correct login data', () => {
        const validData = {
          email: 'user@example.com',
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid for login with any email format', () => {
        const validData = {
          email: 'user@mail.example.com',
          password: 'anypassword'
        };

        const result = AuthValidator.validateLogin(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid for login with any password length', () => {
        const validData = {
          email: 'user@example.com',
          password: '1'
        };

        const result = AuthValidator.validateLogin(validData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Email validation', () => {
      it('should return error for missing email', () => {
        const invalidData = {
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for null email', () => {
        const invalidData = {
          email: null,
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for undefined email', () => {
        const invalidData = {
          email: undefined,
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for non-string email', () => {
        const invalidData = {
          email: 12345,
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });

      it('should return error for empty string email', () => {
        const invalidData = {
          email: '',
          password: 'password123'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
      });
    });

    describe('Password validation', () => {
      it('should return error for missing password', () => {
        const invalidData = {
          email: 'user@example.com'
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for null password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: null
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for undefined password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: undefined
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for non-string password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: 12345678
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return error for empty string password', () => {
        const invalidData = {
          email: 'user@example.com',
          password: ''
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });
    });

    describe('Multiple errors', () => {
      it('should return multiple errors when both fields are missing', () => {
        const invalidData = {};

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });

      it('should return multiple errors when both fields are invalid', () => {
        const invalidData = {
          email: 12345,
          password: null
        };

        const result = AuthValidator.validateLogin(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required and must be a string'
        });
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required and must be a string'
        });
      });
    });
  });
});
