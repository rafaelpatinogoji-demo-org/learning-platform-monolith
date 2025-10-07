beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/learnlite_test';
});

afterAll(() => {
  jest.clearAllMocks();
});
