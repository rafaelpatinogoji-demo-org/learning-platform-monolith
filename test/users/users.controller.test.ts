import { Request, Response } from 'express';
import { usersController } from '../../src/controllers/users.controller';
import { UsersService } from '../../src/services/users.service';
import { UserValidator } from '../../src/utils/validation';

jest.mock('../../src/services/users.service');
jest.mock('../../src/utils/validation');

describe('UsersController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      query: {},
      params: {},
      body: {},
      requestId: 'test-request-id'
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    jest.clearAllMocks();
  });

  describe('index', () => {
    it('should list users with default pagination', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', name: 'User 1', role: 'student', created_at: new Date() },
        { id: 2, email: 'user2@test.com', name: 'User 2', role: 'instructor', created_at: new Date() }
      ];

      (UserValidator.validateListParams as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (UsersService.listUsers as jest.Mock).mockResolvedValue({
        users: mockUsers,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      });

      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(UserValidator.validateListParams).toHaveBeenCalledWith({});
      expect(UsersService.listUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockUsers,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        version: 'v1.9'
      });
    });

    it('should list users with role filter', async () => {
      mockRequest.query = { role: 'admin' };
      
      (UserValidator.validateListParams as jest.Mock).mockReturnValue({ 
        page: 1, 
        limit: 10, 
        role: 'admin' 
      });
      (UsersService.listUsers as jest.Mock).mockResolvedValue({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });

      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(UsersService.listUsers).toHaveBeenCalledWith({ page: 1, limit: 10, role: 'admin' });
    });

    it('should list users with search filter', async () => {
      mockRequest.query = { search: 'john' };
      
      (UserValidator.validateListParams as jest.Mock).mockReturnValue({ 
        page: 1, 
        limit: 10, 
        search: 'john' 
      });
      (UsersService.listUsers as jest.Mock).mockResolvedValue({
        users: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });

      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(UsersService.listUsers).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'john' });
    });

    it('should list users with pagination parameters', async () => {
      mockRequest.query = { page: '2', limit: '20' };
      
      (UserValidator.validateListParams as jest.Mock).mockReturnValue({ 
        page: 2, 
        limit: 20
      });
      (UsersService.listUsers as jest.Mock).mockResolvedValue({
        users: [],
        pagination: { page: 2, limit: 20, total: 0, totalPages: 0 }
      });

      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(UsersService.listUsers).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    it('should handle errors gracefully', async () => {
      (UserValidator.validateListParams as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (UsersService.listUsers as jest.Mock).mockRejectedValue(new Error('Database error'));

      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Failed to list users'
        })
      }));
    });
  });

  describe('show', () => {
    it('should get user by ID', async () => {
      mockRequest.params = { id: '1' };
      const mockUser = { 
        id: 1, 
        email: 'user@test.com', 
        name: 'Test User', 
        role: 'student', 
        created_at: new Date() 
      };

      (UsersService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(UsersService.getUserById).toHaveBeenCalledWith(1);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockUser,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID'
        })
      }));
    });

    it('should return 400 for zero user ID', async () => {
      mockRequest.params = { id: '0' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 for negative user ID', async () => {
      mockRequest.params = { id: '-1' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent user', async () => {
      mockRequest.params = { id: '999' };
      (UsersService.getUserById as jest.Mock).mockResolvedValue(null);

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'USER_NOT_FOUND'
        })
      }));
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { id: '1' };
      (UsersService.getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user'
        })
      }));
    });
  });

  describe('updateRole', () => {
    it('should update user role successfully', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { role: 'instructor' };

      const existingUser = { id: 1, email: 'user@test.com', name: 'User', role: 'student', created_at: new Date() };
      const updatedUser = { ...existingUser, role: 'instructor' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (UsersService.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (UsersService.updateUserRole as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(UserValidator.validateRoleUpdate).toHaveBeenCalledWith({ role: 'instructor' });
      expect(UsersService.updateUserRole).toHaveBeenCalledWith(1, 'instructor');
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: updatedUser,
        message: 'User role updated successfully',
        version: 'v1.9'
      });
    });

    it('should update role to admin', async () => {
      mockRequest.params = { id: '2' };
      mockRequest.body = { role: 'admin' };

      const existingUser = { id: 2, email: 'user@test.com', name: 'User', role: 'student', created_at: new Date() };
      const updatedUser = { ...existingUser, role: 'admin' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (UsersService.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (UsersService.updateUserRole as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(UsersService.updateUserRole).toHaveBeenCalledWith(2, 'admin');
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        data: updatedUser
      }));
    });

    it('should update role to student', async () => {
      mockRequest.params = { id: '3' };
      mockRequest.body = { role: 'student' };

      const existingUser = { id: 3, email: 'user@test.com', name: 'User', role: 'instructor', created_at: new Date() };
      const updatedUser = { ...existingUser, role: 'student' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (UsersService.getUserById as jest.Mock).mockResolvedValue(existingUser);
      (UsersService.updateUserRole as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(UsersService.updateUserRole).toHaveBeenCalledWith(3, 'student');
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.params = { id: 'invalid' };
      mockRequest.body = { role: 'admin' };

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID'
        })
      }));
    });

    it('should return 400 for invalid role', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { role: 'invalid-role' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'role', message: 'Role must be one of: admin, instructor, student' }]
      });

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: [{ field: 'role', message: 'Role must be one of: admin, instructor, student' }]
        })
      }));
    });

    it('should return 400 for missing role', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {};

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'role', message: 'Role is required' }]
      });

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user does not exist', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.body = { role: 'admin' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (UsersService.getUserById as jest.Mock).mockResolvedValue(null);

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'USER_NOT_FOUND'
        })
      }));
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { role: 'admin' };

      (UserValidator.validateRoleUpdate as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (UsersService.getUserById as jest.Mock).mockResolvedValue({ id: 1, email: 'user@test.com', name: 'User', role: 'student', created_at: new Date() });
      (UsersService.updateUserRole as jest.Mock).mockRejectedValue(new Error('Database error'));

      await usersController.updateRole(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user role'
        })
      }));
    });
  });

  describe('create (legacy stub)', () => {
    it('should return stub response', async () => {
      await usersController.create(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v1.9'
      });
    });
  });

  describe('update (legacy stub)', () => {
    it('should return stub response', async () => {
      mockRequest.params = { id: '1' };
      await usersController.update(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '1',
        version: 'v1.9'
      });
    });
  });

  describe('remove (legacy stub)', () => {
    it('should return stub response', async () => {
      mockRequest.params = { id: '1' };
      await usersController.remove(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '1',
        version: 'v1.9'
      });
    });
  });
});
