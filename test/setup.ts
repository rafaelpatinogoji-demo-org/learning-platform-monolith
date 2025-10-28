import { jest } from '@jest/globals';

// Mock the database module
jest.mock('../src/db', () => ({
  db: {
    query: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }
}));

// Mock JWT module
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

// Global test timeout
jest.setTimeout(5000);
