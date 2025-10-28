import { QueryResult, QueryResultRow } from 'pg';

export const mockQuery = jest.fn();
export const mockGetClient = jest.fn();
export const mockConnect = jest.fn();
export const mockDisconnect = jest.fn();

export const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

mockGetClient.mockResolvedValue(mockClient);

export const resetDbMocks = () => {
  mockQuery.mockReset();
  mockGetClient.mockReset();
  mockGetClient.mockResolvedValue(mockClient);
  mockConnect.mockReset();
  mockDisconnect.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
};

export const mockQuerySuccess = <T extends QueryResultRow = any>(rows: T[]): QueryResult<T> => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});
