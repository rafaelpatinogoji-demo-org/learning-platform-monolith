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
  
  // Only collect coverage from auth-related files
  collectCoverageFrom: [
    'src/middleware/auth.middleware.ts',
    'src/utils/jwt-utils.ts',
    'src/utils/password-hasher.ts'
  ],
  
  // Coverage thresholds - focused on auth components only
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
