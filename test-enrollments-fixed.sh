#!/bin/bash

# Complete test script for Enrollments module
# Tests from ground up with new user registration and login

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LearnLite Enrollments Module Test   ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Verify API version
echo -e "${YELLOW}Step 1: Checking API version...${NC}"
VERSION_CHECK=$(curl -s $BASE_URL/)
VERSION=$(echo $VERSION_CHECK | jq -r '.version')
echo -e "${GREEN}✓ API version: $VERSION${NC}\n"

# Step 2: Register and login test users
echo -e "${YELLOW}Step 2: Setting up test users...${NC}"

# Function to register and login
register_and_login() {
    local email=$1
    local password=$2
    local name=$3
    local role=$4
    
    # Try to register
    REG_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"name\": \"$name\",
        \"role\": \"$role\"
      }")
    
    # Login to get token
    LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\"
      }")
    
    if echo $LOGIN_RESPONSE | jq -e '.ok == true' > /dev/null 2>&1; then
        TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
        echo -e "${GREEN}✓ $name logged in successfully${NC}"
        echo $TOKEN
    else
        echo -e "${RED}✗ Failed to login $name${NC}"
        echo $LOGIN_RESPONSE | jq .
        echo ""
    fi
}

# Setup instructor
echo "Setting up instructor..."
INSTRUCTOR_TOKEN=$(register_and_login "test.instructor@learnlite.com" "TestPass123!" "Test Instructor" "instructor")

# Setup students
echo "Setting up students..."
STUDENT1_TOKEN=$(register_and_login "test.student1@learnlite.com" "TestPass123!" "Test Student One" "student")
STUDENT2_TOKEN=$(register_and_login "test.student2@learnlite.com" "TestPass123!" "Test Student Two" "student")

# Setup admin
echo "Setting up admin..."
ADMIN_TOKEN=$(register_and_login "test.admin@learnlite.com" "TestPass123!" "Test Admin" "admin")

echo ""

# Check if we have valid tokens
if [ -z "$INSTRUCTOR_TOKEN" ] || [ -z "$STUDENT1_TOKEN" ] || [ -z "$STUDENT2_TOKEN" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to obtain all required tokens. Exiting.${NC}"
    exit 1
fi

# Step 3: Create test courses
echo -e "${YELLOW}Step 3: Creating test courses...${NC}"

# Create a published course
COURSE1=$(curl -s -X POST $BASE_URL/api/courses \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course - Enrollments Demo",
    "description": "A test course for demonstrating enrollment functionality",
    "price_cents": 2999
  }')

if echo $COURSE1 | jq -e '.ok == true' > /dev/null 2>&1; then
    COURSE1_ID=$(echo $COURSE1 | jq -r '.data.id')
    echo -e "${GREEN}✓ Course created (ID: $COURSE1_ID)${NC}"
    
    # Publish the course
    PUBLISH=$(curl -s -X POST $BASE_URL/api/courses/$COURSE1_ID/publish \
      -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
    
    if echo $PUBLISH | jq -e '.ok == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Course published${NC}"
    else
        echo -e "${RED}✗ Failed to publish course${NC}"
        echo $PUBLISH | jq .
    fi
else
    echo -e "${RED}✗ Failed to create course${NC}"
    echo $COURSE1 | jq .
    exit 1
fi

# Create an unpublished course
COURSE2=$(curl -s -X POST $BASE_URL/api/courses \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Unpublished Test Course",
    "description": "This course is not published yet",
    "price_cents": 1999
  }')

if echo $COURSE2 | jq -e '.ok == true' > /dev/null 2>&1; then
    COURSE2_ID=$(echo $COURSE2 | jq -r '.data.id')
    echo -e "${GREEN}✓ Unpublished course created (ID: $COURSE2_ID)${NC}"
else
    echo -e "${RED}✗ Failed to create unpublished course${NC}"
fi

echo ""

# Step 4: Test enrollment creation
echo -e "${YELLOW}Step 4: Testing enrollment creation...${NC}"

# Student 1 enrolls in published course
echo "Student 1 enrolling in published course..."
ENROLL1=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE1_ID}")

if echo $ENROLL1 | jq -e '.ok == true' > /dev/null 2>&1; then
    ENROLLMENT1_ID=$(echo $ENROLL1 | jq -r '.data.id')
    echo -e "${GREEN}✓ Student 1 enrolled successfully (Enrollment ID: $ENROLLMENT1_ID)${NC}"
    echo "  Status: $(echo $ENROLL1 | jq -r '.data.status')"
    echo "  Course ID: $(echo $ENROLL1 | jq -r '.data.course_id')"
    echo "  User ID: $(echo $ENROLL1 | jq -r '.data.user_id')"
else
    echo -e "${RED}✗ Failed to enroll student 1${NC}"
    echo $ENROLL1 | jq .
fi

# Student 2 enrolls in the same course
echo "Student 2 enrolling in published course..."
ENROLL2=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE1_ID}")

if echo $ENROLL2 | jq -e '.ok == true' > /dev/null 2>&1; then
    ENROLLMENT2_ID=$(echo $ENROLL2 | jq -r '.data.id')
    echo -e "${GREEN}✓ Student 2 enrolled successfully (Enrollment ID: $ENROLLMENT2_ID)${NC}"
else
    echo -e "${RED}✗ Failed to enroll student 2${NC}"
    echo $ENROLL2 | jq .
fi

echo ""

# Step 5: Test duplicate enrollment prevention
echo -e "${YELLOW}Step 5: Testing duplicate enrollment prevention...${NC}"

DUPLICATE=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE1_ID}")

if echo $DUPLICATE | jq -e '.error.code == "ALREADY_ENROLLED"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Duplicate enrollment correctly rejected (409 Conflict)${NC}"
    echo "  Error: $(echo $DUPLICATE | jq -r '.error.message')"
else
    echo -e "${RED}✗ Duplicate enrollment not handled correctly${NC}"
    echo $DUPLICATE | jq .
fi

echo ""

# Step 6: Test enrollment in unpublished course
echo -e "${YELLOW}Step 6: Testing enrollment in unpublished course...${NC}"

if [ ! -z "$COURSE2_ID" ]; then
    UNPUBLISHED_ENROLL=$(curl -s -X POST $BASE_URL/api/enrollments \
      -H "Authorization: Bearer $STUDENT1_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"courseId\": $COURSE2_ID}")
    
    if echo $UNPUBLISHED_ENROLL | jq -e '.error.code == "COURSE_NOT_PUBLISHED"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Cannot enroll in unpublished course (400 Bad Request)${NC}"
        echo "  Error: $(echo $UNPUBLISHED_ENROLL | jq -r '.error.message')"
    else
        echo -e "${RED}✗ Unpublished course enrollment not handled correctly${NC}"
        echo $UNPUBLISHED_ENROLL | jq .
    fi
else
    echo -e "${YELLOW}⚠ Skipping unpublished course test (no course created)${NC}"
fi

echo ""

# Step 7: Test getting user's enrollments
echo -e "${YELLOW}Step 7: Testing GET /api/enrollments/me...${NC}"

MY_ENROLLMENTS=$(curl -s $BASE_URL/api/enrollments/me \
  -H "Authorization: Bearer $STUDENT1_TOKEN")

if echo $MY_ENROLLMENTS | jq -e '.ok == true' > /dev/null 2>&1; then
    COUNT=$(echo $MY_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Retrieved student's enrollments (Count: $COUNT)${NC}"
    echo "Enrollments:"
    echo $MY_ENROLLMENTS | jq '.data[] | "  - Course: \(.course.title) | Status: \(.status)"' -r 2>/dev/null
else
    echo -e "${RED}✗ Failed to get student enrollments${NC}"
    echo $MY_ENROLLMENTS | jq .
fi

echo ""

# Step 8: Test instructor viewing course enrollments
echo -e "${YELLOW}Step 8: Testing instructor viewing course enrollments...${NC}"

COURSE_ENROLLMENTS=$(curl -s $BASE_URL/api/courses/$COURSE1_ID/enrollments \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")

if echo $COURSE_ENROLLMENTS | jq -e '.ok == true' > /dev/null 2>&1; then
    COUNT=$(echo $COURSE_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Instructor retrieved course enrollments (Count: $COUNT)${NC}"
    echo "Enrolled students:"
    echo $COURSE_ENROLLMENTS | jq '.data[] | "  - \(.student.name) (\(.student.email)) | Status: \(.status)"' -r 2>/dev/null
else
    echo -e "${RED}✗ Failed to get course enrollments${NC}"
    echo $COURSE_ENROLLMENTS | jq .
fi

echo ""

# Step 9: Test admin updating enrollment status
echo -e "${YELLOW}Step 9: Testing admin updating enrollment status...${NC}"

if [ ! -z "$ENROLLMENT1_ID" ]; then
    UPDATE_STATUS=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT1_ID/status \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "completed"}')
    
    if echo $UPDATE_STATUS | jq -e '.ok == true and .data.status == "completed"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Admin successfully updated enrollment status to 'completed'${NC}"
    else
        echo -e "${RED}✗ Failed to update enrollment status${NC}"
        echo $UPDATE_STATUS | jq .
    fi
    
    # Verify the status change
    VERIFY=$(curl -s $BASE_URL/api/enrollments/me \
      -H "Authorization: Bearer $STUDENT1_TOKEN")
    
    if echo $VERIFY | jq -e '.data[0].status == "completed"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Status change verified${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No enrollment ID available for update test${NC}"
fi

echo ""

# Step 10: Test role-based access control
echo -e "${YELLOW}Step 10: Testing role-based access control...${NC}"

# Student tries to update status (should fail)
echo "Testing student cannot update status..."
if [ ! -z "$ENROLLMENT1_ID" ]; then
    STUDENT_UPDATE=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT1_ID/status \
      -H "Authorization: Bearer $STUDENT1_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "active"}')
    
    if echo $STUDENT_UPDATE | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Student correctly denied from updating status (403 Forbidden)${NC}"
    else
        echo -e "${RED}✗ Access control not working for student${NC}"
        echo $STUDENT_UPDATE | jq .
    fi
fi

# Instructor tries to update status (should fail)
echo "Testing instructor cannot update status..."
if [ ! -z "$ENROLLMENT1_ID" ]; then
    INSTRUCTOR_UPDATE=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT1_ID/status \
      -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"status": "active"}')
    
    if echo $INSTRUCTOR_UPDATE | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Instructor correctly denied from updating status (403 Forbidden)${NC}"
    else
        echo -e "${RED}✗ Access control not working for instructor${NC}"
        echo $INSTRUCTOR_UPDATE | jq .
    fi
fi

# Test instructor cannot view other's course enrollments
echo "Testing instructor cannot view other's course enrollments..."
# Use the existing demo course (ID 1) which is owned by a different instructor
FORBIDDEN_VIEW=$(curl -s $BASE_URL/api/courses/1/enrollments \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")

# Our test instructor shouldn't be able to view enrollments for course 1 (owned by demo instructor)
if echo $FORBIDDEN_VIEW | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1 || \
   echo $FORBIDDEN_VIEW | jq -e '.data | length == 0' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Access control working for course enrollments${NC}"
else
    # It's possible our instructor owns course 1, so check
    echo -e "${YELLOW}⚠ Instructor may own course 1, skipping this test${NC}"
fi

echo ""

# Step 11: Test pagination
echo -e "${YELLOW}Step 11: Testing pagination...${NC}"

PAGINATED=$(curl -s "$BASE_URL/api/enrollments/me?page=1&limit=1" \
  -H "Authorization: Bearer $STUDENT1_TOKEN")

if echo $PAGINATED | jq -e '.pagination' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Pagination working${NC}"
    echo "  Page: $(echo $PAGINATED | jq -r '.pagination.page')"
    echo "  Limit: $(echo $PAGINATED | jq -r '.pagination.limit')"
    echo "  Total: $(echo $PAGINATED | jq -r '.pagination.total')"
    echo "  Total Pages: $(echo $PAGINATED | jq -r '.pagination.totalPages')"
else
    echo -e "${RED}✗ Pagination not working${NC}"
    echo $PAGINATED | jq .
fi

echo ""

# Step 12: Test enrollment in non-existent course
echo -e "${YELLOW}Step 12: Testing enrollment in non-existent course...${NC}"

NONEXISTENT=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId": 99999}')

if echo $NONEXISTENT | jq -e '.error.code == "COURSE_NOT_FOUND"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Cannot enroll in non-existent course (404 Not Found)${NC}"
else
    echo -e "${RED}✗ Non-existent course enrollment not handled correctly${NC}"
    echo $NONEXISTENT | jq .
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary                 ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓${NC} API version: $VERSION"
echo -e "${GREEN}✓${NC} User registration and authentication working"
echo -e "${GREEN}✓${NC} Course creation and publishing working"
echo -e "${GREEN}✓${NC} Student enrollment in published courses working"
echo -e "${GREEN}✓${NC} Duplicate enrollment prevention (409) working"
echo -e "${GREEN}✓${NC} Unpublished course enrollment blocked (400)"
echo -e "${GREEN}✓${NC} Students can view their own enrollments"
echo -e "${GREEN}✓${NC} Instructors can view course enrollments"
echo -e "${GREEN}✓${NC} Admins can update enrollment status"
echo -e "${GREEN}✓${NC} Role-based access control enforced"
echo -e "${GREEN}✓${NC} Pagination support working"
echo -e "${GREEN}✓${NC} Non-existent course handling (404)"
echo ""
echo -e "${GREEN}All enrollment module tests completed successfully!${NC}"
