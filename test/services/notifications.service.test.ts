import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { db } from '../../src/db';

jest.mock('../../src/db');

describe('NotificationsWorker', () => {
  let worker: NotificationsWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    worker = new NotificationsWorker();
  });

  afterEach(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  describe('getStatus', () => {
    it('should return worker status with enabled true', () => {
      const status = worker.getStatus();

      expect(status).toEqual({
        enabled: true,
        interval: 5000,
        lastRunAt: null,
        pendingEstimate: 0,
        sink: expect.any(String)
      });
    });

    it('should return correct sink configuration', () => {
      const status = worker.getStatus();

      expect(['console', 'file']).toContain(status.sink);
    });

    it('should update lastRunAt after processing', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      const status = worker.getStatus();
      expect(status.lastRunAt).not.toBeNull();
    });

    it('should update pendingEstimate after processing', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      const status = worker.getStatus();
      expect(status.pendingEstimate).toBe(5);
    });
  });

  describe('start', () => {
    it('should start the worker', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      worker.start();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Notifications worker: enabled'));
      
      consoleSpy.mockRestore();
    });

    it('should not start if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      worker.start();
      worker.start();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should stop the worker gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      worker.start();
      await worker.stop();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('worker stopped'));
      
      consoleSpy.mockRestore();
    });

    it('should wait for current processing to complete', async () => {
      (db.query as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 200))
      );

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stopPromise = worker.stop();
      await stopPromise;

      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('processEvents', () => {
    it('should process unprocessed events', async () => {
      const mockEvents = [
        { id: 1, topic: 'test.event', payload: { data: 'test1' }, created_at: new Date() },
        { id: 2, topic: 'test.event', payload: { data: 'test2' }, created_at: new Date() }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Processed 2 notification event(s)'));
      
      consoleSpy.mockRestore();
    });

    it('should handle empty event queue', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      expect(db.query).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Database error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing notification events'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should use transactions for event processing', async () => {
      const mockEvents = [
        { id: 1, topic: 'test.event', payload: { data: 'test' }, created_at: new Date() }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      expect(db.query).toHaveBeenCalledWith('BEGIN');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Query error'))
        .mockResolvedValueOnce(undefined);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      worker.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await worker.stop();

      expect(db.query).toHaveBeenCalledWith('ROLLBACK');

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('getWorker', () => {
  it('should return singleton instance', () => {
    const worker1 = getWorker();
    const worker2 = getWorker();

    expect(worker1).toBe(worker2);
  });

  it('should return NotificationsWorker instance', () => {
    const worker = getWorker();

    expect(worker).toBeInstanceOf(NotificationsWorker);
  });
});

describe('isWorkerEnabled', () => {
  const originalEnv = process.env.NOTIFICATIONS_ENABLED;

  afterEach(() => {
    process.env.NOTIFICATIONS_ENABLED = originalEnv;
  });

  it('should return true when NOTIFICATIONS_ENABLED is true', () => {
    process.env.NOTIFICATIONS_ENABLED = 'true';

    expect(isWorkerEnabled()).toBe(true);
  });

  it('should return false when NOTIFICATIONS_ENABLED is false', () => {
    process.env.NOTIFICATIONS_ENABLED = 'false';

    expect(isWorkerEnabled()).toBe(false);
  });

  it('should return false when NOTIFICATIONS_ENABLED is not set', () => {
    delete process.env.NOTIFICATIONS_ENABLED;

    expect(isWorkerEnabled()).toBe(false);
  });
});

describe('publish', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should publish event to outbox', async () => {
    const mockEvent = { id: 1 };
    (db.query as jest.Mock).mockResolvedValue({ rows: [mockEvent] });

    const result = await publish('test.event', { data: 'test' });

    expect(result).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO outbox_events'),
      ['test.event', JSON.stringify({ data: 'test' })]
    );
  });

  it('should return null if insert fails', async () => {
    (db.query as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await publish('test.event', { data: 'test' });

    expect(result).toBeNull();
  });

  it('should handle database errors', async () => {
    (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await publish('test.event', { data: 'test' });

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to publish event to outbox'),
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should stringify payload as JSON', async () => {
    const payload = { user: 'test', action: 'created' };
    (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

    await publish('user.created', payload);

    expect(db.query).toHaveBeenCalledWith(
      expect.any(String),
      ['user.created', JSON.stringify(payload)]
    );
  });
});

describe('isNotificationsEnabled', () => {
  const originalEnv = process.env.NOTIFICATIONS_ENABLED;

  afterEach(() => {
    process.env.NOTIFICATIONS_ENABLED = originalEnv;
  });

  it('should return true when NOTIFICATIONS_ENABLED is true', () => {
    process.env.NOTIFICATIONS_ENABLED = 'true';

    expect(isNotificationsEnabled()).toBe(true);
  });

  it('should return false when NOTIFICATIONS_ENABLED is false', () => {
    process.env.NOTIFICATIONS_ENABLED = 'false';

    expect(isNotificationsEnabled()).toBe(false);
  });

  it('should return false when NOTIFICATIONS_ENABLED is not set', () => {
    delete process.env.NOTIFICATIONS_ENABLED;

    expect(isNotificationsEnabled()).toBe(false);
  });
});
