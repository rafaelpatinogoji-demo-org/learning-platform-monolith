import { Request, Response } from 'express';
import { usersController } from '../../src/controllers/users.controller';

describe('Users Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {}
    };
    mockResponse = {
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('index', () => {
    it('should return correct response structure', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v1.9'
      });
    });
  });

  describe('create', () => {
    it('should return correct response structure', async () => {
      await usersController.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v1.9'
      });
    });
  });

  describe('show', () => {
    it('should return correct response structure with user id', async () => {
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

  describe('update', () => {
    it('should return correct response structure with user id', async () => {
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

  describe('remove', () => {
    it('should return correct response structure with user id', async () => {
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
