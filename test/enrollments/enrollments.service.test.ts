import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { db } from '../../src/db';
import { EnrollmentsService } from '../../src/services/enrollments.service';

// Mock the db module
jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Typed mock for db.query
const mockDbQuery = db.query as jest.MockedFunction<typeof db.query>;

// Helper to create a mock query result
const createMockQueryResult = (rows: any[]) => ({
  rows,
  rowCount: rows.length,
  command: 'SELECT',
  oid: 0,
  fields: [],
});

describe('EnrollmentsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEnrollment', () => {
    it('should create an enrollment successfully for a published course', async () => {
      const userId = 1;
      const courseId = 10;
      const newEnrollment = { id: 1, user_id: userId, course_id: courseId, status: 'active', created_at: new Date() };

      // Mock course check (published)
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, published: true }]));
      // Mock existing enrollment check (not enrolled)
      // Simula la consulta que verifica si el usuario ya está inscrito en el curso
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));
      // Mock insert query
      // Simula la inserción de la nueva inscripción en la base de datos
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([newEnrollment]));

      const result = await EnrollmentsService.createEnrollment(userId, courseId);

      expect(result).toEqual(newEnrollment);
      expect(mockDbQuery).toHaveBeenCalledTimes(3);
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT id, published FROM courses WHERE id = $1', [courseId]);
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO enrollments'), [userId, courseId]);
    });

    it('should throw an error if the course is not found', async () => {
      const userId = 1;
      const courseId = 99;

      // Mock course check (not found)
      // Simula la consulta que no encuentra el curso solicitado
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(EnrollmentsService.createEnrollment(userId, courseId)).rejects.toThrow('Course not found');
      expect(mockDbQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if trying to enroll in an unpublished course', async () => {
      const userId = 1;
      const courseId = 10;

      // Mock course check (unpublished)
      // Simula la consulta que encuentra un curso pero no está publicado
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, published: false }]));

      await expect(EnrollmentsService.createEnrollment(userId, courseId)).rejects.toThrow('Cannot enroll in unpublished course');
      expect(mockDbQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if already enrolled', async () => {
      const userId = 1;
      const courseId = 10;

      // Mock course check (published)
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId, published: true }]));
      // Mock existing enrollment check (already enrolled)
      // Simula la consulta que encuentra una inscripción existente del usuario
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: 1 }]));

      await expect(EnrollmentsService.createEnrollment(userId, courseId)).rejects.toThrow('Already enrolled in this course');
      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('canViewCourseEnrollments', () => {
    it('should return true for an admin', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 1, 'admin');
      expect(result).toBe(true);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('should return true for the instructor of the course', async () => {
      const courseId = 1;
      const instructorId = 2;

      // Simula la consulta que verifica si el instructor es dueño del curso
      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([{ id: courseId }]));

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, instructorId, 'instructor');

      expect(result).toBe(true);
      expect(mockDbQuery).toHaveBeenCalledWith('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, instructorId]);
    });

    it('should return false for an instructor who does not own the course', async () => {
      const courseId = 1;
      const otherInstructorId = 3;

      mockDbQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await EnrollmentsService.canViewCourseEnrollments(courseId, otherInstructorId, 'instructor');

      expect(result).toBe(false);
    });

    it('should return false for a student', async () => {
      const result = await EnrollmentsService.canViewCourseEnrollments(1, 3, 'student');
      expect(result).toBe(false);
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  describe('isValidStatus', () => {
    it.each(['active', 'completed', 'refunded'])('should return true for valid status "%s"', (status) => {
      expect(EnrollmentsService.isValidStatus(status)).toBe(true);
    });

    it.each(['pending', 'cancelled', null, undefined, 123])('should return false for invalid status "%s"', (status) => {
      expect(EnrollmentsService.isValidStatus(status)).toBe(false);
    });
  });
});
