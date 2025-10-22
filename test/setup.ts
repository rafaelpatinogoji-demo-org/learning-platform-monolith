/**
 * Jest setup file for authentication tests
 * Configures environment variables and global test settings
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.PORT = '4001';
process.env.LOG_LEVEL = 'error';

jest.setTimeout(5000);

global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: console.log,
  info: console.info,
};
