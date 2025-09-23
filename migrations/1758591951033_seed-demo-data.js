/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // Insert demo users
  pgm.sql(`
    INSERT INTO users (email, password_hash, name, role) VALUES
    ('admin@learnlite.com', '$2b$10$rQZ8kHWiZ8kHWiZ8kHWiZe', 'Admin User', 'admin'),
    ('instructor@learnlite.com', '$2b$10$rQZ8kHWiZ8kHWiZ8kHWiZe', 'John Instructor', 'instructor'),
    ('student@learnlite.com', '$2b$10$rQZ8kHWiZ8kHWiZ8kHWiZe', 'Jane Student', 'student'),
    ('student2@learnlite.com', '$2b$10$rQZ8kHWiZ8kHWiZ8kHWiZe', 'Bob Learner', 'student');
  `);

  // Insert demo course
  pgm.sql(`
    INSERT INTO courses (title, description, price_cents, published, instructor_id) VALUES
    (
      'Introduction to Web Development',
      'Learn the fundamentals of web development including HTML, CSS, and JavaScript. This comprehensive course will take you from beginner to building your first interactive web applications.',
      4999,
      true,
      2
    );
  `);

  // Insert demo lessons
  pgm.sql(`
    INSERT INTO lessons (course_id, title, video_url, content_md, position) VALUES
    (
      1,
      'Getting Started with HTML',
      'https://example.com/videos/html-basics.mp4',
      '# Getting Started with HTML

## What is HTML?

HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page using markup.

## Basic HTML Structure

Every HTML document has a basic structure:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>Page Title</title>
</head>
<body>
    <h1>My First Heading</h1>
    <p>My first paragraph.</p>
</body>
</html>
\`\`\`

## Key Concepts

- **Elements**: The building blocks of HTML
- **Tags**: Keywords surrounded by angle brackets
- **Attributes**: Additional information about elements

## Practice Exercise

Create a simple HTML page with:
1. A title
2. A heading
3. A paragraph
4. A list of your hobbies',
      1
    ),
    (
      1,
      'Styling with CSS',
      'https://example.com/videos/css-basics.mp4',
      '# Styling with CSS

## What is CSS?

CSS (Cascading Style Sheets) is used to style and layout web pages. It controls the presentation of HTML elements.

## CSS Syntax

CSS rules consist of a selector and a declaration block:

\`\`\`css
selector {
    property: value;
    property: value;
}
\`\`\`

## Common Properties

- **color**: Text color
- **background-color**: Background color
- **font-size**: Size of text
- **margin**: Space outside elements
- **padding**: Space inside elements

## Example

\`\`\`css
h1 {
    color: blue;
    font-size: 24px;
    text-align: center;
}

p {
    color: #333;
    line-height: 1.5;
}
\`\`\`

## Practice Exercise

Style your HTML page from the previous lesson:
1. Change the heading color
2. Add a background color
3. Style your list
4. Add some padding and margins',
      2
    ),
    (
      1,
      'JavaScript Fundamentals',
      'https://example.com/videos/js-basics.mp4',
      '# JavaScript Fundamentals

## What is JavaScript?

JavaScript is a programming language that enables interactive web pages. It is an essential part of web applications.

## Variables and Data Types

\`\`\`javascript
// Variables
let name = "John";
const age = 25;
var city = "New York";

// Data types
let number = 42;
let string = "Hello World";
let boolean = true;
let array = [1, 2, 3, 4, 5];
let object = { name: "John", age: 25 };
\`\`\`

## Functions

\`\`\`javascript
// Function declaration
function greet(name) {
    return "Hello, " + name + "!";
}

// Function call
let message = greet("Alice");
console.log(message);
\`\`\`

## DOM Manipulation

\`\`\`javascript
// Select elements
let heading = document.getElementById("myHeading");
let buttons = document.querySelectorAll(".btn");

// Change content
heading.textContent = "New Heading";

// Add event listeners
button.addEventListener("click", function() {
    alert("Button clicked!");
});
\`\`\`

## Practice Exercise

Add interactivity to your web page:
1. Create a button that changes the heading text
2. Add a form that displays user input
3. Create a simple calculator
4. Make a color picker that changes the background',
      3
    );
  `);

  // Insert demo enrollment
  pgm.sql(`
    INSERT INTO enrollments (user_id, course_id, status) VALUES
    (3, 1, 'active'),
    (4, 1, 'active');
  `);

  // Insert demo lesson progress
  pgm.sql(`
    INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at) VALUES
    (1, 1, true, current_timestamp - interval '2 days'),
    (1, 2, true, current_timestamp - interval '1 day'),
    (2, 1, true, current_timestamp - interval '3 days');
  `);

  // Insert demo quiz
  pgm.sql(`
    INSERT INTO quizzes (course_id, title) VALUES
    (1, 'HTML & CSS Knowledge Check');
  `);

  // Insert demo quiz questions
  pgm.sql(`
    INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES
    (
      1,
      'What does HTML stand for?',
      '["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"]',
      0
    ),
    (
      1,
      'Which CSS property is used to change the text color?',
      '["font-color", "text-color", "color", "foreground-color"]',
      2
    ),
    (
      1,
      'What is the correct HTML element for the largest heading?',
      '["<heading>", "<h6>", "<h1>", "<head>"]',
      2
    );
  `);

  // Insert demo quiz submission
  pgm.sql(`
    INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES
    (1, 3, '[0, 2, 2]', 100.00);
  `);

  // Insert demo certificate
  pgm.sql(`
    INSERT INTO certificates (user_id, course_id, code) VALUES
    (3, 1, 'CERT-WEB-DEV-001-2024');
  `);
};

exports.down = pgm => {
  // Delete seed data in reverse order
  pgm.sql('DELETE FROM certificates WHERE code = \'CERT-WEB-DEV-001-2024\'');
  pgm.sql('DELETE FROM quiz_submissions WHERE quiz_id = 1');
  pgm.sql('DELETE FROM quiz_questions WHERE quiz_id = 1');
  pgm.sql('DELETE FROM quizzes WHERE course_id = 1');
  pgm.sql('DELETE FROM lesson_progress WHERE enrollment_id IN (1, 2)');
  pgm.sql('DELETE FROM enrollments WHERE course_id = 1');
  pgm.sql('DELETE FROM lessons WHERE course_id = 1');
  pgm.sql('DELETE FROM courses WHERE instructor_id = 2');
  pgm.sql('DELETE FROM users WHERE email IN (\'admin@learnlite.com\', \'instructor@learnlite.com\', \'student@learnlite.com\', \'student2@learnlite.com\')');
};
