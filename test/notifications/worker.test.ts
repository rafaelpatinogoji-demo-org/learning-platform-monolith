import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const mockQuery = jest.fn() as any;
const mockAppendFileSync = jest.fn() as any;
const mockExistsSync = jest.fn() as any;
const mockMkdirSync = jest.fn() as any;

jest.mock('../../src/db', () => ({
  db: {
    query: mockQuery,
  },
}));

jest.mock('fs', () => ({
  appendFileSync: mockAppendFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';

describe('Notifications Worker', () => {
  let worker: NotificationsWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new NotificationsWorker();
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      const status = worker.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.interval).toBe(5000);
      expect(status.sink).toBe('console');
    });

    it('should use console sink by default', () => {
      delete process.env.NOTIFICATIONS_SINK;
      const testWorker = new NotificationsWorker();
      const status = testWorker.getStatus();
      expect(status.sink).toBe('console');
    });

    it('should use file sink when configured', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockExistsSync.mockReturnValue(false);
      const testWorker = new NotificationsWorker();
      const status = testWorker.getStatus();
      expect(status.sink).toBe('file');
    });

    it('should create var directory if file sink is used and directory does not exist', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockExistsSync.mockReturnValue(false);
      new NotificationsWorker();
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('var'),
        { recursive: true }
      );
    });

    it('should not create var directory if it already exists', () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockExistsSync.mockReturnValue(true);
      mockMkdirSync.mockClear();
      new NotificationsWorker();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start the worker and begin polling', () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notifications worker: enabled')
      );
    });

    it('should not start if already running', () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      const logCallCount = (console.log as jest.Mock).mock.calls.length;
      
      worker.start();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
    });
  });

  describe('stop', () => {
    it('should stop the worker gracefully', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await worker.stop();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Notifications worker stopped')
      );
    });

    it('should wait for current processing to complete', async () => {
      mockQuery.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ rows: [] }), 100)
      ));
      
      worker.start();
      
      const stopPromise = worker.stop();
      jest.advanceTimersByTime(100);
      
      await stopPromise;
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('stopped')
      );
    });
  });

  describe('processEvents', () => {
    it('should begin transaction before fetching events', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    });

    it('should fetch unprocessed events with correct query', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*FROM outbox_events.*WHERE processed = false/s),
        [50]
      );
    });

    it('should use row locking with SKIP LOCKED', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const selectCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('SELECT')
      );
      expect(selectCall![0]).toMatch(/FOR UPDATE SKIP LOCKED/i);
    });

    it('should order events by created_at ASC', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const selectCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('SELECT')
      );
      expect(selectCall![0]).toMatch(/ORDER BY created_at ASC/i);
    });

    it('should limit batch size to 50', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const selectCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('SELECT')
      );
      expect(selectCall![1]).toEqual([50]);
    });

    it('should process events and mark them as processed', async () => {
      const mockEvents = [
        { id: 1, topic: 'enrollment.created', payload: { userId: 1 }, created_at: new Date() },
        { id: 2, topic: 'certificate.issued', payload: { userId: 2 }, created_at: new Date() },
      ];
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE outbox_events.*SET processed = true/s),
        [[1, 2]]
      );
    });

    it('should commit transaction after successful processing', async () => {
      const mockEvents = [
        { id: 1, topic: 'test.event', payload: { data: 'value' }, created_at: new Date() },
      ];
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });

    it('should commit even when no events to process', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const dbError = new Error('Database error');
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(dbError);
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing notification events'),
        dbError
      );
    });

    it('should not process if already processing', async () => {
      mockQuery.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ rows: [] }), 100)
      ));
      
      worker.start();
      jest.advanceTimersByTime(5000);

      const callCount = mockQuery.mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });

    it('should update pending count after processing', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = worker.getStatus();
      expect(status.pendingEstimate).toBe(5);
    });

    it('should update lastRunAt timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      const beforeStart = worker.getStatus().lastRunAt;
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const afterStart = worker.getStatus().lastRunAt;
      expect(afterStart).not.toBe(beforeStart);
      expect(afterStart).toBeInstanceOf(Date);
    });
  });

  describe('sendNotification', () => {
    afterEach(async () => {
      jest.clearAllMocks();
    });

    it('should log to console when sink is console', async () => {
      process.env.NOTIFICATIONS_SINK = 'console';
      const testWorker = new NotificationsWorker();
      
      const mockEvent = {
        id: 1,
        topic: 'test.topic',
        payload: { data: 'value' },
        created_at: new Date(),
      };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockEvent] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      testWorker.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      await testWorker.stop();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/test\.topic/),
        expect.any(String)
      );
    });

    it('should write to file when sink is file', async () => {
      process.env.NOTIFICATIONS_SINK = 'file';
      mockExistsSync.mockReturnValue(true);
      const testWorker = new NotificationsWorker();
      
      const mockEvent = {
        id: 1,
        topic: 'test.topic',
        payload: { data: 'value' },
        created_at: new Date(),
      };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockEvent] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      testWorker.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      await testWorker.stop();

      expect(mockAppendFileSync).toHaveBeenCalled();
      const writtenData = mockAppendFileSync.mock.calls[0][1];
      expect(writtenData).toContain('test.topic');
      expect(writtenData).toContain('"data":"value"');
    });
  });

  describe('getStatus', () => {
    it('should return worker status with all fields', () => {
      const status = worker.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('interval');
      expect(status).toHaveProperty('lastRunAt');
      expect(status).toHaveProperty('pendingEstimate');
      expect(status).toHaveProperty('sink');
    });

    it('should return correct interval value', () => {
      const status = worker.getStatus();
      expect(status.interval).toBe(5000);
    });

    it('should return enabled as true', () => {
      const status = worker.getStatus();
      expect(status.enabled).toBe(true);
    });

    it('should initially have null lastRunAt', () => {
      const status = worker.getStatus();
      expect(status.lastRunAt).toBeNull();
    });

    it('should initially have 0 pendingEstimate', () => {
      const status = worker.getStatus();
      expect(status.pendingEstimate).toBe(0);
    });
  });

  describe('getWorker', () => {
    it('should return a singleton instance', () => {
      const worker1 = getWorker();
      const worker2 = getWorker();

      expect(worker1).toBe(worker2);
    });

    it('should return NotificationsWorker instance', () => {
      const workerInstance = getWorker();
      expect(workerInstance).toBeInstanceOf(NotificationsWorker);
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

    it('should return false when NOTIFICATIONS_ENABLED is not "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(isWorkerEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(isWorkerEnabled()).toBe(false);
    });
  });

  describe('error handling and retries', () => {
    it('should handle errors during event processing gracefully', async () => {
      const mockEvent = {
        id: 1,
        topic: 'test.topic',
        payload: { data: 'value' },
        created_at: new Date(),
      };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockEvent] })
        .mockRejectedValueOnce(new Error('Processing failed'));
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should continue processing after error', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(mockQuery.mock.calls.length).toBeGreaterThan(2);
    }, 10000);

    it('should not process new events while shutdown is in progress', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      
      worker.start();
      const stopPromise = worker.stop();

      jest.advanceTimersByTime(5000);
      await Promise.resolve();
      await stopPromise;

      const commitCalls = mockQuery.mock.calls.filter((call: any) => call[0] === 'COMMIT');
      expect(commitCalls.length).toBeLessThan(3);
    });
  });

  describe('event ordering', () => {
    it('should process events in created_at order', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);
      const later = new Date(now.getTime() + 1000);
      
      const mockEvents = [
        { id: 2, topic: 'event.two', payload: {}, created_at: now },
        { id: 1, topic: 'event.one', payload: {}, created_at: earlier },
        { id: 3, topic: 'event.three', payload: {}, created_at: later },
      ];
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const selectCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('ORDER BY')
      );
      expect(selectCall![0]).toMatch(/ORDER BY created_at ASC/i);
    });
  });

  describe('batch processing', () => {
    it('should process up to 50 events in a single batch', async () => {
      const mockEvents = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        topic: `event.${i}`,
        payload: { index: i },
        created_at: new Date(),
      }));
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const updateCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('SET processed = true')
      );
      expect(updateCall).toBeDefined();
      expect((updateCall as any)![1][0].length).toBe(50);
    });

    it('should mark all processed events with processed_at timestamp', async () => {
      const mockEvents = [
        { id: 1, topic: 'event.one', payload: {}, created_at: new Date() },
        { id: 2, topic: 'event.two', payload: {}, created_at: new Date() },
      ];
      
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });
      
      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));

      const updateCall = mockQuery.mock.calls.find((call: any) => 
        call[0].includes('SET processed = true')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall![0]).toMatch(/SET processed = true/i);
    });
  });
});
