/**
 * Tests for coursesController
 * 
 * Integration tests for course controller endpoints with mocked services
 */

import { Request, Response } from 'express';
import { coursesController } from '../../src/controllers/courses.controller';
import { CoursesService } from '../../src/services/courses.service';
import { CourseValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/courses.service');
jest.mock('../../src/utils/validation');

const mockCoursesService = CoursesService as jest.Mocked<typeof CoursesService>;
const mockCourseValidator = CourseValidator as jest.Mocked<typeof CourseValidator>;

describe('coursesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
  });

  describe('index', () => {
    const mockCourses = [
      {
        id: 1,
        title: 'Course 1',
        description: 'Description 1',
        price_cents: 2999,
        published: true,
        instructor_id: 5,
        created_at: new Date()
      }
    ];

    const mockPagination = {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    };

    beforeEach(() => {
      mockCourseValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockCourseValidator.sanitizeSearch.mockReturnValue(undefined);
    });

    it('should list courses for public access (no user)', async () => {
      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourses,
        pagination: mockPagination,
        version: 'v0.7'
      });
    });

    it('should list courses for student (published only)', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };

      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
    });

    it('should list courses for instructor (their own courses)', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };

      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 5
      });
    });

    it('should list all courses for admin', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };

      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should handle search query', async () => {
      mockReq.query = { q: 'javascript' };
      mockCourseValidator.sanitizeSearch.mockReturnValue('javascript');

      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.sanitizeSearch).toHaveBeenCalledWith('javascript');
      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'javascript',
        published_only: true
      });
    });

    it('should handle pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '20' };
      mockCourseValidator.validatePagination.mockReturnValue({ page: 2, limit: 20 });

      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: { ...mockPagination, page: 2, limit: 20 }
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.validatePagination).toHaveBeenCalledWith(mockReq.query);
      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        search: undefined,
        published_only: true
      });
    });

    it('should handle service errors', async () => {
      mockCoursesService.listCourses.mockRejectedValue(new Error('Database error'));

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list courses',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('create', () => {
    const mockCourseData = {
      title: 'New Course',
      description: 'Course description',
      price_cents: 2999
    };

    const mockCreatedCourse = {
      id: 1,
      title: 'New Course',
      description: 'Course description',
      price_cents: 2999,
      published: false,
      instructor_id: 5,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCourseValidator.validateCreateCourse.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCourseValidator.normalizePrice.mockReturnValue(2999);
    });

    it('should create course for instructor', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = mockCourseData;

      mockCoursesService.createCourse.mockResolvedValue(mockCreatedCourse);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.validateCreateCourse).toHaveBeenCalledWith(mockCourseData);
      expect(mockCourseValidator.normalizePrice).toHaveBeenCalledWith(2999);
      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: 'Course description',
          price_cents: 2999
        },
        5,
        'instructor'
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        course: mockCreatedCourse,
        version: 'v0.7'
      });
    });

    it('should create course for admin', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };
      mockReq.body = mockCourseData;

      mockCoursesService.createCourse.mockResolvedValue(mockCreatedCourse);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        expect.any(Object),
        10,
        'admin'
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.body = mockCourseData;

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 for student role', async () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.body = mockCourseData;

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only instructors and admins can create courses',
          role: 'student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = { title: '' };

      mockCourseValidator.validateCreateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          errors: [{ field: 'title', message: 'Title cannot be empty' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle service errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = mockCourseData;

      mockCoursesService.createCourse.mockRejectedValue(new Error('Database error'));

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('show', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: true,
      instructor_id: 5,
      created_at: new Date(),
      instructor: {
        id: 5,
        name: 'John Doe'
      }
    };

    it('should get course by ID', async () => {
      mockReq.params = { id: '1' };

      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.getCourseById).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v0.7'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { id: 'invalid' };

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid course ID',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockReq.params = { id: '999' };

      mockCoursesService.getCourseById.mockResolvedValue(null);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };

      mockCoursesService.getCourseById.mockRejectedValue(new Error('Database error'));

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('update', () => {
    const mockUpdatedCourse = {
      id: 1,
      title: 'Updated Course',
      description: 'Updated Description',
      price_cents: 3999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCourseValidator.validateUpdateCourse.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockCourseValidator.normalizePrice.mockReturnValue(3999);
    });

    it('should update course for instructor who owns it', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course', price_cents: 3999 };

      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.canModifyCourse).toHaveBeenCalledWith(1, 5, 'instructor');
      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated Course',
        price_cents: 3999
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockUpdatedCourse,
        version: 'v0.7'
      });
    });

    it('should update course for admin', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course', instructor_id: 7 };

      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated Course',
        instructor_id: 7
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course' };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for insufficient permissions', async () => {
      mockReq.user = { id: 6, email: 'instructor2@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course' };

      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to modify this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: '' };

      mockCourseValidator.validateUpdateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent course', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course' };

      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue(null);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('publish', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: true,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should publish course', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockCourse);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockCourse,
        version: 'v0.7'
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      mockReq.user = { id: 6, email: 'instructor2@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('unpublish', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 2999,
      published: false,
      instructor_id: 5,
      created_at: new Date()
    };

    it('should unpublish course', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockCourse);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockCourse,
        version: 'v0.7'
      });
    });
  });

  describe('remove', () => {
    it('should delete course for admin', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '1' };

      mockCoursesService.deleteCourse.mockResolvedValue(true);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.deleteCourse).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v0.7'
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockReq.params = { id: '1' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-admin user', async () => {
      mockReq.user = { id: 5, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can delete courses',
          role: 'instructor',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockReq.user = { id: 10, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '999' };

      mockCoursesService.deleteCourse.mockResolvedValue(false);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
