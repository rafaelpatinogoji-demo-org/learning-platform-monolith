process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NOTIFICATIONS_ENABLED = 'false';
process.env.NOTIFICATIONS_SINK = 'console';

jest.setTimeout(10000);
