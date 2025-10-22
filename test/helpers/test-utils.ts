import { Request, Response, NextFunction } from 'express';

export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  const req: any = {
    headers: {},
    body: {},
    params: {},
    query: {},
    requestId: 'test-request-id',
    ...overrides,
  };
  return req;
}

export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
}

export function createMockNext(): jest.Mock<NextFunction> {
  return jest.fn();
}

export function createTestJwtPayload(overrides: Partial<{
  id: number;
  email: string;
  role: string;
}> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    role: 'student',
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<{
  id: number;
  email: string;
  role: string;
}> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    role: 'student',
    ...overrides,
  };
}
