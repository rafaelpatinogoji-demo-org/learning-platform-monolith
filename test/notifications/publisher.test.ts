import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { db } from '../../src/db';

jest.mock('../../src/db');

describe('Notifications Publisher', () => {
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should successfully publish event and return event ID', async () => {
      const mockEventId = 123;
      mockDb.query.mockResolvedValue({
        rows: [{ id: mockEventId }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const topic = 'enrollment.created';
      const payload = { userId: 1, courseId: 2 };

      const result = await publish(topic, payload);

      expect(result).toBe(mockEventId);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [topic, JSON.stringify(payload)]
      );
    });

    it('should return null when database query returns no rows', async () => {
      mockDb.query.mockResolvedValue({
        rows: [],
        command: 'INSERT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await publish('test.topic', { data: 'test' });

      expect(result).toBeNull();
    });

    it('should return null and log error when database query fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const topic = 'error.topic';
      const payload = { test: 'data' };
      const result = await publish(topic, payload);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to publish event to outbox: ${topic}`),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should serialize payload as JSON string', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const complexPayload = {
        userId: 1,
        nested: { data: 'value' },
        array: [1, 2, 3]
      };

      await publish('test.topic', complexPayload);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test.topic', JSON.stringify(complexPayload)]
      );
    });
  });

  describe('isNotificationsEnabled', () => {
    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'true';
      expect(isNotificationsEnabled()).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is not "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(isNotificationsEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(isNotificationsEnabled()).toBe(false);
    });
  });
});
