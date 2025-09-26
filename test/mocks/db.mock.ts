import { QueryResult, PoolClient, QueryResultRow } from 'pg';

export const mockQueryResult = <T extends QueryResultRow = any>(rows: T[], rowCount?: number): QueryResult<T> => ({
  rows,
  rowCount: rowCount ?? rows.length,
  command: 'SELECT',
  oid: 0,
  fields: []
});

export const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  end: jest.fn()
};

export const mockDb = {
  query: jest.fn(),
  getClient: jest.fn().mockResolvedValue(mockClient),
  connect: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
  smokeTest: jest.fn().mockResolvedValue({ success: true, userCount: 1 }),
  getConnectionStatus: jest.fn().mockReturnValue(true),
  disconnect: jest.fn(),
  getPoolStats: jest.fn().mockReturnValue({
    totalCount: 1,
    idleCount: 0,
    waitingCount: 0
  })
};

jest.mock('../../src/db', () => ({
  db: mockDb
}), { virtual: true });

export { mockDb as db };
