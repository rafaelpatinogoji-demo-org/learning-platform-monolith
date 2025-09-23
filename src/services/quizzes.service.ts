import { db } from '../db';

export interface Quiz {
  id: number;
  course_id: number;
  title: string;
  created_at: Date;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  created_at: Date;
}

export interface QuizSubmission {
  id: number;
  quiz_id: number;
  user_id: number;
  answers: number[];
  score: number;
  created_at: Date;
}

export interface SubmissionResult {
  total: number;
  correct: number;
  score: number;
  questions: {
    id: number;
    correct: boolean;
  }[];
}

export class QuizzesService {
  /**
   * Create a new quiz for a course
   */
  static async createQuiz(courseId: number, title: string, userId: number): Promise<Quiz> {
    // Check if user owns the course or is admin
    const canModify = await this.canModifyCourseQuizzes(courseId, userId);
    if (!canModify) {
      throw new Error('FORBIDDEN');
    }

    const result = await db.query(
      'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
      [courseId, title]
    );

    return result.rows[0];
  }

  /**
   * List quizzes for a course
   */
  static async listQuizzesForCourse(courseId: number, userId?: number): Promise<Quiz[]> {
    // Check if course is published or user has access
    const hasAccess = await this.canViewCourseQuizzes(courseId, userId);
    if (!hasAccess) {
      throw new Error('FORBIDDEN');
    }

    const result = await db.query(
      'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
      [courseId]
    );

    return result.rows;
  }

  /**
   * Get quiz details with questions
   */
  static async getQuizById(quizId: number, userId?: number): Promise<{quiz: Quiz, questions: Partial<QuizQuestion>[]}> {
    // Get quiz with course info
    const quizResult = await db.query(
      `SELECT q.*, c.published, c.instructor_id 
       FROM quizzes q 
       JOIN courses c ON q.course_id = c.id 
       WHERE q.id = $1`,
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];
    
    // Check access
    const isInstructor = userId && quiz.instructor_id === userId;
    const isAdmin = userId && await this.isAdmin(userId);
    const isStudent = !isInstructor && !isAdmin;
    
    // Students can only see published course quizzes
    if (isStudent && !quiz.published) {
      throw new Error('NOT_FOUND');
    }

    // Get questions
    const questionsResult = await db.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY created_at',
      [quizId]
    );

    // Remove correct_index for students
    const questions = questionsResult.rows.map(q => {
      if (isStudent) {
        const { correct_index, ...questionWithoutAnswer } = q;
        return questionWithoutAnswer;
      }
      return q;
    });

    return {
      quiz: {
        id: quiz.id,
        course_id: quiz.course_id,
        title: quiz.title,
        created_at: quiz.created_at
      },
      questions
    };
  }

  /**
   * Create a quiz question
   */
  static async createQuestion(
    quizId: number,
    prompt: string,
    choices: string[],
    correctIndex: number,
    userId: number
  ): Promise<QuizQuestion> {
    // Get quiz and course info
    const quizResult = await db.query(
      'SELECT q.*, c.instructor_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];
    
    // Check ownership
    const isOwner = quiz.instructor_id === userId;
    const isAdmin = await this.isAdmin(userId);
    
    if (!isOwner && !isAdmin) {
      throw new Error('FORBIDDEN');
    }

    const result = await db.query(
      'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [quizId, prompt, JSON.stringify(choices), correctIndex]
    );

    return result.rows[0];
  }

  /**
   * Update a quiz question
   */
  static async updateQuestion(
    quizId: number,
    questionId: number,
    updates: { prompt?: string; choices?: string[]; correct_index?: number },
    userId: number
  ): Promise<QuizQuestion> {
    // Check ownership
    const quizResult = await db.query(
      'SELECT q.*, c.instructor_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];
    const isOwner = quiz.instructor_id === userId;
    const isAdmin = await this.isAdmin(userId);
    
    if (!isOwner && !isAdmin) {
      throw new Error('FORBIDDEN');
    }

    // Check question exists
    const questionResult = await db.query(
      'SELECT * FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
      [questionId, quizId]
    );

    if (questionResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.prompt !== undefined) {
      updateFields.push(`prompt = $${paramCount++}`);
      values.push(updates.prompt);
    }

    if (updates.choices !== undefined) {
      updateFields.push(`choices = $${paramCount++}`);
      values.push(JSON.stringify(updates.choices));
    }

    if (updates.correct_index !== undefined) {
      updateFields.push(`correct_index = $${paramCount++}`);
      values.push(updates.correct_index);
    }

    if (updateFields.length === 0) {
      return questionResult.rows[0];
    }

    values.push(questionId, quizId);
    const updateQuery = `
      UPDATE quiz_questions 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} AND quiz_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    return result.rows[0];
  }

  /**
   * Delete a quiz question
   */
  static async deleteQuestion(quizId: number, questionId: number, userId: number): Promise<void> {
    // Check ownership
    const quizResult = await db.query(
      'SELECT q.*, c.instructor_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];
    const isOwner = quiz.instructor_id === userId;
    const isAdmin = await this.isAdmin(userId);
    
    if (!isOwner && !isAdmin) {
      throw new Error('FORBIDDEN');
    }

    const result = await db.query(
      'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
      [questionId, quizId]
    );

    if (result.rowCount === 0) {
      throw new Error('NOT_FOUND');
    }
  }

  /**
   * Submit quiz answers
   */
  static async submitQuiz(quizId: number, answers: number[], userId: number): Promise<SubmissionResult> {
    // Get quiz with course info
    const quizResult = await db.query(
      'SELECT q.*, c.published, c.id as course_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];

    // Check course is published
    if (!quiz.published) {
      throw new Error('FORBIDDEN');
    }

    // Check student is enrolled
    const enrollmentResult = await db.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, quiz.course_id, 'active']
    );

    if (enrollmentResult.rows.length === 0) {
      throw new Error('NOT_ENROLLED');
    }

    // Get questions with correct answers
    const questionsResult = await db.query(
      'SELECT id, correct_index FROM quiz_questions WHERE quiz_id = $1 ORDER BY created_at',
      [quizId]
    );

    const questions = questionsResult.rows;

    // Validate answers length
    if (answers.length !== questions.length) {
      throw new Error('INVALID_ANSWERS_LENGTH');
    }

    // Calculate score
    let correct = 0;
    const questionResults = questions.map((q, index) => {
      const isCorrect = answers[index] === q.correct_index;
      if (isCorrect) correct++;
      return {
        id: q.id,
        correct: isCorrect
      };
    });

    const total = questions.length;
    const score = total > 0 ? (correct / total) * 100 : 0;

    // Save submission
    await db.query(
      'INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES ($1, $2, $3, $4)',
      [quizId, userId, JSON.stringify(answers), score]
    );

    return {
      total,
      correct,
      score,
      questions: questionResults
    };
  }

  /**
   * Get student's latest submission
   */
  static async getLatestSubmission(quizId: number, userId: number): Promise<QuizSubmission | null> {
    const result = await db.query(
      'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
      [quizId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * List all submissions for a quiz (instructor/admin only)
   */
  static async listSubmissions(quizId: number, userId: number): Promise<any[]> {
    // Check ownership
    const quizResult = await db.query(
      'SELECT q.*, c.instructor_id FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = $1',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    const quiz = quizResult.rows[0];
    const isOwner = quiz.instructor_id === userId;
    const isAdmin = await this.isAdmin(userId);
    
    if (!isOwner && !isAdmin) {
      throw new Error('FORBIDDEN');
    }

    const result = await db.query(
      `SELECT 
        qs.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email
      FROM quiz_submissions qs
      JOIN users u ON qs.user_id = u.id
      WHERE qs.quiz_id = $1
      ORDER BY qs.created_at DESC`,
      [quizId]
    );

    return result.rows.map(row => ({
      id: row.id,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      },
      score: parseFloat(row.score),
      answers: row.answers,
      created_at: row.created_at
    }));
  }

  /**
   * Check if user can modify course quizzes
   */
  private static async canModifyCourseQuizzes(courseId: number, userId: number): Promise<boolean> {
    // Check if admin
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
      return true;
    }

    // Check if course owner
    const courseResult = await db.query(
      'SELECT instructor_id FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return false;
    }

    return courseResult.rows[0].instructor_id === userId;
  }

  /**
   * Check if user can view course quizzes
   */
  private static async canViewCourseQuizzes(courseId: number, userId?: number): Promise<boolean> {
    const courseResult = await db.query(
      'SELECT published, instructor_id FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return false;
    }

    const course = courseResult.rows[0];

    // Published courses are viewable by all
    if (course.published) {
      return true;
    }

    // Unpublished courses require authentication
    if (!userId) {
      return false;
    }

    // Check if admin
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
      return true;
    }

    // Check if course owner
    return course.instructor_id === userId;
  }

  /**
   * Check if user is admin
   */
  private static async isAdmin(userId: number): Promise<boolean> {
    const result = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0 && result.rows[0].role === 'admin';
  }
}
