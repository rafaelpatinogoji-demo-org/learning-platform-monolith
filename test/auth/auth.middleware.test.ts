import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';
import { signJwt } from '../../src/utils/jwt-utils';
import { config } from '../../src/config';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    
    mockRequest = {
      headers: {},
      requestId: 'test-request-id'
    } as any;
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;
    
    nextFunction = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and attach user to request', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const token = signJwt(payload, config.jwtSecret);
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is missing', () => {
      mockRequest.headers = {};
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('Missing or invalid Authorization header')
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      mockRequest.headers = {
        authorization: 'Basic credentials'
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty', () => {
      mockRequest.headers = {
        authorization: 'Bearer '
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here'
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const expiredToken = signJwt(payload, config.jwtSecret, { expiresIn: -1 });
      
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_TOKEN'
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for token with invalid payload structure', () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign({ sub: 'not-a-number' }, config.jwtSecret);
      
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };
      
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      mockRequest.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };
      
      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for user with any of multiple allowed roles', () => {
      mockRequest.user = {
        id: 1,
        email: 'instructor@example.com',
        role: 'instructor'
      };
      
      const middleware = requireRole('admin', 'instructor');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      mockRequest.user = {
        id: 1,
        email: 'student@example.com',
        role: 'student'
      };
      
      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'FORBIDDEN',
          message: expect.stringContaining('Access denied')
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockRequest.user = undefined;
      
      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should include required roles in error message', () => {
      mockRequest.user = {
        id: 1,
        email: 'student@example.com',
        role: 'student'
      };
      
      const middleware = requireRole('admin', 'instructor');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: expect.objectContaining({
          message: expect.stringContaining('admin, instructor')
        })
      });
    });
  });

  describe('authenticateOptional', () => {
    it('should authenticate and attach user when valid token provided', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const token = signJwt(payload, config.jwtSecret);
      
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };
      
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'student'
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when no Authorization header', () => {
      mockRequest.headers = {};
      
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user when Authorization header is invalid', () => {
      mockRequest.headers = {
        authorization: 'Basic credentials'
      };
      
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here'
      };
      
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is expired', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'student' };
      const expiredToken = signJwt(payload, config.jwtSecret, { expiresIn: -1 });
      
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };
      
      authenticateOptional(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
