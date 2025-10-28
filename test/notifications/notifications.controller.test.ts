/**
 * Tests for notifications controller
 * 
 * Tests the health endpoint and error handling
 * without any external dependencies using mocks.
 */

import { Request, Response } from 'express';
import { notificationsController } from '../../src/controllers/notifications.controller';
import { testUtils } from '../setup';

jest.mock('../../src/modules/notifications/worker', () => ({
  getWorker: jest.fn(),
  isWorkerEnabled: jest.fn()
}));

jest.mock('../../src/config', () => ({
  config: {
    version: '1.3.0'
  }
}));

import { getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';

describe('notifications controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockGetWorker: jest.MockedFunction<typeof getWorker>;
  let mockIsWorkerEnabled: jest.MockedFunction<typeof isWorkerEnabled>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockGetWorker = getWorker as jest.MockedFunction<typeof getWorker>;
    mockIsWorkerEnabled = isWorkerEnabled as jest.MockedFunction<typeof isWorkerEnabled>;
    
    jest.clearAllMocks();
  });

  describe('getHealth endpoint', () => {
    it('should return disabled status when worker is not enabled', async () => {
      // Arrange
      mockIsWorkerEnabled.mockReturnValue(false);

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        version: '1.3.0',
        enabled: false,
        message: 'Notifications worker is disabled'
      });
      expect(mockGetWorker).not.toHaveBeenCalled();
    });

    it('should return worker status when worker is enabled', async () => {
      // Arrange
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2023-01-01T00:00:00Z'),
        pendingEstimate: 3,
        sink: 'console'
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus)
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockGetWorker).toHaveBeenCalledTimes(1);
      expect(mockWorker.getStatus).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        version: '1.3.0',
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2023-01-01T00:00:00Z'),
        pendingEstimate: 3,
        sink: 'console'
      });
    });

    it('should handle errors gracefully and return 500 status', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockIsWorkerEnabled.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting notifications health:',
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should handle worker.getStatus() throwing an error', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockWorker = {
        getStatus: jest.fn().mockImplementation(() => {
          throw new Error('Worker status error');
        })
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error getting notifications health:',
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should include requestId from request in error response', async () => {
      // Arrange
      const customRequestId = 'custom-health-check-123';
      mockReq = testUtils.createMockRequest({
        requestId: customRequestId
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockIsWorkerEnabled.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.requestId).toBe(customRequestId);

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should return correct response structure for enabled worker', async () => {
      // Arrange
      const mockWorkerStatus = {
        enabled: true,
        interval: 10000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'file'
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus)
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        version: '1.3.0',
        enabled: true,
        interval: 10000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'file'
      });
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should not call getWorker when worker is disabled', async () => {
      // Arrange
      mockIsWorkerEnabled.mockReturnValue(false);

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockGetWorker).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          message: 'Notifications worker is disabled'
        })
      );
    });
  });
});
