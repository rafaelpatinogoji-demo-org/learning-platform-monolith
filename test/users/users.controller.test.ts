import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { usersController } from '../../src/controllers/users.controller';

describe('Users Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {}
    } as any;
    
    mockResponse = {
      json: jest.fn().mockReturnThis()
    } as any;
  });

  describe('GET /users', () => {
    it('should return index route response', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v1.9'
      });
    });
  });

  describe('POST /users', () => {
    it('should return create route response', async () => {
      await usersController.create(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v1.9'
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return show route response with id', async () => {
      mockRequest.params = { id: '123' };
      
      await usersController.show(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '123',
        version: 'v1.9'
      });
    });
  });

  describe('PUT /users/:id', () => {
    it('should return update route response with id', async () => {
      mockRequest.params = { id: '456' };
      
      await usersController.update(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '456',
        version: 'v1.9'
      });
    });
  });

  describe('DELETE /users/:id', () => {
    it('should return remove route response with id', async () => {
      mockRequest.params = { id: '789' };
      
      await usersController.remove(mockRequest as Request, mockResponse as Response);
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '789',
        version: 'v1.9'
      });
    });
  });
});
