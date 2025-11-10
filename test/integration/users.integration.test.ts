import { UsersService, CreateUserInput, UpdateUserInput } from '../../src/services/users.service';
import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/db';

jest.mock('../../src/db');
jest.mock('../../src/services/auth.service');

describe('Users Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management Workflow', () => {
    it('should complete full user lifecycle: create, read, update, delete', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      const createdUser = await UsersService.createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      expect(createdUser).toEqual(mockUser);

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      const fetchedUser = await UsersService.getUserById(1);
      expect(fetchedUser).toEqual(mockUser);

      const updatedUser = { ...mockUser, name: 'Updated User' };
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await UsersService.updateUser(1, { name: 'Updated User' });
      expect(result?.name).toBe('Updated User');

      (db.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
      const deleted = await UsersService.deleteUser(1);
      expect(deleted).toBe(true);
    });

    it('should handle admin creating and managing multiple users', async () => {
      const adminUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date()
      };

      const studentUser = {
        id: 2,
        email: 'student@example.com',
        name: 'Student User',
        role: 'student',
        created_at: new Date()
      };

      const instructorUser = {
        id: 3,
        email: 'instructor@example.com',
        name: 'Instructor User',
        role: 'instructor',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [adminUser] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      await UsersService.createUser({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin'
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [studentUser] });

      await UsersService.createUser({
        email: 'student@example.com',
        password: 'password123',
        name: 'Student User',
        role: 'student'
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [instructorUser] });

      await UsersService.createUser({
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor User',
        role: 'instructor'
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [adminUser, studentUser, instructorUser] });

      const allUsers = await UsersService.getAllUsers(1, 10);
      expect(allUsers.users).toHaveLength(3);
      expect(allUsers.total).toBe(3);

      expect(UsersService.canAccessProfile(1, 'admin', 2)).toBe(true);
      expect(UsersService.canAccessProfile(1, 'admin', 3)).toBe(true);
    });

    it('should enforce profile access controls', async () => {
      const user1 = {
        id: 1,
        email: 'user1@example.com',
        name: 'User 1',
        role: 'student',
        created_at: new Date()
      };

      const user2 = {
        id: 2,
        email: 'user2@example.com',
        name: 'User 2',
        role: 'student',
        created_at: new Date()
      };

      expect(UsersService.canAccessProfile(1, 'student', 1)).toBe(true);
      expect(UsersService.canAccessProfile(1, 'student', 2)).toBe(false);

      expect(UsersService.canUpdateProfile(1, 'student', 1, { name: 'New Name' })).toBe(true);
      expect(UsersService.canUpdateProfile(1, 'student', 2, { name: 'New Name' })).toBe(false);

      expect(UsersService.canUpdateProfile(1, 'student', 1, { role: 'admin' })).toBe(false);

      expect(UsersService.canDeleteUser('student')).toBe(false);
      expect(UsersService.canDeleteUser('instructor')).toBe(false);
      expect(UsersService.canDeleteUser('admin')).toBe(true);
    });

    it('should handle role changes by admin', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [{ ...user, role: 'instructor' }] });

      const canUpdate = UsersService.canUpdateProfile(2, 'admin', 1, { role: 'instructor' });
      expect(canUpdate).toBe(true);

      const updated = await UsersService.updateUser(1, { role: 'instructor' });
      expect(updated?.role).toBe('instructor');
    });

    it('should prevent duplicate email registration', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 1, email: 'existing@example.com' }]
      });

      await expect(UsersService.createUser({
        email: 'existing@example.com',
        password: 'password123',
        name: 'User'
      })).rejects.toThrow('Email already exists');
    });

    it('should handle pagination for large user lists', async () => {
      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        role: 'student',
        created_at: new Date()
      }));

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      const page1 = await UsersService.getAllUsers(1, 10);
      expect(page1.users).toHaveLength(10);
      expect(page1.total).toBe(100);

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: mockUsers });

      const page2 = await UsersService.getAllUsers(2, 10);
      expect(page2.users).toHaveLength(10);
      expect(page2.total).toBe(100);
    });

    it('should validate role during user creation', async () => {
      await expect(UsersService.createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
        role: 'superadmin'
      })).rejects.toThrow('Invalid role. Must be admin, instructor, or student');

      await expect(UsersService.createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
        role: 'moderator'
      })).rejects.toThrow('Invalid role. Must be admin, instructor, or student');
    });

    it('should validate role during user update', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [user] });

      await expect(UsersService.updateUser(1, { role: 'superadmin' }))
        .rejects.toThrow('Invalid role. Must be admin, instructor, or student');

      await expect(UsersService.updateUser(1, { role: 'moderator' }))
        .rejects.toThrow('Invalid role. Must be admin, instructor, or student');
    });

    it('should handle password updates securely', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [user] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('newhash');

      await UsersService.updateUser(1, { password: 'newpassword123' });

      expect(AuthService.hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('password_hash'),
        expect.arrayContaining(['newhash', 1])
      );
    });

    it('should handle email updates with duplicate checking', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [{ id: 2, email: 'existing@example.com' }] });

      await expect(UsersService.updateUser(1, { email: 'existing@example.com' }))
        .rejects.toThrow('Email already exists');
    });

    it('should allow email update to same email', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [user] });

      const result = await UsersService.updateUser(1, { email: 'user@example.com' });
      expect(result?.email).toBe('user@example.com');
    });

    it('should handle instructor user workflow', async () => {
      const instructor = {
        id: 1,
        email: 'instructor@example.com',
        name: 'Instructor',
        role: 'instructor',
        created_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [instructor] });
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');

      const created = await UsersService.createUser({
        email: 'instructor@example.com',
        password: 'password123',
        name: 'Instructor',
        role: 'instructor'
      });

      expect(created.role).toBe('instructor');

      expect(UsersService.canAccessProfile(1, 'instructor', 1)).toBe(true);
      expect(UsersService.canUpdateProfile(1, 'instructor', 1, { name: 'New Name' })).toBe(true);
      expect(UsersService.canUpdateProfile(1, 'instructor', 1, { role: 'admin' })).toBe(false);
      expect(UsersService.canDeleteUser('instructor')).toBe(false);
    });

    it('should handle multiple field updates atomically', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      const updatedUser = {
        id: 1,
        email: 'newemail@example.com',
        name: 'New Name',
        role: 'instructor',
        created_at: user.created_at
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await UsersService.updateUser(1, {
        email: 'newemail@example.com',
        name: 'New Name',
        role: 'instructor'
      });

      expect(result?.email).toBe('newemail@example.com');
      expect(result?.name).toBe('New Name');
      expect(result?.role).toBe('instructor');
    });

    it('should handle case-insensitive email lookups', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        role: 'student',
        created_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [user] });

      const result1 = await UsersService.getUserByEmail('USER@EXAMPLE.COM');
      const result2 = await UsersService.getUserByEmail('User@Example.Com');
      const result3 = await UsersService.getUserByEmail('user@example.com');

      expect(result1).toEqual(user);
      expect(result2).toEqual(user);
      expect(result3).toEqual(user);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user@example.com']
      );
    });
  });
});
