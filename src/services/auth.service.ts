import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthMongoDBService } from './auth-mongodb.service';

/**
 * Authentication service for password hashing and JWT operations
 * 
 * Using bcrypt for password hashing:
 * - Industry standard with built-in salt generation
 * - Adaptive cost factor (rounds) for future-proofing
 * - Well-tested and widely adopted
 * - Good balance of security and performance
 */

const BCRYPT_ROUNDS = 12; // Higher than default 10 for better security

export class AuthService {
  /**
   * Hash a plain text password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a plain text password against a hashed password
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token for authenticated user
   */
  static generateToken(user: { id: number; email: string; role: string }): string {
    const payload = {
      sub: user.id,        // Subject (user ID)
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // Expires in 24 hours
    };

    return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Verify JWT token and return decoded payload
   */
  static verifyToken(token: string): any {
    return jwt.verify(token, config.jwtSecret);
  }

  /**
   * Create user profile response (safe for client)
   */
  static createUserProfile(user: { id: number; email: string; name: string; role: string; created_at: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at
    };
  }

  /**
   * Sync user to MongoDB (dual-write functionality)
   * This is part of Phase 2 of the migration plan
   */
  static async syncUserToMongoDB(pgUser: {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    role: string;
    created_at: Date;
  }): Promise<void> {
    try {
      await AuthMongoDBService.syncUserFromPostgres(pgUser);
      console.log(`User ${pgUser.email} synced to MongoDB successfully`);
    } catch (error) {
      console.error(`Failed to sync user ${pgUser.email} to MongoDB:`, error);
    }
  }
}
