export const mockQuery = jest.fn();
export const mockConnect = jest.fn();
export const mockRelease = jest.fn();
export const mockGetClient = jest.fn();

export const db = {
  query: mockQuery,
  connect: mockConnect,
  getClient: mockGetClient,
};

export const resetDbMocks = () => {
  mockQuery.mockReset();
  mockConnect.mockReset();
  mockRelease.mockReset();
  mockGetClient.mockReset();
};
