import { jest } from '@jest/globals';

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

process.env.NODE_ENV = 'test';
process.env.NOTIFICATIONS_ENABLED = 'true';
process.env.NOTIFICATIONS_SINK = 'console';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/learnlite_test';
