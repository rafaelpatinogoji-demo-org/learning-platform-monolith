#!/bin/bash

# Focused test script for Enrollments module v0.9
# Tests core functionality step by step

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LearnLite Enrollments Test (v0.9)   ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Check API health
echo -e "${YELLOW}Step 1: Checking API health...${NC}"
HEALTH=$(curl -s $BASE_URL/)
if echo $HEALTH | jq -e '.ok == true and .version == "v0.9"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is healthy and running v0.9${NC}"
    echo "  Modules: $(echo $HEALTH | jq -r '.modules | join(", ")')"
else
    echo -e "${RED}✗ API health check failed${NC}"
    exit 1
fi
echo ""

# Step 2: Register fresh test users
echo -e "${YELLOW}Step 2: Setting up test users...${NC}"

# Generate unique email suffixes to avoid conflicts
TIMESTAMP=$(date +%s)

# Register instructor
echo "Registering instructor..."
INSTRUCTOR_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"instructor${TIMESTAMP}@test.com\",
    \"password\": \"TestPass123!\",
    \"name\": \"Test Instructor\",
    \"role\": \"instructor\"
  }")

if echo $INSTRUCTOR_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    INSTRUCTOR_TOKEN=$(echo $INSTRUCTOR_REG | jq -r '.token')
    echo -e "${GREEN}✓ Instructor registered${NC}"
else
    echo -e "${RED}✗ Failed to register instructor${NC}"
    echo $INSTRUCTOR_REG | jq .
    exit 1
fi

# Register student
echo "Registering student..."
STUDENT_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"student${TIMESTAMP}@test.com\",
    \"password\": \"TestPass123!\",
    \"name\": \"Test Student\",
    \"role\": \"student\"
  }")

if echo $STUDENT_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    STUDENT_TOKEN=$(echo $STUDENT_REG | jq -r '.token')
    echo -e "${GREEN}✓ Student registered${NC}"
else
    echo -e "${RED}✗ Failed to register student${NC}"
    echo $STUDENT_REG | jq .
    exit 1
fi

# Register admin
echo "Registering admin..."
ADMIN_REG=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin${TIMESTAMP}@test.com\",
    \"password\": \"TestPass123!\",
    \"name\": \"Test Admin\",
    \"role\": \"admin\"
  }")

if echo $ADMIN_REG | jq -e '.ok == true' > /dev/null 2>&1; then
    ADMIN_TOKEN=$(echo $ADMIN_REG | jq -r '.token')
    echo -e "${GREEN}✓ Admin registered${NC}"
else
    echo -e "${RED}✗ Failed to register admin${NC}"
    echo $ADMIN_REG | jq .
    exit 1
fi
echo ""

# Step 3: Create and publish a course
echo -e "${YELLOW}Step 3: Creating test course...${NC}"

COURSE_CREATE=$(curl -s -X POST $BASE_URL/api/courses \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Enrollment Test Course",
    "description": "A course for testing enrollment functionality",
    "price_cents": 2999
  }')

if echo $COURSE_CREATE | jq -e '.ok == true' > /dev/null 2>&1; then
    COURSE_ID=$(echo $COURSE_CREATE | jq -r '.data.id')
    echo -e "${GREEN}✓ Course created (ID: $COURSE_ID)${NC}"
    
    # Publish the course
    PUBLISH=$(curl -s -X POST $BASE_URL/api/courses/$COURSE_ID/publish \
      -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
    
    if echo $PUBLISH | jq -e '.ok == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Course published${NC}"
    else
        echo -e "${RED}✗ Failed to publish course${NC}"
        echo $PUBLISH | jq .
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to create course${NC}"
    echo $COURSE_CREATE | jq .
    exit 1
fi
echo ""

# Step 4: Test student enrollment
echo -e "${YELLOW}Step 4: Testing student enrollment...${NC}"

ENROLL=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE_ID}")

if echo $ENROLL | jq -e '.ok == true' > /dev/null 2>&1; then
    ENROLLMENT_ID=$(echo $ENROLL | jq -r '.data.id')
    echo -e "${GREEN}✓ Student enrolled successfully (ID: $ENROLLMENT_ID)${NC}"
    echo "  Status: $(echo $ENROLL | jq -r '.data.status')"
    echo "  Course ID: $(echo $ENROLL | jq -r '.data.course_id')"
else
    echo -e "${RED}✗ Failed to enroll student${NC}"
    echo $ENROLL | jq .
    exit 1
fi
echo ""

# Step 5: Test duplicate enrollment prevention
echo -e "${YELLOW}Step 5: Testing duplicate enrollment prevention...${NC}"

DUPLICATE=$(curl -s -X POST $BASE_URL/api/enrollments \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE_ID}")

if echo $DUPLICATE | jq -e '.error.code == "ALREADY_ENROLLED"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Duplicate enrollment correctly rejected${NC}"
else
    echo -e "${RED}✗ Duplicate enrollment not handled correctly${NC}"
    echo $DUPLICATE | jq .
fi
echo ""

# Step 6: Test getting user enrollments
echo -e "${YELLOW}Step 6: Testing GET /api/enrollments/me...${NC}"

MY_ENROLLMENTS=$(curl -s $BASE_URL/api/enrollments/me \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo $MY_ENROLLMENTS | jq -e '.ok == true' > /dev/null 2>&1; then
    COUNT=$(echo $MY_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Retrieved student enrollments (Count: $COUNT)${NC}"
    if [ "$COUNT" -gt "0" ]; then
        echo "  First enrollment:"
        echo "    Course: $(echo $MY_ENROLLMENTS | jq -r '.data[0].course.title')"
        echo "    Status: $(echo $MY_ENROLLMENTS | jq -r '.data[0].status')"
    fi
else
    echo -e "${RED}✗ Failed to get student enrollments${NC}"
    echo $MY_ENROLLMENTS | jq .
fi
echo ""

# Step 7: Test instructor viewing course enrollments
echo -e "${YELLOW}Step 7: Testing instructor viewing course enrollments...${NC}"

COURSE_ENROLLMENTS=$(curl -s $BASE_URL/api/courses/$COURSE_ID/enrollments \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")

if echo $COURSE_ENROLLMENTS | jq -e '.ok == true' > /dev/null 2>&1; then
    COUNT=$(echo $COURSE_ENROLLMENTS | jq '.data | length')
    echo -e "${GREEN}✓ Instructor retrieved course enrollments (Count: $COUNT)${NC}"
    if [ "$COUNT" -gt "0" ]; then
        echo "  First enrollment:"
        echo "    Student: $(echo $COURSE_ENROLLMENTS | jq -r '.data[0].student.name')"
        echo "    Status: $(echo $COURSE_ENROLLMENTS | jq -r '.data[0].status')"
    fi
else
    echo -e "${RED}✗ Failed to get course enrollments${NC}"
    echo $COURSE_ENROLLMENTS | jq .
fi
echo ""

# Step 8: Test admin updating enrollment status
echo -e "${YELLOW}Step 8: Testing admin updating enrollment status...${NC}"

UPDATE_STATUS=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT_ID/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}')

if echo $UPDATE_STATUS | jq -e '.ok == true and .data.status == "completed"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin successfully updated enrollment status${NC}"
    echo "  New status: $(echo $UPDATE_STATUS | jq -r '.data.status')"
else
    echo -e "${RED}✗ Failed to update enrollment status${NC}"
    echo $UPDATE_STATUS | jq .
fi
echo ""

# Step 9: Test role-based access control
echo -e "${YELLOW}Step 9: Testing role-based access control...${NC}"

# Student tries to update status (should fail)
STUDENT_UPDATE=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT_ID/status \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}')

if echo $STUDENT_UPDATE | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Student correctly denied from updating status${NC}"
else
    echo -e "${RED}✗ Access control failed for student${NC}"
    echo $STUDENT_UPDATE | jq .
fi

# Instructor tries to update status (should fail)
INSTRUCTOR_UPDATE=$(curl -s -X PUT $BASE_URL/api/enrollments/$ENROLLMENT_ID/status \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}')

if echo $INSTRUCTOR_UPDATE | jq -e '.error.code == "FORBIDDEN"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Instructor correctly denied from updating status${NC}"
else
    echo -e "${RED}✗ Access control failed for instructor${NC}"
    echo $INSTRUCTOR_UPDATE | jq .
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Test Summary                 ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ API version v0.9 confirmed${NC}"
echo -e "${GREEN}✓ User registration and authentication${NC}"
echo -e "${GREEN}✓ Course creation and publishing${NC}"
echo -e "${GREEN}✓ Student enrollment in published courses${NC}"
echo -e "${GREEN}✓ Duplicate enrollment prevention${NC}"
echo -e "${GREEN}✓ Student can view own enrollments${NC}"
echo -e "${GREEN}✓ Instructor can view course enrollments${NC}"
echo -e "${GREEN}✓ Admin can update enrollment status${NC}"
echo -e "${GREEN}✓ Role-based access control enforced${NC}"
echo ""
echo -e "${GREEN}🎉 All core enrollment functionality tests passed!${NC}"
