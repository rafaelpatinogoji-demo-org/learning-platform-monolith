import { Request, Response } from 'express';
import { coursesController } from '../src/controllers/courses.controller';
import { CoursesService } from '../src/services/courses.service';
import { CourseValidator } from '../src/utils/validation';

jest.mock('../src/services/courses.service');
jest.mock('../src/utils/validation');

describe('CoursesController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      params: {},
      query: {},
      body: {},
      requestId: 'test-request-id'
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('index - List courses', () => {
    it('should list published courses for unauthenticated users', async () => {
      const mockResult = {
        courses: [
          { id: 1, title: 'Course 1', published: true },
          { id: 2, title: 'Course 2', published: true }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      (CourseValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CourseValidator.sanitizeSearch as jest.Mock).mockReturnValue(undefined);
      (CoursesService.listCourses as jest.Mock).mockResolvedValue(mockResult);

      await coursesController.index(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v1.9'
      });
    });

    it('should list only instructor own courses', async () => {
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      const mockResult = {
        courses: [{ id: 1, title: 'My Course', published: false }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      (CourseValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CourseValidator.sanitizeSearch as jest.Mock).mockReturnValue(undefined);
      (CoursesService.listCourses as jest.Mock).mockResolvedValue(mockResult);

      await coursesController.index(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 10
      });
    });

    it('should list all courses for admin', async () => {
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };

      const mockResult = {
        courses: [
          { id: 1, title: 'Course 1', published: true },
          { id: 2, title: 'Course 2', published: false }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      (CourseValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CourseValidator.sanitizeSearch as jest.Mock).mockReturnValue(undefined);
      (CoursesService.listCourses as jest.Mock).mockResolvedValue(mockResult);

      await coursesController.index(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should handle search query', async () => {
      mockRequest.query = { q: 'JavaScript' };

      const mockResult = {
        courses: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };

      (CourseValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CourseValidator.sanitizeSearch as jest.Mock).mockReturnValue('JavaScript');
      (CoursesService.listCourses as jest.Mock).mockResolvedValue(mockResult);

      await coursesController.index(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'JavaScript',
        published_only: true
      });
    });

    it('should handle errors', async () => {
      (CourseValidator.validatePagination as jest.Mock).mockReturnValue({ page: 1, limit: 10 });
      (CourseValidator.sanitizeSearch as jest.Mock).mockReturnValue(undefined);
      (CoursesService.listCourses as jest.Mock).mockRejectedValue(new Error('Database error'));

      await coursesController.index(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
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
    it('should create course for instructor', async () => {
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = {
        title: 'New Course',
        description: 'Course description',
        price_cents: 1999
      };

      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: 'Course description',
        price_cents: 1999,
        published: false,
        instructor_id: 10,
        created_at: new Date()
      };

      (CourseValidator.validateCreateCourse as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (CourseValidator.normalizePrice as jest.Mock).mockReturnValue(1999);
      (CoursesService.createCourse as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.create(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.body = { title: 'New Course', price_cents: 1999 };

      await coursesController.create(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
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
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: '', price_cents: -100 };

      (CourseValidator.validateCreateCourse as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [
          { field: 'title', message: 'Title cannot be empty' },
          { field: 'price_cents', message: 'Price cannot be negative' }
        ]
      });

      await coursesController.create(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: [
            { field: 'title', message: 'Title cannot be empty' },
            { field: 'price_cents', message: 'Price cannot be negative' }
          ],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 403 when insufficient permissions', async () => {
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: 'New Course', price_cents: 1999 };

      (CourseValidator.validateCreateCourse as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (CourseValidator.normalizePrice as jest.Mock).mockReturnValue(1999);
      (CoursesService.createCourse as jest.Mock).mockRejectedValue(
        new Error('Insufficient permissions to create course')
      );

      await coursesController.create(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('show - Get course details', () => {
    it('should get published course', async () => {
      mockRequest.params = { id: '1' };

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999,
        published: true,
        instructor_id: 10,
        created_at: new Date(),
        instructor: { id: 10, name: 'John Doe' }
      };

      (CoursesService.getCourseById as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should return 400 for invalid course ID', async () => {
      mockRequest.params = { id: 'invalid' };

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
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
      mockRequest.params = { id: '999' };

      (CoursesService.getCourseById as jest.Mock).mockResolvedValue(null);

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should hide unpublished course from unauthenticated users', async () => {
      mockRequest.params = { id: '1' };

      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 10
      };

      (CoursesService.getCourseById as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should show unpublished course to owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 10
      };

      (CoursesService.getCourseById as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should hide unpublished course from non-owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 20, email: 'other@test.com', role: 'instructor' };

      const mockCourse = {
        id: 1,
        title: 'Unpublished Course',
        published: false,
        instructor_id: 10
      };

      (CoursesService.getCourseById as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.show(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('update - Update course', () => {
    it('should update course for owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: 'Updated Title' };

      const mockCourse = {
        id: 1,
        title: 'Updated Title',
        description: 'Test Description',
        price_cents: 1999,
        published: true,
        instructor_id: 10,
        created_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(true);
      (CourseValidator.validateUpdateCourse as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });
      (CoursesService.updateCourse as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.update(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated Title' };

      await coursesController.update(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 when user cannot modify course', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 20, email: 'other@test.com', role: 'instructor' };
      mockRequest.body = { title: 'Updated Title' };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(false);

      await coursesController.update(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
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
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };
      mockRequest.body = { title: '', price_cents: -100 };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(true);
      (CourseValidator.validateUpdateCourse as jest.Mock).mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title cannot be empty' }]
      });

      await coursesController.update(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('remove - Delete course', () => {
    it('should delete course for admin', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };

      (CoursesService.deleteCourse as jest.Mock).mockResolvedValue(true);

      await coursesController.remove(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 403 for non-admin users', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      await coursesController.remove(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can delete courses',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.user = { id: 1, email: 'admin@test.com', role: 'admin' };

      (CoursesService.deleteCourse as jest.Mock).mockResolvedValue(false);

      await coursesController.remove(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('publish - Publish course', () => {
    it('should publish course for owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 10,
        created_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.publish(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should return 403 when user cannot modify course', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 20, email: 'other@test.com', role: 'instructor' };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(false);

      await coursesController.publish(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('unpublish - Unpublish course', () => {
    it('should unpublish course for owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      const mockCourse = {
        id: 1,
        title: 'Test Course',
        published: false,
        instructor_id: 10,
        created_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock).mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock).mockResolvedValue(mockCourse);

      await coursesController.unpublish(mockRequest as Request, mockResponse as Response);

      expect(CoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });
  });

  describe('overview - Get course overview', () => {
    it('should get course overview for published course', async () => {
      mockRequest.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor: { id: 10, name: 'John Doe' },
        totalLessons: 5,
        enrollments: { active: 10, completed: 3 },
        averageProgress: 65,
        quizzes: { total: 2, totalQuestions: 10 },
        certificatesIssued: 3,
        updatedAt: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock).mockResolvedValue(mockOverview);

      await coursesController.overview(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      mockRequest.params = { id: '999' };

      (CoursesService.getCourseOverview as jest.Mock).mockResolvedValue(null);

      await coursesController.overview(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should hide unpublished course overview from unauthenticated users', async () => {
      mockRequest.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Test Course',
        published: false,
        instructor: { id: 10, name: 'John Doe' },
        totalLessons: 5,
        enrollments: { active: 0, completed: 0 },
        averageProgress: 0,
        quizzes: { total: 0, totalQuestions: 0 },
        certificatesIssued: 0,
        updatedAt: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock).mockResolvedValue(mockOverview);

      await coursesController.overview(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should show unpublished course overview to owner instructor', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 10, email: 'instructor@test.com', role: 'instructor' };

      const mockOverview = {
        id: 1,
        title: 'Test Course',
        published: false,
        instructor: { id: 10, name: 'John Doe' },
        totalLessons: 5,
        enrollments: { active: 0, completed: 0 },
        averageProgress: 0,
        quizzes: { total: 0, totalQuestions: 0 },
        certificatesIssued: 0,
        updatedAt: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock).mockResolvedValue(mockOverview);

      await coursesController.overview(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });
  });
});
