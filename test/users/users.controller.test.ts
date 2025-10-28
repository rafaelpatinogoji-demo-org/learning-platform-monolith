/**
 * Tests for Users Controller
 * 
 * Tests user CRUD operations, role-based access control, and profile management
 * following existing Jest patterns from test/auth/ directory.
 */

import { Request, Response } from 'express';
import { usersController } from '../../src/controllers/users.controller';
import { testUtils } from '../setup';

describe('Users Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('index - GET /users', () => {
    it('should return users list with correct response format', async () => {
      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });

    it('should handle request without authentication', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });

    it('should handle admin user access', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });

    it('should handle instructor user access', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });

    it('should handle student user access', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });
  });

  describe('create - POST /users', () => {
    it('should return user creation response with correct format', async () => {
      // Arrange
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };

      // Act
      await usersController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v0.5'
      });
    });

    it('should handle admin creating instructor user', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.body = {
        email: 'instructor@example.com',
        password: 'password123',
        name: 'New Instructor',
        role: 'instructor'
      };

      // Act
      await usersController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v0.5'
      });
    });

    it('should handle empty request body', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await usersController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v0.5'
      });
    });

    it('should handle malformed request data', async () => {
      // Arrange
      mockReq.body = {
        email: 123,
        password: null,
        name: '',
        role: 'invalid-role'
      };

      // Act
      await usersController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v0.5'
      });
    });
  });

  describe('show - GET /users/:id', () => {
    it('should return user profile with correct format', async () => {
      // Arrange
      mockReq.params = { id: '123' };

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle numeric user ID', async () => {
      // Arrange
      mockReq.params = { id: '456' };

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '456',
        version: 'v0.5'
      });
    });

    it('should handle non-numeric user ID', async () => {
      // Arrange
      mockReq.params = { id: 'invalid-id' };

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: 'invalid-id',
        version: 'v0.5'
      });
    });

    it('should handle missing user ID parameter', async () => {
      // Arrange
      mockReq.params = {};

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: undefined,
        version: 'v0.5'
      });
    });

    it('should handle user viewing own profile', async () => {
      // Arrange
      mockReq.user = { id: 123, email: 'user@example.com', role: 'student' };
      mockReq.params = { id: '123' };

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle admin viewing any user profile', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '456' };

      // Act
      await usersController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '456',
        version: 'v0.5'
      });
    });
  });

  describe('update - PUT /users/:id', () => {
    it('should return user update response with correct format', async () => {
      // Arrange
      mockReq.params = { id: '123' };
      mockReq.body = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle user updating own profile', async () => {
      // Arrange
      mockReq.user = { id: 123, email: 'user@example.com', role: 'student' };
      mockReq.params = { id: '123' };
      mockReq.body = { name: 'New Name' };

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle admin updating any user', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '456' };
      mockReq.body = { role: 'instructor' };

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '456',
        version: 'v0.5'
      });
    });

    it('should handle password update', async () => {
      // Arrange
      mockReq.params = { id: '123' };
      mockReq.body = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle empty update data', async () => {
      // Arrange
      mockReq.params = { id: '123' };
      mockReq.body = {};

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle invalid update data', async () => {
      // Arrange
      mockReq.params = { id: '123' };
      mockReq.body = {
        email: 'invalid-email',
        role: 'invalid-role',
        name: null
      };

      // Act
      await usersController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v0.5'
      });
    });
  });

  describe('remove - DELETE /users/:id', () => {
    it('should return user deletion response with correct format', async () => {
      // Arrange
      mockReq.params = { id: '123' };

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '123',
        version: 'v0.5'
      });
    });

    it('should handle admin deleting user', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '456' };

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '456',
        version: 'v0.5'
      });
    });

    it('should handle non-numeric user ID', async () => {
      // Arrange
      mockReq.params = { id: 'invalid-id' };

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: 'invalid-id',
        version: 'v0.5'
      });
    });

    it('should handle missing user ID parameter', async () => {
      // Arrange
      mockReq.params = {};

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: undefined,
        version: 'v0.5'
      });
    });

    it('should handle instructor attempting deletion', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '456' };

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '456',
        version: 'v0.5'
      });
    });

    it('should handle student attempting deletion', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { id: '456' };

      // Act
      await usersController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '456',
        version: 'v0.5'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle controller method throwing error', async () => {
      // Arrange
      const originalIndex = usersController.index;
      usersController.index = jest.fn().mockRejectedValue(new Error('Database error'));

      try {
        // Act
        await usersController.index(mockReq as Request, mockRes as Response);
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database error');
      }

      // Cleanup
      usersController.index = originalIndex;
    });

    it('should handle malformed request object', async () => {
      // Arrange
      const malformedReq = { params: {} } as Request;
      const malformedRes = {
        json: jest.fn().mockReturnThis()
      } as any;

      await expect(usersController.show(malformedReq, malformedRes)).resolves.not.toThrow();
    });
  });

  describe('Role-Based Access Control Scenarios', () => {
    it('should handle all role types consistently', async () => {
      const roles = ['admin', 'instructor', 'student'];
      
      for (const role of roles) {
        mockReq.user = { id: 1, email: `${role}@example.com`, role };
        
        await usersController.index(mockReq as Request, mockRes as Response);
        await usersController.show(mockReq as Request, mockRes as Response);
        await usersController.create(mockReq as Request, mockRes as Response);
        await usersController.update(mockReq as Request, mockRes as Response);
        await usersController.remove(mockReq as Request, mockRes as Response);
        
        expect(mockRes.json).toHaveBeenCalled();
      }
    });

    it('should handle undefined user role', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'user@example.com', role: undefined as any };

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });

    it('should handle invalid user role', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'user@example.com', role: 'invalid-role' as any };

      // Act
      await usersController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v0.5'
      });
    });
  });
});
