import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';
import { signJwt } from '../../src/utils/jwt-utils';

jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    version: 'v1.9',
  },
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      requestId: 'test-request-id',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and set req.user', () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'test-secret-key');
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 1,
        email: 'test@test.com',
        role: 'student',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject request with Bearer but no token', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject expired token', async () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'test-secret-key', { expiresIn: '0s' });
      mockReq.headers = { authorization: `Bearer ${token}` };

      await new Promise(resolve => setTimeout(resolve, 1000));

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject token with invalid signature', () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'wrong-secret');
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject malformed token', () => {
      mockReq.headers = { authorization: 'Bearer not-a-valid-token' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle different user roles', () => {
      const roles = ['student', 'instructor', 'admin'] as const;

      roles.forEach(role => {
        const token = signJwt({ id: 1, email: 'user@test.com', role }, 'test-secret-key');
        mockReq.headers = { authorization: `Bearer ${token}` };
        mockReq.user = undefined;
        mockNext.mockClear();

        authenticate(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.user).toBeDefined();
        expect((mockReq.user as any).role).toBe(role);
      });
    });
  });

  describe('requireRole', () => {
    it('should allow request with authorized role', () => {
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      const middleware = requireRole('admin', 'instructor');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow request with any of multiple allowed roles', () => {
      mockReq.user = { id: 1, email: 'instructor@test.com', role: 'instructor' };
      const middleware = requireRole('admin', 'instructor');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request with unauthorized role', () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without user (not authenticated)', () => {
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle single role requirement', () => {
      mockReq.user = { id: 1, email: 'admin@test.com', role: 'admin' };
      const middleware = requireRole('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when role does not match any allowed roles', () => {
      mockReq.user = { id: 1, email: 'student@test.com', role: 'student' };
      const middleware = requireRole('admin', 'instructor');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin, instructor. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('authenticateOptional', () => {
    it('should set user for valid token', () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'test-secret-key');
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 1,
        email: 'test@test.com',
        role: 'student',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user when no authorization header', () => {
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for invalid Bearer format', () => {
      mockReq.headers = { authorization: 'InvalidFormat token' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user for empty token', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user for expired token', async () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'test-secret-key', { expiresIn: '0s' });
      mockReq.headers = { authorization: `Bearer ${token}` };

      await new Promise(resolve => setTimeout(resolve, 1000));

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for token with wrong signature', () => {
      const token = signJwt({ id: 1, email: 'test@test.com', role: 'student' }, 'wrong-secret');
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
