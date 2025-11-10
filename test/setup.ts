import { jest } from '@jest/globals';

beforeAll(() => {
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  jest.clearAllMocks();
});

export {};
