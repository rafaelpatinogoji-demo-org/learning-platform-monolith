import express, { Router } from 'express';
import authRoutes from '../../src/routes/auth.routes';
import { authController } from '../../src/controllers/auth.controller';
import { authenticate } from '../../src/middleware/auth.middleware';

jest.mock('../../src/controllers/auth.controller');
jest.mock('../../src/middleware/auth.middleware');

describe('Auth Routes', () => {
  let router: Router;

  beforeEach(() => {
    router = authRoutes;
  });

  it('should export a Router instance', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });

  it('should have POST /register route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const registerRoute = routes.find((r: any) => r.path === '/register');
    expect(registerRoute).toBeDefined();
    expect(registerRoute.methods).toContain('post');
  });

  it('should have POST /login route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const loginRoute = routes.find((r: any) => r.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute.methods).toContain('post');
  });

  it('should have GET /me route', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const meRoute = routes.find((r: any) => r.path === '/me');
    expect(meRoute).toBeDefined();
    expect(meRoute.methods).toContain('get');
  });

  it('should have authenticate middleware on /me route', () => {
    const meRoute = (router as any).stack
      .filter((layer: any) => layer.route)
      .find((layer: any) => layer.route.path === '/me');

    expect(meRoute).toBeDefined();
    expect(meRoute.route.stack.length).toBeGreaterThan(1);
  });
});
