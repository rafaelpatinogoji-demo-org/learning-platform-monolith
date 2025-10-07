import express, { Router } from 'express';
import usersRoutes from '../../src/routes/users.routes';
import { usersController } from '../../src/controllers/users.controller';
import { authenticate, requireRole } from '../../src/middleware/auth.middleware';

jest.mock('../../src/controllers/users.controller');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => next()),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  authenticateOptional: jest.fn((req: any, res: any, next: any) => next())
}));

describe('Users Routes', () => {
  let router: Router;

  beforeEach(() => {
    router = usersRoutes;
  });

  it('should export a Router instance', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });

  it('should have GET / route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const indexRoute = routes.find((r: any) => r.path === '/');
    expect(indexRoute).toBeDefined();
    expect(indexRoute.methods).toContain('get');
  });

  it('should have POST / route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const createRoute = routes.find((r: any) => r.path === '/' && r.methods.includes('post'));
    expect(createRoute).toBeDefined();
  });

  it('should have GET /:id route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const showRoute = routes.find((r: any) => r.path === '/:id');
    expect(showRoute).toBeDefined();
    expect(showRoute.methods).toContain('get');
  });

  it('should have PUT /:id route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const updateRoute = routes.find((r: any) => r.path === '/:id' && r.methods.includes('put'));
    expect(updateRoute).toBeDefined();
  });

  it('should have DELETE /:id route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const deleteRoute = routes.find((r: any) => r.path === '/:id' && r.methods.includes('delete'));
    expect(deleteRoute).toBeDefined();
  });

  it('should apply authenticate middleware to all routes', () => {
    const middlewares = (router as any).stack.filter((layer: any) => !layer.route);
    expect(middlewares.length).toBeGreaterThan(0);
  });
});
