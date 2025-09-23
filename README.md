# LearnLite Backend

A minimal Express.js backend for the LearnLite learning platform, built with TypeScript.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your configuration (see Configuration section below)

4. Start the PostgreSQL database:
   ```bash
   docker compose up -d
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on port 4000 (or the port specified in your `.env` file).

## Configuration

The application uses a centralized configuration system that loads from environment variables. Copy `.env.example` to `.env` and update the values:

### Environment Variables

- **PORT** (default: 4000) - Server port number
- **NODE_ENV** (default: development) - Environment mode: `development`, `test`, or `production`
- **JWT_SECRET** - Secret key for JWT tokens (REQUIRED in production)
- **DATABASE_URL** - PostgreSQL connection string (for future use)
- **LOG_LEVEL** (default: info) - Logging level: `error`, `warn`, `info`, or `debug`
- **APP_NAME** (default: learnlite) - Application name
- **NOTIFICATIONS_ENABLED** (default: false) - Enable/disable notifications worker
- **NOTIFICATIONS_SINK** (default: console) - Where to send notifications: `console` or `file`

### Configuration Validation

The app validates configuration on startup:
- **Required variables**: In production, `JWT_SECRET` is required
- **Invalid values**: The app will exit with clear error messages for invalid configurations
- **Safe defaults**: Development and test environments use safe defaults for convenience
- **Security**: Secrets are never logged; only `[REDACTED]` appears in logs

## Database

The application uses PostgreSQL as its database. For local development, use Docker Compose:

### Starting the Database

```bash
# Start PostgreSQL in the background
docker compose up -d

# View logs
docker compose logs -f postgres

# Stop the database
docker compose down
```

### Database Connection

The application connects to PostgreSQL using the `DATABASE_URL` environment variable. The default configuration for Docker Compose is:
```
DATABASE_URL=postgresql://learnlite:learnlite_dev_password@localhost:5432/learnlite
```

### Database Schema (v0.4)

The learning platform uses a comprehensive schema covering all core domain entities:

#### Core Tables

- **users** - Platform users (admin, instructor, student roles)
- **courses** - Learning courses with pricing and publishing status
- **lessons** - Course content with video URLs and markdown content
- **enrollments** - Student course enrollments with status tracking
- **lesson_progress** - Individual lesson completion tracking
- **quizzes** - Course assessments
- **quiz_questions** - Quiz questions with multiple choice answers (JSON)
- **quiz_submissions** - Student quiz attempts with scores
- **certificates** - Course completion certificates with unique codes
- **outbox_events** - Event sourcing for eventual consistency

#### Key Features

- **Foreign Key Constraints**: Proper relationships with cascading deletes
- **Unique Constraints**: Prevent duplicate enrollments, progress entries, and certificates
- **Check Constraints**: Enforce valid enum values (user roles, enrollment status)
- **Indexes**: Optimized for common query patterns
- **JSON Support**: Flexible storage for quiz choices and answers

### Migrations

This project uses `node-pg-migrate` for database migrations:

```bash
# Create a new migration
npm run migrate:create migration-name

# Run pending migrations (creates schema + seed data)
npm run migrate:up

# Rollback the last migration
npm run migrate:down

# Check migration status
npm run migrate
```

#### Initial Setup

After starting the database, run migrations to create the schema and seed demo data:

```bash
# Start database
docker compose up -d

# Run all migrations (creates tables + demo data)
npm run migrate:up

# Verify setup
curl http://localhost:4000/readiness
```

The seed migration creates:
- Sample users (admin, instructor, students)
- A complete "Introduction to Web Development" course
- Enrollment and progress data
- Quiz questions and submissions
- A sample certificate

## Architecture (v0.8)

### Route-Controller Pattern

The application follows a clean Route-Controller pattern that separates routing concerns from business logic:

#### Directory Structure
```
src/
├── routes/          # Express route definitions
├── controllers/     # Request/response handling
├── services/        # Business logic layer
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── config/          # Configuration management
└── db/              # Database connection
```

#### Request Flow

1. **Route** - Express routes define URL patterns and HTTP methods
2. **Middleware** - Authentication, validation, logging
3. **Controller** - Handles HTTP requests/responses, delegates to services
4. **Service** - Contains business logic, interacts with database
5. **Response** - Consistent JSON responses with proper status codes

### Authentication & Authorization (v0.5)

The platform implements JWT-based authentication with role-based access control (RBAC):

#### Authentication Flow

1. **Login** - POST `/api/auth/login` with email/password
2. **JWT Token** - Server returns signed JWT with user info and role
3. **Protected Routes** - Include `Authorization: Bearer <token>` header
4. **Token Validation** - Middleware verifies signature and expiration

#### User Roles

- **admin** - Full system access, can manage all resources
- **instructor** - Can create and manage own courses, view enrollments
- **student** - Can enroll in courses, submit quizzes, track progress

#### Middleware

- `authenticate` - Validates JWT token, attaches user to request
- `requireRole(roles)` - Ensures user has required role(s)
- `authenticateOptional` - Allows both authenticated and public access

#### Security Features

- Bcrypt password hashing with configurable cost factor
- JWT tokens with configurable expiration (24h default)
- Role-based route protection
- Request ID tracking for audit logs
- Secure error messages (no data leakage)

### API Design (v1.3)

#### Response Format

All API responses follow a consistent structure:

```json
{
  "ok": true,
  "data": { /* response payload */ },
  "version": "v1.3",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "requestId": "req_abc123"
}
```

Error responses:

```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": { /* field-specific errors */ }
  },
  "version": "v1.3",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "requestId": "req_abc123"
}
```

#### HTTP Status Codes

- **200** - Success (GET, PUT operations)
- **201** - Created (POST operations)
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate resource)
- **500** - Internal Server Error (logged for debugging)

#### Pagination

List endpoints support pagination with consistent parameters:

```
GET /api/courses?page=1&limit=10&search=javascript
```

Response includes pagination metadata:

```json
{
  "ok": true,
  "data": {
    "courses": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

## Modules

### Authentication (v0.5)

Complete JWT-based authentication system with role-based access control.

#### Endpoints

- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/register` - User registration (students only)

#### Features

- Secure password hashing with bcrypt
- JWT tokens with configurable expiration
- Role-based access control (admin, instructor, student)
- Input validation and sanitization
- Comprehensive error handling

### Users (v0.6)

User management with role-based operations and profile management.

#### Endpoints

- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

#### Features

- Role-based user creation and management
- Profile updates with ownership verification
- Email uniqueness enforcement
- Secure password updates
- Admin-only user deletion

### Courses (v0.7)

Complete course management with publishing workflow and role-based access.

#### Endpoints

- `GET /api/courses` - List courses with search and pagination
- `POST /api/courses` - Create course (instructor/admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (owner/admin)
- `DELETE /api/courses/:id` - Delete course (admin only)
- `POST /api/courses/:id/publish` - Publish course
- `POST /api/courses/:id/unpublish` - Unpublish course

#### Features

- Role-based course creation and management
- Publishing workflow for course lifecycle
- Search functionality across title and description
- Pagination with configurable limits
- Price normalization (dollars to cents)
- Ownership-based authorization

### Lessons (v0.8)

Lesson management with automatic positioning and atomic reordering.

#### Endpoints

- `POST /api/courses/:courseId/lessons` - Create lesson
- `GET /api/courses/:courseId/lessons` - List course lessons
- `PATCH /api/courses/:courseId/lessons/reorder` - Reorder lessons
- `GET /api/lessons/:id` - Get lesson details
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson

#### Features

- Automatic position management (dense 1..N sequence)
- Atomic reordering with validation
- Markdown content support
- Video URL validation
- Role-based access control
- Visibility rules based on course publishing status

### Enrollments (v0.9)

Student enrollment management with status tracking and duplicate prevention.

#### Endpoints

- `POST /api/enrollments` - Enroll in course (students)
- `GET /api/enrollments/me` - Get user's enrollments
- `PUT /api/enrollments/:id/status` - Update enrollment status (admin)
- `GET /api/courses/:courseId/enrollments` - List course enrollments (instructor/admin)

#### Features

- One enrollment per (user, course) pair
- Published course requirement for enrollment
- Status management (active, completed, refunded)
- Role-based access to enrollment data
- Instructor can view own course enrollments

### Quizzes (v1.0)

Comprehensive quiz system with multiple-choice questions and automatic scoring.

#### Endpoints

- `POST /api/courses/:courseId/quizzes` - Create quiz
- `GET /api/courses/:courseId/quizzes` - List course quizzes
- `GET /api/quizzes/:id` - Get quiz with questions
- `POST /api/quizzes/:id/submit` - Submit quiz answers
- `GET /api/quizzes/:id/submissions/me` - Get latest submission
- `GET /api/quizzes/:id/submissions` - List all submissions (instructor/admin)
- `POST /api/quizzes/:quizId/questions` - Create question
- `PUT /api/quizzes/:quizId/questions/:questionId` - Update question
- `DELETE /api/quizzes/:quizId/questions/:questionId` - Delete question

#### Features

- Multiple-choice questions with configurable choices
- Automatic scoring with immediate feedback
- Multiple attempts support (all stored)
- Role-based question management
- Student enrollment verification for submissions
- Correct answers hidden from student responses

### Progress (v1.1)

Progress tracking system for lesson completion and course progress calculation.

#### Endpoints

- `POST /api/progress/complete` - Mark lesson complete/incomplete
- `GET /api/progress/me?courseId=...` - Get user's course progress
- `GET /api/courses/:courseId/progress` - Get course progress aggregate (instructor/admin)

#### Features

- Lesson-level completion tracking
- Automatic progress percentage calculation
- Idempotent operations (safe to retry)
- Role-based progress viewing
- Integration with enrollments system
- Support for course completion certificates

### Certificates (v1.2)

Certificate generation system for course completion with unique verification codes.

#### Endpoints

- `POST /api/certificates/generate` - Generate certificate for completed course
- `GET /api/certificates/me` - Get user's certificates
- `GET /api/certificates/:code/verify` - Verify certificate by code (public)
- `GET /api/certificates/course/:courseId` - List course certificates (instructor/admin)

#### Features

- Automatic certificate generation for 100% course completion
- Unique verification codes for authenticity
- Public certificate verification
- Role-based certificate management
- Integration with progress tracking system
- Duplicate prevention (one certificate per user per course)

### Notifications (v1.3)

Event-driven notifications system using outbox pattern for reliable delivery.

#### Endpoints

- `GET /api/notifications/health` - Worker status and metrics

#### Features

- Outbox pattern for reliable event processing
- Background worker with configurable polling
- Console and file sink support
- Event hooks for enrollment and certificate generation
- Batch processing with transactional consistency
- Health monitoring and metrics

## Development

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env`
4. Start database: `docker compose up -d`
5. Run migrations: `npm run migrate:up`
6. Start development server: `npm run dev`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server (requires build first)
- `npm run clean` - Remove build artifacts/learnlite

## Authentication Endpoints

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "student"  // Optional, admin-only. Defaults to "student"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "User registered successfully",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "name": "User Name",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "version": "v0.6"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "name": "User Name",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "version": "v0.6"
}
```

#### Get Current User Profile
```bash
GET /api/auth/me
Authorization: Bearer <your-jwt-token>
```

### Using Authentication

#### Include JWT Token in Requests
```bash
curl -H "Authorization: Bearer <your-jwt-token>" http://localhost:4000/api/users
```

#### Example Authentication Flow
```bash
# 1. Register a new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'

# 2. Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 3. Use token to access protected endpoints
curl -H "Authorization: Bearer <token-from-login>" http://localhost:4000/api/auth/me
```

### Role-Based Access Control

#### Role Hierarchy
- **admin**: Full access to all resources
- **instructor**: Can create and manage courses, lessons, quizzes
- **student**: Can enroll in courses, track progress, take quizzes

#### Protected Endpoints Examples

**Users Management (Admin Only):**
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `DELETE /api/users/:id` - Delete user

**Course Management:**
- `GET /api/courses` - Public access (browse courses)
- `POST /api/courses` - Instructors and admins only
- `PUT /api/courses/:id` - Instructors and admins only
- `DELETE /api/courses/:id` - Admins only

#### Authentication Errors

**401 Unauthorized** - Missing or invalid token:
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header. Expected: Bearer <token>",
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

**403 Forbidden** - Insufficient permissions:
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required role(s): admin. Your role: student",
    "requestId": "uuid",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Middleware Components

#### `authenticate()`
- Validates JWT tokens from `Authorization: Bearer <token>` header
- Attaches `req.user` with `{id, email, role}` for authenticated requests
- Returns 401 for invalid/missing tokens

#### `requireRole(...roles)`
- Must be used after `authenticate()` middleware
- Checks if `req.user.role` matches allowed roles
- Returns 403 for insufficient permissions

#### Usage in Routes
```typescript
// Require authentication
router.use(authenticate);

// Require specific role(s)
router.get('/admin-only', requireRole('admin'), controller.adminAction);
router.post('/instructors', requireRole('instructor', 'admin'), controller.create);
```

## Courses Module (v0.7)

### Overview

The Courses module provides complete CRUD functionality for course management with role-based access control, pagination, search, and publishing workflow.

### Course Management Features

#### Role-Based Access
- **Public/Students**: Can browse and search published courses only
- **Instructors**: Can create, edit, publish/unpublish their own courses
- **Admins**: Full access to all courses, can assign instructors

#### Course Lifecycle
1. **Creation**: Instructors create courses (unpublished by default)
2. **Editing**: Update title, description, price
3. **Publishing**: Make courses visible to public
4. **Management**: Ongoing updates and status changes

### API Endpoints

#### List Courses
```bash
GET /api/courses?page=1&limit=10&q=search

# Public access - only published courses
# Instructor access - only their courses
# Admin access - all courses
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "title": "Introduction to Web Development",
      "description": "Learn web development fundamentals...",
      "price_cents": 4999,
      "published": true,
      "instructor_id": 2,
      "created_at": "2024-01-01T00:00:00.000Z",
      "instructor": {
        "id": 2,
        "name": "John Instructor"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "version": "v0.7"
}
```

#### Create Course
```bash
POST /api/courses
Authorization: Bearer <instructor-or-admin-token>
Content-Type: application/json

{
  "title": "Advanced JavaScript",
  "description": "Learn advanced JS concepts",
  "price_cents": 5999,
  "instructor_id": 3  // Admin only - optional
}
```

#### Get Course Details
```bash
GET /api/courses/:id

# Public access for published courses
# Owner/admin access for unpublished courses
```

#### Update Course
```bash
PUT /api/courses/:id
Authorization: Bearer <owner-instructor-or-admin-token>
Content-Type: application/json

{
  "title": "Updated Course Title",
  "description": "Updated description",
  "price_cents": 6999,
  "instructor_id": 4  // Admin only
}
```

#### Publish/Unpublish Course
```bash
# Publish course
POST /api/courses/:id/publish
Authorization: Bearer <owner-instructor-or-admin-token>

# Unpublish course
POST /api/courses/:id/unpublish
Authorization: Bearer <owner-instructor-or-admin-token>
```

#### Delete Course
```bash
DELETE /api/courses/:id
Authorization: Bearer <admin-token>

# Admin only operation
```

### Validation Rules

#### Course Creation/Update
- **Title**: Required, non-empty, max 255 characters
- **Description**: Optional string
- **Price**: Required, non-negative number (auto-converted to cents)
- **Instructor ID**: Admin only, must be valid user ID

#### Price Handling
```javascript
// Automatic conversion to cents
"price_cents": 29.99  → 2999 cents
"price_cents": 2999   → 2999 cents (already in cents)
"price_cents": "29.99" → 2999 cents (string conversion)
```

### Search and Pagination

#### Search Parameters
- **q**: Search query (searches title and description with ILIKE)
- **page**: Page number (default: 1)
- **limit**: Items per page (default: 10, max: 100)

#### Example Requests
```bash
# Search for JavaScript courses
GET /api/courses?q=javascript

# Paginated results
GET /api/courses?page=2&limit=5

# Combined search and pagination
GET /api/courses?q=web&page=1&limit=20
```

### Ownership and Permissions

#### Instructor Permissions
- Create courses (automatically assigned as instructor)
- Edit own courses (title, description, price)
- Publish/unpublish own courses
- View own courses (all statuses)

#### Admin Permissions
- Create courses for any instructor
- Edit any course (including instructor assignment)
- Publish/unpublish any course
- Delete any course
- View all courses

#### Student/Public Permissions
- Browse published courses only
- Search published courses
- View published course details

### Example Usage Flow

```bash
# 1. Instructor creates a course
curl -X POST http://localhost:4000/api/courses \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "React Fundamentals", "description": "Learn React", "price_cents": 3999}'

# 2. Update course details
curl -X PUT http://localhost:4000/api/courses/1 \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"description": "Complete React course with hooks"}'

# 3. Publish course
curl -X POST http://localhost:4000/api/courses/1/publish \
  -H "Authorization: Bearer <instructor-token>"

# 4. Public can now see the course
curl http://localhost:4000/api/courses?q=react
```

## Lessons Module (v0.8)

### Overview

The Lessons module provides comprehensive lesson management within courses, including creation, ordering, and role-aware visibility controls. Lessons support markdown content and optional video URLs.

### Key Features

#### Lesson Management
- Create lessons with title, content (markdown), and optional video URL
- Automatic position management (dense 1..N sequence per course)
- Atomic reordering with position persistence
- Automatic gap closing on deletion

#### Role-Based Access Control
- **Public/Students**: View lessons only for published courses
- **Instructors**: Full CRUD on lessons for their own courses
- **Admins**: Full CRUD on lessons for any course

### API Endpoints

#### Create Lesson
```bash
POST /api/courses/:courseId/lessons
Authorization: Bearer <instructor-or-admin-token>

{
  "title": "Introduction to HTML",
  "content_md": "# HTML Basics\n\nHTML is the foundation...",
  "video_url": "https://youtube.com/watch?v=...",
  "position": 1  # Optional, appends to end if not provided
}
```

#### List Course Lessons
```bash
GET /api/courses/:courseId/lessons

# Returns lessons ordered by position
# Public can view if course is published
# Instructors can view their own course lessons
# Admins can view any course lessons
```

#### Get Lesson Details
```bash
GET /api/lessons/:id

# Same visibility rules as listing
```

#### Update Lesson
```bash
PUT /api/lessons/:id
Authorization: Bearer <instructor-or-admin-token>

{
  "title": "Updated Title",
  "content_md": "Updated content...",
  "video_url": "https://new-video-url.com"
}
```

#### Reorder Lessons
```bash
PATCH /api/courses/:courseId/lessons/reorder
Authorization: Bearer <instructor-or-admin-token>

{
  "lessonIds": [3, 1, 2, 4]  # New order of lesson IDs
}

# Atomically updates all positions
# Returns reordered lesson list
```

#### Delete Lesson
```bash
DELETE /api/lessons/:id
Authorization: Bearer <instructor-or-admin-token>

# Deletes lesson and re-compacts positions (no gaps)
```

### Position Management

#### Automatic Positioning
- New lessons without position are appended to end
- Positions are maintained as dense sequence (1, 2, 3, ...)
- No gaps allowed in position sequence

#### Reordering Rules
- Must provide ALL lesson IDs for the course
- IDs must match exactly (no missing, no extras)
- Atomic operation - all or nothing
- Returns new ordered list on success

### Visibility Rules

#### Published Courses
- Public and students can view lessons
- Ordered by position ascending

#### Unpublished Courses
- Only instructor owner and admins can view
- Useful for course preparation

### Validation

#### Lesson Data
- **Title**: Required, non-empty, max 255 characters
- **Content**: Optional markdown text
- **Video URL**: Optional, must be valid HTTP/HTTPS URL
- **Position**: Optional positive integer

#### Reorder Validation
- Array of lesson IDs required
- No duplicates allowed
- All IDs must belong to the course
- Count must match current lesson count

### Example Workflow

```bash
# 1. Create course lessons
curl -X POST http://localhost:4000/api/courses/1/lessons \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started",
    "content_md": "# Welcome\n\nLet'\''s begin...",
    "video_url": "https://youtube.com/watch?v=abc123"
  }'

# 2. Add more lessons (auto-positioned)
curl -X POST http://localhost:4000/api/courses/1/lessons \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Advanced Topics", "content_md": "## Deep Dive..."}'

# 3. List lessons (ordered by position)
curl http://localhost:4000/api/courses/1/lessons

# 4. Reorder lessons
curl -X PATCH http://localhost:4000/api/courses/1/lessons/reorder \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"lessonIds": [2, 1]}'

# 5. Update lesson content
curl -X PUT http://localhost:4000/api/lessons/1 \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"content_md": "# Updated Content\n\nNew material..."}'

# 6. Delete lesson (positions auto-compact)
curl -X DELETE http://localhost:4000/api/lessons/2 \
  -H "Authorization: Bearer <instructor-token>"
```

### Error Handling

#### Common Errors
- **403 Forbidden**: Instructor trying to modify another instructor's course lessons
- **404 Not Found**: Course or lesson doesn't exist
- **400 Bad Request**: Invalid reorder IDs or validation failure
- **401 Unauthorized**: Missing or invalid authentication

### Database Schema

```sql
lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  video_url TEXT,
  content_md TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Indexes for performance
CREATE INDEX ON lessons(course_id);
CREATE INDEX ON lessons(course_id, position);
```

## Enrollments Module (v0.9)

### Overview
The Enrollments module enables students to enroll in courses and provides instructors/admins with visibility into course enrollments. It includes role-based access control and enrollment status management.

### API Endpoints

#### Enroll in Course
```bash
POST /api/enrollments
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "courseId": 1
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "user_id": 3,
    "course_id": 1,
    "status": "active",
    "created_at": "2024-01-15T10:00:00.000Z"
  },
  "version": "v0.9"
}
```

#### Get My Enrollments
```bash
GET /api/enrollments/me?page=1&limit=10
Authorization: Bearer <user-token>
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "course_id": 1,
      "status": "active",
      "created_at": "2024-01-15T10:00:00.000Z",
      "course": {
        "id": 1,
        "title": "Introduction to Web Development",
        "description": "Learn web development fundamentals...",
        "published": true,
        "price_cents": 4999,
        "instructor_id": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "version": "v0.9"
}
```

#### Get Course Enrollments
```bash
GET /api/courses/:courseId/enrollments?page=1&limit=10
Authorization: Bearer <instructor-or-admin-token>

# Instructors can only view enrollments for their own courses
# Admins can view enrollments for any course
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "course_id": 1,
      "status": "active",
      "created_at": "2024-01-15T10:00:00.000Z",
      "student": {
        "id": 3,
        "name": "Alice Student",
        "email": "alice@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "version": "v0.9"
}
```

#### Update Enrollment Status
```bash
PUT /api/enrollments/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "completed"  // or "active" or "refunded"
}
```

### Business Rules

#### Enrollment Creation
- Only students can enroll themselves
- Course must be published
- One active enrollment per (user, course) pair
- Duplicate enrollment attempts return 409 Conflict
- Default status is "active"

#### Visibility Rules
- Students can only view their own enrollments
- Instructors can view enrollments for their courses only
- Admins can view all enrollments

#### Status Management
- Only admins can update enrollment status
- Valid statuses: `active`, `completed`, `refunded`
- Status changes are tracked with timestamps

### Validation

#### Enrollment Data
- **Course ID**: Required positive integer
- **Status**: Must be one of: active, completed, refunded

#### Pagination
- **Page**: Default 1, must be positive
- **Limit**: Default 10, max 100

### Error Responses

#### Common Errors
- **400 Bad Request**: Invalid course ID or validation failure
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Course not found
- **409 Conflict**: Already enrolled in course

### Example Workflow

```bash
# 1. Student browses published courses
curl http://localhost:4000/api/courses

# 2. Student enrolls in a course
curl -X POST http://localhost:4000/api/enrollments \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}'

# 3. Student views their enrollments
curl http://localhost:4000/api/enrollments/me \
  -H "Authorization: Bearer <student-token>"

# 4. Instructor views course enrollments
curl http://localhost:4000/api/courses/1/enrollments \
  -H "Authorization: Bearer <instructor-token>"

# 5. Admin updates enrollment status
curl -X PUT http://localhost:4000/api/enrollments/1/status \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### Database Schema

```sql
enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'refunded')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
)

-- Indexes for performance
CREATE INDEX ON enrollments(user_id);
CREATE INDEX ON enrollments(course_id);
```

## Quizzes Module (v1.0)

### Overview
The Quizzes module provides course-level assessments with multiple-choice questions, automatic scoring, and submission tracking. Instructors can create quizzes with questions, and enrolled students can take quizzes and receive immediate feedback.

### API Endpoints

#### Create Quiz for Course
```bash
POST /api/courses/:courseId/quizzes
Authorization: Bearer <instructor-or-admin-token>
Content-Type: application/json

{
  "title": "Module 1 Quiz"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "course_id": 1,
    "title": "Module 1 Quiz",
    "created_at": "2024-01-20T10:00:00.000Z"
  },
  "version": "v1.0"
}
```

#### List Course Quizzes
```bash
GET /api/courses/:courseId/quizzes
Authorization: Optional

# Public/students see quizzes for published courses only
# Instructors/admins see all quizzes for their courses
```

#### Get Quiz Details
```bash
GET /api/quizzes/:id
Authorization: Optional

# Students don't see correct_index in questions
# Instructors/admins see full question data
```

**Student Response:**
```json
{
  "ok": true,
  "data": {
    "quiz": {
      "id": 1,
      "course_id": 1,
      "title": "Module 1 Quiz",
      "created_at": "2024-01-20T10:00:00.000Z"
    },
    "questions": [
      {
        "id": 1,
        "quiz_id": 1,
        "prompt": "What is React?",
        "choices": ["A library", "A framework", "A language", "A database"],
        "created_at": "2024-01-20T10:05:00.000Z"
      }
    ]
  },
  "version": "v1.0"
}
```

#### Create Quiz Question
```bash
POST /api/quizzes/:quizId/questions
Authorization: Bearer <instructor-or-admin-token>
Content-Type: application/json

{
  "prompt": "What is React?",
  "choices": ["A library", "A framework", "A language", "A database"],
  "correct_index": 0
}
```

#### Update Quiz Question
```bash
PUT /api/quizzes/:quizId/questions/:questionId
Authorization: Bearer <instructor-or-admin-token>
Content-Type: application/json

{
  "prompt": "What is React primarily used for?",
  "choices": ["Building UIs", "Database management", "Server programming", "Machine learning"],
  "correct_index": 0
}
```

#### Delete Quiz Question
```bash
DELETE /api/quizzes/:quizId/questions/:questionId
Authorization: Bearer <instructor-or-admin-token>
```

#### Submit Quiz
```bash
POST /api/quizzes/:id/submit
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "answers": [0, 2, 1, 3]  // Answer indices for each question
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "total": 4,
    "correct": 3,
    "score": 75,
    "questions": [
      { "id": 1, "correct": true },
      { "id": 2, "correct": true },
      { "id": 3, "correct": false },
      { "id": 4, "correct": true }
    ]
  },
  "version": "v1.0"
}
```

#### Get My Latest Submission
```bash
GET /api/quizzes/:id/submissions/me
Authorization: Bearer <student-token>
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "quiz_id": 1,
    "user_id": 3,
    "answers": [0, 2, 1, 3],
    "score": "75.00",
    "created_at": "2024-01-20T11:00:00.000Z"
  },
  "version": "v1.0"
}
```

#### List All Submissions (Instructor/Admin)
```bash
GET /api/quizzes/:id/submissions
Authorization: Bearer <instructor-or-admin-token>
```

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 3,
        "name": "Alice Student",
        "email": "alice@example.com"
      },
      "score": 75,
      "answers": [0, 2, 1, 3],
      "created_at": "2024-01-20T11:00:00.000Z"
    }
  ],
  "version": "v1.0"
}
```

### Business Rules

#### Quiz Management
- Instructors can only create/manage quizzes for their own courses
- Admins can manage quizzes for any course
- Quiz titles must be non-empty and max 255 characters

#### Question Management
- Questions require a prompt (non-empty string)
- Choices must be an array of at least 2 strings
- correct_index must be within the valid range of choices
- Only course owner or admin can add/edit/delete questions

#### Quiz Submission
- Students must be enrolled in the course to submit
- Course must be published for students to submit
- Multiple attempts are allowed (all stored)
- GET /submissions/me returns the latest attempt
- Score is calculated as (correct answers / total questions) * 100

#### Visibility Rules
- Public/students see quizzes only for published courses
- Students never see correct_index in question data
- Instructors see all quizzes for their courses
- Admins see all quizzes
- Only instructors/admins can view all submissions

### Validation

#### Quiz Data
- **Title**: Required, non-empty string, max 255 characters

#### Question Data
- **Prompt**: Required, non-empty string
- **Choices**: Array of at least 2 non-empty strings
- **Correct Index**: Integer between 0 and choices.length - 1

#### Submission Data
- **Answers**: Array of integers matching question count
- Each answer must be a non-negative integer

### Error Responses

#### Common Errors
- **400 Bad Request**: Invalid data or validation failure
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions or not enrolled
- **404 Not Found**: Quiz, question, or course not found
- **409 Conflict**: Duplicate submission (if implemented)

### Example Workflow

```bash
# 1. Instructor creates a quiz for their course
curl -X POST http://localhost:4000/api/courses/1/quizzes \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Module 1 Quiz"}'

# 2. Instructor adds questions to the quiz
curl -X POST http://localhost:4000/api/quizzes/1/questions \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is React?",
    "choices": ["A library", "A framework", "A language", "A database"],
    "correct_index": 0
  }'

# 3. Student views quiz (enrolled in published course)
curl http://localhost:4000/api/quizzes/1 \
  -H "Authorization: Bearer <student-token>"

# 4. Student submits quiz answers
curl -X POST http://localhost:4000/api/quizzes/1/submit \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"answers": [0, 2, 1]}'

# 5. Student checks their submission
curl http://localhost:4000/api/quizzes/1/submissions/me \
  -H "Authorization: Bearer <student-token>"

# 6. Instructor views all submissions
curl http://localhost:4000/api/quizzes/1/submissions \
  -H "Authorization: Bearer <instructor-token>"
```

### Database Schema

```sql
quizzes (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

quiz_questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

quiz_submissions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Indexes for performance
CREATE INDEX ON quizzes(course_id);
CREATE INDEX ON quiz_questions(quiz_id);
CREATE INDEX ON quiz_submissions(quiz_id);
CREATE INDEX ON quiz_submissions(user_id);
```

## Progress Module (v1.1)

### Overview
The Progress module tracks per-lesson completion for enrolled students, enabling progress percentage calculations and future certificate eligibility. Students can mark lessons as complete/incomplete, view their progress, and instructors can see aggregated course progress.

### Features
- **Lesson Completion Tracking**: Students mark lessons as complete/incomplete
- **Progress Calculation**: Automatic percentage calculation based on completed lessons
- **Idempotent Operations**: Marking completion multiple times is safe
- **Role-Based Access**: Students see own progress, instructors see course aggregates
- **Course Progress Overview**: Instructors view all students' progress in their courses

### API Endpoints

#### Progress Management

##### Mark Lesson Complete/Incomplete
```http
POST /api/progress/complete
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "enrollmentId": 1,
  "lessonId": 2,
  "completed": true
}

Response:
{
  "ok": true,
  "data": {
    "id": 1,
    "enrollmentId": 1,
    "lessonId": 2,
    "completed": true,
    "completedAt": "2024-01-21T10:30:00Z",
    "createdAt": "2024-01-21T10:30:00Z",
    "updatedAt": "2024-01-21T10:30:00Z"
  },
  "version": "v1.1"
}
```

##### Get My Progress for a Course
```http
GET /api/progress/me?courseId=1
Authorization: Bearer <student-token>

Response:
{
  "ok": true,
  "data": {
    "lessonsCompleted": 3,
    "totalLessons": 5,
    "percent": 60,
    "lessons": [
      {
        "lessonId": 1,
        "lessonTitle": "Introduction",
        "position": 1,
        "completed": true,
        "completed_at": "2024-01-20T09:00:00Z"
      },
      {
        "lessonId": 2,
        "lessonTitle": "Getting Started",
        "position": 2,
        "completed": true,
        "completed_at": "2024-01-20T10:00:00Z"
      },
      {
        "lessonId": 3,
        "lessonTitle": "Advanced Topics",
        "position": 3,
        "completed": false,
        "completed_at": null
      }
    ]
  },
  "version": "v1.1"
}
```

##### Get Course Progress (Instructor/Admin)
```http
GET /api/courses/:courseId/progress
Authorization: Bearer <instructor-token>

Response:
{
  "ok": true,
  "data": [
    {
      "user": {
        "id": 3,
        "name": "Alice Student",
        "email": "alice@example.com"
      },
      "completedCount": 4,
      "totalLessons": 5,
      "percent": 80
    },
    {
      "user": {
        "id": 4,
        "name": "Bob Learner",
        "email": "bob@example.com"
      },
      "completedCount": 2,
      "totalLessons": 5,
      "percent": 40
    }
  ],
  "count": 2,
  "version": "v1.1"
}
```

### Business Rules

#### Progress Tracking
- Students can only mark progress for their own enrollments
- Lesson must belong to the enrolled course
- Completed status can be toggled (true/false)
- First completion sets `completed_at` timestamp
- Marking incomplete clears `completed_at`

#### Access Control
- **Students**: Can mark/view own progress only
- **Instructors**: Can view aggregate progress for own courses
- **Admins**: Can view aggregate progress for any course
- Students can view progress regardless of course publish state

#### Validation
- Enrollment ID must exist and belong to the authenticated user
- Lesson ID must belong to the enrollment's course
- Cross-course lesson marking is prevented
- Completed flag must be boolean

### Usage Examples

```bash
# 1. Student marks lesson as complete
curl -X POST http://localhost:4000/api/progress/complete \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 2,
    "completed": true
  }'

# 2. Student checks their progress for a course
curl http://localhost:4000/api/progress/me?courseId=1 \
  -H "Authorization: Bearer <student-token>"

# 3. Student marks lesson as incomplete (changed mind)
curl -X POST http://localhost:4000/api/progress/complete \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 2,
    "completed": false
  }'

# 4. Instructor views all students' progress in their course
curl http://localhost:4000/api/courses/1/progress \
  -H "Authorization: Bearer <instructor-token>"
```

### Database Schema

```sql
lesson_progress (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, lesson_id)
)

-- Index for performance
CREATE INDEX ON lesson_progress(enrollment_id);
```

### Integration Notes

- Progress percentage is calculated as: `(completed_lessons / total_lessons) * 100`
- Progress data is used for certificate eligibility (100% completion required)
- Idempotent operations ensure safe retry behavior
- Unique constraint prevents duplicate progress records
- CASCADE delete maintains referential integrity

## Notifications Module (v1.3)

The notifications module implements an **outbox pattern** for reliable async event processing. Events are written to the `outbox_events` table and processed by a background worker.

### Configuration

Add these environment variables to your `.env` file:

```bash
# Enable/disable the notifications worker
NOTIFICATIONS_ENABLED=true

# Where to send notifications: 'console' or 'file'
# If 'file', notifications will be written to var/notifications.log
NOTIFICATIONS_SINK=console
```

### How It Works

1. **Event Publishing**: Key actions (like enrollment creation) publish events to the outbox
2. **Background Worker**: Polls every 5 seconds for unprocessed events
3. **Processing**: Events are logged (console or file) and marked as processed
4. **Graceful Shutdown**: Worker stops cleanly on SIGINT/SIGTERM

### Supported Events

- `enrollment.created` - Triggered when a student enrolls in a course
- `certificate.issued` - (Future) Triggered when a certificate is issued

### API Endpoints

```bash
# Check notifications worker health
curl http://localhost:4000/api/notifications/health
```

Response shows worker status:
```json
{
  "ok": true,
  "version": "v1.3",
  "enabled": true,
  "interval": 5000,
  "lastRunAt": "2025-01-21T15:30:45.123Z",
  "pendingEstimate": 3,
  "sink": "console"
}
```

### Monitoring

- **Console sink**: Events appear in server logs with 📨 prefix
- **File sink**: Events written as JSONL to `var/notifications.log`
- **Database**: Check `outbox_events` table for event history

### Example Event Flow

1. Student enrolls in a course
2. Event published to outbox: `enrollment.created`
3. Worker picks up event within 5 seconds
4. Event logged/saved and marked as processed

### Database Schema

The outbox_events table (created in migrations):
```sql
outbox_events (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Certificates Module (v1.2)

### Overview
The Certificates module enables course completion certificates with eligibility checking, issuance by instructors/admins, self-claiming by students, and public verification via unique codes. Certificates are automatically issued when students complete all course requirements.

### Features
- **Eligibility Checking**: Validates enrollment and completion before issuance
- **Instructor Issuance**: Instructors can issue certificates to eligible students
- **Student Self-Claim**: Students can claim their own certificates when eligible
- **Public Verification**: Anyone can verify a certificate using its unique code
- **Event Publishing**: Publishes `certificate.issued` events to the outbox
- **Duplicate Prevention**: One certificate per (user, course) pair enforced

### API Endpoints

#### Certificate Management

##### Issue Certificate (Instructor/Admin)
```http
POST /api/certificates/issue
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "userId": 3,
  "courseId": 1
}

Response:
{
  "ok": true,
  "data": {
    "id": 1,
    "userId": 3,
    "courseId": 1,
    "code": "CERT-A1B2C3-D4E5F6",
    "issuedAt": "2024-01-21T14:30:00Z"
  },
  "version": "v1.2"
}
```

##### Claim Certificate (Student)
```http
POST /api/certificates/claim
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "courseId": 1
}

Response:
{
  "ok": true,
  "data": {
    "id": 2,
    "courseId": 1,
    "code": "CERT-G7H8I9-J0K1L2",
    "issuedAt": "2024-01-21T15:00:00Z"
  },
  "version": "v1.2"
}
```

##### Get My Certificates
```http
GET /api/certificates/me
Authorization: Bearer <student-token>

Response:
{
  "ok": true,
  "data": [
    {
      "course": {
        "id": 1,
        "title": "Introduction to Web Development"
      },
      "code": "CERT-G7H8I9-J0K1L2",
      "issued_at": "2024-01-21T15:00:00Z"
    }
  ],
  "count": 1,
  "version": "v1.2"
}
```

##### Get Course Certificates (Instructor/Admin)
```http
GET /api/courses/:courseId/certificates
Authorization: Bearer <instructor-token>

Response:
{
  "ok": true,
  "data": [
    {
      "user": {
        "id": 3,
        "name": "Jane Student",
        "email": "jane@example.com"
      },
      "code": "CERT-A1B2C3-D4E5F6",
      "issued_at": "2024-01-21T14:30:00Z"
    }
  ],
  "count": 1,
  "version": "v1.2"
}
```

##### Verify Certificate (Public)
```http
GET /api/certificates/CERT-A1B2C3-D4E5F6

Response (Valid):
{
  "ok": true,
  "valid": true,
  "user": {
    "name": "Jane Student"
  },
  "course": {
    "title": "Introduction to Web Development"
  },
  "issued_at": "2024-01-21T14:30:00Z",
  "version": "v1.2"
}

Response (Invalid):
{
  "ok": true,
  "valid": false,
  "version": "v1.2"
}
```

### Eligibility Rules

A certificate can be issued when:
1. **Active Enrollment**: User has an active enrollment in the course
2. **Completion Criteria** (one of):
   - All lessons completed (100% progress via lesson_progress table)
   - Enrollment status is 'completed'
3. **No Duplicate**: No existing certificate for the same (user, course) pair

### Business Rules

#### Issuance
- Instructors can only issue certificates for their own courses
- Admins can issue certificates for any course
- Eligibility is checked before issuance
- Duplicate certificates are prevented (409 Conflict)

#### Claiming
- Students can only claim certificates for courses they're enrolled in
- Must meet eligibility requirements
- Self-service when requirements are met

#### Verification
- Public endpoint (no authentication required)
- Returns minimal information (no emails)
- Invalid codes return `valid: false`
- Consistent response format for security

### Certificate Code Format

Codes are generated in the format: `CERT-XXXXXX-XXXXXX`
- 12 random characters (base64url)
- URL-safe and unique
- Easy to share and verify

### Event Integration

When a certificate is issued (via issue or claim), an event is published:
```javascript
{
  topic: "certificate.issued",
  payload: {
    certificateId: 1,
    userId: 3,
    courseId: 1,
    code: "CERT-A1B2C3-D4E5F6"
  }
}
```

This event is processed by the notifications worker if enabled.

### Usage Examples

```bash
# 1. Instructor issues certificate to eligible student
curl -X POST http://localhost:4000/api/certificates/issue \
  -H "Authorization: Bearer <instructor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 3,
    "courseId": 1
  }'

# 2. Student claims their own certificate
curl -X POST http://localhost:4000/api/certificates/claim \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}'

# 3. Student views their certificates
curl http://localhost:4000/api/certificates/me \
  -H "Authorization: Bearer <student-token>"

# 4. Instructor views all certificates for their course
curl http://localhost:4000/api/courses/1/certificates \
  -H "Authorization: Bearer <instructor-token>"

# 5. Public verification of certificate
curl http://localhost:4000/api/certificates/CERT-A1B2C3-D4E5F6
```

### Database Schema

```sql
certificates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  code VARCHAR(100) UNIQUE NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
)

-- Indexes for performance
CREATE INDEX ON certificates(user_id);
CREATE INDEX ON certificates(course_id);
```

### Error Responses

- `ENROLLMENT_NOT_FOUND` - User not enrolled in the course
- `NOT_ELIGIBLE` - Eligibility requirements not met
- `ALREADY_ISSUED` - Certificate already exists for this user/course
- `NOT_OWNER` - Instructor can only issue for own courses

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server (requires build first)
- `npm run clean` - Remove build artifacts
=======
# learning-platform-monolith
Learning Platform NODEJS Back-End
>>>>>>> 867da0c9184479569b0794dc182c5c6064082810
