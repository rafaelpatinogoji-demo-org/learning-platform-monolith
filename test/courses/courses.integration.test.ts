import { Request, Response } from 'express';
import { coursesController } from '../../src/controllers/courses.controller';
import { CoursesService } from '../../src/services/courses.service';

jest.mock('../../src/services/courses.service');

describe('Courses Controller Integration Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      user: undefined,
      params: {},
      body: {},
      query: {},
      requestId: 'test-request-id'
    };

    res = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('GET /courses', () => {
    it('should list only published courses for public access', async () => {
      const mockCourses = [
        {
          id: 1,
          title: 'Published Course',
          description: 'Description',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John Doe',
          instructor_email: 'john@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue({
        courses: mockCourses,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });

      await coursesController.index(req as Request, res as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        published_only: true
      });
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockCourses,
        pagination: expect.any(Object),
        version: expect.any(String)
      });
    });

    it('should list instructor courses for instructor role', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };

      const mockCourses = [
        {
          id: 1,
          title: 'My Course',
          description: 'Description',
          price_cents: 9999,
          published: false,
          instructor_id: 1,
          instructor_name: 'Instructor',
          instructor_email: 'instructor@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue({
        courses: mockCourses,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });

      await coursesController.index(req as Request, res as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        instructor_id: 1
      });
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should list all courses for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      const mockCourses = [
        {
          id: 1,
          title: 'Course 1',
          description: 'Description',
          price_cents: 9999,
          published: true,
          instructor_id: 1,
          instructor_name: 'John',
          instructor_email: 'john@example.com',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          title: 'Course 2',
          description: 'Description',
          price_cents: 14999,
          published: false,
          instructor_id: 2,
          instructor_name: 'Jane',
          instructor_email: 'jane@example.com',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue({
        courses: mockCourses,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
      });

      await coursesController.index(req as Request, res as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined
      });
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should handle pagination parameters', async () => {
      req.query = { page: '2', limit: '50' };

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue({
        courses: [],
        pagination: { page: 2, limit: 50, total: 0, totalPages: 0 }
      });

      await coursesController.index(req as Request, res as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        search: undefined,
        published_only: true
      });
    });

    it('should handle search parameter', async () => {
      req.query = { q: 'TypeScript' };

      (CoursesService.listCourses as jest.Mock) = jest.fn().mockResolvedValue({
        courses: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });

      await coursesController.index(req as Request, res as Response);

      expect(CoursesService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'TypeScript',
        published_only: true
      });
    });
  });

  describe('POST /courses', () => {
    it('should return 401 without authentication', async () => {
      req.body = {
        title: 'New Course',
        description: 'Description',
        price_cents: 9999
      };

      await coursesController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      });
    });

    it('should return 403 for student role', async () => {
      req.user = { id: 1, email: 'student@example.com', role: 'student' };
      req.body = {
        title: 'New Course',
        description: 'Description',
        price_cents: 9999
      };

      (CoursesService.createCourse as jest.Mock) = jest.fn().mockRejectedValue(
        new Error('You do not have permissions to create courses')
      );

      await coursesController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN'
        })
      });
    });

    it('should create course for instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.body = {
        title: 'New Course',
        description: 'Description',
        price_cents: 9999
      };

      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: 'Description',
        price_cents: 9999,
        instructor_id: 1,
        published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.createCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.create(req as Request, res as Response);

      expect(CoursesService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Course',
          description: 'Description',
          price_cents: 9999
        }),
        1,
        'instructor'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course created successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should allow admin to specify instructor_id', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.body = {
        title: 'New Course',
        description: 'Description',
        price_cents: 9999,
        instructor_id: 5
      };

      const mockCourse = {
        id: 1,
        title: 'New Course',
        description: 'Description',
        price_cents: 9999,
        instructor_id: 5,
        published: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.createCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.create(req as Request, res as Response);

      expect(CoursesService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Course',
          description: 'Description',
          price_cents: 9999,
          instructor_id: 5
        }),
        1,
        'admin'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for validation errors', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.body = {
        title: '',
        description: 'Description',
        price_cents: -100
      };

      await coursesController.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      });
    });
  });

  describe('PUT /courses/:id', () => {
    it('should return 401 without authentication', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      await coursesController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(false);

      await coursesController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should update course for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const mockCourse = {
        id: 1,
        title: 'Updated Title',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.updateCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.update(req as Request, res as Response);

      expect(CoursesService.updateCourse).toHaveBeenCalledWith(1, req.body);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        message: 'Course updated successfully',
        data: mockCourse,
        version: 'v1.9'
      });
    });

    it('should update course for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const mockCourse = {
        id: 1,
        title: 'Updated Title',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor_id: 2,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.updateCourse as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.update(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        message: 'Course updated successfully'
      }));
    });

    it('should return 404 for non-existent course', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '999' };
      req.body = { title: 'Updated Title' };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.updateCourse as jest.Mock) = jest.fn().mockResolvedValue(null);

      await coursesController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 400 for validation errors', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };
      req.body = { title: '', price_cents: -100 };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);

      await coursesController.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /courses/:id/publish', () => {
    it('should return 401 without authentication', async () => {
      req.params = { id: '1' };

      await coursesController.publish(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return 403 for non-owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(false);

      await coursesController.publish(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should publish course for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      const mockCourse = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: true,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.publish(req as Request, res as Response);

      expect(CoursesService.togglePublished).toHaveBeenCalledWith(1, true);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        message: 'Course published successfully'
      }));
    });

    it('should publish course for admin', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { id: '1' };

      const mockCourse = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: true,
        instructor_id: 2,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.publish(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        message: 'Course published successfully'
      }));
    });

    it('should return 404 for non-existent course', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '999' };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock) = jest.fn().mockResolvedValue(null);

      await coursesController.publish(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /courses/:id/unpublish', () => {
    it('should unpublish course for owner instructor', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      const mockCourse = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.canModifyCourse as jest.Mock) = jest.fn().mockResolvedValue(true);
      (CoursesService.togglePublished as jest.Mock) = jest.fn().mockResolvedValue(mockCourse);

      await coursesController.unpublish(req as Request, res as Response);

      expect(CoursesService.togglePublished).toHaveBeenCalledWith(1, false);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        message: 'Course unpublished successfully'
      }));
    });
  });

  describe('GET /courses/:id/overview', () => {
    it('should get course overview for published course', async () => {
      req.user = { id: 1, email: 'user@example.com', role: 'student' };
      req.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: true,
        instructor: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        },
        lesson_count: 10,
        enrollment_count: 50,
        quiz_count: 5,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(mockOverview);

      await coursesController.overview(req as Request, res as Response);

      expect(CoursesService.getCourseOverview).toHaveBeenCalledWith(1);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });

    it('should return 404 for non-existent course', async () => {
      req.params = { id: '999' };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(null);

      await coursesController.overview(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should deny access to unpublished course for non-owner', async () => {
      req.user = { id: 2, email: 'student@example.com', role: 'student' };
      req.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        },
        lesson_count: 10,
        enrollment_count: 50,
        quiz_count: 5,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(mockOverview);

      await coursesController.overview(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should allow instructor owner to see unpublished course', async () => {
      req.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
      req.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor: {
          id: 1,
          name: 'Instructor',
          email: 'instructor@example.com'
        },
        lesson_count: 10,
        enrollment_count: 50,
        quiz_count: 5,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(mockOverview);

      await coursesController.overview(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });

    it('should allow admin to see any course', async () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      req.params = { id: '1' };

      const mockOverview = {
        id: 1,
        title: 'Course',
        description: 'Description',
        price_cents: 9999,
        published: false,
        instructor: {
          id: 2,
          name: 'John',
          email: 'john@example.com'
        },
        lesson_count: 10,
        enrollment_count: 50,
        quiz_count: 5,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CoursesService.getCourseOverview as jest.Mock) = jest.fn().mockResolvedValue(mockOverview);

      await coursesController.overview(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        data: mockOverview,
        version: 'v1.9'
      });
    });
  });
});
