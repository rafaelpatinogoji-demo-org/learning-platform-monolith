import { jest } from '@jest/globals';

export const mockClient = (): any => ({
  query: jest.fn(),
  release: jest.fn(),
});

export const mockRequest = (overrides = {}): any => ({
  params: {},
  body: {},
  query: {},
  headers: {},
  user: undefined,
  ...overrides,
} as any);

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();
