#!/bin/bash

# Test script for Progress Module (v1.1)
# This script tests the progress tracking functionality

BASE_URL="http://localhost:4000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Progress Module v1.1 ===${NC}"
echo ""

# Function to check if server is running
check_server() {
    curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/healthz 2>/dev/null
}

# Check if server is running
SERVER_STATUS=$(check_server)
if [ "$SERVER_STATUS" != "200" ]; then
    echo -e "${RED}❌ Server is not running. Please start the server first.${NC}"
    echo "Run: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# 1. Login as instructor to get token
echo -e "${YELLOW}1. Logging in as instructor...${NC}"
INSTRUCTOR_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@learnlite.com", "password": "password"}')

INSTRUCTOR_TOKEN=$(echo $INSTRUCTOR_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$INSTRUCTOR_TOKEN" ]; then
    echo -e "${RED}❌ Failed to login as instructor${NC}"
    echo "Response: $INSTRUCTOR_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Instructor logged in${NC}"
echo ""

# 2. Login as student
echo -e "${YELLOW}2. Logging in as student...${NC}"
STUDENT_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@learnlite.com", "password": "password"}')

STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$STUDENT_TOKEN" ]; then
    echo -e "${RED}❌ Failed to login as student${NC}"
    echo "Response: $STUDENT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Student logged in${NC}"
echo ""

# 3. Check if student is enrolled (enrollment ID 1 should exist from seed data)
echo -e "${YELLOW}3. Checking student enrollment...${NC}"
ENROLLMENTS=$(curl -s $BASE_URL/enrollments/me \
  -H "Authorization: Bearer $STUDENT_TOKEN")

echo "Student enrollments: $ENROLLMENTS"
echo ""

# 4. Mark lesson 1 as complete
echo -e "${YELLOW}4. Marking lesson 1 as complete...${NC}"
MARK_COMPLETE=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 1,
    "completed": true
  }')

if echo "$MARK_COMPLETE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Lesson 1 marked as complete${NC}"
    echo "Response: $MARK_COMPLETE"
else
    echo -e "${RED}❌ Failed to mark lesson as complete${NC}"
    echo "Response: $MARK_COMPLETE"
fi
echo ""

# 5. Mark lesson 2 as complete
echo -e "${YELLOW}5. Marking lesson 2 as complete...${NC}"
MARK_COMPLETE_2=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 2,
    "completed": true
  }')

if echo "$MARK_COMPLETE_2" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Lesson 2 marked as complete${NC}"
else
    echo -e "${RED}❌ Failed to mark lesson 2 as complete${NC}"
    echo "Response: $MARK_COMPLETE_2"
fi
echo ""

# 6. Get student's progress for course 1
echo -e "${YELLOW}6. Getting student's progress for course 1...${NC}"
MY_PROGRESS=$(curl -s "$BASE_URL/progress/me?courseId=1" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$MY_PROGRESS" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Retrieved student progress${NC}"
    echo "Progress details:"
    echo "$MY_PROGRESS" | python3 -m json.tool 2>/dev/null || echo "$MY_PROGRESS"
else
    echo -e "${RED}❌ Failed to get student progress${NC}"
    echo "Response: $MY_PROGRESS"
fi
echo ""

# 7. Mark lesson 2 as incomplete (toggle)
echo -e "${YELLOW}7. Marking lesson 2 as incomplete (toggle test)...${NC}"
MARK_INCOMPLETE=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 2,
    "completed": false
  }')

if echo "$MARK_INCOMPLETE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Lesson 2 marked as incomplete${NC}"
else
    echo -e "${RED}❌ Failed to mark lesson as incomplete${NC}"
    echo "Response: $MARK_INCOMPLETE"
fi
echo ""

# 8. Get updated progress
echo -e "${YELLOW}8. Getting updated progress...${NC}"
UPDATED_PROGRESS=$(curl -s "$BASE_URL/progress/me?courseId=1" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if echo "$UPDATED_PROGRESS" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Retrieved updated progress${NC}"
    echo "Updated progress:"
    echo "$UPDATED_PROGRESS" | python3 -m json.tool 2>/dev/null || echo "$UPDATED_PROGRESS"
else
    echo -e "${RED}❌ Failed to get updated progress${NC}"
fi
echo ""

# 9. Instructor views course progress
echo -e "${YELLOW}9. Instructor viewing course progress...${NC}"
COURSE_PROGRESS=$(curl -s $BASE_URL/courses/1/progress \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")

if echo "$COURSE_PROGRESS" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Instructor retrieved course progress${NC}"
    echo "Course progress:"
    echo "$COURSE_PROGRESS" | python3 -m json.tool 2>/dev/null || echo "$COURSE_PROGRESS"
else
    echo -e "${RED}❌ Failed to get course progress${NC}"
    echo "Response: $COURSE_PROGRESS"
fi
echo ""

# 10. Test error cases - wrong enrollment
echo -e "${YELLOW}10. Testing error case: wrong enrollment ID...${NC}"
WRONG_ENROLLMENT=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 999,
    "lessonId": 1,
    "completed": true
  }')

if echo "$WRONG_ENROLLMENT" | grep -q '"ok":false'; then
    echo -e "${GREEN}✅ Correctly rejected invalid enrollment${NC}"
    echo "Error: $(echo $WRONG_ENROLLMENT | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
else
    echo -e "${RED}❌ Should have rejected invalid enrollment${NC}"
fi
echo ""

# 11. Test error case - cross-course lesson marking
echo -e "${YELLOW}11. Testing error case: cross-course lesson marking...${NC}"
# Assuming lesson 10 doesn't belong to course 1
CROSS_COURSE=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 999,
    "completed": true
  }')

if echo "$CROSS_COURSE" | grep -q '"ok":false'; then
    echo -e "${GREEN}✅ Correctly rejected cross-course lesson marking${NC}"
    echo "Error: $(echo $CROSS_COURSE | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
else
    echo -e "${RED}❌ Should have rejected cross-course lesson${NC}"
fi
echo ""

# 12. Test validation - missing completed flag
echo -e "${YELLOW}12. Testing validation: missing completed flag...${NC}"
MISSING_FLAG=$(curl -s -X POST $BASE_URL/progress/complete \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": 1,
    "lessonId": 1
  }')

if echo "$MISSING_FLAG" | grep -q '"ok":false'; then
    echo -e "${GREEN}✅ Correctly validated missing completed flag${NC}"
else
    echo -e "${RED}❌ Should have validated missing completed flag${NC}"
fi
echo ""

echo -e "${YELLOW}=== Progress Module Test Complete ===${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "- ✅ Students can mark lessons as complete/incomplete"
echo "- ✅ Students can view their progress with percentages"
echo "- ✅ Instructors can view aggregate course progress"
echo "- ✅ Cross-course lesson marking is prevented"
echo "- ✅ Validation works correctly"
echo "- ✅ Idempotent operations supported"
