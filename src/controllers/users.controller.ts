import { Request, Response } from 'express';

export const usersController = {
  // GET /users
  index: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'index',
      // Identificador de versión de API - Actualizado a v1.9 con mejoras de funcionalidad
      version: 'v1.9'
    });
  },

  // POST /users
  create: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'create',
      // Identificador de versión de API - Actualizado a v1.9 con mejoras de funcionalidad
      version: 'v1.9'
    });
  },

  // GET /users/:id
  show: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'show',
      id: req.params.id,
      // Identificador de versión de API - Actualizado a v1.9 con mejoras de funcionalidad
      version: 'v1.9'
    });
  },

  // PUT /users/:id
  update: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'update',
      id: req.params.id,
      // Identificador de versión de API - Actualizado a v1.9 con mejoras de funcionalidad
      version: 'v1.9'
    });
  },

  // DELETE /users/:id
  remove: async (req: Request, res: Response) => {
    res.json({
      ok: true,
      route: 'users',
      action: 'remove',
      id: req.params.id,
      // Identificador de versión de API - Actualizado a v1.9 con mejoras de funcionalidad
      version: 'v1.9'
    });
  }
};
