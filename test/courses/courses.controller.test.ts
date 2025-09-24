/**
 * Tests for courses controller
 * 
 * Tests all CRUD operations, role-based authorization, validation,
 * and error handling without any database dependencies.
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
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    jest.clearAllMocks();
  });

  describe('index - List courses', () => {
    const mockCourses = [
      {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        instructor: { id: 1, name: 'Test Instructor' }
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
      mockCoursesService.listCourses.mockResolvedValue({
        courses: mockCourses,
        pagination: mockPagination
      });
    });

    it('should return published courses for unauthenticated users', async () => {
      mockReq.user = undefined;

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

    it('should return published courses for student users', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
    });

    it('should return instructor own courses for instructor users', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 2
      });
    });

    it('should return all courses for admin users', async () => {
      mockReq.user = { id: 3, email: 'admin@example.com', role: 'admin' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should handle search and pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '5', q: 'javascript' };
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockCourseValidator.validatePagination.mockReturnValue({ page: 2, limit: 5 });
      mockCourseValidator.sanitizeSearch.mockReturnValue('javascript');

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.validatePagination).toHaveBeenCalledWith(mockReq.query);
      expect(mockCourseValidator.sanitizeSearch).toHaveBeenCalledWith('javascript');
      expect(mockCoursesService.listCourses).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'javascript'
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

  describe('create - Create course', () => {
    const validCourseData = {
      title: 'New Course',
      description: 'Course description',
      price_cents: 9999
    };

    const mockCreatedCourse = {
      id: 1,
      title: 'New Course',
      description: 'Course description',
      price_cents: 9999,
      published: false,
      instructor_id: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCourseValidator.validateCreateCourse.mockReturnValue({ isValid: true, errors: [] });
      mockCourseValidator.normalizePrice.mockReturnValue(9999);
      mockCoursesService.createCourse.mockResolvedValue(mockCreatedCourse);
    });

    it('should create course successfully for instructor', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.body = validCourseData;

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCourseValidator.validateCreateCourse).toHaveBeenCalledWith(validCourseData);
      expect(mockCourseValidator.normalizePrice).toHaveBeenCalledWith(9999);
      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: 'Course description',
          price_cents: 9999,
          instructor_id: undefined
        },
        1,
        'instructor'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCreatedCourse,
        version: 'v0.7'
      });
    });

    it('should create course successfully for admin with instructor_id', async () => {
      mockReq.user = { id: 2, email: 'admin@example.com', role: 'admin' };
      mockReq.body = { ...validCourseData, instructor_id: 3 };

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.createCourse).toHaveBeenCalledWith(
        {
          title: 'New Course',
          description: 'Course description',
          price_cents: 9999,
          instructor_id: 3
        },
        2,
        'admin'
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = validCourseData;

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

    it('should return 400 when validation fails', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
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
          details: [{ field: 'title', message: 'Title cannot be empty' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when service throws permissions error', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = validCourseData;
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

    it('should handle service errors', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.body = validCourseData;
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

  describe('show - Get course details', () => {
    const mockCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: true,
      instructor_id: 2,
      created_at: new Date(),
      instructor: { id: 2, name: 'Test Instructor' }
    };

    beforeEach(() => {
      mockCoursesService.getCourseById.mockResolvedValue(mockCourse);
    });

    it('should return course details for valid ID', async () => {
      mockReq.params = { id: '1' };

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
          message: 'Course ID must be a valid number',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when course not found', async () => {
      mockReq.params = { id: '999' };
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

    it('should return 404 for unpublished course when user is not authenticated', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = undefined;
      const unpublishedCourse = { ...mockCourse, published: false };
      mockCoursesService.getCourseById.mockResolvedValue(unpublishedCourse);

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

    it('should return 404 for unpublished course when student tries to access', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      const unpublishedCourse = { ...mockCourse, published: false };
      mockCoursesService.getCourseById.mockResolvedValue(unpublishedCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for unpublished course when non-owner instructor tries to access', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 3, email: 'other-instructor@example.com', role: 'instructor' };
      const unpublishedCourse = { ...mockCourse, published: false, instructor_id: 2 };
      mockCoursesService.getCourseById.mockResolvedValue(unpublishedCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should allow owner instructor to view unpublished course', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const unpublishedCourse = { ...mockCourse, published: false, instructor_id: 2 };
      mockCoursesService.getCourseById.mockResolvedValue(unpublishedCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: unpublishedCourse,
        version: 'v0.7'
      });
    });

    it('should allow admin to view unpublished course', async () => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 3, email: 'admin@example.com', role: 'admin' };
      const unpublishedCourse = { ...mockCourse, published: false };
      mockCoursesService.getCourseById.mockResolvedValue(unpublishedCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: unpublishedCourse,
        version: 'v0.7'
      });
    });
  });

  describe('update - Update course', () => {
    const mockUpdatedCourse = {
      id: 1,
      title: 'Updated Course',
      description: 'Updated Description',
      price_cents: 19999,
      published: false,
      instructor_id: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCourseValidator.validateUpdateCourse.mockReturnValue({ isValid: true, errors: [] });
      mockCourseValidator.normalizePrice.mockReturnValue(19999);
      mockCoursesService.updateCourse.mockResolvedValue(mockUpdatedCourse);
    });

    it('should update course successfully', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 19999
      };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCourseValidator.validateUpdateCourse).toHaveBeenCalledWith(mockReq.body);
      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated Course',
        description: 'Updated Description',
        price_cents: 19999
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockUpdatedCourse,
        version: 'v0.7'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: 'invalid' };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 when user cannot modify course', async () => {
      mockReq.user = { id: 2, email: 'other-instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
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

    it('should return 400 when validation fails', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: '' };
      mockCourseValidator.validateUpdateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should allow admin to change instructor_id', async () => {
      mockReq.user = { id: 3, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '1' };
      mockReq.body = { instructor_id: 5 };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, {
        instructor_id: 5
      });
    });

    it('should ignore instructor_id for non-admin users', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated', instructor_id: 5 };

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.updateCourse).toHaveBeenCalledWith(1, {
        title: 'Updated'
      });
    });

    it('should return 404 when course not found', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated' };
      mockCoursesService.updateCourse.mockResolvedValue(null);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('remove - Delete course', () => {
    it('should delete course successfully for admin', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
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

    it('should return 403 for non-admin users', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };

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

    it('should return 403 for unauthenticated users', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for invalid course ID', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: 'invalid' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '999' };
      mockCoursesService.deleteCourse.mockResolvedValue(false);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('publish - Publish course', () => {
    const mockPublishedCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: true,
      instructor_id: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockPublishedCourse);
    });

    it('should publish course successfully', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockPublishedCourse,
        version: 'v0.7'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user cannot modify course', async () => {
      mockReq.user = { id: 2, email: 'other-instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when course not found', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.togglePublished.mockResolvedValue(null);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('unpublish - Unpublish course', () => {
    const mockUnpublishedCourse = {
      id: 1,
      title: 'Test Course',
      description: 'Test Description',
      price_cents: 9999,
      published: false,
      instructor_id: 1,
      created_at: new Date()
    };

    beforeEach(() => {
      mockCoursesService.canModifyCourse.mockResolvedValue(true);
      mockCoursesService.togglePublished.mockResolvedValue(mockUnpublishedCourse);
    });

    it('should unpublish course successfully', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockCoursesService.canModifyCourse).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockCoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockUnpublishedCourse,
        version: 'v0.7'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: '1' };

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user cannot modify course', async () => {
      mockReq.user = { id: 2, email: 'other-instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.canModifyCourse.mockResolvedValue(false);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when course not found', async () => {
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockCoursesService.togglePublished.mockResolvedValue(null);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
