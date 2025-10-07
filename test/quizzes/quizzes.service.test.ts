import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';
import { mockDbQuery, mockDbQueryOnce, clearDbMocks } from '../setup';

describe('QuizzesService', () => {
  beforeEach(() => {
    clearDbMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz when user is course instructor', async () => {
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rows: [{ instructor_id: 1 }] });
      mockDbQueryOnce({ 
        rows: [{ id: 1, course_id: 1, title: 'Test Quiz', created_at: new Date() }] 
      });

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 1);
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Quiz');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [1, 'Test Quiz']
      );
    });

    it('should create quiz when user is admin', async () => {
      mockDbQueryOnce({ rows: [{ role: 'admin' }] });
      mockDbQueryOnce({ 
        rows: [{ id: 1, course_id: 1, title: 'Admin Quiz', created_at: new Date() }] 
      });

      const result = await QuizzesService.createQuiz(1, 'Admin Quiz', 2);
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Admin Quiz');
    });

    it('should throw FORBIDDEN when user is not course instructor or admin', async () => {
      mockDbQueryOnce({ rows: [{ role: 'student' }] });
      mockDbQueryOnce({ rows: [{ instructor_id: 5 }] });

      await expect(QuizzesService.createQuiz(1, 'Test', 1))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should list quizzes for published course', async () => {
      mockDbQueryOnce({ rows: [{ published: true, instructor_id: 1 }] });
      mockDbQueryOnce({ 
        rows: [
          { id: 1, course_id: 1, title: 'Quiz 1', created_at: new Date() },
          { id: 2, course_id: 1, title: 'Quiz 2', created_at: new Date() }
        ] 
      });

      const result = await QuizzesService.listQuizzesForCourse(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Quiz 1');
    });

    it('should throw FORBIDDEN for unpublished course without authentication', async () => {
      mockDbQueryOnce({ rows: [{ published: false, instructor_id: 1 }] });

      await expect(QuizzesService.listQuizzesForCourse(1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should allow instructor to view unpublished course quizzes', async () => {
      mockDbQueryOnce({ rows: [{ published: false, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rows: [] });

      const result = await QuizzesService.listQuizzesForCourse(1, 1);
      
      expect(result).toEqual([]);
    });
  });

  describe('getQuizById', () => {
    it('should return quiz with questions hiding correct_index for students', async () => {
      mockDbQueryOnce({
        rows: [{ 
          id: 1, 
          course_id: 1, 
          title: 'Quiz', 
          published: true, 
          instructor_id: 2,
          created_at: new Date()
        }]
      });
      mockDbQueryOnce({ rows: [{ role: 'student' }] });
      mockDbQueryOnce({
        rows: [
          { 
            id: 1, 
            quiz_id: 1, 
            prompt: 'Question 1?', 
            choices: ['A', 'B', 'C'], 
            correct_index: 1,
            created_at: new Date()
          }
        ]
      });

      const result = await QuizzesService.getQuizById(1, 3);
      
      expect(result.quiz.title).toBe('Quiz');
      expect(result.questions[0].prompt).toBe('Question 1?');
      expect(result.questions[0]).not.toHaveProperty('correct_index');
    });

    it('should return quiz with correct_index for instructors', async () => {
      mockDbQueryOnce({
        rows: [{ 
          id: 1, 
          course_id: 1, 
          title: 'Quiz', 
          published: true, 
          instructor_id: 1,
          created_at: new Date()
        }]
      });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({
        rows: [
          { 
            id: 1, 
            quiz_id: 1, 
            prompt: 'Question?', 
            choices: ['A', 'B'], 
            correct_index: 0,
            created_at: new Date()
          }
        ]
      });

      const result = await QuizzesService.getQuizById(1, 1);
      
      expect(result.questions[0]).toHaveProperty('correct_index', 0);
    });

    it('should throw NOT_FOUND for non-existent quiz', async () => {
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.getQuizById(999))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND for students viewing unpublished course quiz', async () => {
      mockDbQueryOnce({
        rows: [{ 
          id: 1, 
          course_id: 1, 
          title: 'Quiz', 
          published: false, 
          instructor_id: 2,
          created_at: new Date()
        }]
      });
      mockDbQueryOnce({ rows: [{ role: 'student' }] });

      await expect(QuizzesService.getQuizById(1, 3))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create question with JSONB choices', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({
        rows: [{
          id: 1,
          quiz_id: 1,
          prompt: 'What is 2+2?',
          choices: ['3', '4', '5'],
          correct_index: 1,
          created_at: new Date()
        }]
      });

      const result = await QuizzesService.createQuestion(
        1, 
        'What is 2+2?', 
        ['3', '4', '5'], 
        1, 
        1
      );

      expect(result.prompt).toBe('What is 2+2?');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [1, 'What is 2+2?', JSON.stringify(['3', '4', '5']), 1]
      );
    });

    it('should throw NOT_FOUND for non-existent quiz', async () => {
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.createQuestion(999, 'Q?', ['A', 'B'], 0, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not quiz owner', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 2 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });

      await expect(QuizzesService.createQuestion(1, 'Q?', ['A', 'B'], 0, 1))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update question prompt only', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({
        rows: [{ id: 1, quiz_id: 1, prompt: 'Old', choices: ['A', 'B'], correct_index: 0 }]
      });
      mockDbQueryOnce({
        rows: [{ id: 1, quiz_id: 1, prompt: 'New', choices: ['A', 'B'], correct_index: 0 }]
      });

      const result = await QuizzesService.updateQuestion(
        1, 1, { prompt: 'New' }, 1
      );

      expect(result.prompt).toBe('New');
    });

    it('should update all fields when provided', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rows: [{ id: 1, quiz_id: 1 }] });
      mockDbQueryOnce({
        rows: [{
          id: 1,
          quiz_id: 1,
          prompt: 'Updated?',
          choices: ['X', 'Y', 'Z'],
          correct_index: 2
        }]
      });

      const result = await QuizzesService.updateQuestion(
        1, 1, 
        { prompt: 'Updated?', choices: ['X', 'Y', 'Z'], correct_index: 2 }, 
        1
      );

      expect(result.prompt).toBe('Updated?');
      expect(result.correct_index).toBe(2);
    });

    it('should return unchanged question when no updates provided', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      const existingQuestion = { 
        id: 1, quiz_id: 1, prompt: 'Q?', choices: ['A'], correct_index: 0 
      };
      mockDbQueryOnce({ rows: [existingQuestion] });

      const result = await QuizzesService.updateQuestion(1, 1, {}, 1);

      expect(result).toEqual(existingQuestion);
    });

    it('should throw NOT_FOUND for non-existent question', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.updateQuestion(1, 999, { prompt: 'New' }, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question when authorized', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rowCount: 1 });

      await QuizzesService.deleteQuestion(1, 1, 1);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM quiz_questions WHERE id = $1 AND quiz_id = $2',
        [1, 1]
      );
    });

    it('should throw NOT_FOUND when question does not exist', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({ rowCount: 0 });

      await expect(QuizzesService.deleteQuestion(1, 999, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('submitQuiz', () => {
    it('should calculate score correctly with all correct answers', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 },
          { id: 3, correct_index: 2 }
        ]
      });
      mockDbQueryOnce({ rows: [] });

      const result = await QuizzesService.submitQuiz(1, [0, 1, 2], 1);

      expect(result.total).toBe(3);
      expect(result.correct).toBe(3);
      expect(result.score).toBe(100);
      expect(result.questions).toHaveLength(3);
      expect(result.questions.every(q => q.correct)).toBe(true);
    });

    it('should calculate score correctly with some correct answers', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 },
          { id: 3, correct_index: 2 },
          { id: 4, correct_index: 0 }
        ]
      });
      mockDbQueryOnce({ rows: [] });

      const result = await QuizzesService.submitQuiz(1, [0, 0, 2, 1], 1);

      expect(result.total).toBe(4);
      expect(result.correct).toBe(2);
      expect(result.score).toBe(50);
      expect(result.questions[0].correct).toBe(true);
      expect(result.questions[1].correct).toBe(false);
    });

    it('should calculate score as 0 for all wrong answers', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 }
        ]
      });
      mockDbQueryOnce({ rows: [] });

      const result = await QuizzesService.submitQuiz(1, [1, 0], 1);

      expect(result.correct).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should handle empty quiz with 0 questions', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({ rows: [] });
      mockDbQueryOnce({ rows: [] });

      const result = await QuizzesService.submitQuiz(1, [], 1);

      expect(result.total).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should throw NOT_FOUND for non-existent quiz', async () => {
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.submitQuiz(999, [0], 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN for unpublished course', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: false }]
      });

      await expect(QuizzesService.submitQuiz(1, [0], 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.submitQuiz(1, [0], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw NOT_ENROLLED when enrollment is inactive', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.submitQuiz(1, [0], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatches', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({
        rows: [
          { id: 1, correct_index: 0 },
          { id: 2, correct_index: 1 },
          { id: 3, correct_index: 2 }
        ]
      });

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });

    it('should save submission with JSONB answers array', async () => {
      mockDbQueryOnce({
        rows: [{ id: 1, course_id: 1, published: true }]
      });
      mockDbQueryOnce({
        rows: [{ user_id: 1, course_id: 1, status: 'active' }]
      });
      mockDbQueryOnce({
        rows: [{ id: 1, correct_index: 1 }]
      });
      mockDbQueryOnce({ rows: [] });

      await QuizzesService.submitQuiz(1, [1], 1);

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_submissions (quiz_id, user_id, answers, score) VALUES ($1, $2, $3, $4)',
        [1, 1, JSON.stringify([1]), 100]
      );
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission for user', async () => {
      const submission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: [0, 1],
        score: 50,
        created_at: new Date()
      };
      mockDbQuery({ rows: [submission] });

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toEqual(submission);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [1, 1]
      );
    });

    it('should return null when no submission exists', async () => {
      mockDbQuery({ rows: [] });

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should list all submissions when user is quiz owner', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 1 }] });
      mockDbQueryOnce({ rows: [{ role: 'instructor' }] });
      mockDbQueryOnce({
        rows: [
          {
            id: 1,
            user_id: 10,
            user_name: 'Student 1',
            user_email: 'student1@test.com',
            score: 80,
            answers: [0, 1, 2],
            created_at: new Date()
          },
          {
            id: 2,
            user_id: 11,
            user_name: 'Student 2',
            user_email: 'student2@test.com',
            score: 90,
            answers: [0, 1, 0],
            created_at: new Date()
          }
        ]
      });

      const result = await QuizzesService.listSubmissions(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].user.name).toBe('Student 1');
      expect(result[0].score).toBe(80);
      expect(result[1].user.name).toBe('Student 2');
    });

    it('should throw FORBIDDEN when user is not authorized', async () => {
      mockDbQueryOnce({ rows: [{ id: 1, instructor_id: 2 }] });
      mockDbQueryOnce({ rows: [{ role: 'student' }] });

      await expect(QuizzesService.listSubmissions(1, 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND for non-existent quiz', async () => {
      mockDbQueryOnce({ rows: [] });

      await expect(QuizzesService.listSubmissions(999, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });
});
