import { notificationsController } from '../../src/controllers/notifications.controller';
import { getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { Request, Response } from 'express';

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
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      requestId: 'test-request-id'
    } as any;

    mockResponse = {
      json: jsonMock,
      status: statusMock
    } as Partial<Response>;

    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should return disabled status when notifications are disabled', async () => {
      (isWorkerEnabled as jest.Mock).mockReturnValue(false);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: false,
        message: 'Notifications worker is disabled'
      });
    });

    it('should return worker status when notifications are enabled', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-01T10:00:00Z'),
        pendingEstimate: 10,
        sink: 'console'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        ...mockStatus
      });
    });

    it('should return 500 error when worker fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Worker error');
      });

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });

      consoleSpy.mockRestore();
    });

    it('should include all status fields when enabled', async () => {
      const mockStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-01T10:00:00Z'),
        pendingEstimate: 0,
        sink: 'file'
      };

      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockReturnValue(mockStatus)
      });

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-01T10:00:00Z'),
        pendingEstimate: 0,
        sink: 'file'
      });
    });

    it('should handle null lastRunAt correctly', async () => {
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

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

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

    it('should handle getStatus throwing error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockReturnValue({
        getStatus: jest.fn().mockImplementation(() => {
          throw new Error('Status error');
        })
      });

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });

      consoleSpy.mockRestore();
    });

    it('should use default requestId if not provided', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const requestWithoutId = {} as Request;
      
      (isWorkerEnabled as jest.Mock).mockReturnValue(true);
      (getWorker as jest.Mock).mockImplementation(() => {
        throw new Error('Worker error');
      });

      await notificationsController.getHealth(
        requestWithoutId,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: undefined
      });

      consoleSpy.mockRestore();
    });
  });
});
