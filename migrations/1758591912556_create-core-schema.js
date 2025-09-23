/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // Create users table
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    role: { 
      type: 'varchar(20)', 
      notNull: true, 
      check: "role IN ('admin', 'instructor', 'student')",
      default: 'student'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create courses table
  pgm.createTable('courses', {
    id: 'id',
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price_cents: { type: 'integer', notNull: true, default: 0 },
    published: { type: 'boolean', notNull: true, default: false },
    instructor_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create lessons table
  pgm.createTable('lessons', {
    id: 'id',
    course_id: {
      type: 'integer',
      notNull: true,
      references: '"courses"',
      onDelete: 'cascade'
    },
    title: { type: 'varchar(255)', notNull: true },
    video_url: { type: 'text' },
    content_md: { type: 'text' },
    position: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create enrollments table
  pgm.createTable('enrollments', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    course_id: {
      type: 'integer',
      notNull: true,
      references: '"courses"',
      onDelete: 'cascade'
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      check: "status IN ('active', 'completed', 'refunded')",
      default: 'active'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create lesson_progress table
  pgm.createTable('lesson_progress', {
    id: 'id',
    enrollment_id: {
      type: 'integer',
      notNull: true,
      references: '"enrollments"',
      onDelete: 'cascade'
    },
    lesson_id: {
      type: 'integer',
      notNull: true,
      references: '"lessons"',
      onDelete: 'cascade'
    },
    completed: { type: 'boolean', notNull: true, default: false },
    completed_at: { type: 'timestamp' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create quizzes table
  pgm.createTable('quizzes', {
    id: 'id',
    course_id: {
      type: 'integer',
      notNull: true,
      references: '"courses"',
      onDelete: 'cascade'
    },
    title: { type: 'varchar(255)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create quiz_questions table
  pgm.createTable('quiz_questions', {
    id: 'id',
    quiz_id: {
      type: 'integer',
      notNull: true,
      references: '"quizzes"',
      onDelete: 'cascade'
    },
    prompt: { type: 'text', notNull: true },
    choices: { type: 'jsonb', notNull: true },
    correct_index: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create quiz_submissions table
  pgm.createTable('quiz_submissions', {
    id: 'id',
    quiz_id: {
      type: 'integer',
      notNull: true,
      references: '"quizzes"',
      onDelete: 'cascade'
    },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    answers: { type: 'jsonb', notNull: true },
    score: { type: 'decimal(5,2)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create certificates table
  pgm.createTable('certificates', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    course_id: {
      type: 'integer',
      notNull: true,
      references: '"courses"',
      onDelete: 'cascade'
    },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    issued_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Create outbox_events table for eventual consistency
  pgm.createTable('outbox_events', {
    id: 'id',
    topic: { type: 'varchar(100)', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    processed: { type: 'boolean', notNull: true, default: false }
  });

  // Add unique constraints
  pgm.addConstraint('enrollments', 'unique_user_course_enrollment', {
    unique: ['user_id', 'course_id']
  });

  pgm.addConstraint('lesson_progress', 'unique_enrollment_lesson_progress', {
    unique: ['enrollment_id', 'lesson_id']
  });

  pgm.addConstraint('certificates', 'unique_user_course_certificate', {
    unique: ['user_id', 'course_id']
  });

  // Add indexes for better query performance
  pgm.createIndex('courses', 'instructor_id');
  pgm.createIndex('lessons', 'course_id');
  pgm.createIndex('lessons', ['course_id', 'position']);
  pgm.createIndex('enrollments', 'user_id');
  pgm.createIndex('enrollments', 'course_id');
  pgm.createIndex('lesson_progress', 'enrollment_id');
  pgm.createIndex('quizzes', 'course_id');
  pgm.createIndex('quiz_questions', 'quiz_id');
  pgm.createIndex('quiz_submissions', 'quiz_id');
  pgm.createIndex('quiz_submissions', 'user_id');
  pgm.createIndex('certificates', 'user_id');
  pgm.createIndex('certificates', 'course_id');
  pgm.createIndex('outbox_events', 'processed');
  pgm.createIndex('outbox_events', ['topic', 'created_at']);
};

exports.down = pgm => {
  // Drop tables in reverse order due to foreign key constraints
  pgm.dropTable('outbox_events');
  pgm.dropTable('certificates');
  pgm.dropTable('quiz_submissions');
  pgm.dropTable('quiz_questions');
  pgm.dropTable('quizzes');
  pgm.dropTable('lesson_progress');
  pgm.dropTable('enrollments');
  pgm.dropTable('lessons');
  pgm.dropTable('courses');
  pgm.dropTable('users');
};
