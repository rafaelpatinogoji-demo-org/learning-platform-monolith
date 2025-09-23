/**
 * Password hashing utilities using bcrypt
 * 
 * These utilities provide a clean interface for password hashing and verification
 * with configurable cost factors for different environments.
 */

import bcrypt from 'bcrypt';

export interface PasswordHasherConfig {
  costFactor: number; // bcrypt rounds (higher = more secure but slower)
}

/**
 * Default configuration for password hashing
 */
const DEFAULT_CONFIG: PasswordHasherConfig = {
  costFactor: 12 // Higher than default 10 for better security
};

/**
 * Password hasher class with configurable cost factor
 */
export class PasswordHasher {
  private config: PasswordHasherConfig;

  constructor(config: Partial<PasswordHasherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Hash a plain text password using bcrypt
   * Returns a promise that resolves to the hashed password
   */
  async hash(password: string): Promise<string> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    return bcrypt.hash(password, this.config.costFactor);
  }

  /**
   * Verify a plain text password against a hashed password
   * Returns a promise that resolves to true if passwords match
   */
  async compare(password: string, hashedPassword: string): Promise<boolean> {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Get the current cost factor
   */
  getCostFactor(): number {
    return this.config.costFactor;
  }

  /**
   * Update the cost factor (useful for testing)
   */
  setCostFactor(costFactor: number): void {
    if (!Number.isInteger(costFactor) || costFactor < 1 || costFactor > 31) {
      throw new Error('Cost factor must be an integer between 1 and 31');
    }
    this.config.costFactor = costFactor;
  }
}

/**
 * Default password hasher instance
 */
export const passwordHasher = new PasswordHasher();

/**
 * Convenience functions using the default instance
 */
export const hashPassword = (password: string): Promise<string> => 
  passwordHasher.hash(password);

export const comparePassword = (password: string, hashedPassword: string): Promise<boolean> => 
  passwordHasher.compare(password, hashedPassword);

/**
 * Create a password hasher with custom configuration
 * Useful for testing with lower cost factors
 */
export const createPasswordHasher = (config: Partial<PasswordHasherConfig> = {}): PasswordHasher => 
  new PasswordHasher(config);
