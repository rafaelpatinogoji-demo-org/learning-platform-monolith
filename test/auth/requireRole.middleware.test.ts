/**
 * Tests for requireRole middleware
 * 
 * Tests role-based access control without any database dependencies.
 * Assumes authenticate middleware has already run and populated req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../src/middleware/auth.middleware';
import { testUtils } from '../setup';

describe('requireRole middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    
    // Ensure clean environment
    jest.clearAllMocks();
  });

  describe('Missing User Authentication', () => {
    it('should return 401 when req.user is undefined', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = undefined;

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should return 401 when req.user is null', () => {
      // Arrange
      const middleware = requireRole('student');
      mockReq.user = null as any;

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

  describe('Single Role Requirements', () => {
    it('should allow access when user has exact required role', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should deny access when user role does not match', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = {
        id: 2,
        email: 'student@example.com',
        role: 'student'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should handle instructor role requirement', () => {
      // Arrange
      const middleware = requireRole('instructor');
      mockReq.user = {
        id: 3,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle student role requirement', () => {
      // Arrange
      const middleware = requireRole('student');
      mockReq.user = {
        id: 4,
        email: 'student@example.com',
        role: 'student'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Multiple Role Requirements', () => {
    it('should allow access when user has first of multiple allowed roles', () => {
      // Arrange
      const middleware = requireRole('instructor', 'admin');
      mockReq.user = {
        id: 5,
        email: 'instructor@example.com',
        role: 'instructor'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user has second of multiple allowed roles', () => {
      // Arrange
      const middleware = requireRole('instructor', 'admin');
      mockReq.user = {
        id: 6,
        email: 'admin@example.com',
        role: 'admin'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user role is not in allowed list', () => {
      // Arrange
      const middleware = requireRole('instructor', 'admin');
      mockReq.user = {
        id: 7,
        email: 'student@example.com',
        role: 'student'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): instructor, admin. Your role: student',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle three role requirements', () => {
      // Arrange
      const middleware = requireRole('student', 'instructor', 'admin');
      
      // Test student access
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Reset and test instructor access
      jest.clearAllMocks();
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Reset and test admin access
      jest.clearAllMocks();
      mockReq.user = { id: 3, email: 'admin@example.com', role: 'admin' };
      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should be case-sensitive for role matching', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = {
        id: 8,
        email: 'user@example.com',
        role: 'Admin' // Different case
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: Admin',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty role string', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = {
        id: 9,
        email: 'user@example.com',
        role: ''
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required role(s): admin. Your role: ',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle whitespace in roles', () => {
      // Arrange
      const middleware = requireRole('admin');
      mockReq.user = {
        id: 10,
        email: 'user@example.com',
        role: ' admin ' // With whitespace
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle special characters in roles', () => {
      // Arrange
      const middleware = requireRole('super-admin');
      mockReq.user = {
        id: 11,
        email: 'user@example.com',
        role: 'super-admin'
      };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Error Response Format', () => {
    it('should include timestamp in error responses', () => {
      // Arrange
      const beforeTime = new Date().toISOString();
      const middleware = requireRole('admin');
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      const afterTime = new Date().toISOString();
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.error.timestamp;
      
      expect(timestamp).toBeDefined();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });

    it('should include requestId in error responses', () => {
      // Arrange
      const customRequestId = 'role-test-456';
      const middleware = requireRole('admin');
      mockReq.requestId = customRequestId;
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.requestId).toBe(customRequestId);
    });

    it('should format multiple roles correctly in error message', () => {
      // Arrange
      const middleware = requireRole('instructor', 'admin', 'super-admin');
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.message).toBe(
        'Access denied. Required role(s): instructor, admin, super-admin. Your role: student'
      );
    });
  });

  describe('Middleware Factory Pattern', () => {
    it('should return a function when called', () => {
      // Act
      const middleware = requireRole('admin');

      // Assert
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next parameters
    });

    it('should create independent middleware instances', () => {
      // Arrange
      const adminMiddleware = requireRole('admin');
      const studentMiddleware = requireRole('student');
      
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };

      // Act & Assert
      adminMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      studentMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403); // Admin trying to access student-only
    });

    it('should handle no role arguments gracefully', () => {
      // Arrange
      const middleware = requireRole(); // No roles specified
      mockReq.user = { id: 1, email: 'user@example.com', role: 'admin' };

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert - Should deny access since no roles are allowed
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
