import { Request, Response } from 'express';

export const usersController = {
  // GET /users
  index: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'index',
      version: 'v0.5'
    });
  },

  // POST /users
  create: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'create',
      version: 'v0.5'
    });
  },

  // GET /users/:id
  show: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'show',
      id: req.params.id,
      version: 'v0.5'
    });
  },

  // PUT /users/:id
  update: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'update',
      id: req.params.id,
      version: 'v0.5'
    });
  },

  // DELETE /users/:id
  remove: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'remove',
      id: req.params.id,
      version: 'v0.5'
    });
  }
};
