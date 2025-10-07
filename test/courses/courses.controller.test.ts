import { coursesController } from '../../src/controllers/courses.controller';
import { CoursesService } from '../../src/services/courses.service';
import { createMockRequest, createMockResponse, createMockCourse, mockUsers } from '../helpers/test-data';

jest.mock('../../src/services/courses.service');

describe('CoursesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('index', () => {
    it('should list published courses only for students', async () => {
      const mockResult = {
        courses: [createMockCourse({ published: true })],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue(mockResult);

      const req = createMockRequest(mockUsers.student, {}, {}, { page: '1', limit: '10' });
      const res = createMockResponse();

      await coursesController.index(req, res);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v1.9'
      });
    });

    it('should list own courses for instructors', async () => {
      const mockResult = {
        courses: [createMockCourse({ instructor_id: mockUsers.instructor1.id })],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue(mockResult);

      const req = createMockRequest(mockUsers.instructor1, {}, {}, { page: '1', limit: '10' });
      const res = createMockResponse();

      await coursesController.index(req, res);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: mockUsers.instructor1.id
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v1.9'
      });
    });

    it('should list all courses for admin', async () => {
      const mockResult = {
        courses: [createMockCourse()],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue(mockResult);

      const req = createMockRequest(mockUsers.admin, {}, {}, { page: '1', limit: '10' });
      const res = createMockResponse();

      await coursesController.index(req, res);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.courses,
        pagination: mockResult.pagination,
        version: 'v1.9'
      });
    });
  });

  describe('create', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined);
      const res = createMockResponse();

      await coursesController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      });
    });

    it('should validate course data', async () => {
      const req = createMockRequest(mockUsers.instructor1, {}, { title: '' });
      const res = createMockResponse();

      await coursesController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
    });

    it('should create course successfully', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Description',
        price_cents: 9900
      };
      const mockCourse = createMockCourse(courseData);

      (CoursesService.createCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(mockUsers.instructor1, {}, courseData);
      const res = createMockResponse();

      await coursesController.create(req, res);

      expect(CoursesService.createCourse).toHaveBeenCalledWith(
        courseData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });
  });

  describe('show', () => {
    it('should show published course to anyone', async () => {
      const mockCourse = createMockCourse({ published: true });

      (CoursesService.getCourseById as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();

      await coursesController.show(req, res);

      expect(CoursesService.getCourseById).toHaveBeenCalledWith(1, true);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should deny unpublished course to unauthenticated users', async () => {
      const mockCourse = createMockCourse({ published: false });

      (CoursesService.getCourseById as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();

      await coursesController.show(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        })
      });
    });

    it('should show unpublished course to instructor owner', async () => {
      const mockCourse = createMockCourse({ published: false, instructor_id: mockUsers.instructor1.id });

      (CoursesService.getCourseById as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' });
      const res = createMockResponse();

      await coursesController.show(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should show unpublished course to admin', async () => {
      const mockCourse = createMockCourse({ published: false, instructor_id: mockUsers.instructor1.id });

      (CoursesService.getCourseById as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(mockUsers.admin, { id: '1' });
      const res = createMockResponse();

      await coursesController.show(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      (CoursesService.getCourseById as jest.Mock) = jest.fn().mockResolvedValue(null);

      const req = createMockRequest(undefined, { id: '999' });
      const res = createMockResponse();

      await coursesController.show(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'COURSE_NOT_FOUND'
        })
      });
    });
  });

  describe('update', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();

      await coursesController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should check permissions', async () => {
      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(false);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, { title: 'Updated' });
      const res = createMockResponse();

      await coursesController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should validate update data', async () => {
      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, { title: '' });
      const res = createMockResponse();

      await coursesController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update course successfully', async () => {
      const updateData = { title: 'Updated Title' };
      const mockCourse = createMockCourse(updateData);

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.updateCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, updateData);
      const res = createMockResponse();

      await coursesController.update(req, res);

      expect(CoursesService.updateCourse).toHaveBeenCalledWith(1, updateData);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });
  });

  describe('remove', () => {
    it('should require admin role', async () => {
      const req = createMockRequest(mockUsers.instructor1, { id: '1' });
      const res = createMockResponse();

      await coursesController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should delete course successfully', async () => {
      (CoursesService.deleteCourse as jest.Mock) = jest.fn().mockResolvedValue(true);

      const req = createMockRequest(mockUsers.admin, { id: '1' });
      const res = createMockResponse();

      await coursesController.remove(req, res);

      expect(CoursesService.deleteCourse).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course deleted successfully',
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      (CoursesService.deleteCourse as jest.Mock) = jest.fn().mockResolvedValue(false);

      const req = createMockRequest(mockUsers.admin, { id: '999' });
      const res = createMockResponse();

      await coursesController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('publish', () => {
    it('should require authentication', async () => {
      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();

      await coursesController.publish(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should check permissions', async () => {
      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(false);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' });
      const res = createMockResponse();

      await coursesController.publish(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should toggle published status', async () => {
      const mockCourse = createMockCourse({ published: true });

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      const req = createMockRequest(mockUsers.instructor1, { id: '1' }, { published: true });
      const res = createMockResponse();

      await coursesController.publish(req, res);

      expect(CoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Course published successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });
  });

  describe('overview', () => {
    it('should return course overview for published course', async () => {
      const mockOverview = {
        ...createMockCourse({ published: true }),
        instructor: {
          id: 2,
          name: 'Instructor One',
          email: 'instructor1@test.com'
        },
        lesson_count: 5,
        total_enrollments: 10,
        active_enrollments: 8,
        completed_count: 2,
        avg_progress: 60.5
      };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(mockOverview);

      const req = createMockRequest(undefined, { id: '1' });
      const res = createMockResponse();

      await coursesController.overview(req, res);

      expect(CoursesService.getCourseOverview).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });

    it('should return 404 when course not found', async () => {
      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(null);

      const req = createMockRequest(undefined, { id: '999' });
      const res = createMockResponse();

      await coursesController.overview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
