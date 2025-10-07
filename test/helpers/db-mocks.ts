import { QueryResult, PoolClient, QueryResultRow } from 'pg';

export function mockQueryResult<T extends QueryResultRow = any>(rows: T[], rowCount?: number): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: []
  };
}

export function mockPoolClient() {
  const queryMock = jest.fn();
  const client = {
    query: queryMock,
    release: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    off: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    eventNames: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    addListener: jest.fn()
  } as any as PoolClient;
  
  return Object.assign(client, { query: queryMock });
}

export function setupTransactionMocks(clientMock: any) {
  clientMock.query
    .mockResolvedValueOnce(mockQueryResult([]))
    .mockResolvedValueOnce(mockQueryResult([]));
  
  return clientMock;
}
