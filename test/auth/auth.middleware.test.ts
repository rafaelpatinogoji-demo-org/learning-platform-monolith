import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    nextFunction = jest.fn();

    mockRequest = {
      headers: {},
      requestId: 'test-request-id'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and attach user to request', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      const decodedPayload = {
        sub: 123,
        email: 'user@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };

      mockJwt.verify.mockReturnValue(decodedPayload as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockJwt.verify).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        id: 123,
        email: 'user@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is missing', () => {
      mockRequest.headers = {};

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('Missing or invalid Authorization header')
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Basic some-token'
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('Missing or invalid Authorization header')
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is empty after Bearer prefix', () => {
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'No token provided'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
      Object.setPrototypeOf(expiredError, jwt.JsonWebTokenError.prototype);
      
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token payload is a string', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockReturnValue('string-payload' as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token payload is missing required fields', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockReturnValue({
        sub: 123,
        email: 'user@example.com'
      } as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token payload has invalid field types', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockReturnValue({
        sub: '123',
        email: 'user@example.com',
        role: 'student'
      } as any);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle non-JWT errors', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Some other error');
      });

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'AUTH_ERROR',
            message: 'Authentication failed'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access if user has required role', () => {
      mockRequest.user = {
        id: 1,
        email: 'student@example.com',
        role: 'student'
      };

      const middleware = requireRole('student');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access if user has one of multiple required roles', () => {
      mockRequest.user = {
        id: 1,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      const middleware = requireRole('admin', 'instructor');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = requireRole('student');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', () => {
      mockRequest.user = {
        id: 1,
        email: 'student@example.com',
        role: 'student'
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: expect.stringContaining('Access denied')
          })
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 with role information in error message', () => {
      mockRequest.user = {
        id: 1,
        email: 'student@example.com',
        role: 'student'
      };

      const middleware = requireRole('admin', 'instructor');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: expect.stringContaining('admin, instructor')
          })
        })
      );
    });

    it('should work with admin role', () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should work with instructor role', () => {
      mockRequest.user = {
        id: 1,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      const middleware = requireRole('instructor');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('authenticateOptional', () => {
    it('should authenticate valid token and attach user to request', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      const decodedPayload = {
        sub: 123,
        email: 'user@example.com',
        role: 'student',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      };

      mockJwt.verify.mockReturnValue(decodedPayload as any);

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockJwt.verify).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        id: 123,
        email: 'user@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if authorization header is missing', () => {
      mockRequest.headers = {};

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Basic some-token'
      };

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if token is empty', () => {
      mockRequest.headers = {
        authorization: 'Bearer '
      };

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if token payload is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockReturnValue('string-payload' as any);

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if token payload is missing required fields', () => {
      mockRequest.headers = {
        authorization: 'Bearer token'
      };

      mockJwt.verify.mockReturnValue({
        sub: 123,
        email: 'user@example.com'
      } as any);

      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
