/**
 * Tests for courses controller
 * 
 * Tests HTTP request handling, role-based access control, validation,
 * and error handling for all course endpoints.
 */

import { Request, Response } from 'express';
import { coursesController } from '../../src/controllers/courses.controller';
import { testUtils } from '../setup';

jest.mock('../../src/services/courses.service');
jest.mock('../../src/utils/validation');

const mockCoursesService = require('../../src/services/courses.service');
const mockCourseValidator = require('../../src/utils/validation');

describe('coursesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('index - List courses', () => {
    beforeEach(() => {
      mockCourseValidator.CourseValidator = {
        validatePagination: jest.fn().mockReturnValue({ page: 1, limit: 10 }),
        sanitizeSearch: jest.fn().mockReturnValue(undefined)
      };
    });

    it('should list published courses for unauthenticated users', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.query = {};
      const mockResult = {
        courses: [{ id: 1, title: 'Test Course', published: true }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      mockCoursesService.CoursesService.listCourses.mockResolvedValue(mockResult);

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v0.7'
      });
    });

    it('should list published courses for student users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.query = {};
      const mockResult = {
        courses: [{ id: 1, title: 'Test Course', published: true }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      mockCoursesService.CoursesService.listCourses.mockResolvedValue(mockResult);

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
    });

    it('should list own courses for instructor users', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@test.com', role: 'instructor' };
      mockReq.query = {};
      const mockResult = {
        courses: [{ id: 1, title: 'Instructor Course', instructor_id: 2 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      mockCoursesService.CoursesService.listCourses.mockResolvedValue(mockResult);

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 2
      });
    });

    it('should list all courses for admin users', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'admin@test.com', role: 'admin' };
      mockReq.query = {};
      const mockResult = {
        courses: [{ id: 1, title: 'Any Course' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
      mockCoursesService.CoursesService.listCourses.mockResolvedValue(mockResult);

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should handle search and pagination parameters', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockReq.query = { page: '2', limit: '5', q: 'javascript' };
      mockCourseValidator.CourseValidator.validatePagination.mockReturnValue({ page: 2, limit: 5 });
      mockCourseValidator.CourseValidator.sanitizeSearch.mockReturnValue('javascript');
      const mockResult = {
        courses: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 }
      };
      mockCoursesService.CoursesService.listCourses.mockResolvedValue(mockResult);

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCourseValidator.CourseValidator.validatePagination).toHaveBeenCalledWith(mockReq.query);
      expect(mockCourseValidator.CourseValidator.sanitizeSearch).toHaveBeenCalledWith('javascript');
      expect(mockCoursesService.CoursesService.listCourses).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'javascript',
        published_only: true
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      mockCoursesService.CoursesService.listCourses.mockRejectedValue(new Error('Database error'));

      // Act
      await coursesController.index(mockReq as Request, mockRes as Response);

      // Assert
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

  describe('create - Create course', () => {
    beforeEach(() => {
      mockCourseValidator.CourseValidator = {
        validateCreateCourse: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
        normalizePrice: jest.fn().mockReturnValue(2999)
      };
    });

    it('should create course for instructor', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = {
        title: 'New Course',
        description: 'Course Description',
        price_cents: 29.99
      };
      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: 'Course Description',
        price_cents: 2999,
        instructor_id: 1,
        published: false
      };
      mockCoursesService.CoursesService.createCourse.mockResolvedValue(mockCourse);

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCourseValidator.CourseValidator.validateCreateCourse).toHaveBeenCalledWith(mockReq.body);
      expect(mockCourseValidator.CourseValidator.normalizePrice).toHaveBeenCalledWith(29.99);
      expect(mockCoursesService.CoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: 'Course Description',
          price_cents: 2999,
          instructor_id: undefined
        },
        1,
        'instructor'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: 'v0.7'
      });
    });

    it('should create course for admin with specified instructor', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockReq.body = {
        title: 'New Course',
        description: 'Course Description',
        price_cents: 29.99,
        instructor_id: 2
      };
      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: 'Course Description',
        price_cents: 2999,
        instructor_id: 2,
        published: false
      };
      mockCoursesService.CoursesService.createCourse.mockResolvedValue(mockCourse);

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: 'Course Description',
          price_cents: 2999,
          instructor_id: 2
        },
        1,
        'admin'
      );
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 400 for validation errors', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = { title: '' };
      mockCourseValidator.CourseValidator.validateCreateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: [{ field: 'title', message: 'Title cannot be empty' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle permission errors', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = { title: 'New Course', price_cents: 2999 };
      mockCoursesService.CoursesService.createCourse.mockRejectedValue(
        new Error('Insufficient permissions to create course')
      );

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should handle service errors', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = { title: 'New Course', price_cents: 2999 };
      mockCoursesService.CoursesService.createCourse.mockRejectedValue(new Error('Database error'));

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should handle null description', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.body = {
        title: 'New Course',
        description: null,
        price_cents: 2999
      };
      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: null,
        price_cents: 2999,
        instructor_id: 1,
        published: false
      };
      mockCoursesService.CoursesService.createCourse.mockResolvedValue(mockCourse);

      // Act
      await coursesController.create(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: null,
          price_cents: 2999,
          instructor_id: undefined
        },
        1,
        'instructor'
      );
    });
  });

  describe('show - Get course details', () => {
    it('should return course for valid ID', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.getCourseById).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v0.7'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.params = { id: '999' };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(null);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 for unpublished course when user not authenticated', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = undefined;
      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 for unpublished course when student user', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'student@test.com', role: 'student' };
      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for unpublished course when non-owner instructor', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'instructor@test.com', role: 'instructor' };
      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should allow owner instructor to view unpublished course', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v0.7'
      });
    });

    it('should allow admin to view unpublished course', async () => {
      // Arrange
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'admin@test.com', role: 'admin' };
      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.getCourseById.mockResolvedValue(mockCourse);

      // Act
      await coursesController.show(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v0.7'
      });
    });
  });

  describe('update - Update course', () => {
    beforeEach(() => {
      mockCourseValidator.CourseValidator = {
        validateUpdateCourse: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
        normalizePrice: jest.fn().mockReturnValue(3999)
      };
    });

    it('should update course when user has permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: 'Updated Course',
        price_cents: 39.99
      };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      const mockUpdatedCourse = {
        id: 1,
        title: 'Updated Course',
        price_cents: 3999,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCourseValidator.CourseValidator.validateUpdateCourse).toHaveBeenCalledWith(mockReq.body);
      expect(mockCourseValidator.CourseValidator.normalizePrice).toHaveBeenCalledWith(39.99);
      expect(mockCoursesService.CoursesService.updateCourse).toHaveBeenCalledWith(1, {
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

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: 'invalid' };

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Course' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(false);

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
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
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: '' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      mockCourseValidator.CourseValidator.validateUpdateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: [{ field: 'title', message: 'Title cannot be empty' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '999' };
      mockReq.body = { title: 'Updated Course' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.CoursesService.updateCourse.mockResolvedValue(null);

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should allow admin to change instructor_id', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: 'Updated Course',
        instructor_id: 2
      };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      const mockUpdatedCourse = {
        id: 1,
        title: 'Updated Course',
        instructor_id: 2
      };
      mockCoursesService.CoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated Course',
        instructor_id: 2
      });
    });

    it('should ignore instructor_id for non-admin users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: 'Updated Course',
        instructor_id: 2
      };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      const mockUpdatedCourse = {
        id: 1,
        title: 'Updated Course',
        instructor_id: 1
      };
      mockCoursesService.CoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);

      // Act
      await coursesController.update(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated Course'
      });
    });
  });

  describe('remove - Delete course', () => {
    it('should delete course for admin user', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockCoursesService.CoursesService.deleteCourse.mockResolvedValue(true);

      // Act
      await coursesController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.deleteCourse).toHaveBeenCalledWith(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v0.7'
      });
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      // Act
      await coursesController.remove(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 403 for unauthenticated users', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      // Act
      await coursesController.remove(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for invalid course ID', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: 'invalid' };

      // Act
      await coursesController.remove(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      mockReq.params = { id: '999' };
      mockCoursesService.CoursesService.deleteCourse.mockResolvedValue(false);

      // Act
      await coursesController.remove(mockReq as Request, mockRes as Response);

      // Assert
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

  describe('publish - Publish course', () => {
    it('should publish course when user has permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      const mockPublishedCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.togglePublished.mockResolvedValue(mockPublishedCourse);

      // Act
      await coursesController.publish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCoursesService.CoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockPublishedCourse,
        version: 'v0.7'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      // Act
      await coursesController.publish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(false);

      // Act
      await coursesController.publish(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '999' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.CoursesService.togglePublished.mockResolvedValue(null);

      // Act
      await coursesController.publish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('unpublish - Unpublish course', () => {
    it('should unpublish course when user has permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      const mockUnpublishedCourse = {
        id: 1,
        title: 'Test Course',
        published: false,
        instructor_id: 1
      };
      mockCoursesService.CoursesService.togglePublished.mockResolvedValue(mockUnpublishedCourse);

      // Act
      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockCoursesService.CoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCoursesService.CoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockUnpublishedCourse,
        version: 'v0.7'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      // Act
      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(false);

      // Act
      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      // Assert
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

    it('should return 404 when course not found', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      mockReq.params = { id: '999' };
      mockCoursesService.CoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.CoursesService.togglePublished.mockResolvedValue(null);

      // Act
      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
