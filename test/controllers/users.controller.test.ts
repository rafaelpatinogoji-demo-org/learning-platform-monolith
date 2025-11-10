import { Request, Response } from 'express';
import { usersController } from '../../src/controllers/users.controller';

describe('UsersController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      params: {},
      body: {},
      user: undefined
    };
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('index', () => {
    it('should return users index response', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'index',
        version: 'v1.9'
      });
    });

    it('should handle request successfully', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should return users create response', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      await usersController.create(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'create',
        version: 'v1.9'
      });
    });

    it('should handle request successfully', async () => {
      await usersController.create(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('should return user show response with id', async () => {
      mockRequest.params = { id: '123' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '123',
        version: 'v1.9'
      });
    });

    it('should handle different user ids', async () => {
      mockRequest.params = { id: '456' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'show',
        id: '456',
        version: 'v1.9'
      });
    });

    it('should handle request successfully', async () => {
      mockRequest.params = { id: '1' };

      await usersController.show(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return user update response with id', async () => {
      mockRequest.params = { id: '123' };
      mockRequest.body = { name: 'Updated Name' };

      await usersController.update(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '123',
        version: 'v1.9'
      });
    });

    it('should handle different user ids', async () => {
      mockRequest.params = { id: '789' };

      await usersController.update(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'update',
        id: '789',
        version: 'v1.9'
      });
    });

    it('should handle request successfully', async () => {
      mockRequest.params = { id: '1' };

      await usersController.update(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should return user remove response with id', async () => {
      mockRequest.params = { id: '123' };

      await usersController.remove(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '123',
        version: 'v1.9'
      });
    });

    it('should handle different user ids', async () => {
      mockRequest.params = { id: '999' };

      await usersController.remove(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        route: 'users',
        action: 'remove',
        id: '999',
        version: 'v1.9'
      });
    });

    it('should handle request successfully', async () => {
      mockRequest.params = { id: '1' };

      await usersController.remove(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('HTTP response format', () => {
    it('should always include ok: true in responses', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

      await usersController.create(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

      mockRequest.params = { id: '1' };
      await usersController.show(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

      await usersController.update(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

      await usersController.remove(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });

    it('should always include version in responses', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ version: 'v1.9' }));

      await usersController.create(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ version: 'v1.9' }));

      mockRequest.params = { id: '1' };
      await usersController.show(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ version: 'v1.9' }));

      await usersController.update(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ version: 'v1.9' }));

      await usersController.remove(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ version: 'v1.9' }));
    });

    it('should include route and action in responses', async () => {
      await usersController.index(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ 
        route: 'users', 
        action: 'index' 
      }));

      await usersController.create(mockRequest as Request, mockResponse as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ 
        route: 'users', 
        action: 'create' 
      }));
    });
  });
});
