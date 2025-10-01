import { Request, Response } from 'express';
import { coursesController } from '../courses.controller';
import { CoursesService } from '../../services/courses.service';
import { CourseValidator } from '../../utils/validation';

jest.mock('../../utils/validation');

describe('coursesController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockValidator = CourseValidator as jest.Mocked<typeof CourseValidator>;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: undefined,
      requestId: 'test-request-id'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('index', () => {
    let listCoursesSpy: jest.SpyInstance;

    beforeEach(() => {
      mockValidator.validatePagination.mockReturnValue({ page: 1, limit: 10 });
      mockValidator.sanitizeSearch.mockReturnValue(undefined);
      listCoursesSpy = jest.spyOn(CoursesService, 'listCourses').mockResolvedValue({
        courses: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });
    });

    afterEach(() => {
      listCoursesSpy.mockRestore();
    });

    it('should list published courses for unauthenticated users', async () => {
      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(listCoursesSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        published_only: true,
        search: undefined
      });
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should list published courses for students', async () => {
      mockReq.user = { id: 4, email: 'student@example.com', role: 'student' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(listCoursesSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        published_only: true,
        search: undefined
      });
    });

    it('should list own courses for instructors', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(listCoursesSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        instructor_id: 2,
        search: undefined
      });
    });

    it('should list all courses for admin', async () => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(listCoursesSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
    });

    it('should pass search parameter', async () => {
      mockReq.query = { search: 'javascript' };
      mockValidator.sanitizeSearch.mockReturnValue('javascript');

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(listCoursesSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        published_only: true,
        search: 'javascript'
      });
    });

    it('should return courses with pagination', async () => {
      const mockCourses = [
        { id: 1, title: 'Course 1' },
        { id: 2, title: 'Course 2' }
      ];
      listCoursesSpy.mockResolvedValue({
        courses: mockCourses,
        pagination: { total: 25, page: 1, limit: 10, totalPages: 3 }
      });

      await coursesController.index(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourses,
        pagination: { total: 25, page: 1, limit: 10, totalPages: 3 },
        version: expect.any(String)
      });
    });
  });

  describe('create', () => {
    let createCourseSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.body = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 9999
      };
      createCourseSpy = jest.spyOn(CoursesService, 'createCourse');
    });

    afterEach(() => {
      createCourseSpy.mockRestore();
    });

    it('should require authentication', async () => {
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

    it('should return validation errors', async () => {
      mockValidator.validateCreateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Title is required' }]
      });

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course data',
          details: [{ field: 'title', message: 'Title is required' }],
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should create course successfully', async () => {
      mockValidator.validateCreateCourse.mockReturnValue({ isValid: true, errors: [] });
      mockValidator.normalizePrice.mockReturnValue(9999);
      const mockCourse = { id: 1, title: 'Test Course', instructor_id: 2 };
      createCourseSpy.mockResolvedValue(mockCourse);

      await coursesController.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: expect.any(String)
      });
    });
  });

  describe('show', () => {
    let getCourseByIdSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.params = { id: '1' };
      getCourseByIdSpy = jest.spyOn(CoursesService, 'getCourseById');
    });

    afterEach(() => {
      getCourseByIdSpy.mockRestore();
    });

    it('should return 404 when course not found', async () => {
      getCourseByIdSpy.mockResolvedValue(null);

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

    it('should return 404 for unpublished course when not owner', async () => {
      mockReq.user = { id: 3, email: 'other@example.com', role: 'instructor' };
      const mockCourse = { id: 1, title: 'Test', published: false, instructor_id: 2 };
      getCourseByIdSpy.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return unpublished course for owner', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const mockCourse = { id: 1, title: 'Test', published: false, instructor_id: 2 };
      getCourseByIdSpy.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: expect.any(String)
      });
    });

    it('should return published course for everyone', async () => {
      const mockCourse = { id: 1, title: 'Test', published: true, instructor_id: 2 };
      getCourseByIdSpy.mockResolvedValue(mockCourse);

      await coursesController.show(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: expect.any(String)
      });
    });
  });

  describe('update', () => {
    let canModifyCourseSpy: jest.SpyInstance;
    let updateCourseSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      mockReq.body = { title: 'Updated Title' };
      canModifyCourseSpy = jest.spyOn(CoursesService, 'canModifyCourse');
      updateCourseSpy = jest.spyOn(CoursesService, 'updateCourse');
    });

    afterEach(() => {
      canModifyCourseSpy.mockRestore();
      updateCourseSpy.mockRestore();
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return validation errors', async () => {
      mockValidator.validateUpdateCourse.mockReturnValue({
        isValid: false,
        errors: [{ field: 'title', message: 'Invalid title' }]
      });

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      mockValidator.validateUpdateCourse.mockReturnValue({ isValid: true, errors: [] });
      canModifyCourseSpy.mockResolvedValue(true);
      updateCourseSpy.mockResolvedValue(null);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user cannot modify course', async () => {
      mockValidator.validateUpdateCourse.mockReturnValue({ isValid: true, errors: [] });
      canModifyCourseSpy.mockResolvedValue(false);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should update course successfully', async () => {
      mockValidator.validateUpdateCourse.mockReturnValue({ isValid: true, errors: [] });
      const mockUpdated = { id: 1, title: 'Updated Title', instructor_id: 2 };
      canModifyCourseSpy.mockResolvedValue(true);
      updateCourseSpy.mockResolvedValue(mockUpdated);

      await coursesController.update(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockUpdated,
        version: expect.any(String)
      });
    });
  });

  describe('remove', () => {
    let deleteCourseSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '1' };
      deleteCourseSpy = jest.spyOn(CoursesService, 'deleteCourse');
    });

    afterEach(() => {
      deleteCourseSpy.mockRestore();
    });

    it('should require admin role', async () => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when course not found', async () => {
      deleteCourseSpy.mockResolvedValue(false);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should delete course successfully', async () => {
      deleteCourseSpy.mockResolvedValue(true);

      await coursesController.remove(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: expect.any(String)
      });
    });
  });

  describe('publish', () => {
    let togglePublishedSpy: jest.SpyInstance;
    let canModifyCourseSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      togglePublishedSpy = jest.spyOn(CoursesService, 'togglePublished');
      canModifyCourseSpy = jest.spyOn(CoursesService, 'canModifyCourse');
    });

    afterEach(() => {
      togglePublishedSpy.mockRestore();
      canModifyCourseSpy.mockRestore();
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when course not found', async () => {
      togglePublishedSpy.mockResolvedValue(null);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user cannot modify course', async () => {
      const mockCourse = { id: 1, title: 'Test', published: true, instructor_id: 3 };
      togglePublishedSpy.mockResolvedValue(mockCourse);
      canModifyCourseSpy.mockReturnValue(false);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should publish course successfully', async () => {
      const mockCourse = { id: 1, title: 'Test', published: true, instructor_id: 2 };
      canModifyCourseSpy.mockResolvedValue(true);
      togglePublishedSpy.mockResolvedValue(mockCourse);

      await coursesController.publish(mockReq as Request, mockRes as Response);

      expect(canModifyCourseSpy).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(togglePublishedSpy).toHaveBeenCalledWith(1, true);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockCourse,
        version: expect.any(String)
      });
    });
  });

  describe('unpublish', () => {
    let togglePublishedSpy: jest.SpyInstance;
    let canModifyCourseSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '1' };
      togglePublishedSpy = jest.spyOn(CoursesService, 'togglePublished');
      canModifyCourseSpy = jest.spyOn(CoursesService, 'canModifyCourse');
    });

    afterEach(() => {
      togglePublishedSpy.mockRestore();
      canModifyCourseSpy.mockRestore();
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should unpublish course successfully', async () => {
      const mockCourse = { id: 1, title: 'Test', published: false, instructor_id: 2 };
      canModifyCourseSpy.mockResolvedValue(true);
      togglePublishedSpy.mockResolvedValue(mockCourse);

      await coursesController.unpublish(mockReq as Request, mockRes as Response);

      expect(canModifyCourseSpy).toHaveBeenCalledWith(1, 2, 'instructor');
      expect(togglePublishedSpy).toHaveBeenCalledWith(1, false);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course unpublished successfully',
        data: mockCourse,
        version: expect.any(String)
      });
    });
  });

  describe('overview', () => {
    let getCourseOverviewSpy: jest.SpyInstance;

    beforeEach(() => {
      mockReq.params = { id: '1' };
      getCourseOverviewSpy = jest.spyOn(CoursesService, 'getCourseOverview');
    });

    afterEach(() => {
      getCourseOverviewSpy.mockRestore();
    });

    it('should return 404 when course not found', async () => {
      getCourseOverviewSpy.mockResolvedValue(null);

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for unpublished course when not owner', async () => {
      mockReq.user = { id: 3, email: 'other@example.com', role: 'instructor' };
      const mockOverview = {
        id: 1,
        title: 'Test',
        description: 'Test course',
        published: false,
        instructor: { id: 2, name: 'Instructor', email: 'instructor@example.com' },
        lessons_count: 0,
        quizzes_count: 0,
        enrollments_count: 0
      };
      getCourseOverviewSpy.mockResolvedValue(mockOverview);

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return overview for published course', async () => {
      const mockOverview = {
        id: 1,
        title: 'Test',
        description: 'Test course',
        published: true,
        instructor: { id: 2, name: 'Instructor', email: 'instructor@example.com' },
        lessons_count: 1,
        quizzes_count: 0,
        enrollments_count: 5
      };
      getCourseOverviewSpy.mockResolvedValue(mockOverview);

      await coursesController.overview(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: expect.any(String)
      });
    });
  });
});
