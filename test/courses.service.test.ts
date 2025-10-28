import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CoursesService } from '../src/services/courses.service';
import { db } from '../src/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('CoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create course for instructor', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        price_cents: 1999
      };
      
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: false,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.createCourse(courseData, 123, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', 'Test Description', 1999, 123]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should allow admin to specify instructor_id', async () => {
      const courseData = {
        title: 'Test Course',
        price_cents: 1999,
        instructor_id: 456
      };
      
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          price_cents: 1999,
          instructor_id: 456,
          published: false,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      await CoursesService.createCourse(courseData, 123, 'admin');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        expect.arrayContaining([456])
      );
    });

    it('should reject student role', async () => {
      const courseData = { title: 'Test', price_cents: 1999 };

      await expect(
        CoursesService.createCourse(courseData, 123, 'student')
      ).rejects.toThrow('Insufficient permissions to create course');
    });

    it('should create course without description', async () => {
      const courseData = {
        title: 'Test Course',
        price_cents: 1999
      };
      
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: null,
          price_cents: 1999,
          published: false,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.createCourse(courseData, 123, 'instructor');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO courses'),
        ['Test Course', null, 1999, 123]
      );
      expect(result.description).toBeNull();
    });
  });

  describe('getCourseById', () => {
    it('should get course without instructor info', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.getCourseById(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.id, c.title'),
        [1]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should get course with instructor info', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 123,
          instructor_name: 'John Doe',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.getCourseById(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.name as instructor_name'),
        [1]
      );
      expect(result?.instructor).toEqual({
        id: 123,
        name: 'John Doe'
      });
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.getCourseById(999);
      expect(result).toBeNull();
    });
  });

  describe('listCourses', () => {
    beforeEach(() => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '5' }] } as any);
      mockDb.query.mockResolvedValueOnce({ 
        rows: [
          { 
            id: 1, 
            title: 'Course 1', 
            description: 'Desc 1',
            price_cents: 1999,
            published: true, 
            instructor_id: 123,
            instructor_name: 'John',
            created_at: new Date(),
            updated_at: new Date()
          },
          { 
            id: 2, 
            title: 'Course 2', 
            description: 'Desc 2',
            price_cents: 2999,
            published: false, 
            instructor_id: 456,
            instructor_name: 'Jane',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      } as any);
    });

    it('should list courses with pagination', async () => {
      const result = await CoursesService.listCourses({ page: 1, limit: 10 });

      expect(result.courses).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1
      });
    });

    it('should filter published only', async () => {
      await CoursesService.listCourses({ published_only: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.published = true'),
        expect.any(Array)
      );
    });

    it('should filter by instructor', async () => {
      await CoursesService.listCourses({ instructor_id: 123 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('c.instructor_id = $'),
        expect.arrayContaining([123])
      );
    });

    it('should search in title and description', async () => {
      await CoursesService.listCourses({ search: 'javascript' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('c.title ILIKE'),
        expect.arrayContaining(['%javascript%'])
      );
    });

    it('should handle multiple filters together', async () => {
      await CoursesService.listCourses({ 
        page: 2, 
        limit: 20, 
        published_only: true,
        instructor_id: 123,
        search: 'test'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.any(Array)
      );
    });

    it('should calculate total pages correctly', async () => {
      jest.resetAllMocks();
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '25' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await CoursesService.listCourses({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('updateCourse', () => {
    it('should update course title', async () => {
      jest.resetAllMocks();
      const updateData = { title: 'Updated Title' };
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Updated Title',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        ['Updated Title', 1]
      );
      expect(result?.title).toBe('Updated Title');
    });

    it('should update multiple fields', async () => {
      jest.resetAllMocks();
      const updateData = { 
        title: 'Updated Title',
        description: 'Updated Description',
        price_cents: 2999
      };
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Updated Title',
          description: 'Updated Description',
          price_cents: 2999,
          published: true,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.updateCourse(1, updateData);

      expect(result?.title).toBe('Updated Title');
      expect(result?.description).toBe('Updated Description');
      expect(result?.price_cents).toBe(2999);
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.updateCourse(999, { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('canModifyCourse', () => {
    it('should allow admin to modify any course', async () => {
      const result = await CoursesService.canModifyCourse(1, 123, 'admin');
      expect(result).toBe(true);
    });

    it('should allow instructor to modify own course', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, instructor_id: 123 }]
      } as any);

      const result = await CoursesService.canModifyCourse(1, 123, 'instructor');
      expect(result).toBe(true);
    });

    it('should deny instructor modifying others course', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1, instructor_id: 456 }]
      } as any);

      const result = await CoursesService.canModifyCourse(1, 123, 'instructor');
      expect(result).toBe(false);
    });

    it('should deny student access', async () => {
      const result = await CoursesService.canModifyCourse(1, 123, 'student');
      expect(result).toBe(false);
    });

    it('should deny access if course does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.canModifyCourse(999, 123, 'instructor');
      expect(result).toBe(false);
    });
  });

  describe('togglePublished', () => {
    it('should toggle course published status to true', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: true,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.togglePublished(1, true);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [true, 1]
      );
      expect(result?.published).toBe(true);
    });

    it('should toggle course published status to false', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          title: 'Test Course',
          description: 'Test Description',
          price_cents: 1999,
          published: false,
          instructor_id: 123,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult as any);

      const result = await CoursesService.togglePublished(1, false);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE courses'),
        [false, 1]
      );
      expect(result?.published).toBe(false);
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.togglePublished(999, true);
      expect(result).toBeNull();
    });
  });

  describe('deleteCourse', () => {
    it('should delete course and return true', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await CoursesService.deleteCourse(1);

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM courses WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false if course not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await CoursesService.deleteCourse(999);
      expect(result).toBe(false);
    });
  });

  describe('getCourseOverview', () => {
    it('should return comprehensive course overview', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Test Course',
          published: true,
          instructor_id: 123,
          instructor_name: 'John Doe',
          created_at: new Date()
        }]
      } as any);

      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '10' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ active: '5', completed: '3' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ average_progress: '75.5' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ total_quizzes: '2', total_questions: '8' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '3' }] } as any);

      const result = await CoursesService.getCourseOverview(1);

      expect(result).toMatchObject({
        id: 1,
        title: 'Test Course',
        published: true,
        totalLessons: 10,
        certificatesIssued: 3
      });
      expect(result?.instructor).toEqual({
        id: 123,
        name: 'John Doe'
      });
      expect(result?.enrollments).toEqual({
        active: 5,
        completed: 3
      });
      expect(result?.averageProgress).toBe(76);
      expect(result?.quizzes).toEqual({
        total: 2,
        totalQuestions: 8
      });
    });

    it('should return null for non-existent course', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await CoursesService.getCourseOverview(999);
      expect(result).toBeNull();
    });

    it('should handle courses with no lessons', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Empty Course',
          published: true,
          instructor_id: 123,
          instructor_name: 'John Doe',
          created_at: new Date()
        }]
      } as any);

      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '0' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ active: '0', completed: '0' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ average_progress: null }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ total_quizzes: '0', total_questions: '0' }] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '0' }] } as any);

      const result = await CoursesService.getCourseOverview(1);

      expect(result?.totalLessons).toBe(0);
      expect(result?.enrollments).toEqual({ active: 0, completed: 0 });
      expect(result?.averageProgress).toBe(0);
      expect(result?.quizzes).toEqual({ total: 0, totalQuestions: 0 });
      expect(result?.certificatesIssued).toBe(0);
    });
  });
});
