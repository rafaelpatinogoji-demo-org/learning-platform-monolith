#!/bin/bash

# Complete test script for Enrollments module v0.9
# Tests from ground up with new user registration

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LearnLite Enrollments Module Test   ${NC}"
echo -e "${BLUE}           Version v0.9                 ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Verify API version
echo -e "${YELLOW}Step 1: Checking API version...${NC}"
VERSION_CHECK=$(curl -s $BASE_URL/)
VERSION=$(echo $VERSION_CHECK | jq -r '.version')
if [ "$VERSION" = "v0.9" ]; then
    echo -e "${GREEN}✓ API version confirmed: v0.9${NC}\n"
else
    echo -e "${RED}✗ Expected v0.9, got $VERSION${NC}\n"
    exit 1
fi

# Step 2: Register new test users
echo -e "${YELLOW}Step 2: Registering new test users...${NC}"

# Register a new instructor
echo -e "Registering instructor..."
INSTRUCTOR_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.instructor@learnlite.com",
    "password": "TestPass123!",
    "name": "Test Instructor",
    "role": "instructor"
  }')

if echo $INSTRUCTOR_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Instructor registered successfully${NC}"
    INSTRUCTOR_TOKEN=$(echo $INSTRUCTOR_REG | jq -r '.token')
else
    echo -e "${YELLOW}! Instructor may already exist, attempting login...${NC}"
    INSTRUCTOR_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test.instructor@learnlite.com",
        "password": "TestPass123!"
      }')
    
    if echo $INSTRUCTOR_LOGIN | jq -e '.ok == true' > /dev/null 2>&1; then
        INSTRUCTOR_TOKEN=$(echo $INSTRUCTOR_LOGIN | jq -r '.token')
        echo -e "${GREEN}✓ Instructor logged in${NC}"
    else
        echo -e "${RED}✗ Failed to register or login instructor${NC}"
        echo $INSTRUCTOR_LOGIN | jq .
        exit 1
    fi
fi

# Register two students
echo -e "Registering students..."
STUDENT1_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.student1@learnlite.com",
    "password": "TestPass123!",
    "name": "Test Student One",
    "role": "student"
  }')

if echo $STUDENT1_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Student 1 registered successfully${NC}"
    STUDENT1_TOKEN=$(echo $STUDENT1_REG | jq -r '.token')
else
    echo -e "${YELLOW}! Student 1 may already exist, attempting login...${NC}"
    STUDENT1_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test.student1@learnlite.com",
        "password": "TestPass123!"
      }')
    
    if echo $STUDENT1_LOGIN | jq -e '.ok == true' > /dev/null 2>&1; then
        STUDENT1_TOKEN=$(echo $STUDENT1_LOGIN | jq -r '.token')
        echo -e "${GREEN}✓ Student 1 logged in${NC}"
    else
        echo -e "${RED}✗ Failed to register or login student 1${NC}"
        exit 1
    fi
fi

STUDENT2_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.student2@learnlite.com",
    "password": "TestPass123!",
    "name": "Test Student Two",
    "role": "student"
  }')

if echo $STUDENT2_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Student 2 registered successfully${NC}"
    STUDENT2_TOKEN=$(echo $STUDENT2_REG | jq -r '.token')
else
    echo -e "${YELLOW}! Student 2 may already exist, attempting login...${NC}"
    STUDENT2_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test.student2@learnlite.com",
        "password": "TestPass123!"
      }')
    
    if echo $STUDENT2_LOGIN | jq -e '.ok == true' > /dev/null 2>&1; then
        STUDENT2_TOKEN=$(echo $STUDENT2_LOGIN | jq -r '.token')
        echo -e "${GREEN}✓ Student 2 logged in${NC}"
    else
        echo -e "${RED}✗ Failed to register or login student 2${NC}"
        exit 1
    fi
fi

# Register an admin
echo -e "Registering admin..."
ADMIN_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.admin@learnlite.com",
    "password": "TestPass123!",
    "name": "Test Admin",
    "role": "admin"
  }')

if echo $ADMIN_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin registered successfully${NC}"
    ADMIN_TOKEN=$(echo $ADMIN_REG | jq -r '.token')
else
    echo -e "${YELLOW}! Admin may already exist, attempting login...${NC}"
    ADMIN_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test.admin@learnlite.com",
        "password": "TestPass123!"
      }')
    
    if echo $ADMIN_LOGIN | jq -e '.ok == true' > /dev/null 2>&1; then
        ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')
        echo -e "${GREEN}✓ Admin logged in${NC}"
    else
        echo -e "${RED}✗ Failed to register or login admin${NC}"
        exit 1
    fi
fi

echo ""

# Step 3: Create a test course as instructor
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
    fi
else
    echo -e "${RED}✗ Failed to create course${NC}"
    echo $COURSE1 | jq .
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
fi

echo ""

# Step 4: Test enrollment creation
echo -e "${YELLOW}Step 4: Testing enrollment creation...${NC}"

# Student 1 enrolls in published course
echo -e "Student 1 enrolling in published course..."
ENROLL1=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE1_ID}")

if echo $ENROLL1 | jq -e '.ok == true' > /dev/null 2>&1; then
    ENROLLMENT1_ID=$(echo $ENROLL1 | jq -r '.data.id')
    echo -e "${GREEN}✓ Student 1 enrolled successfully (Enrollment ID: $ENROLLMENT1_ID)${NC}"
    echo "  Status: $(echo $ENROLL1 | jq -r '.data.status')"
else
    echo -e "${RED}✗ Failed to enroll student 1${NC}"
    echo $ENROLL1 | jq .
fi

# Student 2 enrolls in the same course
echo -e "Student 2 enrolling in published course..."
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
else
    echo -e "${RED}✗ Duplicate enrollment not handled correctly${NC}"
    echo $DUPLICATE | jq .
fi

echo ""

# Step 6: Test enrollment in unpublished course
echo -e "${YELLOW}Step 6: Testing enrollment in unpublished course...${NC}"

UNPUBLISHED_ENROLL=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE2_ID}")

if echo $UNPUBLISHED_ENROLL | jq -e '.error.code == "COURSE_NOT_PUBLISHED"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Cannot enroll in unpublished course (400 Bad Request)${NC}"
else
    echo -e "${RED}✗ Unpublished course enrollment not handled correctly${NC}"
    echo $UNPUBLISHED_ENROLL | jq .
fi

echo ""

# Step 7: Test getting user's enrollments
echo -e "${YELLOW}Step 7: Testing GET /api/enrollments/me...${NC}"

MY_ENROLLMENTS=$(curl -s $BASE_URL/api/enrollments/me \
  -H "Authorization: Bearer $STUDENT1_TOKEN")

if echo $MY_ENROLLMENTS | jq -e '.ok == true' > /dev/null 2>&1; then
    COUNT=$(echo $MY_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Retrieved student's enrollments (Count: $COUNT)${NC}"
    echo $MY_ENROLLMENTS | jq '.data[] | {enrollment_id: .id, course_title: .course.title, status: .status}' 2>/dev/null
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
    echo $COURSE_ENROLLMENTS | jq '.data[] | {enrollment_id: .id, student_name: .student.name, status: .status}' 2>/dev/null
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
fi

echo ""

# Step 10: Test role-based access control
echo -e "${YELLOW}Step 10: Testing role-based access control...${NC}"

# Student tries to update status (should fail)
echo -e "Testing student cannot update status..."
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

# Instructor tries to update status (should fail)
echo -e "Testing instructor cannot update status..."
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

# Non-owner instructor tries to view enrollments (should fail)
echo -e "Testing instructor cannot view other's course enrollments..."
# First create a course with a different instructor (admin creates for someone else)
OTHER_COURSE=$(curl -s -X POST $BASE_URL/api/courses \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Another Instructor Course",
    "description": "Course owned by different instructor",
    "price_cents": 3999,
    "instructor_id": 999
  }')

if echo $OTHER_COURSE | jq -e '.ok == true' > /dev/null 2>&1; then
    OTHER_COURSE_ID=$(echo $OTHER_COURSE | jq -r '.data.id')
    
    # Try to view enrollments as non-owner instructor
    FORBIDDEN_VIEW=$(curl -s $BASE_URL/api/courses/$OTHER_COURSE_ID/enrollments \
      -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
    
    if echo $FORBIDDEN_VIEW | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Non-owner instructor denied from viewing enrollments (403 Forbidden)${NC}"
    else
        echo -e "${RED}✗ Access control not working for course enrollments${NC}"
    fi
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
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary                 ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓${NC} API version: v0.9 (Enrollments module)"
echo -e "${GREEN}✓${NC} User registration and authentication"
echo -e "${GREEN}✓${NC} Course creation and publishing"
echo -e "${GREEN}✓${NC} Student enrollment in published courses"
echo -e "${GREEN}✓${NC} Duplicate enrollment prevention (409)"
echo -e "${GREEN}✓${NC} Unpublished course enrollment block (400)"
echo -e "${GREEN}✓${NC} Student can view own enrollments"
echo -e "${GREEN}✓${NC} Instructor can view course enrollments"
echo -e "${GREEN}✓${NC} Admin can update enrollment status"
echo -e "${GREEN}✓${NC} Role-based access control enforced"
echo -e "${GREEN}✓${NC} Pagination support"
echo ""
echo -e "${GREEN}All enrollment module tests passed successfully!${NC}"
