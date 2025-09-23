# LearnLite Testing Suite

This directory contains the comprehensive test suite for the LearnLite authentication and RBAC (Role-Based Access Control) layer.

## Overview

The test suite focuses on unit testing the authentication middleware, role-based access control, JWT utilities, and password hashing functionality without any database dependencies. All tests are designed to be fast, deterministic, and isolated.

## Test Structure

```
test/
├── auth/                           # Authentication layer tests
│   ├── authenticate.middleware.test.ts    # JWT authentication middleware
│   ├── requireRole.middleware.test.ts     # RBAC middleware
│   ├── jwt-utils.test.ts                  # JWT signing/verification utilities
│   └── password-hasher.test.ts            # Password hashing utilities
├── setup.ts                       # Global test setup and utilities
└── README.md                      # This file
```

## Running Tests

### Prerequisites

Ensure you have installed the testing dependencies:

```bash
npm install
```

### Available Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only authentication tests
npm run test:auth
```

### Using bash commands directly

If you prefer using bash commands directly:

```bash
# Run all tests
bash -lc "npm test"

# Run with coverage
bash -lc "npm run test:coverage"

# Run specific test file
bash -lc "npx jest test/auth/authenticate.middleware.test.ts"

# Run tests matching a pattern
bash -lc "npx jest --testNamePattern='should return 401'"
```

## Test Configuration

The test suite is configured via `jest.config.ts` in the project root with the following key settings:

- **Environment**: Node.js
- **TypeScript Support**: Via ts-jest preset
- **Test Files**: `test/**/*.test.ts` and `test/**/*.spec.ts`
- **Coverage Threshold**: 80% for lines, functions, branches, and statements
- **Setup File**: `test/setup.ts` runs before each test suite

## Test Categories

### 1. Authentication Middleware Tests (`authenticate.middleware.test.ts`)

Tests the JWT authentication middleware that validates tokens and attaches user information to requests.

**Test Coverage:**
- ✅ Missing Authorization header scenarios
- ✅ Invalid token formats and signatures
- ✅ Expired token handling with fake timers
- ✅ Valid token processing and user attachment
- ✅ Error handling and response formatting
- ✅ Request ID and timestamp inclusion

**Key Features:**
- Uses fake timers for expiration testing
- Tests all error scenarios (401 responses)
- Validates user object attachment to requests
- Ensures proper error message formatting

### 2. Role-Based Access Control Tests (`requireRole.middleware.test.ts`)

Tests the RBAC middleware that enforces role-based permissions.

**Test Coverage:**
- ✅ Missing authentication (401 responses)
- ✅ Single role requirements
- ✅ Multiple role requirements
- ✅ Case-sensitive role matching
- ✅ Edge cases (empty roles, special characters)
- ✅ Middleware factory pattern

**Key Features:**
- Tests all role combinations (student, instructor, admin)
- Validates 403 Forbidden responses
- Tests middleware factory pattern
- Ensures proper error message formatting

### 3. JWT Utilities Tests (`jwt-utils.test.ts`)

Tests the pure JWT utility functions for token creation and verification.

**Test Coverage:**
- ✅ Token signing with custom expiration times
- ✅ Token verification with signature validation
- ✅ Token decoding without verification
- ✅ Expiration checking utilities
- ✅ Malformed token handling
- ✅ Integration tests for complete workflows

**Key Features:**
- Uses test-specific JWT secret
- Tests with fake timers for expiration
- Validates token structure and claims
- Tests round-trip token operations

### 4. Password Hashing Tests (`password-hasher.test.ts`)

Tests the bcrypt wrapper utilities for secure password handling.

**Test Coverage:**
- ✅ Password hashing with configurable cost factors
- ✅ Password verification (correct/incorrect)
- ✅ Salt generation (different hashes for same password)
- ✅ Special character and Unicode support
- ✅ Error handling for invalid inputs
- ✅ Cost factor configuration and validation

**Key Features:**
- Uses low cost factor (4) for fast testing
- Tests password lifecycle (hash → verify)
- Validates bcrypt format and salt uniqueness
- Tests convenience functions and singleton pattern

## Test Utilities

### Global Test Setup (`setup.ts`)

Provides shared utilities and configuration:

- **Environment Variables**: Sets test-specific JWT secret and log level
- **Mock Factories**: Creates mock Express req/res/next objects
- **Console Mocking**: Suppresses logs during testing
- **Cleanup**: Clears mocks after each test

### Mock Utilities

```typescript
// Create mock Express objects
const mockReq = testUtils.createMockRequest({
  headers: { authorization: 'Bearer token' },
  user: { id: 1, email: 'test@example.com', role: 'student' }
});

const mockRes = testUtils.createMockResponse();
const mockNext = testUtils.createMockNext();
```

## Test Principles

### 1. No Database Dependencies
- All tests are pure unit tests
- No database connections or queries
- Fast execution (< 5 seconds total)

### 2. Deterministic Results
- No flaky tests due to timing issues
- Controlled time with Jest fake timers
- Predictable bcrypt behavior with fixed cost factors

### 3. Comprehensive Coverage
- Tests all code paths and edge cases
- Validates error conditions and success scenarios
- Achieves >80% coverage on authentication components

### 4. Isolated Tests
- Each test is independent
- Mocks are cleared between tests
- No shared state between test suites

## Coverage Requirements

The test suite enforces minimum coverage thresholds:

- **Global**: 80% lines, functions, branches, statements
- **Auth Middleware**: 90% lines, functions, branches, statements

View coverage reports:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI/CD

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npx jest test/auth/authenticate.middleware.test.ts

# Run specific test case
npx jest --testNamePattern="should return 401 when token is expired"

# Run with verbose output
npx jest --verbose
```

### Common Issues

1. **TypeScript Errors**: Ensure all types are properly imported and mocked
2. **Fake Timer Issues**: Always call `jest.useRealTimers()` in cleanup
3. **Mock Persistence**: Use `jest.clearAllMocks()` between tests
4. **Coverage Gaps**: Check that all code paths are tested

## Integration with CI/CD

The test suite is designed to work in CI/CD environments:

- **Exit Codes**: Proper exit codes for pass/fail
- **Coverage Reports**: Generates LCOV format for coverage tools
- **No External Dependencies**: Self-contained test execution
- **Fast Execution**: Completes in under 10 seconds

## Contributing

When adding new authentication-related functionality:

1. **Add Tests First**: Write tests before implementation (TDD)
2. **Maintain Coverage**: Ensure new code meets coverage thresholds
3. **Update Documentation**: Update this README for new test categories
4. **Follow Patterns**: Use existing test patterns and utilities

### Test Naming Conventions

- **Describe Blocks**: Use feature/method names (`describe('authenticate middleware')`)
- **Test Cases**: Use behavior descriptions (`it('should return 401 when token is expired')`)
- **Nested Describes**: Group related scenarios (`describe('Invalid Token Scenarios')`)

### Mock Patterns

- **Request Mocks**: Use `testUtils.createMockRequest()` with overrides
- **Response Mocks**: Use `testUtils.createMockResponse()` for spies
- **Time Mocking**: Use `jest.useFakeTimers()` for expiration tests
- **Cleanup**: Always restore mocks and timers in cleanup

## Security Considerations

The test suite validates security-critical functionality:

- **Token Validation**: Ensures invalid tokens are rejected
- **Role Enforcement**: Validates RBAC prevents unauthorized access
- **Password Security**: Tests bcrypt integration and salt generation
- **Error Handling**: Ensures no sensitive data leaks in error messages

All security-related test failures should be treated as high priority and investigated immediately.
