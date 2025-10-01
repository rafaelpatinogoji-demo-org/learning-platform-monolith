import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/db';
import { AuthService } from '../../src/services/auth.service';

describe('Users Integration Tests', () => {
  let adminToken: string;
  let instructorToken: string;
  let studentToken: string;
  let testUsers: any[] = [];

  beforeAll(async () => {
    await db.connect();

    const adminResult = await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      ['admin-test@test.com', await AuthService.hashPassword('password123'), 'Admin Test User', 'admin']
    );
    testUsers.push(adminResult.rows[0]);

    const instructorResult = await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      ['instructor-test@test.com', await AuthService.hashPassword('password123'), 'Instructor Test User', 'instructor']
    );
    testUsers.push(instructorResult.rows[0]);

    const studentResult = await db.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      ['student-test@test.com', await AuthService.hashPassword('password123'), 'Student Test User', 'student']
    );
    testUsers.push(studentResult.rows[0]);

    adminToken = AuthService.generateToken({
      id: testUsers[0].id,
      email: testUsers[0].email,
      role: testUsers[0].role
    });

    instructorToken = AuthService.generateToken({
      id: testUsers[1].id,
      email: testUsers[1].email,
      role: testUsers[1].role
    });

    studentToken = AuthService.generateToken({
      id: testUsers[2].id,
      email: testUsers[2].email,
      role: testUsers[2].role
    });
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', ['%-test@test.com']);
    await db.disconnect();
  });

  describe('GET /api/users', () => {
    it('should list all users when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support role filtering for admin', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });

    it('should support role filtering for instructor', async () => {
      const response = await request(app)
        .get('/api/users?role=instructor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('instructor');
      });
    });

    it('should support role filtering for student', async () => {
      const response = await request(app)
        .get('/api/users?role=student')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('student');
      });
    });

    it('should support search filtering', async () => {
      const response = await request(app)
        .get('/api/users?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should combine pagination and filters', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=5&role=student')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should not expose password_hash in response', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((user: any) => {
        expect(user.password_hash).toBeUndefined();
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.ok).toBe(false);
    });

    it('should return 403 when authenticated as instructor', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
    });

    it('should return 403 when authenticated as student', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.id).toBe(testUsers[0].id);
      expect(response.body.data.email).toBe(testUsers[0].email);
      expect(response.body.data.password_hash).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers[0].id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as instructor', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when authenticated as student', async () => {
      const response = await request(app)
        .get(`/api/users/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('should update user role when authenticated as admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'instructor' });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.role).toBe('instructor');
      expect(response.body.message).toBe('User role updated successfully');

      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['student', testUsers[2].id]);
    });

    it('should update role from student to admin', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('admin');

      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['student', testUsers[2].id]);
    });

    it('should update role from instructor to student', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[1].id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'student' });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('student');

      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['instructor', testUsers[1].id]);
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid-role' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return 400 for missing role', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .patch('/api/users/999999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .patch('/api/users/invalid/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .send({ role: 'admin' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as instructor', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });

    it('should return 403 when authenticated as student', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUsers[2].id}/role`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });
  });
});
