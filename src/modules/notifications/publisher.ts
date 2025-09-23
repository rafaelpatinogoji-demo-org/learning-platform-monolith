import { db } from '../../db';

/**
 * Publishes an event to the outbox_events table for async processing
 * @param topic - Event topic (e.g., 'enrollment.created', 'certificate.issued')
 * @param payload - Event payload data
 * @returns The created event ID or null if publishing fails
 */
export async function publish(topic: string, payload: any): Promise<number | null> {
  try {
    const query = `
      INSERT INTO outbox_events (topic, payload, processed)
      VALUES ($1, $2, false)
      RETURNING id
    `;
    
    const result = await db.query(query, [topic, JSON.stringify(payload)]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to publish event to outbox: ${topic}`, error);
    return null;
  }
}

/**
 * Helper to check if notifications are enabled
 */
export function isNotificationsEnabled(): boolean {
  return process.env.NOTIFICATIONS_ENABLED === 'true';
}
