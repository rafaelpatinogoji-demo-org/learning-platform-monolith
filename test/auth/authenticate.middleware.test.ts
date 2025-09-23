/**
 * Tests for authenticate middleware
 * 
 * Tests JWT token validation, user attachment, and error handling
 * without any database dependencies.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/auth.middleware';
import { signJwt } from '../../src/utils/jwt-utils';
import { testUtils } from '../setup';

// Test configuration
const TEST_JWT_SECRET = 'test-secret-for-jest-testing';
const VALID_USER = {
  id: 1,
  email: 'test@example.com',
  role: 'student'
};

describe('authenticate middleware', () => {
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

  describe('Missing Authorization Header', () => {
    it('should return 401 when Authorization header is missing', () => {
      // Arrange
      mockReq.headers = {};

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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
      // Arrange
      mockReq.headers = {
        authorization: 'Basic dGVzdDp0ZXN0'
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should return 401 when Bearer token is empty', () => {
      // Arrange
      mockReq.headers = {
        authorization: 'Bearer '
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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
  });

  describe('Invalid Token Scenarios', () => {
    it('should return 401 when token signature is invalid', () => {
      // Arrange
      const invalidToken = signJwt(VALID_USER, 'wrong-secret');
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should return 401 when token is malformed', () => {
      // Arrange
      mockReq.headers = {
        authorization: 'Bearer invalid.token.format'
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should return 401 when token is expired', () => {
      // Arrange - Create expired token using fake timers
      jest.useFakeTimers();
      const pastTime = new Date('2023-01-01').getTime();
      jest.setSystemTime(pastTime);
      
      const expiredToken = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward to make token expired
      jest.setSystemTime(pastTime + 2000); // 2 seconds later
      
      mockReq.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
      
      // Cleanup
      jest.useRealTimers();
    });

    it('should return 401 when token payload is a string', () => {
      // Arrange - Create token with string payload (edge case)
      const stringToken = jwt.sign('string-payload', TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${stringToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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

    it('should return 401 when token payload has invalid structure', () => {
      // Arrange - Create token with missing required fields
      const invalidPayload = { sub: 'not-a-number', email: 123, role: null };
      const invalidToken = jwt.sign(invalidPayload, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
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
  });

  describe('Valid Token Scenarios', () => {
    it('should attach user to request and call next() for valid token', () => {
      // Arrange
      const validToken = signJwt(VALID_USER, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toEqual({
        id: VALID_USER.id,
        email: VALID_USER.email,
        role: VALID_USER.role
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle different user roles correctly', () => {
      // Test with admin user
      const adminUser = { id: 2, email: 'admin@example.com', role: 'admin' };
      const adminToken = signJwt(adminUser, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${adminToken}`
      };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle instructor role correctly', () => {
      // Test with instructor user
      const instructorUser = { id: 3, email: 'instructor@example.com', role: 'instructor' };
      const instructorToken = signJwt(instructorUser, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${instructorToken}`
      };

      authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: instructorUser.id,
        email: instructorUser.email,
        role: instructorUser.role
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should preserve other request properties', () => {
      // Arrange
      const validToken = signJwt(VALID_USER, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${validToken}`,
        'content-type': 'application/json'
      };
      mockReq.body = { test: 'data' };
      mockReq.params = { id: '123' };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.headers['content-type']).toBe('application/json');
      expect(mockReq.body).toEqual({ test: 'data' });
      expect(mockReq.params).toEqual({ id: '123' });
      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', () => {
      // Arrange - Mock jwt.verify to throw unexpected error
      const originalVerify = jwt.verify;
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const validToken = signJwt(VALID_USER, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          requestId: 'test-request-id',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Cleanup
      jwt.verify = originalVerify;
    });

    it('should include timestamp in error responses', () => {
      // Arrange
      const beforeTime = new Date().toISOString();
      mockReq.headers = {};

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

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
      const customRequestId = 'custom-request-123';
      mockReq = testUtils.createMockRequest({
        headers: {},
        requestId: customRequestId
      });

      // Act
      authenticate(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.requestId).toBe(customRequestId);
    });
  });

  describe('authenticateOptional middleware', () => {
    const { authenticateOptional, authMiddleware } = require('../../src/middleware/auth.middleware');

    beforeEach(() => {
      mockReq = testUtils.createMockRequest();
      mockRes = testUtils.createMockResponse();
      mockNext = testUtils.createMockNext();
      jest.clearAllMocks();
    });

    it('should continue without user when no Authorization header', () => {
      // Arrange
      mockReq.headers = {};

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should continue without user when Authorization header is not Bearer', () => {
      // Arrange
      mockReq.headers = {
        authorization: 'Basic dGVzdDp0ZXN0'
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when Bearer token is empty', () => {
      // Arrange
      mockReq.headers = {
        authorization: 'Bearer '
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should attach user when valid token is provided', () => {
      // Arrange
      const validToken = signJwt(VALID_USER, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toEqual({
        id: VALID_USER.id,
        email: VALID_USER.email,
        role: VALID_USER.role
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when token signature is invalid', () => {
      // Arrange
      const invalidToken = signJwt(VALID_USER, 'wrong-secret');
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when token is expired', () => {
      // Arrange
      jest.useFakeTimers();
      const pastTime = new Date('2023-01-01').getTime();
      jest.setSystemTime(pastTime);
      
      const expiredToken = signJwt(VALID_USER, TEST_JWT_SECRET, { expiresIn: '1s' });
      
      // Move time forward to make token expired
      jest.setSystemTime(pastTime + 2000);
      
      mockReq.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      
      // Cleanup
      jest.useRealTimers();
    });

    it('should continue without user when token payload is invalid', () => {
      // Arrange
      const stringToken = jwt.sign('string-payload', TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${stringToken}`
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when token payload structure is invalid', () => {
      // Arrange
      const invalidPayload = { sub: 'not-a-number', email: 123, role: null };
      const invalidToken = jwt.sign(invalidPayload, TEST_JWT_SECRET);
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      // Act
      authenticateOptional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('authMiddleware convenience object', () => {
    const { authMiddleware } = require('../../src/middleware/auth.middleware');

    it('should expose required and optional middleware', () => {
      // Assert
      expect(authMiddleware).toBeDefined();
      expect(typeof authMiddleware.required).toBe('function');
      expect(typeof authMiddleware.optional).toBe('function');
      expect(authMiddleware.required.length).toBe(3); // req, res, next
      expect(authMiddleware.optional.length).toBe(3); // req, res, next
    });

    it('should have required middleware that matches authenticate', () => {
      // Assert
      expect(authMiddleware.required).toBe(authenticate);
    });

    it('should have optional middleware that works correctly', () => {
      // Arrange
      mockReq = testUtils.createMockRequest({ headers: {} });
      mockRes = testUtils.createMockResponse();
      mockNext = testUtils.createMockNext();

      // Act
      authMiddleware.optional(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toBeUndefined();
    });
  });
});
