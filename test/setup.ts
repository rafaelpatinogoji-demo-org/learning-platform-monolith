import { db } from '../src/db';

jest.mock('../src/db', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn(),
  },
}));

jest.mock('../src/modules/notifications/publisher', () => ({
  publish: jest.fn(),
  isNotificationsEnabled: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
});
