import { Request, Response } from 'express';
import { getWorker, isWorkerEnabled } from '../modules/notifications/worker';
import { config } from '../config';

export const notificationsController = {
  /**
   * GET /api/notifications/health
   * Returns the health status of the notifications worker
   */
  getHealth: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isWorkerEnabled()) {
        res.json({
          ok: true,
          version: config.version,
          enabled: false,
          message: 'Notifications worker is disabled'
        });
        return;
      }

      const worker = getWorker();
      const status = worker.getStatus();

      res.json({
        ok: true,
        version: config.version,
        ...status
      });
    } catch (error) {
      console.error('Error getting notifications health:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to get notifications health status',
        requestId: (req as any).requestId
      });
    }
  }
};
