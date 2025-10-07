import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
  sign: jest.fn(),
  decode: jest.fn()
}));
jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret'
  }
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    } as any;
    (mockRequest as any).requestId = 'test-request-id';
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid Bearer token and set req.user', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      mockRequest.headers = { authorization: 'Bearer valid.token.here' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(jwt.verify).toHaveBeenCalledWith('valid.token.here', 'test-jwt-secret');
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 for missing Authorization header', () => {
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Authorization header format', () => {
      mockRequest.headers = { authorization: 'Invalid token.here' };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for empty token', () => {
      mockRequest.headers = { authorization: 'Bearer ' };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid JWT token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for expired JWT token', () => {
      mockRequest.headers = { authorization: 'Bearer expired.token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for string decoded payload', () => {
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockReturnValue('string-payload');

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for payload missing sub field', () => {
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockReturnValue({
        email: 'test@example.com',
        role: 'student'
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for non-object errors', () => {
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Generic error');
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow request with correct role', () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'admin' };
      const middleware = requireRole('admin');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow request with one of multiple allowed roles', () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'instructor' };
      const middleware = requireRole('admin', 'instructor');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 for missing req.user', () => {
      const middleware = requireRole('admin');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for user with wrong role', () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'student' };
      const middleware = requireRole('admin');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should show multiple required roles in error message', () => {
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'student' };
      const middleware = requireRole('admin', 'instructor');

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin, instructor. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateOptional', () => {
    it('should authenticate valid Bearer token and set req.user', () => {
      const mockDecoded = {
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 1234567890,
        exp: 1234567900
      };
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(jwt.verify).toHaveBeenCalledWith('valid.token', 'test-jwt-secret');
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without error for missing Authorization header', () => {
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for invalid Authorization header format', () => {
      mockRequest.headers = { authorization: 'Invalid token' };

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for empty token', () => {
      mockRequest.headers = { authorization: 'Bearer ' };

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for invalid JWT token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid.token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for expired JWT token', () => {
      mockRequest.headers = { authorization: 'Bearer expired.token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for string decoded payload', () => {
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockReturnValue('string-payload');

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without error for payload missing required fields', () => {
      mockRequest.headers = { authorization: 'Bearer valid.token' };
      (jwt.verify as jest.Mock).mockReturnValue({
        email: 'test@example.com'
      });

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
