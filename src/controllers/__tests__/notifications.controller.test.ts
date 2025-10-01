import { Request, Response } from 'express';
import { notificationsController } from '../notifications.controller';
import { getWorker, isWorkerEnabled } from '../../modules/notifications/worker';
import { config } from '../../config';

jest.mock('../../modules/notifications/worker');
jest.mock('../../config', () => ({
  config: {
    version: 'v1.9'
  }
}));

const mockedIsWorkerEnabled = jest.mocked(isWorkerEnabled);
const mockedGetWorker = jest.mocked(getWorker);

describe('NotificationsController', () => {
  describe('getHealth', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRequest = {
        requestId: 'test-request-id'
      } as Partial<Request>;

      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      
      mockResponse = {
        json: jsonMock,
        status: statusMock
      } as Partial<Response>;
    });

    it('should return 200 with disabled status when worker is disabled', async () => {
      mockedIsWorkerEnabled.mockReturnValue(false);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedIsWorkerEnabled).toHaveBeenCalledTimes(1);
      expect(mockedGetWorker).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        enabled: false,
        message: 'Notifications worker is disabled'
      });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 200 with worker status when worker is enabled', async () => {
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-01T00:00:00Z'),
        pendingEstimate: 10,
        sink: 'console'
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus)
      };

      mockedIsWorkerEnabled.mockReturnValue(true);
      mockedGetWorker.mockReturnValue(mockWorker as any);

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockedIsWorkerEnabled).toHaveBeenCalledTimes(1);
      expect(mockedGetWorker).toHaveBeenCalledTimes(1);
      expect(mockWorker.getStatus).toHaveBeenCalledTimes(1);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: true,
        version: 'v1.9',
        ...mockWorkerStatus
      });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 500 with error message when an error occurs', async () => {
      const mockError = new Error('Worker initialization failed');
      mockedIsWorkerEnabled.mockImplementation(() => {
        throw mockError;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await notificationsController.getHealth(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting notifications health:',
        mockError
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
