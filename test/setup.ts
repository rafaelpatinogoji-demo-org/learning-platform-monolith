/**
 * Jest setup file for LearnLite authentication tests
 * 
 * This file runs before each test suite and sets up:
 * - Environment variables for testing
 * - Global test utilities
 * - Mock configurations
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest-testing';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Global test timeout
jest.setTimeout(5000);

// Mock console methods to reduce noise in tests (optional)
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Suppress info/debug logs during testing
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  log: originalConsole.log
};

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global test utilities
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

// Export test utilities for use in test files
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

// Make test utils globally available
(global as any).testUtils = testUtils;
