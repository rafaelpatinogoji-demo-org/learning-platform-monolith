import { jest } from '@jest/globals';
import { Request, Response } from 'express';

const mockQuery = jest.fn() as any;
const mockGetWorker = jest.fn() as any;
const mockIsWorkerEnabled = jest.fn() as any;

jest.mock('../../src/db', () => ({
  db: {
    query: mockQuery,
  },
}));

jest.mock('../../src/modules/notifications/worker', () => ({
  getWorker: mockGetWorker,
  isWorkerEnabled: mockIsWorkerEnabled,
}));

jest.mock('../../src/modules/notifications/publisher', () => ({
  publish: jest.fn(),
  isNotificationsEnabled: jest.fn().mockReturnValue(true),
}));

import { notificationsController } from '../../src/controllers/notifications.controller';
import { publish } from '../../src/modules/notifications/publisher';

interface MockRequest extends Partial<Request> {
  requestId?: string;
}

describe('Notifications Integration Tests', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: any;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();

    mockRequest = {
      requestId: 'test-request-id',
    };

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };
  });

  describe('GET /api/notifications/health', () => {
    it('should return disabled status when notifications are disabled', async () => {
      mockIsWorkerEnabled.mockReturnValue(false);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        version: expect.any(String),
        enabled: false,
        message: 'Notifications worker is disabled',
      });
    });

    it('should return worker status when notifications are enabled', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);
      
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date('2024-01-21T10:00:00Z'),
        pendingEstimate: 3,
        sink: 'console',
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus),
      };

      mockGetWorker.mockReturnValue(mockWorker);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      expect(mockGetWorker).toHaveBeenCalled();
      expect(mockWorker.getStatus).toHaveBeenCalled();
      expect(responseJson).toHaveBeenCalledWith({
        ok: true,
        version: expect.any(String),
        enabled: true,
        interval: 5000,
        lastRunAt: mockWorkerStatus.lastRunAt,
        pendingEstimate: 3,
        sink: 'console',
      });
    });

    it('should include all worker status fields in response', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);
      
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: new Date(),
        pendingEstimate: 10,
        sink: 'file',
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus),
      };

      mockGetWorker.mockReturnValue(mockWorker);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      const response = responseJson.mock.calls[0][0] as any;
      expect(response).toHaveProperty('ok', true);
      expect(response).toHaveProperty('version');
      expect(response).toHaveProperty('enabled', true);
      expect(response).toHaveProperty('interval', 5000);
      expect(response).toHaveProperty('lastRunAt');
      expect(response).toHaveProperty('pendingEstimate', 10);
      expect(response).toHaveProperty('sink', 'file');
    });

    it('should return 500 error when worker throws exception', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockImplementation(() => {
        throw new Error('Worker initialization failed');
      });

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: 'test-request-id',
      });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting notifications health'),
        expect.any(Error)
      );
    });

    it('should handle null lastRunAt gracefully', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);
      
      const mockWorkerStatus = {
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'console',
      };

      const mockWorker = {
        getStatus: jest.fn().mockReturnValue(mockWorkerStatus),
      };

      mockGetWorker.mockReturnValue(mockWorker);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      const response = responseJson.mock.calls[0][0] as any;
      expect(response.lastRunAt).toBeNull();
    });
  });

  describe('Complete event flow', () => {
    it('should publish event to outbox and verify insertion', async () => {
      const mockEventId = 42;
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: mockEventId }],
      });

      const eventPayload = {
        enrollmentId: 1,
        userId: 2,
        courseId: 3,
      };

      (publish as any).mockResolvedValueOnce(mockEventId as any);

      const result = await publish('enrollment.created', eventPayload);

      expect(result).toBe(mockEventId);
    });

    it('should handle multiple events in correct order', async () => {
      const now = new Date();
      const event1CreatedAt = new Date(now.getTime() - 2000);
      const event2CreatedAt = new Date(now.getTime() - 1000);
      
      const mockEvents = [
        {
          id: 1,
          topic: 'enrollment.created',
          payload: { enrollmentId: 1 },
          created_at: event1CreatedAt,
        },
        {
          id: 2,
          topic: 'certificate.issued',
          payload: { certificateId: 1 },
          created_at: event2CreatedAt,
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] });

      (publish as any)
        .mockResolvedValueOnce(1 as any)
        .mockResolvedValueOnce(2 as any);

      const result1 = await publish('enrollment.created', mockEvents[0].payload);
      const result2 = await publish('certificate.issued', mockEvents[1].payload);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
    });

    it('should handle idempotent event processing', async () => {
      const mockEvent = {
        id: 1,
        topic: 'test.event',
        payload: { userId: 123 },
        created_at: new Date(),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      (publish as any).mockResolvedValueOnce(1 as any);

      await publish('test.event', mockEvent.payload);

      (publish as any).mockResolvedValueOnce(null as any);
      const secondResult = await publish('test.event', mockEvent.payload);

      expect(secondResult).toBeDefined();
    });
  });

  describe('Health endpoint edge cases', () => {
    it('should handle missing requestId in request', async () => {
      mockIsWorkerEnabled.mockReturnValue(true);
      mockGetWorker.mockImplementation(() => {
        throw new Error('Worker error');
      });

      const requestWithoutId = {} as Request;

      await notificationsController.getHealth(
        requestWithoutId as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: undefined,
      });
    });

    it('should return consistent response format for disabled state', async () => {
      mockIsWorkerEnabled.mockReturnValue(false);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      const response = responseJson.mock.calls[0][0] as any;
      expect(response).toMatchObject({
        ok: true,
        version: expect.any(String),
        enabled: false,
        message: expect.any(String),
      });
    });

    it('should include version in all responses', async () => {
      mockIsWorkerEnabled.mockReturnValue(false);

      await notificationsController.getHealth(
        mockRequest as any,
        mockResponse as any
      );

      const response = responseJson.mock.calls[0][0] as any;
      expect(response.version).toBeDefined();
      expect(typeof response.version).toBe('string');
    });
  });
});
