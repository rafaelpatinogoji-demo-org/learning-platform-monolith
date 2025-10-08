import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { db } from '../../src/db';
import * as fs from 'fs';

jest.mock('../../src/db');
jest.mock('fs');

describe('NotificationsWorker', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.NOTIFICATIONS_SINK = 'console';
    
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.appendFileSync.mockReturnValue(undefined);
  });

  describe('constructor', () => {
    it('should initialize with console sink by default', () => {
      delete process.env.NOTIFICATIONS_SINK;
      const worker = new NotificationsWorker();
      
      const status = worker.getStatus();
      expect(status.sink).toBe('console');
    });

    it('should initialize with file sink when specified', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      const worker = new NotificationsWorker();
      
      const status = worker.getStatus();
      expect(status.sink).toBe('file');
    });

    it('should create var directory if using file sink and directory does not exist', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFs.existsSync.mockReturnValue(false);
      
      new NotificationsWorker();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('var'),
        { recursive: true }
      );
    });

    it('should not create var directory if it already exists', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFs.existsSync.mockReturnValue(true);
      
      new NotificationsWorker();
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should log that worker is enabled', () => {
      const worker = new NotificationsWorker();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      worker.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notifications worker: enabled')
      );
      
      consoleLogSpy.mockRestore();
      worker.stop();
    });

    it('should prevent multiple starts', () => {
      const worker = new NotificationsWorker();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      worker.start();
      worker.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
      
      consoleLogSpy.mockRestore();
      worker.stop();
    });

    it('should set up interval for periodic processing', () => {
      const worker = new NotificationsWorker();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      worker.start();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      worker.stop();
    });
  });

  describe('stop', () => {
    it('should stop the worker gracefully', async () => {
      const worker = new NotificationsWorker();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      worker.start();
      await worker.stop();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('worker stopped')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should clear the interval when stopped', async () => {
      const worker = new NotificationsWorker();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      worker.start();
      await worker.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('processEvents', () => {
    it('should process events in a transaction', async () => {
      const worker = new NotificationsWorker();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, topic: 'test.event', payload: { data: 'test' }, created_at: new Date() }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] });

      await (worker as any).processEvents();

      expect(mockDb.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDb.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const worker = new NotificationsWorker();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK', rowCount: 0, oid: 0, fields: [] });

      await (worker as any).processEvents();

      expect(mockDb.query).toHaveBeenCalledWith('ROLLBACK');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should fetch events with correct query parameters', async () => {
      const worker = new NotificationsWorker();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] });

      await (worker as any).processEvents();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE SKIP LOCKED'),
        [50]
      );
    });

    it('should mark events as processed after sending', async () => {
      const worker = new NotificationsWorker();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, topic: 'test.event', payload: { data: 'test' }, created_at: new Date() },
            { id: 2, topic: 'test.event2', payload: { data: 'test2' }, created_at: new Date() }
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 2, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] });

      await (worker as any).processEvents();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE outbox_events'),
        [[1, 2]]
      );
    });

    it('should log processed event count', async () => {
      const worker = new NotificationsWorker();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, topic: 'test.event', payload: { data: 'test' }, created_at: new Date() }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        })
        .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] });

      await (worker as any).processEvents();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed 1 notification event(s)')
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('sendNotification', () => {
    it('should log to console when sink is console', () => {
      process.env.NOTIFICATIONS_SINK = 'console';
      const worker = new NotificationsWorker();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const event = {
        id: 1,
        topic: 'test.event',
        payload: { userId: 1 },
        created_at: new Date()
      };

      (worker as any).sendNotification(event);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test.event'),
        expect.any(String)
      );
      
      consoleLogSpy.mockRestore();
    });

    it('should write to file when sink is file', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      const worker = new NotificationsWorker();
      
      const event = {
        id: 1,
        topic: 'test.event',
        payload: { userId: 1 },
        created_at: new Date()
      };

      (worker as any).sendNotification(event);

      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('notifications.log'),
        expect.stringContaining('"topic":"test.event"')
      );
    });
  });

  describe('updatePendingCount', () => {
    it('should update pending count from database', async () => {
      const worker = new NotificationsWorker();
      
      mockDb.query.mockResolvedValue({ 
        rows: [{ count: '42' }], 
        command: 'SELECT', 
        rowCount: 1, 
        oid: 0, 
        fields: [] 
      });

      await (worker as any).updatePendingCount();

      const status = worker.getStatus();
      expect(status.pendingEstimate).toBe(42);
    });

    it('should handle errors when updating pending count', async () => {
      const worker = new NotificationsWorker();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockDb.query.mockRejectedValue(new Error('Count query failed'));

      await (worker as any).updatePendingCount();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update pending count'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const worker = new NotificationsWorker();
      
      const status = worker.getStatus();

      expect(status).toEqual({
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: 'console'
      });
    });

    it('should update lastRunAt after processing', async () => {
      const worker = new NotificationsWorker();
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], command: 'SELECT', rowCount: 1, oid: 0, fields: [] });

      await (worker as any).processEvents();

      const status = worker.getStatus();
      expect(status.lastRunAt).toBeInstanceOf(Date);
    });
  });

  describe('getWorker', () => {
    it('should return singleton instance', () => {
      const worker1 = getWorker();
      const worker2 = getWorker();

      expect(worker1).toBe(worker2);
    });
  });

  describe('isWorkerEnabled', () => {
    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'true';
      expect(isWorkerEnabled()).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is not "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(isWorkerEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(isWorkerEnabled()).toBe(false);
    });
  });
});
