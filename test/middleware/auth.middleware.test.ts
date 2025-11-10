/**
 * Unit tests for auth.middleware
 * 
 * Tests authentication middleware, role-based access control, and optional authentication
 * with various scenarios including edge cases and error conditions.
 * 
 * Coverage target: 85%+
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';
import { config } from '../../src/config';

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {},
      requestId: 'test-request-id'
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn() as jest.Mock;
  });

  describe('successful authentication', () => {
    it('should authenticate valid token and attach user to request', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const token = jwt.sign(
        { sub: payload.id, email: payload.email, role: payload.role },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe(1);
      expect(mockReq.user?.email).toBe('test@example.com');
      expect(mockReq.user?.role).toBe('student');
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle different user roles', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach(role => {
        const token = jwt.sign(
          { sub: 1, email: 'test@example.com', role },
          config.jwtSecret,
          { expiresIn: '1h' }
        );
        
        mockReq.headers = { authorization: `Bearer ${token}` };
        mockReq.user = undefined;
        
        authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
        
        expect((mockReq as any).user?.role).toBe(role);
      });
    });

    it('should handle different user IDs', () => {
      const userIds = [1, 999, 123456];
      
      userIds.forEach(id => {
        const token = jwt.sign(
          { sub: id, email: 'test@example.com', role: 'student' },
          config.jwtSecret,
          { expiresIn: '1h' }
        );
        
        mockReq.headers = { authorization: `Bearer ${token}` };
        mockReq.user = undefined;
        
        authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
        
        expect((mockReq as any).user?.id).toBe(id);
      });
    });
  });

  describe('missing or invalid authorization header', () => {
    it('should return 401 when authorization header is missing', () => {
      mockReq.headers = {};
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
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

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
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

    it('should return 401 when token is empty after Bearer prefix', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty string', () => {
      mockReq.headers = { authorization: '' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('invalid tokens', () => {
    it('should return 401 for malformed token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        config.jwtSecret,
        { expiresIn: -1 }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token with wrong secret', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        'wrong-secret',
        { expiresIn: '1h' }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token with string payload', () => {
      const token = jwt.sign('string-payload', config.jwtSecret);
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token missing sub field', () => {
      const token = jwt.sign(
        { email: 'test@example.com', role: 'student' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token missing email field', () => {
      const token = jwt.sign(
        { sub: 1, role: 'student' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token missing role field', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token with wrong type for sub', () => {
      const token = jwt.sign(
        { sub: 'not-a-number', email: 'test@example.com', role: 'student' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('requireRole middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      requestId: 'test-request-id'
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn() as jest.Mock;
  });

  describe('successful authorization', () => {
    it('should allow user with required role', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'admin' };
      
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple required roles', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'instructor' };
      
      const middleware = requireRole('admin', 'instructor');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow student role when specified', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
      
      const middleware = requireRole('student');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow any role in the list', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach(role => {
        mockReq.user = { id: 1, email: 'test@example.com', role };
        mockNext.mockClear();
        
        const middleware = requireRole('student', 'instructor', 'admin');
        middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
        
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('missing authentication', () => {
    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined;
      
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('insufficient permissions', () => {
    it('should return 403 when user role does not match', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
      
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
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

    it('should return 403 when user role not in multiple required roles', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'student' };
      
      const middleware = requireRole('admin', 'instructor');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin, instructor. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for role matching', () => {
      mockReq.user = { id: 1, email: 'test@example.com', role: 'Admin' };
      
      const middleware = requireRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('authenticateOptional middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      requestId: 'test-request-id'
    };
    
    mockRes = {
      status: jest.fn(),
      json: jest.fn()
    };
    
    mockNext = jest.fn() as jest.Mock;
  });

  describe('with valid token', () => {
    it('should authenticate and attach user when valid token provided', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe(1);
      expect(mockReq.user?.email).toBe('test@example.com');
      expect(mockReq.user?.role).toBe('student');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('without token', () => {
    it('should continue without user when no authorization header', () => {
      mockReq.headers = {};
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user when authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is empty', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('with invalid token', () => {
    it('should continue without user for malformed token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for expired token', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        config.jwtSecret,
        { expiresIn: -1 }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for token with wrong secret', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        'wrong-secret',
        { expiresIn: '1h' }
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for token with string payload', () => {
      const token = jwt.sign('string-payload', config.jwtSecret);
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for token missing required fields', () => {
      const token = jwt.sign(
        { email: 'test@example.com', role: 'student' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without user for token with wrong field types', () => {
      const token = jwt.sign(
        { sub: 'not-a-number', email: 'test@example.com', role: 'student' },
        config.jwtSecret
      );
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});

describe('Integration scenarios', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {},
      requestId: 'test-request-id'
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn() as jest.Mock;
  });

  it('should handle authenticate followed by requireRole for authorized user', () => {
    const token = jwt.sign(
      { sub: 1, email: 'admin@example.com', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    mockReq.headers = { authorization: `Bearer ${token}` };
    
    authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    expect(mockReq.user?.role).toBe('admin');
    
    mockNext.mockClear();
    const roleMiddleware = requireRole('admin');
    roleMiddleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    
    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should handle authenticate followed by requireRole for unauthorized user', () => {
    const token = jwt.sign(
      { sub: 1, email: 'student@example.com', role: 'student' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    mockReq.headers = { authorization: `Bearer ${token}` };
    
    authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    expect(mockReq.user?.role).toBe('student');
    
    mockNext.mockClear();
    const roleMiddleware = requireRole('admin');
    roleMiddleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle multiple role checks', () => {
    const token = jwt.sign(
      { sub: 1, email: 'instructor@example.com', role: 'instructor' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    mockReq.headers = { authorization: `Bearer ${token}` };
    
    authenticate(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    
    mockNext.mockClear();
    const middleware1 = requireRole('instructor', 'admin');
    middleware1(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    expect(mockNext).toHaveBeenCalled();
    
    mockNext.mockClear();
    const middleware2 = requireRole('admin');
    middleware2(mockReq as Request, mockRes as Response, mockNext as NextFunction);
    expect(statusMock).toHaveBeenCalledWith(403);
  });
});
