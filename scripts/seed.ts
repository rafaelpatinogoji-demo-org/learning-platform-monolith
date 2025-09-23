#!/usr/bin/env ts-node

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnlite',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

interface SeedData {
  users: Array<{
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'instructor' | 'student';
  }>;
  courses: Array<{
    title: string;
    description: string;
    price: number;
    published: boolean;
    instructorEmail: string;
  }>;
  lessons: Array<{
    courseTitle: string;
    title: string;
    content: string;
    videoUrl?: string;
    position: number;
  }>;
  quizzes: Array<{
    courseTitle: string;
    title: string;
    questions: Array<{
      prompt: string;
      choices: string[];
      correctIndex: number;
    }>;
  }>;
  enrollments: Array<{
    studentEmail: string;
    courseTitle: string;
    status: 'active' | 'completed' | 'refunded';
  }>;
  progress: Array<{
    studentEmail: string;
    courseTitle: string;
    lessonTitle: string;
    completed: boolean;
    daysAgo?: number;
  }>;
}

const seedData: SeedData = {
  users: [
    {
      email: 'admin@learnlite.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'john.instructor@learnlite.com',
      password: 'instructor123',
      name: 'John Smith',
      role: 'instructor'
    },
    {
      email: 'sarah.instructor@learnlite.com',
      password: 'instructor123',
      name: 'Sarah Johnson',
      role: 'instructor'
    },
    {
      email: 'alice.student@learnlite.com',
      password: 'student123',
      name: 'Alice Cooper',
      role: 'student'
    },
    {
      email: 'bob.student@learnlite.com',
      password: 'student123',
      name: 'Bob Wilson',
      role: 'student'
    },
    {
      email: 'carol.student@learnlite.com',
      password: 'student123',
      name: 'Carol Davis',
      role: 'student'
    }
  ],
  courses: [
    {
      title: 'Complete Web Development Bootcamp',
      description: 'Learn full-stack web development from scratch. Master HTML, CSS, JavaScript, Node.js, and databases to build modern web applications.',
      price: 99.99,
      published: true,
      instructorEmail: 'john.instructor@learnlite.com'
    },
    {
      title: 'Advanced JavaScript Concepts',
      description: 'Deep dive into advanced JavaScript topics including closures, prototypes, async programming, and modern ES6+ features.',
      price: 79.99,
      published: true,
      instructorEmail: 'john.instructor@learnlite.com'
    },
    {
      title: 'React for Beginners',
      description: 'Learn React from the ground up. Build interactive user interfaces with components, hooks, and state management.',
      price: 89.99,
      published: false,
      instructorEmail: 'sarah.instructor@learnlite.com'
    }
  ],
  lessons: [
    // Web Development Bootcamp lessons
    {
      courseTitle: 'Complete Web Development Bootcamp',
      title: 'Introduction to Web Development',
      content: `# Introduction to Web Development

## What You'll Learn

Welcome to the Complete Web Development Bootcamp! In this comprehensive course, you'll learn:

- **Frontend Development**: HTML, CSS, JavaScript
- **Backend Development**: Node.js, Express.js
- **Database Management**: PostgreSQL, MongoDB
- **Version Control**: Git and GitHub
- **Deployment**: Heroku, Netlify, AWS

## Course Structure

This course is divided into several modules:

1. **HTML Fundamentals** - Structure and semantics
2. **CSS Styling** - Layout and design
3. **JavaScript Programming** - Interactivity and logic
4. **Backend Development** - Server-side programming
5. **Database Integration** - Data persistence
6. **Full-Stack Projects** - Putting it all together

## Prerequisites

- Basic computer literacy
- Willingness to learn and practice
- No prior programming experience required

Let's get started on your web development journey!`,
      videoUrl: 'https://example.com/videos/web-dev-intro.mp4',
      position: 1
    },
    {
      courseTitle: 'Complete Web Development Bootcamp',
      title: 'HTML Fundamentals',
      content: `# HTML Fundamentals

## What is HTML?

HTML (HyperText Markup Language) is the standard markup language for creating web pages.

## Basic Structure

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web Page</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is a paragraph.</p>
</body>
</html>
\`\`\`

## Common Elements

- **Headings**: \`<h1>\` to \`<h6>\`
- **Paragraphs**: \`<p>\`
- **Links**: \`<a href="url">Link text</a>\`
- **Images**: \`<img src="image.jpg" alt="Description">\`
- **Lists**: \`<ul>\`, \`<ol>\`, \`<li>\`

## Semantic HTML

Use semantic elements for better accessibility:
- \`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<article>\`, \`<footer>\``,
      videoUrl: 'https://example.com/videos/html-fundamentals.mp4',
      position: 2
    },
    {
      courseTitle: 'Complete Web Development Bootcamp',
      title: 'CSS Styling Basics',
      content: `# CSS Styling Basics

## What is CSS?

CSS (Cascading Style Sheets) controls the presentation and layout of HTML elements.

## CSS Syntax

\`\`\`css
selector {
    property: value;
    property: value;
}
\`\`\`

## Selectors

- **Element**: \`h1 { color: blue; }\`
- **Class**: \`.my-class { font-size: 16px; }\`
- **ID**: \`#my-id { background: red; }\`

## Box Model

Every element has:
- **Content**: The actual content
- **Padding**: Space inside the element
- **Border**: Border around the element
- **Margin**: Space outside the element

## Layout Techniques

- **Flexbox**: For one-dimensional layouts
- **Grid**: For two-dimensional layouts
- **Float**: Legacy layout method`,
      videoUrl: 'https://example.com/videos/css-basics.mp4',
      position: 3
    },
    // Advanced JavaScript lessons
    {
      courseTitle: 'Advanced JavaScript Concepts',
      title: 'Closures and Scope',
      content: `# Closures and Scope

## Understanding Scope

JavaScript has function scope and block scope (ES6+).

## What are Closures?

A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.

\`\`\`javascript
function outerFunction(x) {
    return function innerFunction(y) {
        return x + y;
    };
}

const addFive = outerFunction(5);
console.log(addFive(3)); // 8
\`\`\`

## Practical Uses

- Data privacy
- Function factories
- Module pattern
- Event handlers`,
      videoUrl: 'https://example.com/videos/closures.mp4',
      position: 1
    },
    // React lessons
    {
      courseTitle: 'React for Beginners',
      title: 'Introduction to React',
      content: `# Introduction to React

## What is React?

React is a JavaScript library for building user interfaces, particularly web applications.

## Key Concepts

- **Components**: Reusable UI pieces
- **JSX**: JavaScript XML syntax
- **Props**: Data passed to components
- **State**: Component's internal data

## Your First Component

\`\`\`jsx
function Welcome(props) {
    return <h1>Hello, {props.name}!</h1>;
}
\`\`\``,
      videoUrl: 'https://example.com/videos/react-intro.mp4',
      position: 1
    }
  ],
  quizzes: [
    {
      courseTitle: 'Complete Web Development Bootcamp',
      title: 'HTML & CSS Knowledge Check',
      questions: [
        {
          prompt: 'What does HTML stand for?',
          choices: [
            'HyperText Markup Language',
            'High Tech Modern Language',
            'Home Tool Markup Language',
            'Hyperlink and Text Markup Language'
          ],
          correctIndex: 0
        },
        {
          prompt: 'Which CSS property is used to change the text color?',
          choices: ['font-color', 'text-color', 'color', 'foreground-color'],
          correctIndex: 2
        },
        {
          prompt: 'What is the correct HTML element for the largest heading?',
          choices: ['<heading>', '<h6>', '<h1>', '<head>'],
          correctIndex: 2
        }
      ]
    },
    {
      courseTitle: 'Advanced JavaScript Concepts',
      title: 'JavaScript Fundamentals Quiz',
      questions: [
        {
          prompt: 'What is a closure in JavaScript?',
          choices: [
            'A way to close the browser',
            'A function with access to outer scope variables',
            'A method to end a program',
            'A type of loop'
          ],
          correctIndex: 1
        },
        {
          prompt: 'Which keyword is used to declare a block-scoped variable?',
          choices: ['var', 'let', 'const', 'both let and const'],
          correctIndex: 3
        }
      ]
    }
  ],
  enrollments: [
    {
      studentEmail: 'alice.student@learnlite.com',
      courseTitle: 'Complete Web Development Bootcamp',
      status: 'active'
    },
    {
      studentEmail: 'bob.student@learnlite.com',
      courseTitle: 'Complete Web Development Bootcamp',
      status: 'active'
    },
    {
      studentEmail: 'carol.student@learnlite.com',
      courseTitle: 'Advanced JavaScript Concepts',
      status: 'active'
    },
    {
      studentEmail: 'alice.student@learnlite.com',
      courseTitle: 'Advanced JavaScript Concepts',
      status: 'completed'
    }
  ],
  progress: [
    {
      studentEmail: 'alice.student@learnlite.com',
      courseTitle: 'Complete Web Development Bootcamp',
      lessonTitle: 'Introduction to Web Development',
      completed: true,
      daysAgo: 5
    },
    {
      studentEmail: 'alice.student@learnlite.com',
      courseTitle: 'Complete Web Development Bootcamp',
      lessonTitle: 'HTML Fundamentals',
      completed: true,
      daysAgo: 3
    },
    {
      studentEmail: 'bob.student@learnlite.com',
      courseTitle: 'Complete Web Development Bootcamp',
      lessonTitle: 'Introduction to Web Development',
      completed: true,
      daysAgo: 2
    }
  ]
};

async function clearExistingData() {
  console.log('🧹 Clearing entire database...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete ALL data in reverse order of dependencies
    console.log('  • Clearing outbox events...');
    await client.query('DELETE FROM outbox_events');
    
    console.log('  • Clearing certificates...');
    await client.query('DELETE FROM certificates');
    
    console.log('  • Clearing quiz submissions...');
    await client.query('DELETE FROM quiz_submissions');
    
    console.log('  • Clearing lesson progress...');
    await client.query('DELETE FROM lesson_progress');
    
    console.log('  • Clearing quiz questions...');
    await client.query('DELETE FROM quiz_questions');
    
    console.log('  • Clearing quizzes...');
    await client.query('DELETE FROM quizzes');
    
    console.log('  • Clearing enrollments...');
    await client.query('DELETE FROM enrollments');
    
    console.log('  • Clearing lessons...');
    await client.query('DELETE FROM lessons');
    
    console.log('  • Clearing courses...');
    await client.query('DELETE FROM courses');
    
    console.log('  • Clearing users...');
    await client.query('DELETE FROM users');
    
    // Reset sequences to start from 1
    console.log('  • Resetting ID sequences...');
    await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE courses_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE lessons_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE quizzes_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE quiz_questions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE enrollments_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE quiz_submissions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE certificates_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE lesson_progress_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE outbox_events_id_seq RESTART WITH 1');
    
    await client.query('COMMIT');
    console.log('✅ Database completely cleared and sequences reset');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  const client = await pool.connect();
  try {
    for (const user of seedData.users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      await client.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [user.email, hashedPassword, user.name, user.role]
      );
      
      console.log(`  ✓ Created ${user.role}: ${user.name} (${user.email})`);
    }
  } finally {
    client.release();
  }
}

async function seedCourses() {
  console.log('📚 Seeding courses...');
  
  const client = await pool.connect();
  try {
    for (const course of seedData.courses) {
      // Get instructor ID
      const instructorResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [course.instructorEmail]
      );
      
      if (instructorResult.rows.length === 0) {
        throw new Error(`Instructor not found: ${course.instructorEmail}`);
      }
      
      const instructorId = instructorResult.rows[0].id;
      const priceCents = Math.round(course.price * 100);
      
      await client.query(
        'INSERT INTO courses (title, description, price_cents, published, instructor_id) VALUES ($1, $2, $3, $4, $5)',
        [course.title, course.description, priceCents, course.published, instructorId]
      );
      
      console.log(`  ✓ Created course: ${course.title} (${course.published ? 'Published' : 'Draft'})`);
    }
  } finally {
    client.release();
  }
}

async function seedLessons() {
  console.log('📖 Seeding lessons...');
  
  const client = await pool.connect();
  try {
    for (const lesson of seedData.lessons) {
      // Get course ID
      const courseResult = await client.query(
        'SELECT id FROM courses WHERE title = $1',
        [lesson.courseTitle]
      );
      
      if (courseResult.rows.length === 0) {
        throw new Error(`Course not found: ${lesson.courseTitle}`);
      }
      
      const courseId = courseResult.rows[0].id;
      
      await client.query(
        'INSERT INTO lessons (course_id, title, content_md, video_url, position) VALUES ($1, $2, $3, $4, $5)',
        [courseId, lesson.title, lesson.content, lesson.videoUrl, lesson.position]
      );
      
      console.log(`  ✓ Created lesson: ${lesson.title}`);
    }
  } finally {
    client.release();
  }
}

async function seedQuizzes() {
  console.log('📝 Seeding quizzes...');
  
  const client = await pool.connect();
  try {
    for (const quiz of seedData.quizzes) {
      // Get course ID
      const courseResult = await client.query(
        'SELECT id FROM courses WHERE title = $1',
        [quiz.courseTitle]
      );
      
      if (courseResult.rows.length === 0) {
        throw new Error(`Course not found: ${quiz.courseTitle}`);
      }
      
      const courseId = courseResult.rows[0].id;
      
      // Create quiz
      const quizResult = await client.query(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING id',
        [courseId, quiz.title]
      );
      
      const quizId = quizResult.rows[0].id;
      
      // Create questions
      for (const question of quiz.questions) {
        await client.query(
          'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4)',
          [quizId, question.prompt, JSON.stringify(question.choices), question.correctIndex]
        );
      }
      
      console.log(`  ✓ Created quiz: ${quiz.title} (${quiz.questions.length} questions)`);
    }
  } finally {
    client.release();
  }
}

async function seedEnrollments() {
  console.log('🎓 Seeding enrollments...');
  
  const client = await pool.connect();
  try {
    for (const enrollment of seedData.enrollments) {
      // Get user and course IDs
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [enrollment.studentEmail]
      );
      
      const courseResult = await client.query(
        'SELECT id FROM courses WHERE title = $1',
        [enrollment.courseTitle]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${enrollment.studentEmail}`);
      }
      
      if (courseResult.rows.length === 0) {
        throw new Error(`Course not found: ${enrollment.courseTitle}`);
      }
      
      const userId = userResult.rows[0].id;
      const courseId = courseResult.rows[0].id;
      
      await client.query(
        'INSERT INTO enrollments (user_id, course_id, status) VALUES ($1, $2, $3)',
        [userId, courseId, enrollment.status]
      );
      
      console.log(`  ✓ Enrolled: ${enrollment.studentEmail} in ${enrollment.courseTitle}`);
    }
  } finally {
    client.release();
  }
}

async function seedProgress() {
  console.log('📊 Seeding progress...');
  
  const client = await pool.connect();
  try {
    for (const progress of seedData.progress) {
      // Get enrollment and lesson IDs
      const enrollmentResult = await client.query(`
        SELECT e.id as enrollment_id 
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE u.email = $1 AND c.title = $2
      `, [progress.studentEmail, progress.courseTitle]);
      
      const lessonResult = await client.query(`
        SELECT l.id as lesson_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE c.title = $1 AND l.title = $2
      `, [progress.courseTitle, progress.lessonTitle]);
      
      if (enrollmentResult.rows.length === 0) {
        console.log(`  ⚠️  Enrollment not found: ${progress.studentEmail} in ${progress.courseTitle}`);
        continue;
      }
      
      if (lessonResult.rows.length === 0) {
        console.log(`  ⚠️  Lesson not found: ${progress.lessonTitle} in ${progress.courseTitle}`);
        continue;
      }
      
      const enrollmentId = enrollmentResult.rows[0].enrollment_id;
      const lessonId = lessonResult.rows[0].lesson_id;
      
      const completedAt = progress.completed && progress.daysAgo 
        ? `current_timestamp - interval '${progress.daysAgo} days'`
        : progress.completed ? 'current_timestamp' : null;
      
      if (completedAt) {
        await client.query(
          `INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at) 
           VALUES ($1, $2, $3, ${completedAt})`,
          [enrollmentId, lessonId, progress.completed]
        );
      } else {
        await client.query(
          'INSERT INTO lesson_progress (enrollment_id, lesson_id, completed) VALUES ($1, $2, $3)',
          [enrollmentId, lessonId, progress.completed]
        );
      }
      
      console.log(`  ✓ Progress: ${progress.lessonTitle} - ${progress.completed ? 'Completed' : 'Started'}`);
    }
  } finally {
    client.release();
  }
}

async function generateSampleCertificate() {
  console.log('🏆 Generating sample certificate...');
  
  const client = await pool.connect();
  try {
    // Find a completed enrollment to generate certificate for
    const completedEnrollment = await client.query(`
      SELECT e.user_id, e.course_id, u.name, c.title
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.status = 'completed'
      LIMIT 1
    `);
    
    if (completedEnrollment.rows.length > 0) {
      const { user_id, course_id, name, title } = completedEnrollment.rows[0];
      const certificateCode = `SEED-${title.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
      
      await client.query(
        'INSERT INTO certificates (user_id, course_id, code) VALUES ($1, $2, $3)',
        [user_id, course_id, certificateCode]
      );
      
      console.log(`  ✓ Certificate generated for ${name}: ${certificateCode}`);
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🌱 Starting LearnLite database seeding...\n');
    console.log('⚠️  WARNING: This will completely clear the database and reset all IDs!\n');
    
    await clearExistingData();
    await seedUsers();
    await seedCourses();
    await seedLessons();
    await seedQuizzes();
    await seedEnrollments();
    await seedProgress();
    await generateSampleCertificate();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${seedData.users.length} users created`);
    console.log(`   • ${seedData.courses.length} courses created`);
    console.log(`   • ${seedData.lessons.length} lessons created`);
    console.log(`   • ${seedData.quizzes.length} quizzes created`);
    console.log(`   • ${seedData.enrollments.length} enrollments created`);
    console.log(`   • ${seedData.progress.length} progress records created`);
    console.log('   • 1 sample certificate generated');
    
    console.log('\n🔑 Test Credentials:');
    console.log('   Admin: admin@learnlite.com / admin123');
    console.log('   Instructor: john.instructor@learnlite.com / instructor123');
    console.log('   Student: alice.student@learnlite.com / student123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
