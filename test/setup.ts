/**
 * Global test setup for Jest
 * 
 * This file runs once before all tests and configures the test environment.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.DATABASE_URL = 'postgresql://localhost:5432/learnlite_test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output
process.env.NOTIFICATIONS_ENABLED = 'false';

jest.setTimeout(10000);

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
