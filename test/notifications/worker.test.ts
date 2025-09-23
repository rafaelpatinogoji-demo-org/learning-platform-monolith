/**
 * Tests for notifications worker module
 * 
 * Tests worker lifecycle, status reporting, and environment configuration
 * with comprehensive mocking of database and file system operations.
 */

import { NotificationsWorker, getWorker, isWorkerEnabled } from '../../src/modules/notifications/worker';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
  dirname: jest.fn(),
}));

import { db } from '../../src/db';

const mockDb = db as jest.Mocked<typeof db>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('notifications worker', () => {
  let worker: NotificationsWorker;
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to reduce noise and verify logging
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    delete process.env.NOTIFICATIONS_SINK;
    
    mockPath.join.mockReturnValue('/mock/path/var/notifications.log');
    mockPath.dirname.mockReturnValue('/mock/path/var');
  });

  afterEach(async () => {
    if (worker) {
      try {
        await worker.stop();
      } catch (error) {
      }
    }
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with console sink by default', () => {
      // Act
      worker = new NotificationsWorker();
      const status = worker.getStatus();

      // Assert
      expect(status.sink).toBe('console');
      expect(status.enabled).toBe(true);
      expect(status.interval).toBe(5000);
    });

    it('should initialize with file sink when NOTIFICATIONS_SINK is file', () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFs.existsSync.mockReturnValue(false);

      // Act
      worker = new NotificationsWorker();
      const status = worker.getStatus();

      // Assert
      expect(status.sink).toBe('file');
      expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), 'var', 'notifications.log');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/mock/path/var', { recursive: true });
    });

    it('should not create directory if it already exists for file sink', () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFs.existsSync.mockReturnValue(true);

      // Act
      worker = new NotificationsWorker();

      // Assert
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Worker Lifecycle', () => {
    beforeEach(() => {
      worker = new NotificationsWorker();
    });

    it('should start worker and log startup message', () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] });

      // Act
      worker.start();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📬 Notifications worker: enabled, sink=console, interval=5000ms')
      );
    });

    it('should not start worker if already running', () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] });
      worker.start();
      consoleSpy.mockClear();

      // Act
      worker.start();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  Notifications worker already running');
    });

    it('should stop worker gracefully', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0, command: 'BEGIN', oid: 0, fields: [] });
      worker.start();

      // Act
      await worker.stop();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('📬 Notifications worker stopped');
    });
  });

  describe('Status Reporting', () => {
    it('should return correct status information', () => {
      // Arrange
      worker = new NotificationsWorker();

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

    it('should return file sink in status when configured', () => {
      // Arrange
      process.env.NOTIFICATIONS_SINK = 'file';
      mockFs.existsSync.mockReturnValue(true);
      worker = new NotificationsWorker();

      // Act
      const status = worker.getStatus();

      // Assert
      expect(status.sink).toBe('file');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getWorker', () => {
      // Act
      const worker1 = getWorker();
      const worker2 = getWorker();

      // Assert
      expect(worker1).toBe(worker2);
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = process.env.NOTIFICATIONS_ENABLED;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.NOTIFICATIONS_ENABLED = originalEnv;
      } else {
        delete process.env.NOTIFICATIONS_ENABLED;
      }
    });

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
