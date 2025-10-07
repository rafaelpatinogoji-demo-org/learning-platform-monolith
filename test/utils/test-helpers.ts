import { Request, Response } from 'express';

export interface MockUser {
  id: number;
  email: string;
  role: string;
}

export interface AuthRequest {
  user?: MockUser;
  requestId?: string;
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
}

export function mockRequest(overrides?: Partial<AuthRequest>): AuthRequest {
  return {
    user: { id: 1, email: 'test@example.com', role: 'student' },
    requestId: 'test-request-id',
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
}

export function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

export function mockDbQueryResult<T = any>(rows: T[], rowCount?: number) {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

export function mockEnrollment(overrides?: any) {
  return {
    id: 1,
    user_id: 1,
    course_id: 1,
    status: 'active',
    created_at: new Date('2024-01-01'),
    ...overrides,
  };
}

export function mockCourse(overrides?: any) {
  return {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    published: true,
    price_cents: 9900,
    instructor_id: 2,
    ...overrides,
  };
}

export function mockLesson(overrides?: any) {
  return {
    id: 1,
    course_id: 1,
    title: 'Test Lesson',
    position: 1,
    content: 'Test content',
    ...overrides,
  };
}

export function mockProgress(overrides?: any) {
  return {
    id: 1,
    enrollment_id: 1,
    lesson_id: 1,
    completed: true,
    completed_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
    ...overrides,
  };
}
