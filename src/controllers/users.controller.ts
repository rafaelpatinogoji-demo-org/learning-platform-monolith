import { Request, Response } from 'express';
import { UsersService } from '../services/users.service';
import { UserValidator } from '../utils/validation';

export const usersController = {
  index: async (req: Request, res: Response) => {
    try {
      const params = UserValidator.validateListParams(req.query);
      const result = await UsersService.listUsers(params);

      res.json({
        ok: true,
        data: result.users,
        pagination: result.pagination,
        version: 'v1.9'
      });
    } catch (error) {
      console.error(`[${req.requestId}] List users error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list users',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  show: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const user = await UsersService.getUserById(userId);
      if (!user) {
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

      res.json({
        ok: true,
        data: user,
        version: 'v1.9'
      });
    } catch (error) {
      console.error(`[${req.requestId}] Get user error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  updateRole: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID',
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const validation = UserValidator.validateRoleUpdate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role data',
            details: validation.errors,
            requestId: req.requestId,
            timestamp: new Date().toISOString()
          }
        });
      }

      const existingUser = await UsersService.getUserById(userId);
      if (!existingUser) {
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

      const updatedUser = await UsersService.updateUserRole(userId, req.body.role);

      res.json({
        ok: true,
        data: updatedUser,
        message: 'User role updated successfully',
        version: 'v1.9'
      });
    } catch (error) {
      console.error(`[${req.requestId}] Update user role error:`, error);
      res.status(500).json({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user role',
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  create: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'create',
      version: 'v1.9'
    });
  },

  update: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'update',
      id: req.params.id,
      version: 'v1.9'
    });
  },

  remove: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'remove',
      id: req.params.id,
      version: 'v1.9'
    });
  }
};
