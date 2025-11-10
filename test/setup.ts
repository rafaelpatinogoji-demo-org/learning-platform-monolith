
jest.mock('../src/db', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn()
  }
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

jest.setTimeout(5000);
