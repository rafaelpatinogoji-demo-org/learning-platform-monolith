import { db } from '../db';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  created_at: Date;
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
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
  static async listUsers(options: UserListOptions = {}): Promise<UserListResult> {
    const { page = 1, limit = 10, role, search } = options;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (role && ['admin', 'instructor', 'student'].includes(role)) {
      conditions.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

  static async getUserById(id: number): Promise<User | null> {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async updateUserRole(userId: number, newRole: string): Promise<User | null> {
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, created_at',
      [newRole, userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
