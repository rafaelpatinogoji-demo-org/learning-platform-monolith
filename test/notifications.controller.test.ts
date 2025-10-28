import { Request, Response } from 'express';
import { notificationsController } from '../src/controllers/notifications.controller';
import * as worker from '../src/modules/notifications/worker';
import { config } from '../src/config';

jest.mock('../src/modules/notifications/worker');

jest.mock('../src/config', () => ({
  config: {
    version: 'v1.9'
  }
}));

describe('NotificationsController', () => {
  describe('getHealth', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      mockRequest = {
        requestId: 'test-request-id'
      } as any;

      jsonSpy = jest.fn().mockReturnThis();
      statusSpy = jest.fn().mockReturnThis();
      mockResponse = {
        json: jsonSpy,
        status: statusSpy
      };
    });

    describe('when worker is disabled', () => {
      beforeEach(() => {
        (worker.isWorkerEnabled as jest.Mock).mockReturnValue(false);
      });

      it('should return disabled status with 200 OK', async () => {
        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(worker.isWorkerEnabled).toHaveBeenCalledTimes(1);
        expect(worker.getWorker).not.toHaveBeenCalled();
        expect(jsonSpy).toHaveBeenCalledWith({
          ok: true,
          version: 'v1.9',
          enabled: false,
          message: 'Notifications worker is disabled'
        });
        expect(statusSpy).not.toHaveBeenCalled();
      });
    });

    describe('when worker is enabled', () => {
      let mockWorkerInstance: any;

      beforeEach(() => {
        (worker.isWorkerEnabled as jest.Mock).mockReturnValue(true);
        
        mockWorkerInstance = {
          getStatus: jest.fn()
        };
        
        (worker.getWorker as jest.Mock).mockReturnValue(mockWorkerInstance);
      });

      it('should return worker status with 200 OK', async () => {
        const mockStatus = {
          enabled: true,
          interval: 5000,
          lastRunAt: new Date('2024-01-01T00:00:00Z'),
          pendingEstimate: 5,
          sink: 'console'
        };

        mockWorkerInstance.getStatus.mockReturnValue(mockStatus);

        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(worker.isWorkerEnabled).toHaveBeenCalledTimes(1);
        expect(worker.getWorker).toHaveBeenCalledTimes(1);
        expect(mockWorkerInstance.getStatus).toHaveBeenCalledTimes(1);
        expect(jsonSpy).toHaveBeenCalledWith({
          ok: true,
          version: 'v1.9',
          ...mockStatus
        });
        expect(statusSpy).not.toHaveBeenCalled();
      });

      it('should handle null lastRunAt in status', async () => {
        const mockStatus = {
          enabled: true,
          interval: 5000,
          lastRunAt: null,
          pendingEstimate: 0,
          sink: 'file'
        };

        mockWorkerInstance.getStatus.mockReturnValue(mockStatus);

        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonSpy).toHaveBeenCalledWith({
          ok: true,
          version: 'v1.9',
          ...mockStatus
        });
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        (worker.isWorkerEnabled as jest.Mock).mockReturnValue(true);
      });

      it('should return 500 error when getWorker throws error', async () => {
        const mockError = new Error('Worker initialization failed');
        (worker.getWorker as jest.Mock).mockImplementation(() => {
          throw mockError;
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(worker.isWorkerEnabled).toHaveBeenCalledTimes(1);
        expect(worker.getWorker).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error getting notifications health:',
          mockError
        );
        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get notifications health status',
          requestId: 'test-request-id'
        });

        consoleErrorSpy.mockRestore();
      });

      it('should return 500 error when getStatus throws error', async () => {
        const mockError = new Error('Status retrieval failed');
        const mockWorkerInstance = {
          getStatus: jest.fn().mockImplementation(() => {
            throw mockError;
          })
        };

        (worker.getWorker as jest.Mock).mockReturnValue(mockWorkerInstance);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(worker.getWorker).toHaveBeenCalledTimes(1);
        expect(mockWorkerInstance.getStatus).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error getting notifications health:',
          mockError
        );
        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get notifications health status',
          requestId: 'test-request-id'
        });

        consoleErrorSpy.mockRestore();
      });

      it('should include requestId in error response', async () => {
        (mockRequest as any).requestId = 'unique-request-123';
        
        (worker.getWorker as jest.Mock).mockImplementation(() => {
          throw new Error('Test error');
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await notificationsController.getHealth(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(jsonSpy).toHaveBeenCalledWith({
          ok: false,
          error: 'Failed to get notifications health status',
          requestId: 'unique-request-123'
        });

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
