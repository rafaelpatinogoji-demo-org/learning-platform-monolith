import { User, IUser } from '../models/User';
import { connectMongoDB } from '../db/mongodb';

/**
 * MongoDB-specific authentication service
 * Handles user operations in MongoDB for the gradual migration
 */
export class AuthMongoDBService {
  /**
   * Ensure MongoDB connection is established
   */
  private static async ensureConnection(): Promise<void> {
    await connectMongoDB();
  }

  /**
   * Create user in MongoDB
   */
  static async createUser(userData: {
    email: string;
    password_hash: string;
    name: string;
    role: 'admin' | 'instructor' | 'student';
  }): Promise<IUser> {
    await this.ensureConnection();
    
    const user = new User({
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      name: userData.name,
      role: userData.role
    });

    return await user.save();
  }

  /**
   * Find user by email in MongoDB
   */
  static async findUserByEmail(email: string): Promise<IUser | null> {
    await this.ensureConnection();
    return await User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by ID in MongoDB
   */
  static async findUserById(id: string): Promise<IUser | null> {
    await this.ensureConnection();
    return await User.findById(id);
  }

  /**
   * Check if email exists in MongoDB
   */
  static async emailExists(email: string): Promise<boolean> {
    await this.ensureConnection();
    const user = await User.findOne({ email: email.toLowerCase() });
    return !!user;
  }

  /**
   * Sync user from PostgreSQL to MongoDB
   * Used during the dual-write phase
   */
  static async syncUserFromPostgres(pgUser: {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    role: string;
    created_at: Date;
  }): Promise<IUser | null> {
    try {
      await this.ensureConnection();
      
      const existingUser = await User.findOne({ email: pgUser.email.toLowerCase() });
      if (existingUser) {
        return existingUser;
      }

      const mongoUser = new User({
        email: pgUser.email.toLowerCase(),
        password_hash: pgUser.password_hash,
        name: pgUser.name,
        role: pgUser.role as 'admin' | 'instructor' | 'student',
        created_at: pgUser.created_at
      });

      return await mongoUser.save();
    } catch (error) {
      console.error('Error syncing user to MongoDB:', error);
      return null;
    }
  }
}
