import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, authenticateOptional } from '../auth.middleware';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    verify: jest.fn(),
    sign: jest.fn()
  };
});

jest.mock('../../config', () => ({
  config: {
    jwtSecret: 'test-secret-key'
  }
}));

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    headers: {},
    user: undefined,
    requestId: 'test-request-id',
    ...overrides
  } as Request;
};

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = (): NextFunction => jest.fn() as NextFunction;

describe('auth.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 when Authorization header is missing', () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();
      const next = mockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      const req = mockRequest({ headers: { authorization: 'Basic token123' } });
      const res = mockResponse();
      const next = mockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty after Bearer prefix', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer ' } });
      const res = mockResponse();
      const next = mockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer invalid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('invalid.token.here', 'test-secret-key');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer expired.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when decoded token is a string', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue('string-payload' as any);

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when decoded token is missing sub field', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        email: 'test@example.com',
        role: 'student',
        iat: 123456,
        exp: 234567
      } as any);

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when decoded token is missing email field', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        sub: 1,
        role: 'student',
        iat: 123456,
        exp: 234567
      } as any);

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when decoded token is missing role field', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
        iat: 123456,
        exp: 234567
      } as any);

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should successfully authenticate with valid token and attach user to request', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 123456,
        exp: 234567
      } as any);

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid.token.here', 'test-secret-key');
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle different user roles correctly', () => {
      const roles = ['student', 'instructor', 'admin'];

      roles.forEach((role, index) => {
        const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
        const res = mockResponse();
        const next = mockNext();

        mockedJwt.verify.mockReturnValue({
          sub: index + 1,
          email: `${role}@example.com`,
          role: role,
          iat: 123456,
          exp: 234567
        } as any);

        authenticate(req, res, next);

        expect(req.user?.role).toBe(role);
        expect(next).toHaveBeenCalled();
      });
    });

    it('should return 401 for non-JsonWebTokenError exceptions', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Some other error');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 when user is not authenticated', () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not allowed', () => {
      const req = mockRequest({ 
        user: { id: 1, email: 'student@example.com', role: 'student' } 
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access when user has the required role', () => {
      const req = mockRequest({ 
        user: { id: 1, email: 'admin@example.com', role: 'admin' } 
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      const req = mockRequest({ 
        user: { id: 2, email: 'instructor@example.com', role: 'instructor' } 
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('admin', 'instructor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 with all required roles in error message', () => {
      const req = mockRequest({ 
        user: { id: 1, email: 'student@example.com', role: 'student' } 
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('admin', 'instructor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin, instructor. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
    });

    it('should work with student role requirement', () => {
      const req = mockRequest({ 
        user: { id: 3, email: 'student@example.com', role: 'student' } 
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole('student');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should work with all three roles allowed', () => {
      const roles = ['student', 'instructor', 'admin'];
      
      roles.forEach((role, index) => {
        const req = mockRequest({ 
          user: { id: index + 1, email: `${role}@example.com`, role } 
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireRole('student', 'instructor', 'admin');
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('authenticateOptional', () => {
    it('should call next without setting user when Authorization header is missing', () => {
      const req = mockRequest({ headers: {} });
      const res = mockResponse();
      const next = mockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next without setting user when Authorization header does not start with Bearer', () => {
      const req = mockRequest({ headers: { authorization: 'Basic token123' } });
      const res = mockResponse();
      const next = mockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without setting user when token is empty', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer ' } });
      const res = mockResponse();
      const next = mockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without setting user when token is invalid', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer invalid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without setting user when token is expired', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer expired.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without setting user when decoded token is a string', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue('string-payload' as any);

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without setting user when decoded token is missing required fields', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        email: 'test@example.com',
        role: 'student'
      } as any);

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should set user and call next with valid token', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockReturnValue({
        sub: 1,
        email: 'test@example.com',
        role: 'student',
        iat: 123456,
        exp: 234567
      } as any);

      authenticateOptional(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid.token.here', 'test-secret-key');
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle different user roles correctly', () => {
      const roles = ['student', 'instructor', 'admin'];

      roles.forEach((role, index) => {
        const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
        const res = mockResponse();
        const next = mockNext();

        mockedJwt.verify.mockReturnValue({
          sub: index + 1,
          email: `${role}@example.com`,
          role: role,
          iat: 123456,
          exp: 234567
        } as any);

        authenticateOptional(req, res, next);

        expect(req.user?.role).toBe(role);
        expect(next).toHaveBeenCalled();
      });
    });

    it('should call next without error for any exception', () => {
      const req = mockRequest({ headers: { authorization: 'Bearer valid.token.here' } });
      const res = mockResponse();
      const next = mockNext();

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Some random error');
      });

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
