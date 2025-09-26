/**
 * Tests for UsersService
 * 
 * Tests business logic for user operations with proper database mocking
 * and role-based permission testing.
 */

import { UsersService, CreateUserData, UpdateUserData } from '../../src/services/users.service';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;

jest.mock('../../src/services/auth.service');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with default student role', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);

      const result = await UsersService.createUser(userData, 'admin');

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test@example.com', hashedPassword, 'Test User', 'student']
      );
      expect(result).toEqual(createdUser);
    });

    it('should create user with specified role when creator is admin', async () => {
      const userData: CreateUserData = {
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor User',
        role: 'instructor'
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 2,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);

      const result = await UsersService.createUser(userData, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['instructor@example.com', hashedPassword, 'Instructor User', 'instructor']
      );
      expect(result).toEqual(createdUser);
    });

    it('should create admin user when creator is admin', async () => {
      const userData: CreateUserData = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin'
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 3,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);

      const result = await UsersService.createUser(userData, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['admin@example.com', hashedPassword, 'Admin User', 'admin']
      );
      expect(result).toEqual(createdUser);
    });

    it('should throw error when non-admin tries to create instructor user', async () => {
      const userData: CreateUserData = {
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor User',
        role: 'instructor'
      };

      await expect(UsersService.createUser(userData, 'student'))
        .rejects.toThrow('Insufficient permissions to create user with specified role');

      expect(mockDb.query).not.toHaveBeenCalled();
      expect(mockAuthService.hashPassword).not.toHaveBeenCalled();
    });

    it('should throw error when non-admin tries to create admin user', async () => {
      const userData: CreateUserData = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin'
      };

      await expect(UsersService.createUser(userData, 'instructor'))
        .rejects.toThrow('Insufficient permissions to create user with specified role');

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should allow non-admin to create student user explicitly', async () => {
      const userData: CreateUserData = {
        email: 'student@example.com',
        password: 'password123',
        name: 'Student User',
        role: 'student'
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 4,
        email: 'student@example.com',
        name: 'Student User',
        role: 'student',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);

      const result = await UsersService.createUser(userData, 'instructor');

      expect(result).toEqual(createdUser);
    });

    it('should allow non-admin to create user without specifying role', async () => {
      const userData: CreateUserData = {
        email: 'student@example.com',
        password: 'password123',
        name: 'Student User'
      };

      const hashedPassword = 'hashed-password';
      const createdUser = {
        id: 5,
        email: 'student@example.com',
        name: 'Student User',
        role: 'student',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [createdUser] } as any);

      const result = await UsersService.createUser(userData, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['student@example.com', hashedPassword, 'Student User', 'student']
      );
      expect(result).toEqual(createdUser);
    });

    it('should handle database errors', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const hashedPassword = 'hashed-password';
      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(UsersService.createUser(userData, 'admin'))
        .rejects.toThrow('Database error');
    });

    it('should handle password hashing errors', async () => {
      const userData: CreateUserData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockAuthService.hashPassword.mockRejectedValue(new Error('Hashing error'));

      await expect(UsersService.createUser(userData, 'admin'))
        .rejects.toThrow('Hashing error');

      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [user] } as any);

      const result = await UsersService.getUserById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [1]
      );
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await UsersService.getUserById(999);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(UsersService.getUserById(1))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    it('should update user email and name', async () => {
      const updateData: UpdateUserData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = {
        id: 1,
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET email = \$1, name = \$2\s+WHERE id = \$3/),
        ['updated@example.com', 'Updated Name', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update only email', async () => {
      const updateData: UpdateUserData = {
        email: 'newemail@example.com'
      };

      const updatedUser = {
        id: 1,
        email: 'newemail@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET email = \$1\s+WHERE id = \$2/),
        ['newemail@example.com', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update only name', async () => {
      const updateData: UpdateUserData = {
        name: 'New Name'
      };

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'New Name',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET name = \$1\s+WHERE id = \$2/),
        ['New Name', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update only role', async () => {
      const updateData: UpdateUserData = {
        role: 'instructor'
      };

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'instructor',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET role = \$1\s+WHERE id = \$2/),
        ['instructor', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should hash password when updating password', async () => {
      const updateData: UpdateUserData = {
        password: 'newpassword123'
      };

      const hashedPassword = 'new-hashed-password';
      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET password_hash = \$1\s+WHERE id = \$2/),
        [hashedPassword, 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update multiple fields including password', async () => {
      const updateData: UpdateUserData = {
        email: 'updated@example.com',
        password: 'newpassword123',
        name: 'Updated Name',
        role: 'instructor'
      };

      const hashedPassword = 'new-hashed-password';
      const updatedUser = {
        id: 1,
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'instructor',
        created_at: new Date()
      };

      mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
      mockDb.query.mockResolvedValue({ rows: [updatedUser] } as any);

      const result = await UsersService.updateUser(1, updateData);

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET email = \$1, password_hash = \$2, name = \$3, role = \$4\s+WHERE id = \$5/),
        ['updated@example.com', hashedPassword, 'Updated Name', 'instructor', 1]
      );
      expect(result).toEqual(updatedUser);
    });

    it('should return current user when no updates provided', async () => {
      const currentUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [currentUser] } as any);

      const result = await UsersService.updateUser(1, {});

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [1]
      );
      expect(result).toEqual(currentUser);
    });

    it('should return null when user not found during update', async () => {
      const updateData: UpdateUserData = {
        name: 'Updated Name'
      };

      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await UsersService.updateUser(999, updateData);

      expect(result).toBeNull();
    });

    it('should handle password hashing errors during update', async () => {
      const updateData: UpdateUserData = {
        password: 'newpassword123'
      };

      mockAuthService.hashPassword.mockRejectedValue(new Error('Hashing error'));

      await expect(UsersService.updateUser(1, updateData))
        .rejects.toThrow('Hashing error');

      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should list users with default pagination', async () => {
      const users = [
        { id: 1, email: 'user1@example.com', name: 'User 1', role: 'student', created_at: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', role: 'instructor', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any) // count query
        .mockResolvedValueOnce({ rows: users } as any); // users query

      const result = await UsersService.listUsers();

      expect(result).toEqual({
        users,
        pagination: {
          page: 1,
          limit: 10,
          total: 10,
          totalPages: 1
        }
      });
    });

    it('should list users with custom pagination', async () => {
      const users = [
        { id: 1, email: 'user1@example.com', name: 'User 1', role: 'student', created_at: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', role: 'instructor', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '25' }] } as any)
        .mockResolvedValueOnce({ rows: users } as any);

      const result = await UsersService.listUsers({ page: 2, limit: 5 });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [5, 5]
      );
    });

    it('should filter users by role', async () => {
      const instructors = [
        { id: 2, email: 'instructor@example.com', name: 'Instructor', role: 'instructor', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: instructors } as any);

      const result = await UsersService.listUsers({ role: 'instructor' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE role = $1'),
        expect.arrayContaining(['instructor'])
      );
      expect(result.users).toEqual(instructors);
    });

    it('should search users by name and email', async () => {
      const searchResults = [
        { id: 1, email: 'john@example.com', name: 'John Doe', role: 'student', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: searchResults } as any);

      const result = await UsersService.listUsers({ search: 'john' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('(name ILIKE $1 OR email ILIKE $1)'),
        expect.arrayContaining(['%john%'])
      );
      expect(result.users).toEqual(searchResults);
    });

    it('should combine role filter and search', async () => {
      const searchResults = [
        { id: 1, email: 'john.instructor@example.com', name: 'John Instructor', role: 'instructor', created_at: new Date() }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: searchResults } as any);

      const result = await UsersService.listUsers({ role: 'instructor', search: 'john' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE role = $1 AND (name ILIKE $2 OR email ILIKE $2)'),
        expect.arrayContaining(['instructor', '%john%'])
      );
      expect(result.users).toEqual(searchResults);
    });

    it('should handle empty results', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await UsersService.listUsers();

      expect(result).toEqual({
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should calculate total pages correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '23' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await UsersService.listUsers({ limit: 5 });

      expect(result.pagination.totalPages).toBe(5); // Math.ceil(23/5) = 5
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(UsersService.listUsers())
        .rejects.toThrow('Database error');
    });
  });

  describe('canModifyUser', () => {
    it('should allow admin to modify any user', () => {
      const result = UsersService.canModifyUser(1, 2, 'admin');
      expect(result).toBe(true);
    });

    it('should allow admin to modify themselves', () => {
      const result = UsersService.canModifyUser(1, 1, 'admin');
      expect(result).toBe(true);
    });

    it('should allow user to modify their own profile', () => {
      const result = UsersService.canModifyUser(1, 1, 'student');
      expect(result).toBe(true);
    });

    it('should allow instructor to modify their own profile', () => {
      const result = UsersService.canModifyUser(2, 2, 'instructor');
      expect(result).toBe(true);
    });

    it('should not allow student to modify other users', () => {
      const result = UsersService.canModifyUser(1, 2, 'student');
      expect(result).toBe(false);
    });

    it('should not allow instructor to modify other users', () => {
      const result = UsersService.canModifyUser(1, 2, 'instructor');
      expect(result).toBe(false);
    });

    it('should not allow instructor to modify admin', () => {
      const result = UsersService.canModifyUser(1, 2, 'instructor');
      expect(result).toBe(false);
    });

    it('should handle edge cases with same user ID', () => {
      const result = UsersService.canModifyUser(0, 0, 'student');
      expect(result).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and return true when successful', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await UsersService.deleteUser(1);

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await UsersService.deleteUser(999);

      expect(result).toBe(false);
    });

    it('should return false when rowCount is null', async () => {
      mockDb.query.mockResolvedValue({ rowCount: null } as any);

      const result = await UsersService.deleteUser(1);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(UsersService.deleteUser(1))
        .rejects.toThrow('Database error');
    });
  });
});
