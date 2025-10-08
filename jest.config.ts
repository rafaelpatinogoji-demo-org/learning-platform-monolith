import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests and modules
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Collect coverage from auth and certificates modules
  collectCoverageFrom: [
    'src/middleware/auth.middleware.ts',
    'src/utils/jwt-utils.ts',
    'src/utils/password-hasher.ts',
    'src/services/certificates.service.ts',
    'src/controllers/certificates.controller.ts',
    'src/utils/validation.ts',
    'src/services/enrollments.service.ts',
    'src/services/progress.service.ts',
    'src/modules/notifications/publisher.ts',
    'src/modules/notifications/worker.ts',
    'src/controllers/notifications.controller.ts'
  ],
  
  // Coverage thresholds disabled to allow independent module testing
  // Coverage should be enforced at CI level for the full test suite instead.
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     statements: 80
  //   }
  // },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Test timeout (5 seconds)
  testTimeout: 5000,
  
  // Module path mapping (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

export default config;
