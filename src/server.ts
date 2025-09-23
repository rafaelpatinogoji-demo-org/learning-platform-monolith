import app from './app';
import { config, getConfigSummary } from './config';
import { db } from './db';
import { getWorker, isWorkerEnabled } from './modules/notifications/worker';

async function startServer() {
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await db.connect();

    // Start notifications worker if enabled
    if (isWorkerEnabled()) {
      const worker = getWorker();
      worker.start();
    } else {
      console.log('📬 Notifications worker: disabled');
    }

    // Start the HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 ${config.appName} backend server ${config.version} running`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`📍 Port: ${config.port}`);
      console.log(`📍 Health check: http://localhost:${config.port}/healthz`);
      console.log(`📍 Readiness check: http://localhost:${config.port}/readiness`);
      console.log(`📍 API root: http://localhost:${config.port}/`);
      
      // Log redacted config summary
      if (config.logLevel === 'debug') {
        console.log('🔧 Configuration:', JSON.stringify(getConfigSummary(), null, 2));
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('🛑 HTTP server closed');
        
        // Stop notifications worker if running
        if (isWorkerEnabled()) {
          const worker = getWorker();
          await worker.stop();
        }
        
        // Close database connections
        await db.disconnect();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
