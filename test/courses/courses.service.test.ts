import { CoursesService } from '../../src/services/courses.service';
import { db } from '../../src/db';
import { mockQueryResult } from '../helpers/db-mocks';
import { createMockCourse, mockUsers } from '../helpers/test-data';

jest.mock('../../src/db');

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course for instructor with their own ID', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Course Description',
        price_cents: 9900
      };
      const mockCourse = createMockCourse({ ...courseData, instructor_id: mockUsers.instructor1.id });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(
        courseData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, mockUsers.instructor1.id]
      );
    });

    it('should allow admin to create course for another instructor', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Course Description',
        price_cents: 9900,
        instructor_id: mockUsers.instructor1.id
      };
      const mockCourse = createMockCourse({ ...courseData });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(
        courseData,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, mockUsers.instructor1.id]
      );
    });

    it('should ignore instructor_id when non-admin creates course', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Course Description',
        price_cents: 9900,
        instructor_id: mockUsers.instructor2.id
      };

      const mockCourse = createMockCourse({
        ...courseData,
        instructor_id: mockUsers.instructor1.id
      });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.createCourse(
        courseData,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result.instructor_id).toBe(mockUsers.instructor1.id);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        [courseData.title, courseData.description, courseData.price_cents, mockUsers.instructor1.id]
      );
    });
  });

  describe('getCourseById', () => {
    it('should return course with instructor info when includeInstructor is true', async () => {
      const mockCourse = createMockCourse();
      const mockCourseWithInstructor = {
        ...mockCourse,
        instructor_name: 'Instructor Name',
        instructor_id: mockUsers.instructor1.id
      };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourseWithInstructor]));

      const result = await CoursesService.getCourseById(1, true);

      expect(result).toEqual({
        ...mockCourse,
        instructor: {
          id: mockUsers.instructor1.id,
          name: 'Instructor Name'
        }
      });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN users'),
        [1]
      );
    });

    it('should return course without instructor info when includeInstructor is false', async () => {
      const mockCourse = createMockCourse();

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.getCourseById(1, false);

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.not.stringContaining('LEFT JOIN users'),
        [1]
      );
    });

    it('should return null when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await CoursesService.getCourseById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCourse', () => {
    it('should update course with partial data', async () => {
      const updateData = { title: 'Updated Title' };
      const mockCourse = createMockCourse({ ...updateData });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        expect.arrayContaining(['Updated Title', 1])
      );
    });

    it('should update multiple fields', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        price_cents: 12900
      };
      const mockCourse = createMockCourse({ ...updateData });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result).toEqual(mockCourse);
    });

    it('should return current course when no fields to update', async () => {
      const mockCourse = createMockCourse();

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.updateCourse(1, {});

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return null when course not found', async () => {
      const updateData = { title: 'Updated Title' };

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await CoursesService.updateCourse(999, updateData);

      expect(result).toBeNull();
    });
  });

  describe('togglePublished', () => {
    it('should toggle published status from false to true', async () => {
      const mockCourse = createMockCourse({ published: true });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.togglePublished(1, true);

      expect(result).toEqual(mockCourse);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
    });

    it('should return null when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await CoursesService.togglePublished(999, false);

      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    it('should list courses with pagination', async () => {
      const mockCourses = [createMockCourse({ id: 1 }), createMockCourse({ id: 2 })];
      const mockCountResult = { total: '10' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCountResult]))
        .mockResolvedValueOnce(mockQueryResult(mockCourses));

      const result = await CoursesService.listCourses({ page: 1, limit: 10 });

      expect(result.courses).toEqual(mockCourses);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by published status', async () => {
      const mockCourses = [createMockCourse({ published: true })];
      const mockCountResult = { total: '1' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCountResult]))
        .mockResolvedValueOnce(mockQueryResult(mockCourses));

      await CoursesService.listCourses({ page: 1, limit: 10, published_only: true });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
    });

    it('should filter by instructor_id', async () => {
      const mockCourses = [createMockCourse({ instructor_id: 2 })];
      const mockCountResult = { total: '1' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCountResult]))
        .mockResolvedValueOnce(mockQueryResult(mockCourses));

      await CoursesService.listCourses({ page: 1, limit: 10, instructor_id: 2 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([2])
      );
    });

    it('should search by title', async () => {
      const mockCourses = [createMockCourse({ title: 'Test Course' })];
      const mockCountResult = { total: '1' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCountResult]))
        .mockResolvedValueOnce(mockQueryResult(mockCourses));

      await CoursesService.listCourses({ page: 1, limit: 10, search: 'Test' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%Test%'])
      );
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(
        1,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toBe(true);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should allow instructor to modify their own course', async () => {
      const mockCourse = createMockCourse({ instructor_id: mockUsers.instructor1.id });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.canModifyCourse(
        1,
        mockUsers.instructor1.id,
        mockUsers.instructor1.role
      );

      expect(result).toBe(true);
    });

    it('should deny instructor from modifying another instructor course', async () => {
      const mockCourse = createMockCourse({ instructor_id: mockUsers.instructor1.id });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.canModifyCourse(
        1,
        mockUsers.instructor2.id,
        mockUsers.instructor2.role
      );

      expect(result).toBe(false);
    });

    it('should deny student from modifying any course', async () => {
      const mockCourse = createMockCourse({ instructor_id: mockUsers.instructor1.id });

      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([mockCourse]));

      const result = await CoursesService.canModifyCourse(
        1,
        mockUsers.student.id,
        mockUsers.student.role
      );

      expect(result).toBe(false);
    });

    it('should return true for admin even when course not found', async () => {
      const result = await CoursesService.canModifyCourse(
        999,
        mockUsers.admin.id,
        mockUsers.admin.role
      );

      expect(result).toBe(true);
      expect(db.query).not.toHaveBeenCalled();
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([], 1));

      const result = await CoursesService.deleteCourse(1);

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM courses WHERE id = $1',
        [1]
      );
    });

    it('should return false when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([], 0));

      const result = await CoursesService.deleteCourse(999);

      expect(result).toBe(false);
    });
  });

  describe('getCourseOverview', () => {
    it('should return comprehensive course overview', async () => {
      const mockCourseRow = {
        id: 1,
        title: 'Test Course',
        published: true,
        instructor_id: 2,
        created_at: new Date('2024-01-01'),
        instructor_name: 'Instructor One'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCourseRow]))
        .mockResolvedValueOnce(mockQueryResult([{ total: '5' }]))
        .mockResolvedValueOnce(mockQueryResult([{ active: '8', completed: '2' }]))
        .mockResolvedValueOnce(mockQueryResult([{ average_progress: '60.5' }]))
        .mockResolvedValueOnce(mockQueryResult([{ total_quizzes: '3', total_questions: '15' }]))
        .mockResolvedValueOnce(mockQueryResult([{ total: '2' }]));

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        published: true,
        instructor: {
          id: 2,
          name: 'Instructor One'
        },
        totalLessons: 5,
        enrollments: {
          active: 8,
          completed: 2
        },
        averageProgress: 61,
        quizzes: {
          total: 3,
          totalQuestions: 15
        },
        certificatesIssued: 2,
        updatedAt: new Date('2024-01-01')
      });
    });

    it('should handle course with no stats', async () => {
      const mockCourseRow = {
        id: 1,
        title: 'Test Course',
        published: false,
        instructor_id: 2,
        created_at: new Date('2024-01-01'),
        instructor_name: 'Instructor One'
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce(mockQueryResult([mockCourseRow]))
        .mockResolvedValueOnce(mockQueryResult([{ total: '0' }]))
        .mockResolvedValueOnce(mockQueryResult([{ active: '0', completed: '0' }]))
        .mockResolvedValueOnce(mockQueryResult([{ average_progress: '0' }]))
        .mockResolvedValueOnce(mockQueryResult([{ total_quizzes: '0', total_questions: '0' }]))
        .mockResolvedValueOnce(mockQueryResult([{ total: '0' }]));

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toEqual({
        id: 1,
        title: 'Test Course',
        published: false,
        instructor: {
          id: 2,
          name: 'Instructor One'
        },
        totalLessons: 0,
        enrollments: {
          active: 0,
          completed: 0
        },
        averageProgress: 0,
        quizzes: {
          total: 0,
          totalQuestions: 0
        },
        certificatesIssued: 0,
        updatedAt: new Date('2024-01-01')
      });
    });

    it('should return null when course not found', async () => {
      (db.query as jest.Mock).mockResolvedValue(mockQueryResult([]));

      const result = await CoursesService.getCourseOverview(999);

      expect(result).toBeNull();
    });
  });
});
