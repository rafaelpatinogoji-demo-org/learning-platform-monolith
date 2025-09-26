import { db } from '../db';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface UserListResult {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UsersService {
  /**
   * Create a new user
   */
  static async createUser(data: CreateUserData, creatorRole: string): Promise<User> {
    let role = data.role || 'student';
    if (creatorRole !== 'admin' && data.role && data.role !== 'student') {
      throw new Error('Insufficient permissions to create user with specified role');
    }

    const passwordHash = await AuthService.hashPassword(data.password);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [data.email, passwordHash, data.name, role]
    );

    return result.rows[0];
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update user by ID
   */
  static async updateUser(id: number, data: UpdateUserData): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }

    if (data.password !== undefined) {
      const passwordHash = await AuthService.hashPassword(data.password);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (data.role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(data.role);
    }

    if (updates.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, created_at
    `;

    const result = await db.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * List users with pagination and filtering
   */
  static async listUsers(options: UserListOptions = {}): Promise<UserListResult> {
    const {
      page = 1,
      limit = 10,
      search,
      role
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (role) {
      conditions.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    const usersQuery = `
      SELECT id, email, name, role, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    values.push(limit, offset);
    const usersResult = await db.query(usersQuery, values);

    return {
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if user can modify another user
   */
  static canModifyUser(targetUserId: number, currentUserId: number, currentUserRole: string): boolean {
    if (currentUserRole === 'admin') {
      return true; // Admins can modify any user
    }

    return targetUserId === currentUserId;
  }

  /**
   * Delete user by ID (admin only)
   */
  static async deleteUser(id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
