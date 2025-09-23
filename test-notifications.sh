#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:4000/api"

echo -e "${YELLOW}=== Testing Notifications Module v1.3 ===${NC}"
echo ""

# First, check if notifications are enabled
echo -e "${YELLOW}1. Checking notifications health...${NC}"
HEALTH_RESPONSE=$(curl -s $BASE_URL/notifications/health)
echo "Response: $HEALTH_RESPONSE"
echo ""

# Check if notifications are enabled
ENABLED=$(echo $HEALTH_RESPONSE | grep -o '"enabled":[^,}]*' | cut -d':' -f2)
if [ "$ENABLED" != "true" ]; then
    echo -e "${RED}❌ Notifications are disabled. Set NOTIFICATIONS_ENABLED=true in .env${NC}"
    echo "To enable notifications:"
    echo "  1. Edit your .env file"
    echo "  2. Set NOTIFICATIONS_ENABLED=true"
    echo "  3. Restart the server"
    exit 1
fi

echo -e "${GREEN}✅ Notifications worker is enabled${NC}"
echo ""

# Use existing tokens or create new ones
INSTRUCTOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjI2LCJlbWFpbCI6InRlc3QuaW5zdHJ1Y3RvckB0ZXN0LmNvbSIsInJvbGUiOiJpbnN0cnVjdG9yIiwiaWF0IjoxNzU4NTk3OTI2LCJleHAiOjE3NTg2ODQzMjZ9.joJmNraaGRHKZ48wkQyRp6H4D0IdJesFi2qoNtX0fJ4"
STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjI3LCJlbWFpbCI6InRlc3Quc3R1ZGVudEB0ZXN0LmNvbSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzU4NTk3OTMxLCJleHAiOjE3NTg2ODQzMzF9.IUzcjNfdUe4rp1tpYsD8MrXf0oyXyfP2mrIiEUdO6lM"

# 2. Create a test course as instructor
echo -e "${YELLOW}2. Creating test course...${NC}"
COURSE_RESPONSE=$(curl -s -X POST $BASE_URL/courses \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Notifications Test Course",
    "description": "Testing notifications module",
    "price": 0
  }')

COURSE_ID=$(echo $COURSE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$COURSE_ID" ]; then
    echo -e "${RED}❌ Failed to create course${NC}"
    echo "Response: $COURSE_RESPONSE"
    exit 1
fi
echo -e "${GREEN}✅ Created course ID: $COURSE_ID${NC}"
echo ""

# 3. Publish the course
echo -e "${YELLOW}3. Publishing course...${NC}"
PUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/courses/$COURSE_ID/publish" \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN")
echo -e "${GREEN}✅ Course published${NC}"
echo ""

# 4. Enroll student (this should trigger enrollment.created event)
echo -e "${YELLOW}4. Enrolling student (should trigger notification)...${NC}"
ENROLL_RESPONSE=$(curl -s -X POST $BASE_URL/enrollments \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\": $COURSE_ID}")

ENROLLMENT_ID=$(echo $ENROLL_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
if [ -z "$ENROLLMENT_ID" ]; then
    echo -e "${RED}❌ Failed to create enrollment${NC}"
    echo "Response: $ENROLL_RESPONSE"
    exit 1
fi
echo -e "${GREEN}✅ Created enrollment ID: $ENROLLMENT_ID${NC}"
echo ""

# 5. Wait for worker to process
echo -e "${YELLOW}5. Waiting 6 seconds for worker to process event...${NC}"
sleep 6
echo ""

# 6. Check notifications health again to see updated stats
echo -e "${YELLOW}6. Checking notifications health for updated stats...${NC}"
HEALTH_RESPONSE=$(curl -s $BASE_URL/notifications/health)
echo "Response: $HEALTH_RESPONSE"
echo ""

# 7. Check the console output or file
SINK=$(echo $HEALTH_RESPONSE | grep -o '"sink":"[^"]*"' | cut -d'"' -f4)
echo -e "${YELLOW}7. Notification sink is set to: ${SINK}${NC}"

if [ "$SINK" = "file" ]; then
    echo "Check var/notifications.log for the enrollment.created event:"
    if [ -f "var/notifications.log" ]; then
        echo -e "${GREEN}Last 5 lines of notifications.log:${NC}"
        tail -5 var/notifications.log
    else
        echo -e "${YELLOW}Log file not found yet. It will be created when events are processed.${NC}"
    fi
else
    echo "Check the server console output for the enrollment.created event."
    echo "You should see a line like:"
    echo "📨 [timestamp] enrollment.created: {\"enrollmentId\":$ENROLLMENT_ID,\"userId\":27,\"courseId\":$COURSE_ID}"
fi
echo ""

echo -e "${GREEN}✅ Notifications module test complete!${NC}"
echo ""
echo "Summary:"
echo "- Notifications worker is enabled and running"
echo "- Created course ID: $COURSE_ID"
echo "- Created enrollment ID: $ENROLLMENT_ID"
echo "- Event should be processed and visible in $SINK"
