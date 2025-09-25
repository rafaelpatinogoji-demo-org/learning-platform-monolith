# Progress Module Test Suite

This directory contains comprehensive tests for the Progress module (v1.1) of the LearnLite learning platform.

## Overview

The Progress module is responsible for lesson completion tracking and progress calculation. This test suite covers all aspects of the module including validation, business logic, and API endpoints.

## Test Structure

```
test/progress/
├── progress.validator.test.ts     # Unit tests for ProgressValidator
├── progress.service.test.ts       # Unit tests for ProgressService with mocked database
├── progress.controller.test.ts    # Integration tests for ProgressController
└── README.md                      # This file
```

## Test Categories

### 1. ProgressValidator Tests (`progress.validator.test.ts`)

Tests the validation logic for progress-related data without any external dependencies.

**Coverage:**
- ✅ `validateMarkProgress` method with all validation scenarios
- ✅ `validateCourseIdQuery` method with query parameter validation
- ✅ Field validation (enrollmentId, lessonId, completed)
- ✅ Type validation and boundary conditions
- ✅ Multiple validation errors handling
- ✅ Edge cases and error scenarios

**Key Test Scenarios:**
- Valid progress data validation
- Missing required fields
- Invalid data types (string IDs, non-boolean completed)
- Boundary values (zero, negative numbers)
- Multiple validation errors

### 2. ProgressService Tests (`progress.service.test.ts`)

Tests the business logic layer with mocked database dependencies.

**Coverage:**
- ✅ `markLessonProgress` - lesson completion tracking
- ✅ `getUserCourseProgress` - individual user progress calculation
- ✅ `getCourseProgress` - aggregated course progress for instructors/admins
- ✅ `hasCompletedCourse` - course completion verification
- ✅ `getEnrollmentProgress` - enrollment-specific progress

**Key Test Scenarios:**
- Creating new progress records
- Updating existing progress (complete ↔ incomplete)
- Idempotent operations (safe to retry)
- Role-based access control
- Error handling (enrollment not found, unauthorized access)
- Progress calculation accuracy
- Edge cases (no lessons, no enrollments)

### 3. ProgressController Tests (`progress.controller.test.ts`)

Tests the HTTP request/response handling with mocked service dependencies.

**Coverage:**
- ✅ `POST /api/progress/complete` - mark lesson complete/incomplete
- ✅ `GET /api/progress/me` - get user's course progress
- ✅ `GET /api/courses/:courseId/progress` - get course progress aggregate
- ✅ Request validation and error responses
- ✅ Authentication context handling
- ✅ HTTP status codes and response formatting

**Key Test Scenarios:**
- Successful API operations with proper response formatting
- Validation errors (400 status codes)
- Authentication/authorization errors (401/403 status codes)
- Service errors (404/500 status codes)
- Proper user context usage from authentication middleware

## Testing Approach

### Database Mocking Strategy

The tests use Jest mocks to isolate the business logic from database dependencies:

```typescript
jest.mock('../../src/db');
const mockDb = db as jest.Mocked<typeof db>;
```

This approach allows for:
- Fast test execution (no database connections)
- Deterministic test results
- Easy simulation of error conditions
- Isolated testing of business logic

### Authentication Context

Tests simulate authenticated requests using the existing `testUtils`:

```typescript
mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
```

This ensures proper testing of role-based access control and user-specific operations.

### Error Scenario Testing

Comprehensive error testing covers:
- Validation failures
- Database errors
- Authorization failures
- Not found scenarios
- Unexpected service errors

## Running Tests

### Prerequisites

Ensure you have installed the testing dependencies:

```bash
npm install
```

### Available Test Commands

```bash
# Run all Progress module tests
npm test -- test/progress/

# Run specific test file
npm test -- test/progress/progress.validator.test.ts

# Run tests in watch mode
npm test -- --watch test/progress/

# Run tests with coverage
npm run test:coverage

# Run specific test case
npm test -- --testNamePattern="should mark lesson as complete successfully"
```

### Using bash commands directly

```bash
# Run all Progress tests
bash -lc "npx jest test/progress/"

# Run with verbose output
bash -lc "npx jest --verbose test/progress/"

# Run specific test file
bash -lc "npx jest test/progress/progress.service.test.ts"
```

## Test Configuration

The Progress module tests are integrated into the main Jest configuration:

- **Coverage Collection**: Progress module files are included in coverage reports
- **Coverage Thresholds**: 85% for controller and service, 80% for validation
- **Test Environment**: Node.js with TypeScript support
- **Setup**: Uses shared test utilities from `test/setup.ts`

## Key Features Tested

### Lesson Completion Tracking

- ✅ Mark lessons as complete/incomplete
- ✅ Idempotent operations (safe to call multiple times)
- ✅ Proper timestamp handling (completed_at field)
- ✅ User ownership verification
- ✅ Lesson-course relationship validation

### Progress Calculation

- ✅ Accurate percentage calculations
- ✅ Lesson completion counts
- ✅ Course completion verification
- ✅ Empty state handling (no enrollments, no lessons)
- ✅ Partial completion scenarios

### API Endpoints

- ✅ POST `/api/progress/complete` - lesson completion tracking
- ✅ GET `/api/progress/me?courseId=X` - user progress retrieval
- ✅ GET `/api/courses/:courseId/progress` - instructor/admin progress overview
- ✅ Proper HTTP status codes and error messages
- ✅ Request validation and sanitization

### Role-Based Access Control

- ✅ Students can only mark their own progress
- ✅ Students can only view their own progress
- ✅ Instructors can view progress for their courses
- ✅ Admins can view progress for any course
- ✅ Proper 403 Forbidden responses for unauthorized access

## Integration with Existing Test Suite

The Progress module tests follow the established patterns from the auth tests:

- Uses `testUtils` for creating mock Express objects
- Implements comprehensive error scenario testing
- Mocks external dependencies appropriately
- Tests both success and failure paths
- Includes proper TypeScript typing
- Follows the existing describe/it structure and naming conventions

## Coverage Requirements

The test suite enforces minimum coverage thresholds:

- **Progress Controller**: 85% lines, functions, branches, statements
- **Progress Service**: 85% lines, functions, branches, statements
- **Validation Utilities**: 80% lines, functions, branches, statements

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
npx jest test/progress/progress.service.test.ts

# Run specific test case
npx jest --testNamePattern="should create new progress record"

# Run with verbose output
npx jest --verbose test/progress/
```

### Common Issues

1. **Mock Persistence**: Use `jest.clearAllMocks()` in `beforeEach`
2. **Database Mock Setup**: Ensure proper mock return values for chained queries
3. **Authentication Context**: Always set `mockReq.user` for authenticated endpoints
4. **Async Operations**: Use `await` for all controller method calls

## Contributing

When adding new Progress module functionality:

1. **Add Tests First**: Write tests before implementation (TDD)
2. **Maintain Coverage**: Ensure new code meets coverage thresholds
3. **Update Documentation**: Update this README for new test categories
4. **Follow Patterns**: Use existing test patterns and utilities

### Test Naming Conventions

- **Describe Blocks**: Use feature/method names (`describe('markLessonProgress')`)
- **Test Cases**: Use behavior descriptions (`it('should create new progress record when none exists')`)
- **Nested Describes**: Group related scenarios (`describe('validation errors')`)

## Security Considerations

The test suite validates security-critical functionality:

- **Authorization**: Ensures users can only access their own data
- **Role Enforcement**: Validates RBAC prevents unauthorized access
- **Input Validation**: Tests prevent injection and malformed data
- **Error Handling**: Ensures no sensitive data leaks in error messages

All security-related test failures should be treated as high priority and investigated immediately.
