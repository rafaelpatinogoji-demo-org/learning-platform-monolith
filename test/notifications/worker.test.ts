import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { db } from '../../src/db';
import * as fs from 'fs';

jest.mock('../../src/db');
jest.mock('fs');

describe('NotificationsWorker', () => {
  let worker: NotificationsWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new NotificationsWorker();
  });

  describe('start and stop', () => {
    it('should start the worker and begin polling', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      worker.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📬 Notifications worker: enabled')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not start worker twice', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      worker.start();
      worker.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Notifications worker already running')
      );
      
      consoleSpy.mockRestore();
    });

    it('should stop the worker gracefully', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      worker.start();
      await worker.stop();

      const status = worker.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('processEvents', () => {
    it('should process batch of events successfully', async () => {
      const mockEvents = [
        { id: 1, topic: 'enrollment.created', payload: { userId: 1 }, created_at: new Date() },
        { id: 2, topic: 'certificate.issued', payload: { userId: 2 }, created_at: new Date() }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (worker as any).processEvents();

      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📬 Processed 2 notification event(s)')
      );

      consoleSpy.mockRestore();
    });

    it('should rollback transaction on error', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await (worker as any).processEvents();

      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error processing notification events'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty batch gracefully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await (worker as any).processEvents();

      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should use FOR UPDATE SKIP LOCKED in query', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await (worker as any).processEvents();

      const selectCall = (db.query as jest.Mock).mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('FOR UPDATE SKIP LOCKED')
      );
      expect(selectCall).toBeDefined();
    });
  });

  describe('sendNotification', () => {
    it('should log to console when sink is console', async () => {
      const event = {
        id: 1,
        topic: 'test.topic',
        payload: { data: 'test' },
        created_at: new Date()
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (worker as any).sendNotification(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📨'),
        expect.stringContaining('{"data":"test"}')
      );

      consoleSpy.mockRestore();
    });

    it('should write to file when sink is file', async () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      const fileWorker = new NotificationsWorker();
      
      const event = {
        id: 1,
        topic: 'test.topic',
        payload: { data: 'test' },
        created_at: new Date()
      };

      (fs.appendFileSync as jest.Mock).mockImplementation();

      await (fileWorker as any).sendNotification(event);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('notifications.log'),
        expect.stringContaining('"topic":"test.topic"')
      );

      delete process.env.NOTIFICATIONS_SINK;
    });

    it('should format notification message correctly', async () => {
      const event = {
        id: 42,
        topic: 'enrollment.created',
        payload: { userId: 1, courseId: 2 },
        created_at: new Date('2024-01-01T10:00:00Z')
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (worker as any).sendNotification(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📨'),
        expect.stringContaining('{"userId":1,"courseId":2}')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return worker status with default values', () => {
      const status = worker.getStatus();

      expect(status).toEqual({
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: expect.any(String)
      });
    });

    it('should update lastRunAt after processing', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await (worker as any).processEvents();

      const status = worker.getStatus();
      expect(status.lastRunAt).not.toBeNull();
    });

    it('should update pendingEstimate correctly', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await (worker as any).processEvents();

      const status = worker.getStatus();
      expect(status.pendingEstimate).toBe(5);
    });
  });

  describe('isWorkerEnabled', () => {
    const originalEnv = process.env.NOTIFICATIONS_ENABLED;

    afterEach(() => {
      process.env.NOTIFICATIONS_ENABLED = originalEnv;
    });

    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'true';
      expect(isWorkerEnabled()).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is "false"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(isWorkerEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(isWorkerEnabled()).toBe(false);
    });
  });

  describe('getWorker singleton', () => {
    it('should return the same instance', () => {
      const worker1 = getWorker();
      const worker2 = getWorker();
      expect(worker1).toBe(worker2);
    });

    it('should return a NotificationsWorker instance', () => {
      const worker = getWorker();
      expect(worker).toBeInstanceOf(NotificationsWorker);
    });
  });

  describe('edge cases', () => {
    it('should handle stop before start gracefully', async () => {
      await expect(worker.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      
      worker.start();
      await worker.stop();
      await expect(worker.stop()).resolves.not.toThrow();
    });

    it('should process events with string payload correctly', async () => {
      const mockEvents = [
        { id: 1, topic: 'test.topic', payload: '{"key":"value"}', created_at: new Date() }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (worker as any).processEvents();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📬 Processed 1 notification event(s)')
      );

      consoleSpy.mockRestore();
    });
  });
});
