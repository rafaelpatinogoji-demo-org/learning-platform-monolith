import { config } from '../src/config';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/learnlite_test';
});

afterAll(() => {
});

beforeEach(() => {
});

afterEach(() => {
  jest.clearAllMocks();
});
