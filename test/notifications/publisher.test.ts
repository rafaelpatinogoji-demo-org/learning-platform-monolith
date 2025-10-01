import { jest } from '@jest/globals';

const mockQuery = jest.fn() as any;

jest.mock('../../src/db', () => ({
  db: {
    query: mockQuery,
  },
}));

import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';

describe('Notifications Publisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should successfully publish an event and return the event ID', async () => {
      const mockEventId = 123;
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: mockEventId }],
      });

      const result = await publish('enrollment.created', {
        enrollmentId: 1,
        userId: 2,
        courseId: 3,
      });

      expect(result).toBe(mockEventId);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        [
          'enrollment.created',
          JSON.stringify({
            enrollmentId: 1,
            userId: 2,
            courseId: 3,
          }),
        ]
      );
    });

    it('should insert event with correct SQL query structure', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      await publish('test.topic', { data: 'value' });

      const callArgs = (mockQuery.mock.calls as any)[0];
      const query = callArgs[0];

      expect(query).toMatch(/INSERT INTO outbox_events/i);
      expect(query).toMatch(/topic.*payload.*processed/i);
      expect(query).toMatch(/RETURNING id/i);
    });

    it('should stringify payload as JSON', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const payload = {
        userId: 123,
        courseId: 456,
        nested: { data: 'value' },
      };

      await publish('certificate.issued', payload);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['certificate.issued', JSON.stringify(payload)]
      );
    });

    it('should return null when database query returns empty rows', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await publish('test.topic', { data: 'value' });

      expect(result).toBeNull();
    });

    it('should handle database errors and return null', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      const result = await publish('test.topic', { data: 'value' });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to publish event to outbox'),
        dbError
      );
    });

    it('should handle different event topics', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }],
      });

      await publish('enrollment.created', { enrollmentId: 1 });
      await publish('certificate.issued', { certificateId: 2 });
      await publish('progress.updated', { progressId: 3 });

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect((mockQuery.mock.calls as any)[0][1][0]).toBe('enrollment.created');
      expect((mockQuery.mock.calls as any)[1][1][0]).toBe('certificate.issued');
      expect((mockQuery.mock.calls as any)[2][1][0]).toBe('progress.updated');
    });

    it('should handle empty payload objects', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const result = await publish('test.topic', {});

      expect(result).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['test.topic', '{}']
      );
    });

    it('should set processed flag to false in SQL', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      await publish('test.topic', { data: 'value' });

      const query = (mockQuery.mock.calls as any)[0][0];
      expect(query).toMatch(/VALUES \(\$1, \$2, false\)/i);
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

    it('should return false when NOTIFICATIONS_ENABLED is not "true"', () => {
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
