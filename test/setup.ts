process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.PORT = '4000';
process.env.LOG_LEVEL = 'error';
process.env.APP_NAME = 'learnlite-test';
process.env.NOTIFICATIONS_ENABLED = 'false';

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
