import { db } from '../../db';
import * as fs from 'fs';
import * as path from 'path';

export class NotificationsWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastRunAt: Date | null = null;
  private pendingCount = 0;
  private readonly interval = 5000; // 5 seconds
  private readonly batchSize = 50;
  private readonly sink: 'console' | 'file';
  private readonly logFile: string;
  private isShuttingDown = false;

  constructor() {
    this.sink = (process.env.NOTIFICATIONS_SINK as 'console' | 'file') || 'console';
    this.logFile = path.join(process.cwd(), 'var', 'notifications.log');
    
    // Ensure var directory exists if using file sink
    if (this.sink === 'file') {
      const varDir = path.dirname(this.logFile);
      if (!fs.existsSync(varDir)) {
        fs.mkdirSync(varDir, { recursive: true });
      }
    }
  }

  /**
   * Start the worker polling loop
   */
  start(): void {
    if (this.intervalId) {
      console.log('⚠️  Notifications worker already running');
      return;
    }

    console.log(`📬 Notifications worker: enabled, sink=${this.sink}, interval=${this.interval}ms`);
    
    // Run immediately on start
    this.processEvents();
    
    // Then run periodically
    this.intervalId = setInterval(() => {
      if (!this.isShuttingDown) {
        this.processEvents();
      }
    }, this.interval);
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Wait for current processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('📬 Notifications worker stopped');
  }

  /**
   * Process a batch of unprocessed events
   */
  private async processEvents(): Promise<void> {
    if (this.isProcessing || this.isShuttingDown) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Start transaction
      await db.query('BEGIN');
      
      // Fetch unprocessed events with row locking
      const fetchQuery = `
        SELECT id, topic, payload, created_at
        FROM outbox_events
        WHERE processed = false
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `;
      
      const result = await db.query(fetchQuery, [this.batchSize]);
      const events = result.rows;
      
      if (events.length > 0) {
        // Process each event
        for (const event of events) {
          await this.sendNotification(event);
        }
        
        // Mark events as processed
        const eventIds = events.map(e => e.id);
        const updateQuery = `
          UPDATE outbox_events
          SET processed = true, processed_at = NOW()
          WHERE id = ANY($1::int[])
        `;
        
        await db.query(updateQuery, [eventIds]);
        
        // Commit transaction
        await db.query('COMMIT');
        
        console.log(`📬 Processed ${events.length} notification event(s)`);
      } else {
        // No events to process, just commit
        await db.query('COMMIT');
      }
      
      // Update stats
      this.lastRunAt = new Date();
      await this.updatePendingCount();
      
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error('❌ Error processing notification events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a notification (log to console or file)
   */
  private async sendNotification(event: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const message = {
      timestamp,
      id: event.id,
      topic: event.topic,
      payload: event.payload,
      created_at: event.created_at
    };

    if (this.sink === 'file') {
      // Append to JSONL file
      const line = JSON.stringify(message) + '\n';
      fs.appendFileSync(this.logFile, line);
    } else {
      // Log to console
      console.log(`📨 [${timestamp}] ${event.topic}:`, JSON.stringify(event.payload));
    }
  }

  /**
   * Update the count of pending events
   */
  private async updatePendingCount(): Promise<void> {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM outbox_events WHERE processed = false'
      );
      this.pendingCount = parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  }

  /**
   * Get worker status for health check
   */
  getStatus(): {
    enabled: boolean;
    interval: number;
    lastRunAt: Date | null;
    pendingEstimate: number;
    sink: string;
  } {
    return {
      enabled: true,
      interval: this.interval,
      lastRunAt: this.lastRunAt,
      pendingEstimate: this.pendingCount,
      sink: this.sink
    };
  }
}

// Singleton instance
let workerInstance: NotificationsWorker | null = null;

export function getWorker(): NotificationsWorker {
  if (!workerInstance) {
    workerInstance = new NotificationsWorker();
  }
  return workerInstance;
}

export function isWorkerEnabled(): boolean {
  return process.env.NOTIFICATIONS_ENABLED === 'true';
}
