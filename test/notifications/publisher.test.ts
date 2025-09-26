/**
 * Tests for notifications publisher
 * 
 * Tests the publish function and environment configuration
 * without any database dependencies using mocks.
 */

import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { notificationTestUtils, mockDbResponses } from './setup';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

import { db } from '../../src/db';

describe('notifications publisher', () => {
  let mockDb: jest.Mocked<typeof db>;
  let restoreEnv: () => void;

  beforeEach(() => {
    mockDb = db as jest.Mocked<typeof db>;
    jest.clearAllMocks();
    
    restoreEnv = notificationTestUtils.mockEnvVars({
      NOTIFICATIONS_ENABLED: 'true'
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('publish function', () => {
    it('should successfully publish an event to outbox_events table', async () => {
      // Arrange
      const topic = 'enrollment.created';
      const payload = {
        enrollmentId: 123,
        userId: 456,
        courseId: 789
      };
      
      mockDb.query.mockResolvedValue(mockDbResponses.insertSuccess);

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payload)]
      );
    });

    it('should handle certificate.issued events correctly', async () => {
      // Arrange
      const topic = 'certificate.issued';
      const payload = {
        certificateId: 111,
        userId: 222,
        courseId: 333,
        code: 'CERT-ABC123-DEF456'
      };
      
      mockDb.query.mockResolvedValue(mockDbResponses.insertSuccess);

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payload)]
      );
    });

    it('should return null when database insert fails', async () => {
      // Arrange
      const topic = 'enrollment.created';
      const payload = { test: 'data' };
      
      mockDb.query.mockResolvedValue(mockDbResponses.insertFailure);

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeNull();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should return null and log error when database query throws', async () => {
      // Arrange
      const topic = 'enrollment.created';
      const payload = { test: 'data' };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish event to outbox'),
        expect.any(Error)
      );
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    it('should properly serialize complex payload objects', async () => {
      // Arrange
      const topic = 'test.event';
      const complexPayload = {
        user: { id: 1, name: 'Test User' },
        metadata: { timestamp: new Date().toISOString() },
        items: [1, 2, 3]
      };
      
      mockDb.query.mockResolvedValue(mockDbResponses.insertSuccess);

      // Act
      await publish(topic, complexPayload);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [topic, JSON.stringify(complexPayload)]
      );
    });

    it('should handle empty payload objects', async () => {
      // Arrange
      const topic = 'test.event';
      const emptyPayload = {};
      
      mockDb.query.mockResolvedValue(mockDbResponses.insertSuccess);

      // Act
      const result = await publish(topic, emptyPayload);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [topic, JSON.stringify(emptyPayload)]
      );
    });
  });

  describe('isNotificationsEnabled function', () => {
    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'true';

      // Act
      const result = isNotificationsEnabled();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is "false"', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'false';

      // Act
      const result = isNotificationsEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      // Arrange
      delete process.env.NOTIFICATIONS_ENABLED;

      // Act
      const result = isNotificationsEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is empty string', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = '';

      // Act
      const result = isNotificationsEnabled();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is any other value', () => {
      // Arrange
      process.env.NOTIFICATIONS_ENABLED = 'yes';

      // Act
      const result = isNotificationsEnabled();

      // Assert
      expect(result).toBe(false);
    });
  });
});
