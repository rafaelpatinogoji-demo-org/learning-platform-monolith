/**
 * Integration tests for notification events
 * 
 * Tests the complete flow from event publishing to processing
 * using mocked database operations.
 */

import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { NotificationsWorker } from '../../src/modules/notifications/worker';
import { notificationTestUtils, mockDbResponses, createMockQueryResult } from './setup';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockReturnValue('/test/var/notifications.log')
}));

import { db } from '../../src/db';

describe('notification events integration', () => {
  let mockDb: jest.Mocked<typeof db>;
  let restoreEnv: () => void;
  let worker: NotificationsWorker;

  beforeEach(() => {
    mockDb = db as jest.Mocked<typeof db>;
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    restoreEnv = notificationTestUtils.mockEnvVars({
      NOTIFICATIONS_ENABLED: 'true',
      NOTIFICATIONS_SINK: 'console'
    });
  });

  afterEach(async () => {
    if (worker) {
      await worker.stop();
    }
    jest.useRealTimers();
    restoreEnv();
  });

  describe('enrollment.created event flow', () => {
    it('should publish and process enrollment.created event successfully', async () => {
      // Arrange
      const enrollmentPayload = {
        enrollmentId: 123,
        userId: 456,
        courseId: 789
      };

      mockDb.query.mockResolvedValueOnce(mockDbResponses.insertSuccess);

      const publishedEvent = {
        id: 1,
        topic: 'enrollment.created',
        payload: enrollmentPayload,
        created_at: new Date(),
        processed: false
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce({ rows: [publishedEvent], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const eventId = await publish('enrollment.created', enrollmentPayload);

      worker = new NotificationsWorker();
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(eventId).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        ['enrollment.created', JSON.stringify(enrollmentPayload)]
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📨 \[.*\] enrollment\.created:/),
        expect.any(String)
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle enrollment event with all required fields', async () => {
      // Arrange
      const completePayload = {
        enrollmentId: 999,
        userId: 888,
        courseId: 777,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'web',
          userAgent: 'test-browser'
        }
      };

      mockDb.query.mockResolvedValueOnce(mockDbResponses.insertSuccess);

      // Act
      const result = await publish('enrollment.created', completePayload);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['enrollment.created', JSON.stringify(completePayload)]
      );
    });
  });

  describe('certificate.issued event flow', () => {
    it('should publish and process certificate.issued event successfully', async () => {
      // Arrange
      const certificatePayload = {
        certificateId: 111,
        userId: 222,
        courseId: 333,
        code: 'CERT-ABC123-DEF456'
      };

      mockDb.query.mockResolvedValueOnce(mockDbResponses.insertSuccess);

      const publishedEvent = {
        id: 2,
        topic: 'certificate.issued',
        payload: certificatePayload,
        created_at: new Date(),
        processed: false
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce({ rows: [publishedEvent], rowCount: 1, command: 'SELECT', oid: 0, fields: [] } as any) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const eventId = await publish('certificate.issued', certificatePayload);

      worker = new NotificationsWorker();
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(eventId).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        ['certificate.issued', JSON.stringify(certificatePayload)]
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📨 \[.*\] certificate\.issued:/),
        expect.any(String)
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle certificate event with verification code', async () => {
      // Arrange
      const certificatePayload = {
        certificateId: 555,
        userId: 666,
        courseId: 777,
        code: 'CERT-XYZ789-ABC123',
        issuedBy: 'instructor',
        courseName: 'Advanced JavaScript'
      };

      mockDb.query.mockResolvedValueOnce(mockDbResponses.insertSuccess);

      // Act
      const result = await publish('certificate.issued', certificatePayload);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['certificate.issued', JSON.stringify(certificatePayload)]
      );
    });
  });

  describe('batch event processing', () => {
    it('should process multiple events in a single batch', async () => {
      // Arrange
      const events = [
        {
          id: 1,
          topic: 'enrollment.created',
          payload: { enrollmentId: 1, userId: 1, courseId: 1 },
          created_at: new Date(),
          processed: false
        },
        {
          id: 2,
          topic: 'certificate.issued',
          payload: { certificateId: 1, userId: 1, courseId: 1, code: 'CERT-123' },
          created_at: new Date(),
          processed: false
        }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(createMockQueryResult(events, 'SELECT')) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      worker = new NotificationsWorker();
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE outbox_events'),
        [[1, 2]]
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed 2 notification event(s)')
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle mixed event types in batch processing', async () => {
      // Arrange
      const mixedEvents = [
        notificationTestUtils.createMockEvent({
          id: 1,
          topic: 'enrollment.created'
        }),
        notificationTestUtils.createMockEvent({
          id: 2,
          topic: 'certificate.issued',
          payload: { certificateId: 1, code: 'CERT-TEST' }
        }),
        notificationTestUtils.createMockEvent({
          id: 3,
          topic: 'enrollment.created'
        })
      ];

      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(createMockQueryResult(mixedEvents, 'SELECT')) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      worker = new NotificationsWorker();
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed 3 notification event(s)')
      );
      
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      const enrollmentLogs = logCalls.filter(log => 
        typeof log === 'string' && log.includes('enrollment.created')
      );
      const certificateLogs = logCalls.filter(log => 
        typeof log === 'string' && log.includes('certificate.issued')
      );
      
      expect(enrollmentLogs.length).toBeGreaterThan(0);
      expect(certificateLogs.length).toBeGreaterThan(0);

      // Cleanup
      consoleLogSpy.mockRestore();
    });
  });

  describe('error scenarios', () => {
    it('should handle publish failure gracefully', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await publish('enrollment.created', { test: 'data' });

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish event to outbox'),
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should not publish events when notifications are disabled', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'false';

      // Act
      const isEnabled = isNotificationsEnabled();

      // Assert
      expect(isEnabled).toBe(false);
    });

    it('should handle worker processing errors without crashing', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Setup mock to fail on the SELECT query during worker processing
      mockDb.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve(mockDbResponses.beginTransaction);
        } else if (query.includes('SELECT id, topic, payload, created_at')) {
          return Promise.reject(new Error('Processing error'));
        } else if (query === 'ROLLBACK') {
          return Promise.resolve(mockDbResponses.rollbackTransaction);
        }
        return Promise.resolve({ rows: [], rowCount: 0, command: 'UNKNOWN', oid: 0, fields: [] });
      });

      // Act
      worker = new NotificationsWorker();
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('ROLLBACK');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing notification events'),
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });
});
