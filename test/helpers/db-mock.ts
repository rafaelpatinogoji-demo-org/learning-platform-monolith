import { QueryResult } from 'pg';

export function createMockDb() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    healthCheck: jest.fn(),
    smokeTest: jest.fn(),
    getClient: jest.fn(),
    getConnectionStatus: jest.fn(),
    getPoolStats: jest.fn(),
  };
}

export function createMockQueryResult(rows: any[], rowCount?: number): any {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

export const mockUsers = {
  student: {
    id: 1,
    email: 'student@test.com',
    name: 'Test Student',
    role: 'student',
    password_hash: '$2b$12$validHashedPassword',
    created_at: new Date('2024-01-01'),
  },
  instructor: {
    id: 2,
    email: 'instructor@test.com',
    name: 'Test Instructor',
    role: 'instructor',
    password_hash: '$2b$12$validHashedPassword',
    created_at: new Date('2024-01-01'),
  },
  admin: {
    id: 3,
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin',
    password_hash: '$2b$12$validHashedPassword',
    created_at: new Date('2024-01-01'),
  },
};
