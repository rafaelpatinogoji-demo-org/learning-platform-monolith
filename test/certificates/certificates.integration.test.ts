import request from 'supertest';
import express, { Express } from 'express';
import certificatesRoutes from '../../src/routes/certificates.routes';
import coursesRoutes from '../../src/routes/courses.routes';
import { db } from '../../src/db';
import { progressService } from '../../src/services/progress.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

jest.mock('../../src/db');
jest.mock('../../src/services/progress.service');
jest.mock('../../src/modules/notifications/publisher');

describe('Certificates API Integration Tests', () => {
  let app: Express;
  const mockDb = db as jest.Mocked<typeof db>;
  const mockProgressService = progressService as jest.Mocked<typeof progressService>;
  const mockPublish = publish as jest.MockedFunction<typeof publish>;
  const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

  const generateToken = (userId: number, email: string, role: string) => {
    return jwt.sign(
      { sub: userId, email, role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/certificates', certificatesRoutes);
    app.use('/api/courses', coursesRoutes);
    
    jest.clearAllMocks();
    mockIsNotificationsEnabled.mockReturnValue(false);
  });

  describe('POST /api/certificates/issue', () => {
    it('should successfully issue certificate as instructor', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }]
      } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, code: 'CERT-ABC123-DEF456', issued_at: new Date() }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.code).toMatch(/^CERT-/);
      expect(response.body.data.userId).toBe(2);
      expect(response.body.data.courseId).toBe(1);
    });

    it('should successfully issue certificate as admin', async () => {
      const token = generateToken(1, 'admin@test.com', 'admin');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, code: 'CERT-ADMIN123-XYZ', issued_at: new Date() }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
    });

    it('should return 400 for validation error - missing userId', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for validation error - missing courseId', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2 });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
    });

    it('should return 403 when instructor tries to issue for another course', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('NOT_OWNER');
    });

    it('should return 404 when course not found', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 999 });

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });

    it('should return 400 when user is not eligible', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }]
      } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 2,
        totalLessons: 5,
        percent: 40,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('NOT_ELIGIBLE');
    });

    it('should return 409 when certificate already issued', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }]
      } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 2, course_id: 1, code: 'EXISTING', issued_at: new Date() }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(409);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('ALREADY_ISSUED');
    });

    it('should return 401 when no authentication provided', async () => {
      const response = await request(app)
        .post('/api/certificates/issue')
        .send({ userId: 2, courseId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('POST /api/certificates/claim', () => {
    it('should successfully claim certificate as student', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, code: 'CERT-STUDENT-CLAIM', issued_at: new Date() }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.code).toMatch(/^CERT-/);
      expect(response.body.data.courseId).toBe(1);
    });

    it('should return 400 for validation error - missing courseId', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      const response = await request(app)
        .post('/api/certificates/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when not eligible', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 3,
        totalLessons: 5,
        percent: 60,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      const response = await request(app)
        .post('/api/certificates/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('NOT_ELIGIBLE');
    });

    it('should return 409 when already claimed', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, status: 'active' }]
      } as any);
      
      const mockProgressData = {
        lessonsCompleted: 5,
        totalLessons: 5,
        percent: 100,
        lessons: []
      };
      mockProgressService.getUserCourseProgress.mockResolvedValue(mockProgressData);

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, course_id: 1, code: 'EXISTING', issued_at: new Date() }]
      } as any);

      const response = await request(app)
        .post('/api/certificates/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: 1 });

      expect(response.status).toBe(409);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('ALREADY_ISSUED');
    });

    it('should return 401 when no authentication provided', async () => {
      const response = await request(app)
        .post('/api/certificates/claim')
        .send({ courseId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('GET /api/certificates/me', () => {
    it('should return student certificates', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      const mockCerts = [
        {
          id: 1,
          code: 'CERT-ABC123',
          issued_at: new Date('2024-01-01'),
          course_id: 1,
          course_title: 'Course 1'
        },
        {
          id: 2,
          code: 'CERT-XYZ789',
          issued_at: new Date('2024-01-15'),
          course_id: 2,
          course_title: 'Course 2'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCerts } as any);

      const response = await request(app)
        .get('/api/certificates/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.data[0].course.title).toBe('Course 1');
    });

    it('should return empty array when student has no certificates', async () => {
      const token = generateToken(1, 'student@test.com', 'student');

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .get('/api/certificates/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return 401 when no authentication provided', async () => {
      const response = await request(app)
        .get('/api/certificates/me');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('GET /api/courses/:courseId/certificates', () => {
    it('should return course certificates as instructor', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 1 }]
      } as any);

      const mockCerts = [
        {
          id: 1,
          code: 'CERT-ABC123',
          issued_at: new Date(),
          user_id: 2,
          user_name: 'Student 1',
          user_email: 'student1@test.com'
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockCerts } as any);

      const response = await request(app)
        .get('/api/courses/1/certificates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].user.name).toBe('Student 1');
    });

    it('should return course certificates as admin', async () => {
      const token = generateToken(1, 'admin@test.com', 'admin');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .get('/api/courses/1/certificates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 400 for invalid courseId', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      const response = await request(app)
        .get('/api/courses/invalid/certificates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('Invalid course ID');
    });

    it('should return 403 when instructor tries to view other course', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Test Course', instructor_id: 99 }]
      } as any);

      const response = await request(app)
        .get('/api/courses/1/certificates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBe('NOT_OWNER');
    });

    it('should return 404 when course not found', async () => {
      const token = generateToken(1, 'instructor@test.com', 'instructor');

      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .get('/api/courses/999/certificates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });

    it('should return 401 when no authentication provided', async () => {
      const response = await request(app)
        .get('/api/courses/1/certificates');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('GET /api/certificates/:code', () => {
    it('should verify valid certificate code (public endpoint)', async () => {
      const mockDate = new Date('2024-01-01');
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          issued_at: mockDate,
          user_name: 'John Doe',
          course_title: 'Test Course'
        }]
      } as any);

      const response = await request(app)
        .get('/api/certificates/CERT-VALID123-ABC456');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.name).toBe('John Doe');
      expect(response.body.course.title).toBe('Test Course');
    });

    it('should return valid false for invalid code format', async () => {
      const response = await request(app)
        .get('/api/certificates/INVALID');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
    });

    it('should return valid false for non-existent code', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const response = await request(app)
        .get('/api/certificates/CERT-NOTFOUND-123456');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
    });

    it('should handle errors gracefully and return valid false', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/certificates/CERT-ERROR123-456789');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.valid).toBe(false);
    });
  });
});
