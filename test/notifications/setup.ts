/**
 * Jest setup file for notifications module tests
 * 
 * This file provides mocks and utilities specific to testing
 * the notifications module including outbox events and worker functionality.
 */

import { testUtils } from '../setup';

export const mockOutboxEvent = {
  id: 1,
  topic: 'enrollment.created',
  payload: {
    enrollmentId: 123,
    userId: 456,
    courseId: 789
  },
  created_at: new Date('2023-01-01T00:00:00Z'),
  processed: false
};

export const mockCertificateEvent = {
  id: 2,
  topic: 'certificate.issued',
  payload: {
    certificateId: 111,
    userId: 222,
    courseId: 333,
    code: 'CERT-ABC123-DEF456'
  },
  created_at: new Date('2023-01-01T01:00:00Z'),
  processed: false
};

export const createMockQueryResult = (rows: any[], command = 'SELECT') => ({
  rows,
  rowCount: rows.length,
  command,
  oid: 0,
  fields: []
} as any);

export const mockDbResponses = {
  insertSuccess: createMockQueryResult([{ id: 1 }], 'INSERT'),
  insertFailure: createMockQueryResult([], 'INSERT'),
  selectEvents: createMockQueryResult([mockOutboxEvent, mockCertificateEvent]),
  selectNoEvents: createMockQueryResult([]),
  countPending: createMockQueryResult([{ count: '5' }], 'SELECT'),
  beginTransaction: createMockQueryResult([], 'BEGIN'),
  commitTransaction: createMockQueryResult([], 'COMMIT'),
  rollbackTransaction: createMockQueryResult([], 'ROLLBACK'),
  updateProcessed: createMockQueryResult([], 'UPDATE')
};

export const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
};

export const mockTimers = {
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
  setTimeout: jest.fn()
};

export const notificationTestUtils = {
  ...testUtils,
  
  /**
   * Create a mock database client with common query responses
   */
  createMockDb: () => ({
    query: jest.fn()
  }),

  /**
   * Create a mock outbox event
   */
  createMockEvent: (overrides: any = {}) => ({
    ...mockOutboxEvent,
    ...overrides
  }),

  /**
   * Create environment variable mocks
   */
  mockEnvVars: (vars: Record<string, string>) => {
    const originalEnv = process.env;
    Object.keys(vars).forEach(key => {
      process.env[key] = vars[key];
    });
    return () => {
      process.env = originalEnv;
    };
  }
};
