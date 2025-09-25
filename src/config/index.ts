import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  // Server
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  
  // Security
  jwtSecret: string;
  
  // Database (future)
  databaseUrl: string;
  
  mongodbAuthUrl: string;
  
  // Logging
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // Application
  appName: string;
  version: string;
  
  // Notifications
  notificationsEnabled: boolean;
  notificationsSink: 'console' | 'file';
}

class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function validateRequired(key: string, value: string | undefined, env: string): string {
  if (!value || value.trim() === '') {
    throw new ConfigError(
      `❌ Missing required environment variable: ${key}\n` +
      `   Environment: ${env}\n` +
      `   Please set ${key} in your .env file or environment variables.\n` +
      `   Copy .env.example to .env and update the values.`
    );
  }
  return value.trim();
}

function parsePort(portStr: string | undefined, defaultPort: number): number {
  if (!portStr) return defaultPort;
  
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ConfigError(`❌ Invalid PORT value: ${portStr}. Must be a number between 1 and 65535.`);
  }
  return port;
}

function validateNodeEnv(env: string | undefined): 'development' | 'test' | 'production' {
  const validEnvs = ['development', 'test', 'production'] as const;
  const nodeEnv = (env || 'development').toLowerCase();
  
  if (!validEnvs.includes(nodeEnv as any)) {
    throw new ConfigError(
      `❌ Invalid NODE_ENV value: ${env}\n` +
      `   Valid values are: ${validEnvs.join(', ')}`
    );
  }
  
  return nodeEnv as 'development' | 'test' | 'production';
}

function validateLogLevel(level: string | undefined): 'error' | 'warn' | 'info' | 'debug' {
  const validLevels = ['error', 'warn', 'info', 'debug'] as const;
  const logLevel = (level || 'info').toLowerCase();
  
  if (!validLevels.includes(logLevel as any)) {
    throw new ConfigError(
      `❌ Invalid LOG_LEVEL value: ${level}\n` +
      `   Valid values are: ${validLevels.join(', ')}`
    );
  }
  
  return logLevel as 'error' | 'warn' | 'info' | 'debug';
}

function loadConfig(): AppConfig {
  try {
    const nodeEnv = validateNodeEnv(process.env.NODE_ENV);
    
    // In production, JWT_SECRET is required
    // In development/test, we can use a default for convenience
    let jwtSecret: string;
    if (nodeEnv === 'production') {
      jwtSecret = validateRequired('JWT_SECRET', process.env.JWT_SECRET, nodeEnv);
    } else {
      jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
    }
    
    // For test environment, use a different default port to avoid conflicts
    const defaultPort = nodeEnv === 'test' ? 4001 : 4000;
    
    // Parse notifications configuration
    const notificationsEnabled = process.env.NOTIFICATIONS_ENABLED === 'true';
    const notificationsSink = (process.env.NOTIFICATIONS_SINK === 'file' ? 'file' : 'console') as 'console' | 'file';
    
    return {
      port: parsePort(process.env.PORT, defaultPort),
      nodeEnv,
      jwtSecret,
      databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/learnlite_dev',
      mongodbAuthUrl: process.env.MONGODB_AUTH_URL || 'mongodb://localhost:27017/learnlite_auth',
      logLevel: validateLogLevel(process.env.LOG_LEVEL),
      appName: process.env.APP_NAME || 'learnlite',
      version: 'v1.2',
      notificationsEnabled,
      notificationsSink
    };
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('\n🚨 Configuration Error:');
      console.error(error.message);
      console.error('\n💡 Tip: Copy .env.example to .env and update the values for your environment.\n');
      process.exit(1);
    }
    throw error;
  }
}

// Create and export the config object
export const config = loadConfig();

// Helper function to get a redacted config summary for logging
export function getConfigSummary(): Record<string, any> {
  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    jwtSecret: config.jwtSecret ? '[REDACTED]' : '[NOT SET]',
    databaseUrl: config.databaseUrl ? '[REDACTED]' : '[NOT SET]',
    mongodbAuthUrl: config.mongodbAuthUrl ? '[REDACTED]' : '[NOT SET]',
    logLevel: config.logLevel,
    appName: config.appName,
    version: config.version,
    notificationsEnabled: config.notificationsEnabled,
    notificationsSink: config.notificationsSink
  };
}
