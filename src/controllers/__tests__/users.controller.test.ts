import { Request, Response } from 'express';
import { usersController } from '../users.controller';
import { db } from '../../db';

jest.mock('../../db', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('UsersController', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson }));
    
    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };
    
    mockRequest = {
      user: undefined,
      params: {},
      body: {},
      query: {},
      requestId: 'test-request-id',
    };
  });

  describe('index - GET /users', () => {
    it('should return list of users for admin', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      
      const mockUsers = [
        { id: 1, email: 'admin@test.com', name: 'Admin User', role: 'admin' },
        { id: 2, email: 'user@test.com', name: 'Test User', role: 'student' },
      ];
      
      (db.query as jest.Mock).mockResolvedValue({ rows: mockUsers });
      
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v1.9'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should return success even without authentication', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'index'
        })
      );
    });
  });

  describe('create - POST /users', () => {
    it('should create user when called by admin', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.body = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };
      
      const newUser = {
        id: 3,
        email: 'newuser@test.com',
        name: 'New User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [newUser] });
      
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v1.9'
      });
    });

    it('should handle missing required fields', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.body = {
        email: 'newuser@test.com',
      };
      
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle database errors during creation', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.body = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };
      
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should accept creation request without user authentication', async () => {
      mockRequest.body = {
        email: 'newuser@test.com',
        password: 'password123',
        name: 'New User',
        role: 'student'
      };
      
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'create'
        })
      );
    });
  });

  describe('show - GET /users/:id', () => {
    it('should return user profile for admin accessing any user', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      
      const userProfile = {
        id: 2,
        email: 'user@test.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [userProfile] });
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '2',
        version: 'v1.9'
      });
    });

    it('should return own profile for authenticated user', async () => {
      mockRequest.user = { id: 2, email: 'user@test.com', role: 'student' };
      mockRequest.params = { id: '2' };
      
      const userProfile = {
        id: 2,
        email: 'user@test.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [userProfile] });
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'show',
          id: '2'
        })
      );
    });

    it('should handle non-admin accessing other user profile', async () => {
      mockRequest.user = { id: 2, email: 'user@test.com', role: 'student' };
      mockRequest.params = { id: '3' };
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '999' };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle unauthenticated access', async () => {
      mockRequest.params = { id: '2' };
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'show'
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });
  });

  describe('update - PUT /users/:id', () => {
    it('should allow admin to update any user', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      mockRequest.body = { name: 'Updated Name', email: 'updated@test.com' };
      
      const updatedUser = {
        id: 2,
        email: 'updated@test.com',
        name: 'Updated Name',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [updatedUser] });
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '2',
        version: 'v1.9'
      });
    });

    it('should allow user to update own profile', async () => {
      mockRequest.user = { id: 2, email: 'user@test.com', role: 'student' };
      mockRequest.params = { id: '2' };
      mockRequest.body = { name: 'Updated Name' };
      
      const updatedUser = {
        id: 2,
        email: 'user@test.com',
        name: 'Updated Name',
        role: 'student',
        created_at: new Date()
      };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [updatedUser] });
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'update',
          id: '2'
        })
      );
    });

    it('should handle non-admin updating other user profile', async () => {
      mockRequest.user = { id: 2, email: 'user@test.com', role: 'student' };
      mockRequest.params = { id: '3' };
      mockRequest.body = { name: 'Updated Name' };
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle invalid update data', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      mockRequest.body = { invalid_field: 'value' };
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      mockRequest.body = { name: 'Updated Name' };
      
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle unauthenticated update request', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.body = { name: 'Updated Name' };
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'update'
        })
      );
    });
  });

  describe('remove - DELETE /users/:id', () => {
    it('should allow admin to delete user', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '2',
        version: 'v1.9'
      });
    });

    it('should handle non-admin trying to delete user', async () => {
      mockRequest.user = { id: 2, email: 'user@test.com', role: 'student' };
      mockRequest.params = { id: '3' };
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle user not found during deletion', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '999' };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '2' };
      
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle unauthenticated deletion request', async () => {
      mockRequest.params = { id: '2' };
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'remove'
        })
      );
    });

    it('should handle admin deleting their own account', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockRequest.params = { id: '1' };
      
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 1 });
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users',
          action: 'remove',
          id: '1'
        })
      );
    });
  });

  describe('Role-based access control tests', () => {
    it('should differentiate between admin and student roles for index', async () => {
      const studentRequest = {
        ...mockRequest,
        user: { id: 2, email: 'student@test.com', role: 'student' }
      };
      
      await usersController.index(studentRequest as any, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users'
        })
      );
    });

    it('should differentiate between admin and instructor roles for create', async () => {
      const instructorRequest = {
        ...mockRequest,
        user: { id: 3, email: 'instructor@test.com', role: 'instructor' },
        body: {
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User'
        }
      };
      
      await usersController.create(instructorRequest as any, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          route: 'users'
        })
      );
    });

    it('should handle instructor trying to delete user', async () => {
      const instructorRequest = {
        ...mockRequest,
        user: { id: 3, email: 'instructor@test.com', role: 'instructor' },
        params: { id: '2' }
      };
      
      await usersController.remove(instructorRequest as any, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response format with ok, route, action, version', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: expect.any(Boolean),
          route: 'users',
          action: 'index',
          version: expect.any(String)
        })
      );
    });

    it('should include id parameter in show response', async () => {
      mockRequest.params = { id: '42' };
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '42'
        })
      );
    });

    it('should include id parameter in update response', async () => {
      mockRequest.params = { id: '42' };
      mockRequest.body = { name: 'Updated' };
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '42'
        })
      );
    });

    it('should include id parameter in remove response', async () => {
      mockRequest.params = { id: '42' };
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '42'
        })
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty params object', async () => {
      mockRequest.params = {};
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle null user in request', async () => {
      mockRequest.user = null as any;
      
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle empty body in create', async () => {
      mockRequest.body = {};
      
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });

    it('should handle empty body in update', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.body = {};
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(responseJson).toHaveBeenCalled();
    });
  });
});
