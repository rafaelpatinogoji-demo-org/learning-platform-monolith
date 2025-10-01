/**
 * Jest setup file for LearnLite authentication tests
 * 
 * This file runs before each test suite and sets up:
 * - Environment variables for testing
 * - Global test utilities
 * - Mock configurations
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-testing';
process.env.LOG_LEVEL = 'error';

jest.setTimeout(5000);

const originalConsole = console;
global.console = {
  ...originalConsole,
  info: jest.fn(),
  debug: jest.fn(),
  error: originalConsole.error,
  warn: originalConsole.warn,
  log: originalConsole.log
};

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createMockRequest: (overrides?: any) => any;
        createMockResponse: () => any;
        createMockNext: () => jest.Mock;
      };
    }
  }
}

export const testUtils = {
  /**
   * Create a mock Express Request object
   */
  createMockRequest: (overrides: any = {}) => ({
    headers: {},
    user: undefined,
    requestId: 'test-request-id',
    body: {},
    params: {},
    query: {},
    ...overrides
  }),

  /**
   * Create a mock Express Response object with Jest spies
   */
  createMockResponse: () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    return res;
  },

  /**
   * Create a mock Next function
   */
  createMockNext: () => jest.fn()
};

(global as any).testUtils = testUtils;
