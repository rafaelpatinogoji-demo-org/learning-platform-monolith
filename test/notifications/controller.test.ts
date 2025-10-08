import { Request, Response } from 'express';
import { notificationsController } from '../../src/controllers/notifications.controller';
import { getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { config } from '../../src/config';

jest.mock('../../src/modules/notifications/worker');
jest.mock('../../src/config');

describe('NotificationsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockConfig = config as jest.Mocked<typeof config>;
  const mockIsWorkerEnabled = isWorkerEnabled as jest.MockedFunction<typeof isWorkerEnabled>;
  const mockGetWorker = getWorker as jest.MockedFunction<typeof getWorker>;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {};
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    mockConfig.version = 'v1.9';
  });

  describe('getHealth', () => {
    it('should return disabled status when worker is not enabled', async () => {
      mockIsWorkerEnabled.mockReturnValue(false);

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
      expect(mockGetWorker).not.toHaveBeenCalled();
    });

    it('should return worker status when worker is enabled', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);

      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-20T10:00:00Z'),
        pendingEstimate: 10,
        sink: 'console'
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus),
        start: jest.fn(),
        stop: jest.fn()
      };

      mockGetWorker.mockReturnValue(mockWorker as any);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetWorker).toHaveBeenCalled();
      expect(mockWorker.getStatus).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-20T10:00:00Z'),
        pendingEstimate: 10,
        sink: 'console'
      });
    });

    it('should handle errors and return 500 status', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockIsWorkerEnabled.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      (mockRequest as any).requestId = 'test-request-id';

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
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error getting notifications health'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should include all worker status fields in response', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);

      const mockWorkerStatus = {
        enabled: true,
        interval: 3000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'file'
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus),
        start: jest.fn(),
        stop: jest.fn()
      };

      mockGetWorker.mockReturnValue(mockWorker as any);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        ...mockWorkerStatus
      });
    });

    it('should handle worker with null lastRunAt', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue({
          enabled: true,
          interval: 5000,
          lastRunAt: null,
          pendingEstimate: 0,
          sink: 'console'
        }),
        start: jest.fn(),
        stop: jest.fn()
      };

      mockGetWorker.mockReturnValue(mockWorker as any);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRunAt: null
        })
      );
    });
  });
});
