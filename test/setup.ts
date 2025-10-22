process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.DATABASE_URL = 'postgresql://localhost:5432/test_db';

jest.setTimeout(10000);
