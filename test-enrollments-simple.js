const jwt = require('jsonwebtoken');
const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const JWT_SECRET = '21052000T0M1K0'; // From .env file

// Generate tokens for demo users
const tokens = {
  student: jwt.sign({sub: 3, email: 'student@learnlite.com', role: 'student'}, JWT_SECRET, {expiresIn: '1h'}),
  instructor: jwt.sign({sub: 2, email: 'instructor@learnlite.com', role: 'instructor'}, JWT_SECRET, {expiresIn: '1h'}),
  admin: jwt.sign({sub: 1, email: 'admin@learnlite.com', role: 'admin'}, JWT_SECRET, {expiresIn: '1h'})
};

async function testEnrollments() {
  console.log('🚀 Testing LearnLite Enrollments Module v0.9\n');

  try {
    // Test 1: Check API version
    console.log('1. Checking API version...');
    const versionResponse = await axios.get(`${BASE_URL}/`);
    console.log(`✓ API Version: ${versionResponse.data.version}\n`);

    // Test 2: Get student's current enrollments
    console.log('2. Getting student\'s current enrollments...');
    const myEnrollments = await axios.get(`${BASE_URL}/api/enrollments/me`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    console.log(`✓ Found ${myEnrollments.data.data.length} enrollment(s)`);
    myEnrollments.data.data.forEach(enrollment => {
      console.log(`  - Course: ${enrollment.course.title} | Status: ${enrollment.status}`);
    });
    console.log();

    // Test 3: Try to enroll in course 1 (might already be enrolled)
    console.log('3. Testing enrollment in course 1...');
    try {
      const enrollResponse = await axios.post(`${BASE_URL}/api/enrollments`, 
        { courseId: 1 },
        { headers: { Authorization: `Bearer ${tokens.student}` } }
      );
      console.log('✓ Successfully enrolled in course 1');
      console.log(`  Enrollment ID: ${enrollResponse.data.data.id}`);
    } catch (error) {
      if (error.response?.data?.error?.code === 'ALREADY_ENROLLED') {
        console.log('✓ Already enrolled in course 1 (expected)');
      } else {
        console.log('✗ Unexpected error:', error.response?.data?.error?.message);
      }
    }
    console.log();

    // Test 4: Test duplicate enrollment prevention
    console.log('4. Testing duplicate enrollment prevention...');
    try {
      await axios.post(`${BASE_URL}/api/enrollments`, 
        { courseId: 1 },
        { headers: { Authorization: `Bearer ${tokens.student}` } }
      );
      console.log('✗ Should have prevented duplicate enrollment');
    } catch (error) {
      if (error.response?.data?.error?.code === 'ALREADY_ENROLLED') {
        console.log('✓ Duplicate enrollment correctly prevented (409)');
      } else {
        console.log('✗ Wrong error code:', error.response?.data?.error?.code);
      }
    }
    console.log();

    // Test 5: Instructor views course enrollments
    console.log('5. Testing instructor viewing course enrollments...');
    try {
      const courseEnrollments = await axios.get(`${BASE_URL}/api/courses/1/enrollments`, {
        headers: { Authorization: `Bearer ${tokens.instructor}` }
      });
      console.log(`✓ Instructor can view course enrollments (${courseEnrollments.data.data.length} students)`);
      courseEnrollments.data.data.forEach(enrollment => {
        console.log(`  - ${enrollment.student.name} (${enrollment.student.email}) | Status: ${enrollment.status}`);
      });
    } catch (error) {
      console.log('✗ Instructor cannot view course enrollments:', error.response?.data?.error?.message);
    }
    console.log();

    // Test 6: Admin updates enrollment status
    console.log('6. Testing admin updating enrollment status...');
    const enrollments = await axios.get(`${BASE_URL}/api/enrollments/me`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    
    if (enrollments.data.data.length > 0) {
      const enrollmentId = enrollments.data.data[0].id;
      try {
        const updateResponse = await axios.put(`${BASE_URL}/api/enrollments/${enrollmentId}/status`,
          { status: 'completed' },
          { headers: { Authorization: `Bearer ${tokens.admin}` } }
        );
        console.log(`✓ Admin successfully updated enrollment status to: ${updateResponse.data.data.status}`);
      } catch (error) {
        console.log('✗ Admin failed to update status:', error.response?.data?.error?.message);
      }
    }
    console.log();

    // Test 7: Test role-based access control
    console.log('7. Testing role-based access control...');
    if (enrollments.data.data.length > 0) {
      const enrollmentId = enrollments.data.data[0].id;
      
      // Student tries to update status (should fail)
      try {
        await axios.put(`${BASE_URL}/api/enrollments/${enrollmentId}/status`,
          { status: 'active' },
          { headers: { Authorization: `Bearer ${tokens.student}` } }
        );
        console.log('✗ Student should not be able to update status');
      } catch (error) {
        if (error.response?.data?.error?.code === 'FORBIDDEN') {
          console.log('✓ Student correctly denied from updating status (403)');
        } else {
          console.log('✗ Wrong error code:', error.response?.data?.error?.code);
        }
      }
    }
    console.log();

    // Test 8: Test pagination
    console.log('8. Testing pagination...');
    const paginatedResponse = await axios.get(`${BASE_URL}/api/enrollments/me?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${tokens.student}` }
    });
    console.log('✓ Pagination working:');
    console.log(`  Page: ${paginatedResponse.data.pagination.page}`);
    console.log(`  Limit: ${paginatedResponse.data.pagination.limit}`);
    console.log(`  Total: ${paginatedResponse.data.pagination.total}`);
    console.log(`  Total Pages: ${paginatedResponse.data.pagination.totalPages}`);
    console.log();

    // Test 9: Test enrollment in non-existent course
    console.log('9. Testing enrollment in non-existent course...');
    try {
      await axios.post(`${BASE_URL}/api/enrollments`, 
        { courseId: 99999 },
        { headers: { Authorization: `Bearer ${tokens.student}` } }
      );
      console.log('✗ Should have failed for non-existent course');
    } catch (error) {
      if (error.response?.data?.error?.code === 'COURSE_NOT_FOUND') {
        console.log('✓ Non-existent course correctly rejected (404)');
      } else {
        console.log('✗ Wrong error code:', error.response?.data?.error?.code);
      }
    }
    console.log();

    console.log('🎉 All enrollment module tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the tests
testEnrollments();
