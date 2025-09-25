import { Request, Response } from 'express';
import { db } from '../db';
import { AuthService } from '../services/auth.service';
import { config } from '../config';

export const authController = {
  // POST /auth/register - Create new user account
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;

      // Basic validation
      if (!email || !password || !name) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email, password, and name are required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Email format validation (basic)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Password strength validation (basic)
      if (password.length < 6) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 6 characters long',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Role validation - allow role assignment for development/testing
      let userRole = 'student';
      if (role && ['admin', 'instructor', 'student'].includes(role)) {
        userRole = role;
      } else if (role && !['admin', 'instructor', 'student'].includes(role)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be admin, instructor, or student',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if email already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already registered',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Create user
      const result = await db.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, password_hash, name, role, created_at',
        [email.toLowerCase(), hashedPassword, name, userRole]
      );

      const user = result.rows[0];
      const profile = AuthService.createUserProfile(user);
      
      await AuthService.syncUserToMongoDB(user);
      
      // Generate JWT token for immediate login
      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.status(201).json({
        ok: true,
        message: 'User registered successfully',
        token,
        user: profile,
        version: config.version
      });
    } catch (error) {
      console.error(`[${req.requestId}] Registration error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // POST /auth/login - Authenticate user and issue JWT
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Find user by email
      const result = await db.query(
        'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          ok: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Generate JWT token
      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const profile = AuthService.createUserProfile(user);

      res.json({
        ok: true,
        message: 'Login successful',
        token,
        user: profile,
        version: config.version
      });
    } catch (error) {
      console.error(`[${req.requestId}] Login error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // GET /auth/me - Get current user profile from token
  me: async (req: Request, res: Response) => {
    try {
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

      // Fetch fresh user data from database
      const result = await db.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = result.rows[0];
      const profile = AuthService.createUserProfile(user);

      res.json({
        ok: true,
        user: profile,
        version: config.version
      });
    } catch (error) {
      console.error(`[${req.requestId}] Get profile error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};
