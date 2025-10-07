jest.mock('../src/db', () => ({
  db: {
    query: jest.fn(),
  },
}));

jest.mock('../src/config', () => ({
  config: {
    version: 'v1.9',
    jwtSecret: 'test-secret',
    nodeEnv: 'test',
  },
}));

export const mockDbQuery = (returnValue: any) => {
  const { db } = require('../src/db');
  db.query.mockResolvedValue(returnValue);
};

export const mockDbQueryOnce = (returnValue: any) => {
  const { db } = require('../src/db');
  db.query.mockResolvedValueOnce(returnValue);
};

export const clearDbMocks = () => {
  const { db } = require('../src/db');
  db.query.mockClear();
};

export const mockRequest = (overrides: any = {}): any => ({
  params: {},
  body: {},
  query: {},
  user: undefined,
  requestId: 'test-request-id',
  headers: {},
  ...overrides,
});

export const mockResponse = (): any => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};
