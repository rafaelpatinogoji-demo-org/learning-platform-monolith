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
  
  collectCoverageFrom: [
    'src/middleware/auth.middleware.ts',
    'src/utils/jwt-utils.ts',
    'src/utils/password-hasher.ts',
    'src/services/certificates.service.ts',
    'src/controllers/certificates.controller.ts',
    'src/utils/validation.ts'
  ],
  
  // Coverage thresholds for auth and certificates modules
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for auth middleware
    'src/middleware/auth.middleware.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // JWT utilities should have high coverage
    'src/utils/jwt-utils.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Password hasher should have high coverage
    'src/utils/password-hasher.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Certificates service should have high coverage
    'src/services/certificates.service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Certificates controller should have high coverage
    'src/controllers/certificates.controller.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Validation utilities should have high coverage
    'src/utils/validation.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
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
