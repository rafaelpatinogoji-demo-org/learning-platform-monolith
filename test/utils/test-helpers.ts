export const mockStudent = {
  id: 1,
  email: 'student@test.com',
  role: 'student',
  name: 'Test Student'
};

export const mockInstructor = {
  id: 2,
  email: 'instructor@test.com',
  role: 'instructor',
  name: 'Test Instructor'
};

export const mockAdmin = {
  id: 3,
  email: 'admin@test.com',
  role: 'admin',
  name: 'Test Admin'
};

export const mockCourse = {
  id: 1,
  title: 'Test Course',
  description: 'A test course',
  published: true,
  price_cents: 5000,
  instructor_id: 2
};

export const mockUnpublishedCourse = {
  id: 2,
  title: 'Unpublished Course',
  description: 'Not published yet',
  published: false,
  price_cents: 3000,
  instructor_id: 2
};

export const mockEnrollment = {
  id: 1,
  user_id: 1,
  course_id: 1,
  status: 'active',
  created_at: new Date('2024-01-01')
};

export const mockLesson = {
  id: 1,
  course_id: 1,
  title: 'Lesson 1',
  content: 'Content',
  position: 1,
  video_url: null
};

export const mockLessonProgress = {
  id: 1,
  enrollment_id: 1,
  lesson_id: 1,
  completed: true,
  completed_at: new Date('2024-01-02'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02')
};

export function mockDbQuery(result: any) {
  return jest.fn().mockResolvedValue({ rows: result });
}

export function mockDbQueryError(error: Error) {
  return jest.fn().mockRejectedValue(error);
}

export function createMockRequest(user?: any, body?: any, params?: any, query?: any) {
  return {
    user,
    body: body || {},
    params: params || {},
    query: query || {},
    headers: {},
    requestId: 'test-request-id'
  };
}

export function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
