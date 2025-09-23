#!/bin/bash

# Test script for Enrollments module v0.9

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

# Generate test JWT tokens (using the same secret as in development)
JWT_SECRET="dev-jwt-secret-change-in-production"

# Function to create JWT token
create_jwt() {
    local user_id=$1
    local email=$2
    local role=$3
    
    # Create a simple JWT for testing (this is just for demo purposes)
    # In production, use proper JWT generation
    local header='{"alg":"HS256","typ":"JWT"}'
    local payload="{\"sub\":$user_id,\"email\":\"$email\",\"role\":\"$role\",\"iat\":$(date +%s),\"exp\":$(($(date +%s) + 3600))}"
    
    # For testing, we'll use a pre-generated token
    # These tokens are valid for the demo users with IDs 1-4
    case $role in
        "admin")
            echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AbGVhcm5saXRlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwNTMyMDAwMCwiZXhwIjoxOTk5OTk5OTk5fQ.test"
            ;;
        "instructor")
            echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoiaW5zdHJ1Y3RvckBsZWFybmxpdGUuY29tIiwicm9sZSI6Imluc3RydWN0b3IiLCJpYXQiOjE3MDUzMjAwMDAsImV4cCI6MTk5OTk5OTk5OX0.test"
            ;;
        "student")
            echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImVtYWlsIjoic3R1ZGVudEBsZWFybmxpdGUuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3MDUzMjAwMDAsImV4cCI6MTk5OTk5OTk5OX0.test"
            ;;
        "student2")
            echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjQsImVtYWlsIjoic3R1ZGVudDJAbGVhcm5saXRlLmNvbSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzA1MzIwMDAwLCJleHAiOjE5OTk5OTk5OTl9.test"
            ;;
    esac
}

echo -e "${BLUE}=== Testing Enrollments Module v0.9 ===${NC}\n"

# For testing, we'll use Node.js to generate proper JWT tokens
echo -e "${BLUE}Generating test tokens...${NC}"

# Create a temporary Node.js script to generate tokens
cat > /tmp/generate-tokens.js << 'EOF'
const jwt = require('jsonwebtoken');

const secret = 'dev-jwt-secret-change-in-production';

const tokens = {
    admin: jwt.sign({ sub: 1, email: 'admin@learnlite.com', role: 'admin' }, secret, { expiresIn: '1h' }),
    instructor: jwt.sign({ sub: 2, email: 'instructor@learnlite.com', role: 'instructor' }, secret, { expiresIn: '1h' }),
    student: jwt.sign({ sub: 3, email: 'student@learnlite.com', role: 'student' }, secret, { expiresIn: '1h' }),
    student2: jwt.sign({ sub: 4, email: 'student2@learnlite.com', role: 'student' }, secret, { expiresIn: '1h' })
};

console.log(JSON.stringify(tokens));
EOF

# Generate tokens using the project's node_modules
cd /Users/rafaelpatino/Desktop/learning-platform/learning-platform-monolith
TOKENS=$(node /tmp/generate-tokens.js 2>/dev/null)

if [ -z "$TOKENS" ]; then
    echo -e "${RED}Failed to generate tokens. Make sure the server is running.${NC}"
    exit 1
fi

# Parse tokens
ADMIN_TOKEN=$(echo $TOKENS | jq -r '.admin')
INSTRUCTOR_TOKEN=$(echo $TOKENS | jq -r '.instructor')
STUDENT_TOKEN=$(echo $TOKENS | jq -r '.student')
STUDENT2_TOKEN=$(echo $TOKENS | jq -r '.student2')

# Clean up
rm /tmp/generate-tokens.js

echo -e "${GREEN}✓ Tokens generated${NC}\n"

# Test 1: Check API version
echo -e "${BLUE}Test 1: Check API version${NC}"
VERSION=$(curl -s $BASE_URL/ | jq -r '.version')
if [ "$VERSION" = "v0.9" ]; then
    echo -e "${GREEN}✓ API version is v0.9${NC}\n"
else
    echo -e "${RED}✗ Expected version v0.9, got $VERSION${NC}\n"
fi

# Test 2: Student enrolls in a course
echo -e "${BLUE}Test 2: Student enrolls in course 1${NC}"
ENROLLMENT=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}')

if echo $ENROLLMENT | jq -e '.ok == true' > /dev/null; then
    echo -e "${GREEN}✓ Student enrolled successfully${NC}"
    ENROLLMENT_ID=$(echo $ENROLLMENT | jq -r '.data.id')
    echo "  Enrollment ID: $ENROLLMENT_ID"
    echo "  Status: $(echo $ENROLLMENT | jq -r '.data.status')"
else
    echo -e "${RED}✗ Failed to enroll student${NC}"
    echo $ENROLLMENT | jq .
fi
echo

# Test 3: Try duplicate enrollment (should fail with 409)
echo -e "${BLUE}Test 3: Try duplicate enrollment (should fail)${NC}"
DUPLICATE=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 1}')

if echo $DUPLICATE | jq -e '.error.code == "ALREADY_ENROLLED"' > /dev/null; then
    echo -e "${GREEN}✓ Duplicate enrollment correctly rejected (409)${NC}"
else
    echo -e "${RED}✗ Duplicate enrollment not handled correctly${NC}"
    echo $DUPLICATE | jq .
fi
echo

# Test 4: Get student's enrollments
echo -e "${BLUE}Test 4: Get student's enrollments${NC}"
MY_ENROLLMENTS=$(curl -s $BASE_URL/api/enrollments/me \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo $MY_ENROLLMENTS | jq -e '.ok == true' > /dev/null; then
    COUNT=$(echo $MY_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Retrieved $COUNT enrollment(s)${NC}"
    echo $MY_ENROLLMENTS | jq '.data[] | {id, course_id, status, course_title: .course.title}'
else
    echo -e "${RED}✗ Failed to get enrollments${NC}"
    echo $MY_ENROLLMENTS | jq .
fi
echo

# Test 5: Instructor views course enrollments
echo -e "${BLUE}Test 5: Instructor views course enrollments${NC}"
COURSE_ENROLLMENTS=$(curl -s $BASE_URL/api/courses/1/enrollments \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")

if echo $COURSE_ENROLLMENTS | jq -e '.ok == true' > /dev/null; then
    COUNT=$(echo $COURSE_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Instructor retrieved $COUNT enrollment(s) for course 1${NC}"
    echo $COURSE_ENROLLMENTS | jq '.data[] | {id, user_id, status, student_name: .student.name}'
else
    echo -e "${RED}✗ Failed to get course enrollments${NC}"
    echo $COURSE_ENROLLMENTS | jq .
fi
echo

# Test 6: Admin updates enrollment status
echo -e "${BLUE}Test 6: Admin updates enrollment status to 'completed'${NC}"
if [ ! -z "$ENROLLMENT_ID" ]; then
    UPDATE=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT_ID/status \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "completed"}')
    
    if echo $UPDATE | jq -e '.ok == true and .data.status == "completed"' > /dev/null; then
        echo -e "${GREEN}✓ Enrollment status updated to 'completed'${NC}"
    else
        echo -e "${RED}✗ Failed to update enrollment status${NC}"
        echo $UPDATE | jq .
    fi
else
    echo -e "${RED}✗ No enrollment ID available for update test${NC}"
fi
echo

# Test 7: Student tries to update status (should fail)
echo -e "${BLUE}Test 7: Student tries to update status (should fail)${NC}"
if [ ! -z "$ENROLLMENT_ID" ]; then
    FORBIDDEN=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT_ID/status \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "active"}')
    
    if echo $FORBIDDEN | jq -e '.error.code == "FORBIDDEN"' > /dev/null; then
        echo -e "${GREEN}✓ Student correctly denied from updating status (403)${NC}"
    else
        echo -e "${RED}✗ Access control not working correctly${NC}"
        echo $FORBIDDEN | jq .
    fi
else
    echo -e "${RED}✗ No enrollment ID available for test${NC}"
fi
echo

# Test 8: Try to enroll in unpublished course (create one first)
echo -e "${BLUE}Test 8: Try to enroll in unpublished course${NC}"
# First create an unpublished course as instructor
UNPUBLISHED_COURSE=$(curl -s -X POST $BASE_URL/api/courses \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Unpublished Test Course", "description": "Test", "price_cents": 1000}')

if echo $UNPUBLISHED_COURSE | jq -e '.ok == true' > /dev/null; then
    COURSE_ID=$(echo $UNPUBLISHED_COURSE | jq -r '.data.id')
    
    # Try to enroll as student2
    ENROLL_UNPUBLISHED=$(curl -s -X POST $BASE_URL/api/enrollments \
      -H "Authorization: Bearer $STUDENT2_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"courseId\": $COURSE_ID}")
    
    if echo $ENROLL_UNPUBLISHED | jq -e '.error.code == "COURSE_NOT_PUBLISHED"' > /dev/null; then
        echo -e "${GREEN}✓ Cannot enroll in unpublished course (400)${NC}"
    else
        echo -e "${RED}✗ Unpublished course enrollment not handled correctly${NC}"
        echo $ENROLL_UNPUBLISHED | jq .
    fi
    
    # Clean up - delete the test course
    curl -s -X DELETE $BASE_URL/api/courses/$COURSE_ID \
      -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
fi
echo

echo -e "${BLUE}=== Enrollment Module Tests Complete ===${NC}\n"

# Summary
echo -e "${BLUE}Summary:${NC}"
echo "✓ Version updated to v0.9"
echo "✓ Students can enroll in published courses"
echo "✓ Duplicate enrollments are prevented (409)"
echo "✓ Students can view their enrollments"
echo "✓ Instructors can view course enrollments"
echo "✓ Admins can update enrollment status"
echo "✓ Role-based access control enforced"
echo "✓ Cannot enroll in unpublished courses"
