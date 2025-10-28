/**
 * Tests for notifications worker
 * 
 * Tests the NotificationsWorker class including event processing,
 * database transactions, and notification delivery.
 */

import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { notificationTestUtils, mockDbResponses, mockFs, createMockQueryResult } from './setup';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn()
}));

import { db } from '../../src/db';

describe('notifications worker', () => {
  let mockDb: jest.Mocked<typeof db>;
  let mockFsModule: jest.Mocked<typeof fs>;
  let mockPathModule: jest.Mocked<typeof path>;
  let restoreEnv: () => void;
  let worker: NotificationsWorker;

  beforeEach(() => {
    mockDb = db as jest.Mocked<typeof db>;
    mockFsModule = fs as jest.Mocked<typeof fs>;
    mockPathModule = path as jest.Mocked<typeof path>;
    
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    restoreEnv = notificationTestUtils.mockEnvVars({
      NOTIFICATIONS_ENABLED: 'true',
      NOTIFICATIONS_SINK: 'console'
    });

    mockPathModule.join.mockReturnValue('/test/var/notifications.log');
    mockFsModule.existsSync.mockReturnValue(true);
  });

  afterEach(async () => {
    if (worker) {
      await worker.stop();
    }
    jest.useRealTimers();
    restoreEnv();
  });

  describe('NotificationsWorker constructor', () => {
    it('should initialize with console sink by default', () => {
      // Act
      worker = new NotificationsWorker();
      const status = worker.getStatus();

      // Assert
      expect(status.sink).toBe('console');
      expect(status.enabled).toBe(true);
      expect(status.interval).toBe(5000);
    });

    it('should initialize with file sink when configured', () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFsModule.existsSync.mockReturnValue(false);

      // Act
      worker = new NotificationsWorker();

      // Assert
      expect(mockFsModule.mkdirSync).toHaveBeenCalledWith('/test/var', { recursive: true });
    });

    it('should not create directory when it already exists for file sink', () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFsModule.existsSync.mockReturnValue(true);

      // Act
      worker = new NotificationsWorker();

      // Assert
      expect(mockFsModule.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('worker lifecycle', () => {
    beforeEach(() => {
      worker = new NotificationsWorker();
    });

    it('should start worker and begin processing immediately', () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      mockDb.query.mockResolvedValue(mockDbResponses.selectNoEvents);

      // Act
      worker.start();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notifications worker: enabled')
      );
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      // Cleanup
      consoleLogSpy.mockRestore();
      setIntervalSpy.mockRestore();
    });

    it('should not start worker if already running', () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockDb.query.mockResolvedValue(mockDbResponses.selectNoEvents);
      
      worker.start();
      consoleLogSpy.mockClear();

      // Act
      worker.start();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
      
      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should stop worker gracefully', async () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      mockDb.query
        .mockResolvedValue(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValue(mockDbResponses.selectNoEvents) // SELECT events  
        .mockResolvedValue(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValue(mockDbResponses.countPending); // COUNT pending
      
      worker.start();
      
      await jest.runOnlyPendingTimersAsync();

      // Act
      await worker.stop();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('worker stopped')
      );
      
      // Cleanup
      consoleLogSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('event processing', () => {
    beforeEach(() => {
      worker = new NotificationsWorker();
    });

    it('should process events and mark them as processed', async () => {
      // Arrange
      const events = [
        notificationTestUtils.createMockEvent({ id: 1 }),
        notificationTestUtils.createMockEvent({ id: 2 })
      ];
      
      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(createMockQueryResult(events, 'SELECT')) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, topic, payload, created_at'),
        [50]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE outbox_events'),
        [[1, 2]]
      );
      expect(mockDb.query).toHaveBeenCalledWith('COMMIT');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed 2 notification event(s)')
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle empty event batch gracefully', async () => {
      // Arrange - Use mockImplementation to control the exact sequence
      mockDb.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') {
          return Promise.resolve(mockDbResponses.beginTransaction);
        } else if (query.includes('SELECT id, topic, payload, created_at')) {
          return Promise.resolve(mockDbResponses.selectNoEvents); // Empty array
        } else if (query === 'COMMIT') {
          return Promise.resolve(mockDbResponses.commitTransaction);
        } else if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve(mockDbResponses.countPending);
        } else if (query.includes('UPDATE outbox_events')) {
          throw new Error('UPDATE should not be called when there are no events');
        }
        return Promise.resolve({ rows: [], rowCount: 0, command: 'UNKNOWN', oid: 0, fields: [] });
      });

      // Act
      worker.start();
      
      await jest.runOnlyPendingTimersAsync();
      await worker.stop();

      const allCalls = mockDb.query.mock.calls;
      
      expect(allCalls.length).toBeGreaterThanOrEqual(4);
      
      const updateCalls = allCalls.filter(call => 
        typeof call[0] === 'string' && call[0].includes('UPDATE outbox_events')
      );
      expect(updateCalls).toHaveLength(0);
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // SELECT events fails

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
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

    it('should not process events when already processing', async () => {
      // Arrange
      let resolveFirstCall: (value: any) => void;
      const firstCallPromise = new Promise(resolve => {
        resolveFirstCall = resolve;
      });

      mockDb.query.mockImplementationOnce(() => firstCallPromise as any);

      // Act
      worker.start(); // This triggers immediate processEvents() call which hangs on BEGIN
      
      jest.advanceTimersByTime(5000);
      
      const beginCalls = mockDb.query.mock.calls.filter(call => call[0] === 'BEGIN');
      expect(beginCalls).toHaveLength(1);
      
      resolveFirstCall!(mockDbResponses.beginTransaction);
    });
  });

  describe('notification delivery', () => {
    beforeEach(() => {
      worker = new NotificationsWorker();
    });

    it('should log notifications to console when sink is console', async () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'console';
      worker = new NotificationsWorker();
      
      const event = notificationTestUtils.createMockEvent();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(createMockQueryResult([event], 'SELECT')) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      // Act
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📨 \[.*\] enrollment\.created:/),
        expect.any(String)
      );

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should write notifications to file when sink is file', async () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      worker = new NotificationsWorker();
      
      const event = notificationTestUtils.createMockEvent();
      
      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(createMockQueryResult([event], 'SELECT')) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.updateProcessed) // UPDATE processed
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      // Act
      worker.start();
      await jest.runOnlyPendingTimersAsync();

      // Assert
      expect(mockFsModule.appendFileSync).toHaveBeenCalledWith(
        '/test/var/notifications.log',
        expect.stringContaining('"topic":"enrollment.created"')
      );
    });
  });

  describe('status reporting', () => {
    beforeEach(() => {
      worker = new NotificationsWorker();
    });

    it('should return correct status information', () => {
      // Act
      const status = worker.getStatus();

      // Assert
      expect(status).toEqual({
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'console'
      });
    });

    it('should update lastRunAt after processing events', async () => {
      // Arrange
      mockDb.query
        .mockResolvedValueOnce(mockDbResponses.beginTransaction) // BEGIN
        .mockResolvedValueOnce(mockDbResponses.selectNoEvents) // SELECT events
        .mockResolvedValueOnce(mockDbResponses.commitTransaction) // COMMIT
        .mockResolvedValueOnce(mockDbResponses.countPending); // COUNT pending

      // Act
      worker.start();
      await jest.runOnlyPendingTimersAsync();
      const status = worker.getStatus();

      // Assert
      expect(status.lastRunAt).toBeInstanceOf(Date);
      expect(status.pendingEstimate).toBe(5);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same worker instance', () => {
      // Act
      const worker1 = getWorker();
      const worker2 = getWorker();

      // Assert
      expect(worker1).toBe(worker2);
    });
  });

  describe('isWorkerEnabled function', () => {
    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'true';

      // Act
      const result = isWorkerEnabled();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is "false"', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'false';

      // Act
      const result = isWorkerEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      // Arrange
      delete process.env.NOTIFICATIONS_ENABLED;

      // Act
      const result = isWorkerEnabled();

      // Assert
      expect(result).toBe(false);
    });
  });
});
