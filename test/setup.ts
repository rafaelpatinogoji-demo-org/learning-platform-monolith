import { db } from '../src/db';

beforeAll(async () => {
  try {
    await db.connect();
  } catch (error) {
    console.error('Failed to connect to database in test setup:', error);
  }
});

afterAll(async () => {
  try {
    await db.disconnect();
  } catch (error) {
    console.error('Failed to disconnect from database in test teardown:', error);
  }
});

afterEach(() => {
  jest.clearAllMocks();
});
