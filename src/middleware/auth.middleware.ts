import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate JWT tokens
 * Reads Authorization: Bearer <token>, verifies, and attaches req.user
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Type guard to ensure we have the expected payload structure
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      throw new jwt.JsonWebTokenError('Invalid token payload');
    }
    
    // Validate required fields exist and have correct types
    if (typeof decoded.sub !== 'number' || typeof decoded.email !== 'string' || typeof decoded.role !== 'string') {
      throw new jwt.JsonWebTokenError('Invalid token payload structure');
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(401).json({
      ok: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * RBAC guard that checks if user has required role(s)
 * Must be used after authenticate middleware
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token is provided
 */
export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no auth header, just continue without setting req.user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Type guard to ensure we have the expected payload structure
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      // Invalid token, but since auth is optional, just continue
      return next();
    }
    
    // Validate required fields exist and have correct types
    if (typeof decoded.sub !== 'number' || typeof decoded.email !== 'string' || typeof decoded.role !== 'string') {
      // Invalid token structure, but since auth is optional, just continue
      return next();
    }
    
    // Attach user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors, just continue without user
    next();
  }
};

/**
 * Convenience object for auth middleware
 */
export const authMiddleware = {
  required: authenticate,
  optional: authenticateOptional
};
