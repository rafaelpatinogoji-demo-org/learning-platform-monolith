export const mockUsers = {
  admin: {
    id: 1,
    email: 'admin@test.com',
    role: 'admin',
    name: 'Admin User'
  },
  instructor1: {
    id: 2,
    email: 'instructor1@test.com',
    role: 'instructor',
    name: 'Instructor One'
  },
  instructor2: {
    id: 3,
    email: 'instructor2@test.com',
    role: 'instructor',
    name: 'Instructor Two'
  },
  student: {
    id: 4,
    email: 'student@test.com',
    role: 'student',
    name: 'Student User'
  }
};

export function createMockCourse(overrides = {}) {
  return {
    id: 1,
    title: 'Test Course',
    description: 'Test Description',
    price_cents: 9900,
    published: false,
    instructor_id: 2,
    created_at: new Date('2024-01-01'),
    ...overrides
  };
}

export function createMockLesson(overrides = {}) {
  return {
    id: 1,
    course_id: 1,
    title: 'Test Lesson',
    video_url: 'https://example.com/video.mp4',
    content_md: '# Test Content',
    position: 1,
    created_at: new Date('2024-01-01'),
    ...overrides
  };
}

export function createMockRequest(user?: any, params = {}, body = {}, query = {}) {
  return {
    user,
    params,
    body,
    query,
    requestId: 'test-request-id'
  } as any;
}

export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
}
