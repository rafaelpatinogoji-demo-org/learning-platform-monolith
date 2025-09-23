/**
 * Tests for notifications controller
 * 
 * Tests health endpoint responses for enabled/disabled states and error handling
 * following existing controller test patterns.
 */

import { Request, Response } from 'express';
import { notificationsController } from '../../src/controllers/notifications.controller';
import { testUtils } from '../setup';

jest.mock('../../src/modules/notifications/worker', () => ({
  getWorker: jest.fn(),
  isWorkerEnabled: jest.fn(),
}));

jest.mock('../../src/config', () => ({
  config: {
    version: '1.3.0'
  }
}));

import { getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';

const mockGetWorker = getWorker as jest.MockedFunction<typeof getWorker>;
const mockIsWorkerEnabled = isWorkerEnabled as jest.MockedFunction<typeof isWorkerEnabled>;

describe('notifications controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('getHealth endpoint', () => {
    it('should return disabled status when notifications are disabled', async () => {
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
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockGetWorker).not.toHaveBeenCalled();
    });

    it('should return worker status when notifications are enabled', async () => {
      // Arrange
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2023-01-01T12:00:00.000Z'),
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
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        version: '1.3.0',
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2023-01-01T12:00:00.000Z'),
        pendingEstimate: 3,
        sink: 'console'
      });
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockGetWorker).toHaveBeenCalledTimes(1);
      expect(mockWorker.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should return worker status with file sink configuration', async () => {
      // Arrange
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2023-01-01T10:30:00.000Z'),
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
        interval: 5000,
        lastRunAt: new Date('2023-01-01T10:30:00.000Z'),
        pendingEstimate: 0,
        sink: 'file'
      });
    });

    it('should return worker status with null lastRunAt when worker has not run yet', async () => {
      // Arrange
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 10,
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
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        version: '1.3.0',
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 10,
        sink: 'console'
      });
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      const error = new Error('Worker initialization failed');
      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error getting notifications health:', error);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle worker.getStatus() throwing an error', async () => {
      // Arrange
      const statusError = new Error('Status retrieval failed');
      const mockWorker = {
        getStatus: jest.fn().mockImplementation(() => {
          throw statusError;
        })
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error getting notifications health:', statusError);

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should include custom requestId in error responses', async () => {
      // Arrange
      const customRequestId = 'custom-health-request-456';
      mockReq = testUtils.createMockRequest({
        requestId: customRequestId
      });

      const error = new Error('Test error');
      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: customRequestId
      });

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle isWorkerEnabled throwing an error', async () => {
      // Arrange
      const enabledCheckError = new Error('Environment check failed');
      mockIsWorkerEnabled.mockImplementation(() => {
        throw enabledCheckError;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id'
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error getting notifications health:', enabledCheckError);

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Response Format Validation', () => {
    it('should always include ok and version fields in successful responses', async () => {
      mockIsWorkerEnabled.mockReturnValue(false);
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      let callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('ok', true);
      expect(callArgs).toHaveProperty('version', '1.3.0');

      jest.clearAllMocks();
      mockReq = testUtils.createMockRequest();
      mockRes = testUtils.createMockResponse();

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue({
          enabled: true,
          interval: 5000,
          lastRunAt: null,
          pendingEstimate: 0,
          sink: 'console'
        })
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('ok', true);
      expect(callArgs).toHaveProperty('version', '1.3.0');
    });

    it('should always include ok field as false in error responses', async () => {
      // Arrange
      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockImplementation(() => {
        throw new Error('Test error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await notificationsController.getHealth(mockReq as Request, mockRes as Response);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty('ok', false);
      expect(callArgs).toHaveProperty('error');
      expect(callArgs).toHaveProperty('requestId');

      // Cleanup
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive health check requests', async () => {
      // Arrange
      const mockWorker = {
        getStatus: jest.fn().mockReturnValue({
          enabled: true,
          interval: 5000,
          lastRunAt: new Date(),
          pendingEstimate: 2,
          sink: 'console'
        })
      };

      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockReturnValue(mockWorker as any);

      const promises = Array(5).fill(null).map(() => 
        notificationsController.getHealth(mockReq as Request, mockRes as Response)
      );

      await Promise.all(promises);

      expect(mockRes.json).toHaveBeenCalledTimes(5);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockGetWorker).toHaveBeenCalledTimes(5);
    });
  });
});
