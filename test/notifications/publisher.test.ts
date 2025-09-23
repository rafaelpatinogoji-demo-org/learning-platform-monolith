/**
 * Tests for notifications publisher module
 * 
 * Tests event publishing to outbox_events table and environment variable checks
 * without any external dependencies.
 */

import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn(),
  }
}));

import { db } from '../../src/db';

const mockDb = db as jest.Mocked<typeof db>;

describe('notifications publisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publish function', () => {
    it('should return event ID when publishing valid event successfully', async () => {
      // Arrange
      const topic = 'enrollment.created';
      const payload = { userId: 1, courseId: 2 };
      const expectedId = 123;
      
      mockDb.query.mockResolvedValue({
        rows: [{ id: expectedId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBe(expectedId);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payload)]
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should return null when query returns no rows', async () => {
      // Arrange
      const topic = 'certificate.issued';
      const payload = { userId: 1, certificateId: 5 };
      
      mockDb.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeNull();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payload)]
      );
    });

    it('should return null and log error when database query fails', async () => {
      // Arrange
      const topic = 'enrollment.created';
      const payload = { userId: 1, courseId: 2 };
      const dbError = new Error('Database connection failed');
      
      mockDb.query.mockRejectedValue(dbError);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to publish event to outbox: ${topic}`,
        dbError
      );
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle complex payload objects correctly', async () => {
      // Arrange
      const topic = 'quiz.completed';
      const complexPayload = {
        userId: 42,
        quizId: 15,
        score: 85.5,
        answers: [
          { questionId: 1, answer: 'A' },
          { questionId: 2, answer: 'B' }
        ],
        metadata: {
          timeSpent: 1200,
          attempts: 1
        }
      };
      const expectedId = 456;
      
      mockDb.query.mockResolvedValue({
        rows: [{ id: expectedId }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      const result = await publish(topic, complexPayload);

      // Assert
      expect(result).toBe(expectedId);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(complexPayload)]
      );
    });

    it('should use correct SQL query structure', async () => {
      // Arrange
      const topic = 'test.event';
      const payload = { test: 'data' };
      
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      await publish(topic, payload);

      // Assert
      const [query, params] = mockDb.query.mock.calls[0];
      expect(query).toContain('INSERT INTO outbox_events');
      expect(query).toContain('(topic, payload, processed)');
      expect(query).toContain('VALUES ($1, $2, false)');
      expect(query).toContain('RETURNING id');
      expect(params).toEqual([topic, JSON.stringify(payload)]);
    });

    it('should handle null and undefined payload values', async () => {
      // Arrange
      const topic = 'test.event';
      const payloadWithNulls = {
        userId: 1,
        optionalField: null,
        undefinedField: undefined
      };
      
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      const result = await publish(topic, payloadWithNulls);

      // Assert
      expect(result).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payloadWithNulls)]
      );
    });
  });

  describe('isNotificationsEnabled function', () => {
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
      const testValues = ['TRUE', 'True', '1', 'yes', 'enabled', 'on'];

      testValues.forEach(value => {
        process.env.NOTIFICATIONS_ENABLED = value;

        // Act
        const result = isNotificationsEnabled();

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle database timeout errors', async () => {
      // Arrange
      const topic = 'timeout.test';
      const payload = { test: 'data' };
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';
      
      mockDb.query.mockRejectedValue(timeoutError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to publish event to outbox: ${topic}`,
        timeoutError
      );
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle unexpected database response structure', async () => {
      // Arrange
      const topic = 'malformed.response';
      const payload = { test: 'data' };
      
      mockDb.query.mockResolvedValue({
        rows: [{ wrong_field: 'value' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });

      // Act
      const result = await publish(topic, payload);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
