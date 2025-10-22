import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, authenticateOptional } from '../../../src/middleware/auth.middleware';
import { signJwt } from '../../../src/utils/jwt-utils';
import { config } from '../../../src/config';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    mockReq = {
      headers: {},
      requestId: 'test-request-id'
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = jest.fn();
  });

  describe('authenticate()', () => {
    it('should authenticate with valid JWT token', () => {
      const token = signJwt({ id: 1, email: 'test@example.com', role: 'student' }, config.jwtSecret);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      }));
    });

    it('should return 401 when token is empty after Bearer prefix', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        })
      }));
    });

    it('should return 401 for invalid token signature', () => {
      mockReq.headers = { authorization: 'Bearer invalid.token.here' };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        })
      }));
    });

    it('should return 401 for expired token', () => {
      const expiredToken = signJwt({ id: 1, email: 'test@example.com', role: 'student' }, config.jwtSecret, { expiresIn: '-1h' });
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_TOKEN'
        })
      }));
    });

    it('should return 401 for token with invalid payload structure', () => {
      const invalidToken = signJwt({ id: 'not-a-number' as any, email: 'test@example.com', role: 'student' }, config.jwtSecret);
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole()', () => {
    beforeEach(() => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
    });

    it('should allow access when user has required role', () => {
      const middleware = requireRole('student');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user role matches one of multiple required roles', () => {
      const middleware = requireRole('admin', 'instructor', 'student');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role does not match any of multiple required roles', () => {
      const middleware = requireRole('admin', 'instructor');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: expect.stringContaining('admin, instructor')
        })
      }));
    });

    it('should return 401 when req.user is not set', () => {
      delete mockReq.user;
      const middleware = requireRole('student');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      }));
    });
  });

  describe('authenticateOptional()', () => {
    it('should populate req.user with valid token', () => {
      const token = signJwt({ id: 1, email: 'test@example.com', role: 'student' }, config.jwtSecret);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should proceed without req.user when Authorization header is missing', () => {
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should proceed without req.user when Authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should proceed without req.user when token is empty', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should proceed without req.user for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid.token' };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should proceed without req.user for expired token', () => {
      const expiredToken = signJwt({ id: 1, email: 'test@example.com', role: 'student' }, config.jwtSecret, { expiresIn: '-1h' });
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };

      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
