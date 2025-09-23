import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

class DatabaseClient {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Initialize the database connection and test connectivity
   */
  async connect(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      // Test the connection
      await this.query('SELECT 1');
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query with optional parameters
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query<T>(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.connect();
  }

  /**
   * Check if the database is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Smoke test that verifies core schema tables exist and are accessible
   */
  async smokeTest(): Promise<{ success: boolean; userCount?: number; error?: string }> {
    try {
      const result = await this.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(result.rows[0].count);
      return { success: true, userCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Database smoke test failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Gracefully close all connections
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      console.log('🔌 Closing database connections...');
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database connections closed');
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Create and export a singleton instance
export const db = new DatabaseClient();

// Export types for use in other modules
export type { QueryResult, PoolClient, QueryResultRow } from 'pg';
