import { db } from '../db';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
}

export class UsersService {
  /**
   * Get all users (admin only)
   */
  static async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const countResult = await db.query('SELECT COUNT(*) as count FROM users');
    const total = parseInt(countResult.rows[0].count, 10);
    
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return {
      users: result.rows,
      total
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: number): Promise<User | null> {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }

  /**
   * Create a new user
   */
  static async createUser(input: CreateUserInput): Promise<User> {
    const { email, password, name, role = 'student' } = input;
    
    if (!['admin', 'instructor', 'student'].includes(role)) {
      throw new Error('Invalid role. Must be admin, instructor, or student');
    }
    
    // Check if email already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email.toLowerCase(), hashedPassword, name, role]
    );
    
    return result.rows[0];
  }

  /**
   * Update user
   */
  static async updateUser(userId: number, input: UpdateUserInput): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (input.email !== undefined) {
      const existingUser = await this.getUserByEmail(input.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already exists');
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email.toLowerCase());
    }
    
    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    
    if (input.role !== undefined) {
      if (!['admin', 'instructor', 'student'].includes(input.role)) {
        throw new Error('Invalid role. Must be admin, instructor, or student');
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(input.role);
    }
    
    if (input.password !== undefined) {
      const hashedPassword = await AuthService.hashPassword(input.password);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    
    if (updates.length === 0) {
      return user;
    }
    
    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, role, created_at`;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: number): Promise<boolean> {
    const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Validate role
   */
  static validateRole(role: string): boolean {
    return ['admin', 'instructor', 'student'].includes(role);
  }

  /**
   * Check if user can access profile
   * Users can access their own profile, admins can access any profile
   */
  static canAccessProfile(requestingUserId: number, requestingUserRole: string, targetUserId: number): boolean {
    if (requestingUserRole === 'admin') {
      return true;
    }
    
    return requestingUserId === targetUserId;
  }

  /**
   * Check if user can update profile
   * Users can update their own profile (except role), admins can update any profile
   */
  static canUpdateProfile(requestingUserId: number, requestingUserRole: string, targetUserId: number, updates: UpdateUserInput): boolean {
    if (requestingUserRole === 'admin') {
      return true;
    }
    
    if (requestingUserId !== targetUserId) {
      return false;
    }
    
    if (updates.role !== undefined) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if user can delete profile
   * Only admins can delete users
   */
  static canDeleteUser(requestingUserRole: string): boolean {
    return requestingUserRole === 'admin';
  }
}
