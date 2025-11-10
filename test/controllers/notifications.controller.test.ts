import { Request, Response } from 'express';
import { notificationsController } from '../../src/controllers/notifications.controller';
import { getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { config } from '../../src/config';

jest.mock('../../src/modules/notifications/worker');
jest.mock('../../src/config', () => ({
  config: {
    version: 'v1.9'
  }
}));

describe('NotificationsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      requestId: 'test-request-id'
    } as Partial<Request>;
    
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe('getHealth', () => {
    it('should return health status when worker is enabled', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date(),
        pendingEstimate: 5,
        sink: 'console'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(isWorkerEnabled).toHaveBeenCalled();
      expect(getWorker).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        ...mockStatus
      });
    });

    it('should return disabled status when worker is not enabled', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(false);

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(isWorkerEnabled).toHaveBeenCalled();
      expect(getWorker).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: false,
        message: 'Notifications worker is disabled'
      });
    });

    it('should handle errors gracefully', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Worker error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting notifications health:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should include all worker status fields when enabled', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-01'),
        pendingEstimate: 10,
        sink: 'file'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: true,
        interval: 5000,
        lastRunAt: expect.any(Date),
        pendingEstimate: 10,
        sink: 'file'
      });
    });

    it('should handle null lastRunAt', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'console'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'console'
      });
    });

    it('should include version in all responses', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(false);

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        version: 'v1.9'
      }));
    });

    it('should include ok: true in successful responses', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(false);

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: true
      }));
    });

    it('should include ok: false in error responses', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        ok: false
      }));

      consoleErrorSpy.mockRestore();
    });

    it('should include requestId in error responses', async () => {
      mockRequest.requestId = 'custom-request-id';
      
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'custom-request-id'
      }));

      consoleErrorSpy.mockRestore();
    });

    it('should return 500 status code on error', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);

      consoleErrorSpy.mockRestore();
    });

    it('should handle different sink configurations', async () => {
      const consoleSink = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date(),
        pendingEstimate: 0,
        sink: 'console'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(consoleSink)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        sink: 'console'
      }));

      jest.clearAllMocks();

      const fileSink = { ...consoleSink, sink: 'file' };
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(fileSink)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        sink: 'file'
      }));
    });

    it('should handle different pending estimates', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date(),
        pendingEstimate: 100,
        sink: 'console'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        pendingEstimate: 100
      }));
    });
  });
});
