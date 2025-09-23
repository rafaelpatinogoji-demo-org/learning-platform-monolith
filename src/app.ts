import express from 'express';
import cors from 'cors';
import { config } from './config';
import { db } from './db';

// Import middleware
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { loggingMiddleware } from './middleware/logging.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

// Import main router
import apiRoutes from './routes';

const app = express();

// Global middleware
app.use(requestIdMiddleware);
app.use(loggingMiddleware);
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    ok: true,
    app: config.appName,
    version: config.version,
    environment: config.nodeEnv,
    modules: [
      'auth',
      'users', 
      'courses',
      'lessons',
      'enrollments',
      'progress',
      'quizzes',
      'certificates'
    ]
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readiness', async (req, res) => {
  try {
    const isDbHealthy = await db.healthCheck();
    
    if (isDbHealthy) {
      // Run smoke test to verify schema is accessible
      const smokeTestResult = await db.smokeTest();
      
      if (smokeTestResult.success) {
        res.status(200).json({
          status: 'ready',
          database: 'connected',
          schema: 'accessible',
          userCount: smokeTestResult.userCount,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          database: 'connected',
          schema: 'error',
          error: smokeTestResult.error,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      res.status(503).json({
        status: 'not ready',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
