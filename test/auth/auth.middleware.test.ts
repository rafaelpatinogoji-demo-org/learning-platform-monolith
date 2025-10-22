import { authenticate, requireRole, authenticateOptional } from '../../src/middleware/auth.middleware';
import { signJwt } from '../../src/utils/jwt-utils';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/test-utils';
import { Request, Response } from 'express';

jest.mock('../../src/config', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-jest',
    nodeEnv: 'test',
    port: 4001,
  }
}));

describe('Auth Middleware', () => {
  const TEST_SECRET = 'test-secret-key-for-jest';

  describe('authenticate', () => {
    it('should attach user to request with valid token', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        TEST_SECRET
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(1);
      expect(req.user?.email).toBe('test@example.com');
      expect(req.user?.role).toBe('student');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when Authorization header is missing', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('Missing or invalid Authorization header')
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', () => {
      const req = createMockRequest({
        headers: { authorization: 'Basic abc123' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer ' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'No token provided'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid token signature', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        'wrong-secret'
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with expired token', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        TEST_SECRET,
        { expiresIn: '-1s' }
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with malformed token', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token has invalid payload structure (missing required fields)', () => {
      const invalidToken = signJwt(
        { id: 1, wrongField: 'value' } as any,
        TEST_SECRET
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${invalidToken}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', () => {
      const req = createMockRequest({
        user: { id: 1, email: 'instructor@example.com', role: 'instructor' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = requireRole('instructor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      const req = createMockRequest({
        user: { id: 1, email: 'admin@example.com', role: 'admin' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = requireRole('admin', 'instructor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user does not have required role', () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = requireRole('instructor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: expect.stringContaining('Access denied')
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = requireRole('instructor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should include role information in error message', () => {
      const req = createMockRequest({
        user: { id: 1, email: 'student@example.com', role: 'student' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      const middleware = requireRole('admin', 'instructor');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: expect.stringContaining('Required role(s): admin, instructor')
          })
        })
      );
    });
  });

  describe('authenticateOptional', () => {
    it('should attach user when valid token is provided', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        TEST_SECRET
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(1);
      expect(req.user?.email).toBe('test@example.com');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should continue without user when no token is provided', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid.token.here' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when Authorization header is malformed', () => {
      const req = createMockRequest({
        headers: { authorization: 'Basic abc123' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is expired', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        TEST_SECRET,
        { expiresIn: '-1s' }
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token has invalid payload', () => {
      const token = signJwt(
        { id: 1, email: 'test@example.com', role: 'student' },
        'wrong-secret'
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${token}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token has invalid payload structure (missing fields)', () => {
      const invalidToken = signJwt(
        { id: 1, wrongField: 'value' } as any,
        TEST_SECRET
      );

      const req = createMockRequest({
        headers: { authorization: `Bearer ${invalidToken}` }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is just whitespace', () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer    ' }
      }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      authenticateOptional(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
