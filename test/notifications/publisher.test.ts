import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';
import { db } from '../../src/db';

jest.mock('../../src/db');

describe('Notifications Publisher', () => {
  describe('publish', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should publish event successfully and return event ID', async () => {
      const mockEventId = 123;
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ id: mockEventId }]
      });

      const result = await publish('test.topic', { data: 'test' });

      expect(result).toBe(mockEventId);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        ['test.topic', JSON.stringify({ data: 'test' })]
      );
    });

    it('should serialize payload to JSON string', async () => {
      const payload = { userId: 1, courseId: 2, nested: { value: 'test' } };
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      await publish('enrollment.created', payload);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['enrollment.created', JSON.stringify(payload)]
      );
    });

    it('should return null when database query fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (db.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await publish('test.topic', { data: 'test' });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish event'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return null when query returns no rows', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await publish('test.topic', { data: 'test' });

      expect(result).toBeNull();
    });

    it('should handle complex nested payload objects', async () => {
      const complexPayload = {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com'
        },
        course: {
          id: 2,
          title: 'Test Course',
          lessons: [1, 2, 3]
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      };
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 1 }] });

      await publish('enrollment.created', complexPayload);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['enrollment.created', JSON.stringify(complexPayload)]
      );
    });
  });

  describe('isNotificationsEnabled', () => {
    const originalEnv = process.env.NOTIFICATIONS_ENABLED;

    afterEach(() => {
      process.env.NOTIFICATIONS_ENABLED = originalEnv;
    });

    it('should return true when NOTIFICATIONS_ENABLED is "true"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'true';
      expect(isNotificationsEnabled()).toBe(true);
    });

    it('should return false when NOTIFICATIONS_ENABLED is "false"', () => {
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(isNotificationsEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is undefined', () => {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(isNotificationsEnabled()).toBe(false);
    });

    it('should return false when NOTIFICATIONS_ENABLED is empty string', () => {
      process.env.NOTIFICATIONS_ENABLED = '';
      expect(isNotificationsEnabled()).toBe(false);
    });
  });
});
