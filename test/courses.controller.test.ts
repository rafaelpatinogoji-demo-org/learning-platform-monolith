import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { coursesController } from '../src/controllers/courses.controller';
import { CoursesService } from '../src/services/courses.service';
import { CourseValidator } from '../src/utils/validation';

jest.mock('../src/services/courses.service');
jest.mock('../src/utils/validation');

const mockCoursesService = CoursesService as jest.Mocked<typeof CoursesService>;
const mockCourseValidator = CourseValidator as jest.Mocked<typeof CourseValidator>;

interface MockRequest extends Partial<Request> {
  user?: { id: number; email: string; role: string };
  params?: any;
  query?: any;
  body?: any;
  requestId?: string;
}

interface MockResponse extends Partial<Response> {
  status: jest.MockedFunction<any>;
  json: jest.MockedFunction<any>;
}

describe('CoursesController', () => {
  let mockReq: MockRequest;
  let mockRes: MockResponse;

  beforeEach(() => {
    mockReq = {
      requestId: 'test-request-id',
      params: {},
      query: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('index', () => {
    beforeEach(() => {
      mockCourseValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockCourseValidator.sanitizeSearch.mockReturnValue(undefined);
    });

    it('should list published courses for unauthenticated users', async () => {
      const mockResult = {
        courses: [{ 
          id: 1, 
          title: 'Test Course', 
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 123,
          created_at: new Date()
        }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      mockCoursesService.listCourses.mockResolvedValue(mockResult);

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v1.9'
      });
    });

    it('should filter courses for instructor role', async () => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };

      const mockResult = { courses: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockCoursesService.listCourses.mockResolvedValue(mockResult);

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 123
      });
    });

    it('should show all courses for admin', async () => {
      mockReq.user = { id: 123, email: 'admin@test.com', role: 'admin' };

      const mockResult = { courses: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockCoursesService.listCourses.mockResolvedValue(mockResult);

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should handle search queries', async () => {
      mockReq.query = { q: 'javascript' };
      mockCourseValidator.sanitizeSearch.mockReturnValue('javascript');

      const mockResult = { courses: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      mockCoursesService.listCourses.mockResolvedValue(mockResult);

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'javascript',
        published_only: true
      });
    });

    it('should handle errors', async () => {
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
    beforeEach(() => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999
      };
    });

    it('should create course successfully', async () => {
      const validationResult = { isValid: true, errors: [] };
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: false,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCourseValidator.validateCreateCourse.mockReturnValue(validationResult);
      mockCourseValidator.normalizePrice.mockReturnValue(1999);
      mockCoursesService.createCourse.mockResolvedValue(mockCourse);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          instructor_id: undefined
        },
        123,
        'instructor'
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should reject unauthenticated requests', async () => {
      mockReq.user = undefined;

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

    it('should reject invalid course data', async () => {
      const validationResult = {
        isValid: false,
        errors: [{ field: 'title', message: 'Title is required' }]
      };

      mockCourseValidator.validateCreateCourse.mockReturnValue(validationResult);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: validationResult.errors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle permission errors', async () => {
      const validationResult = { isValid: true, errors: [] };
      mockCourseValidator.validateCreateCourse.mockReturnValue(validationResult);
      mockCourseValidator.normalizePrice.mockReturnValue(1999);
      mockCoursesService.createCourse.mockRejectedValue(new Error('Insufficient permissions to create course'));

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to create course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should normalize price before creating', async () => {
      const validationResult = { isValid: true, errors: [] };
      mockReq.body.price_cents = 19.99;
      
      mockCourseValidator.validateCreateCourse.mockReturnValue(validationResult);
      mockCourseValidator.normalizePrice.mockReturnValue(1999);
      mockCoursesService.createCourse.mockResolvedValue({} as any);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.normalizePrice).toHaveBeenCalledWith(19.99);
      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ price_cents: 1999 }),
        123,
        'instructor'
      );
    });
  });

  describe('show', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
    });

    it('should show published course to unauthenticated users', async () => {
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: true,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.getCourseById).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should hide unpublished course from students', async () => {
      mockReq.user = { id: 456, email: 'student@test.com', role: 'student' };
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: false,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should show unpublished course to course owner', async () => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: false,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should show unpublished course to admin', async () => {
      mockReq.user = { id: 456, email: 'admin@test.com', role: 'admin' };
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: false,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
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
          message: 'Course ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockCoursesService.getCourseById.mockResolvedValue(null);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course' };
    });

    it('should update course successfully', async () => {
      const validationResult = { isValid: true, errors: [] };
      const mockCourse = { 
        id: 1, 
        title: 'Updated Course', 
        description: 'Test Description',
        price_cents: 1999,
        published: true,
        instructor_id: 123,
        created_at: new Date()
      };

      mockCourseValidator.validateUpdateCourse.mockReturnValue(validationResult);
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue(mockCourse);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.canModifyCourse).toHaveBeenCalledWith(1, 123, 'instructor');
      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, { title: 'Updated Course' });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should reject unauthorized updates', async () => {
      const validationResult = { isValid: true, errors: [] };
      mockCourseValidator.validateUpdateCourse.mockReturnValue(validationResult);
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

    it('should reject invalid update data', async () => {
      const validationResult = {
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      };

      mockCourseValidator.validateUpdateCourse.mockReturnValue(validationResult);
      mockCoursesService.canModifyCourse.mockResolvedValue(true);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: validationResult.errors,
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      const validationResult = { isValid: true, errors: [] };
      mockCourseValidator.validateUpdateCourse.mockReturnValue(validationResult);
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue(null);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should normalize price when updating', async () => {
      const validationResult = { isValid: true, errors: [] };
      mockReq.body = { price_cents: 29.99 };
      
      mockCourseValidator.validateUpdateCourse.mockReturnValue(validationResult);
      mockCourseValidator.normalizePrice.mockReturnValue(2999);
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.updateCourse.mockResolvedValue({} as any);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.normalizePrice).toHaveBeenCalledWith(29.99);
      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ price_cents: 2999 })
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockReq.user = { id: 123, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '1' };
    });

    it('should delete course as admin', async () => {
      mockCoursesService.deleteCourse.mockResolvedValue(true);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.deleteCourse).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v1.9'
      });
    });

    it('should reject non-admin users', async () => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can delete courses',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockCoursesService.deleteCourse.mockResolvedValue(false);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
    });

    it('should publish course', async () => {
      const mockCourse = { 
        id: 1, 
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: true,
        instructor_id: 123,
        created_at: new Date()
      };
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockCourse);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should reject unauthorized publish', async () => {
      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to publish this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(null);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('unpublish', () => {
    beforeEach(() => {
      mockReq.user = { id: 123, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
    });

    it('should unpublish course', async () => {
      const mockCourse = { 
        id: 1, 
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: false,
        instructor_id: 123,
        created_at: new Date()
      };
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockCourse);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should reject unauthorized unpublish', async () => {
      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to unpublish this course',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('overview', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
    });

    it('should return course overview', async () => {
      const mockOverview = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor: { id: 123, name: 'John Doe' },
        totalLessons: 10,
        enrollments: { active: 5, completed: 3 },
        averageProgress: 75,
        quizzes: { total: 2, totalQuestions: 8 },
        certificatesIssued: 3,
        updatedAt: new Date()
      };

      mockCoursesService.getCourseOverview.mockResolvedValue(mockOverview);

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.getCourseOverview).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent course', async () => {
      mockCoursesService.getCourseOverview.mockResolvedValue(null);

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.params = { id: 'invalid' };

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_ID',
          message: 'Course ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle errors', async () => {
      mockCoursesService.getCourseOverview.mockRejectedValue(new Error('Database error'));

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get course overview',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });
  });
});
