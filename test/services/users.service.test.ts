import { UsersService, CreateUserInput, UpdateUserInput } from '../../src/services/users.service';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1', role: 'student', created_at: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', role: 'instructor', created_at: new Date() }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      const result = await UsersService.getAllUsers(1, 10);

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(10);
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users');
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [10, 0]
      );
    });

    it('should handle pagination correctly', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      await UsersService.getAllUsers(3, 20);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [20, 40]
      );
    });

    it('should use default pagination values', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await UsersService.getAllUsers();

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [10, 0]
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await UsersService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [1]
      );
    });

    it('should return null when user not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await UsersService.getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await UsersService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should convert email to lowercase', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await UsersService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await UsersService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create a new user with default role', async () => {
      const input: CreateUserInput = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      const mockUser = {
        id: 1,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });

      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await UsersService.createUser(input);

      expect(result).toEqual(mockUser);
      expect(AuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['newuser@example.com', 'hashedpassword', 'New User', 'student']
      );
    });

    it('should create a new user with specified role', async () => {
      const input: CreateUserInput = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, ...input, created_at: new Date() }] });

      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      await UsersService.createUser(input);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['admin@example.com', 'hashedpassword', 'Admin User', 'admin']
      );
    });

    it('should throw error for invalid role', async () => {
      const input: CreateUserInput = {
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
        role: 'invalid'
      };

      await expect(UsersService.createUser(input)).rejects.toThrow('Invalid role. Must be admin, instructor, or student');
    });

    it('should throw error if email already exists', async () => {
      const input: CreateUserInput = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'User'
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, email: 'existing@example.com' }]
      });

      await expect(UsersService.createUser(input)).rejects.toThrow('Email already exists');
    });

    it('should convert email to lowercase', async () => {
      const input: CreateUserInput = {
        email: 'NEWUSER@EXAMPLE.COM',
        password: 'password123',
        name: 'New User'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      await UsersService.createUser(input);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
        ['newuser@example.com', 'hashedpassword', 'New User', 'student']
      );
    });
  });

  describe('updateUser', () => {
    it('should update user email', async () => {
      const mockUser = {
        id: 1,
        email: 'old@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      const updatedUser = { ...mockUser, email: 'new@example.com' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await UsersService.updateUser(1, { email: 'new@example.com' });

      expect(result).toEqual(updatedUser);
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, name, role, created_at',
        ['new@example.com', 1]
      );
    });

    it('should update user name', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'Old Name',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [{ ...mockUser, name: 'New Name' }] });

      await UsersService.updateUser(1, { name: 'New Name' });

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role, created_at',
        ['New Name', 1]
      );
    });

    it('should update user role', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [{ ...mockUser, role: 'instructor' }] });

      await UsersService.updateUser(1, { role: 'instructor' });

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, created_at',
        ['instructor', 1]
      );
    });

    it('should update user password', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [mockUser] });

      (AuthService.hashPassword as jest.Mock).mockResolvedValue('newhash');

      await UsersService.updateUser(1, { password: 'newpassword' });

      expect(AuthService.hashPassword).toHaveBeenCalledWith('newpassword');
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email, name, role, created_at',
        ['newhash', 1]
      );
    });

    it('should update multiple fields', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });

      await UsersService.updateUser(1, { email: 'new@example.com', name: 'New Name' });

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET email = $1, name = $2 WHERE id = $3 RETURNING id, email, name, role, created_at',
        ['new@example.com', 'New Name', 1]
      );
    });

    it('should return null if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await UsersService.updateUser(999, { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should throw error for invalid role', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      await expect(UsersService.updateUser(1, { role: 'invalid' })).rejects.toThrow('Invalid role. Must be admin, instructor, or student');
    });

    it('should throw error if new email already exists', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'existing@example.com' }] });

      await expect(UsersService.updateUser(1, { email: 'existing@example.com' })).rejects.toThrow('Email already exists');
    });

    it('should return user unchanged if no updates provided', async () => {
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });

      const result = await UsersService.updateUser(1, {});

      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await UsersService.deleteUser(1);

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [1]);
    });

    it('should return false if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await UsersService.deleteUser(999);

      expect(result).toBe(false);
    });

    it('should return false if rowCount is null', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rowCount: null });

      const result = await UsersService.deleteUser(1);

      expect(result).toBe(false);
    });
  });

  describe('validateRole', () => {
    it('should return true for valid roles', () => {
      expect(UsersService.validateRole('admin')).toBe(true);
      expect(UsersService.validateRole('instructor')).toBe(true);
      expect(UsersService.validateRole('student')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(UsersService.validateRole('invalid')).toBe(false);
      expect(UsersService.validateRole('superadmin')).toBe(false);
      expect(UsersService.validateRole('')).toBe(false);
    });
  });

  describe('canAccessProfile', () => {
    it('should allow admin to access any profile', () => {
      expect(UsersService.canAccessProfile(1, 'admin', 2)).toBe(true);
      expect(UsersService.canAccessProfile(1, 'admin', 999)).toBe(true);
    });

    it('should allow user to access their own profile', () => {
      expect(UsersService.canAccessProfile(1, 'student', 1)).toBe(true);
      expect(UsersService.canAccessProfile(5, 'instructor', 5)).toBe(true);
    });

    it('should deny user access to other profiles', () => {
      expect(UsersService.canAccessProfile(1, 'student', 2)).toBe(false);
      expect(UsersService.canAccessProfile(1, 'instructor', 2)).toBe(false);
    });
  });

  describe('canUpdateProfile', () => {
    it('should allow admin to update any profile including role', () => {
      expect(UsersService.canUpdateProfile(1, 'admin', 2, { name: 'New Name' })).toBe(true);
      expect(UsersService.canUpdateProfile(1, 'admin', 2, { role: 'instructor' })).toBe(true);
    });

    it('should allow user to update their own profile', () => {
      expect(UsersService.canUpdateProfile(1, 'student', 1, { name: 'New Name' })).toBe(true);
      expect(UsersService.canUpdateProfile(1, 'student', 1, { email: 'new@example.com' })).toBe(true);
    });

    it('should deny user from updating other profiles', () => {
      expect(UsersService.canUpdateProfile(1, 'student', 2, { name: 'New Name' })).toBe(false);
      expect(UsersService.canUpdateProfile(1, 'instructor', 2, { name: 'New Name' })).toBe(false);
    });

    it('should deny user from changing their own role', () => {
      expect(UsersService.canUpdateProfile(1, 'student', 1, { role: 'admin' })).toBe(false);
      expect(UsersService.canUpdateProfile(1, 'instructor', 1, { role: 'admin' })).toBe(false);
    });
  });

  describe('canDeleteUser', () => {
    it('should allow admin to delete users', () => {
      expect(UsersService.canDeleteUser('admin')).toBe(true);
    });

    it('should deny non-admin from deleting users', () => {
      expect(UsersService.canDeleteUser('student')).toBe(false);
      expect(UsersService.canDeleteUser('instructor')).toBe(false);
    });
  });
});
