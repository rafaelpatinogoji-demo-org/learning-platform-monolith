import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('QuizzesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create quiz when user is course owner', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'Test Quiz');
    });

    it('should create quiz when user is admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Test Quiz', course_id: 1, created_at: new Date() }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 2);

      expect(result).toHaveProperty('id', 1);
    });

    it('should throw FORBIDDEN when user is neither owner nor admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ instructor_id: 999 }], rowCount: 1 } as any);

      await expect(QuizzesService.createQuiz(1, 'Test Quiz', 3))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw when course does not exist', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.createQuiz(999, 'Test Quiz', 1))
        .rejects.toThrow();
    });
  });

  describe('listQuizzesForCourse', () => {
    it('should return quizzes for published course without userId', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ published: true }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, title: 'Quiz 1', course_id: 1 },
            { id: 2, title: 'Quiz 2', course_id: 1 }
          ],
          rowCount: 2
        } as any);

      const result = await QuizzesService.listQuizzesForCourse(1);

      expect(result).toHaveLength(2);
    });

    it('should return quizzes when user is course owner', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 1 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Quiz 1', course_id: 1 }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.listQuizzesForCourse(1, 1);

      expect(result).toHaveLength(1);
    });

    it('should return quizzes when user is admin', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 999 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Quiz 1', course_id: 1 }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.listQuizzesForCourse(1, 2);

      expect(result).toHaveLength(1);
    });

    it('should throw FORBIDDEN for unpublished course without proper access', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ published: false, instructor_id: 999 }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.listQuizzesForCourse(1, 3))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw when course does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.listQuizzesForCourse(999))
        .rejects.toThrow();
    });
  });

  describe('getQuizById', () => {
    it('should return quiz with questions including correct_index for instructor', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Quiz 1',
            course_id: 1,
            published: true,
            instructor_id: 1,
            created_at: new Date()
          }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              prompt: 'Question 1',
              choices: JSON.stringify(['A', 'B', 'C']),
              correct_index: 1,
              quiz_id: 1
            }
          ],
          rowCount: 1
        } as any);

      const result = await QuizzesService.getQuizById(1, 1);

      expect(result.quiz).toHaveProperty('id', 1);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toHaveProperty('correct_index', 1);
    });

    it('should return quiz with questions excluding correct_index for student', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Quiz 1',
            course_id: 1,
            published: true,
            instructor_id: 999,
            created_at: new Date()
          }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              prompt: 'Question 1',
              choices: JSON.stringify(['A', 'B', 'C']),
              correct_index: 1,
              quiz_id: 1
            }
          ],
          rowCount: 1
        } as any);

      const result = await QuizzesService.getQuizById(1, 2);

      expect(result.quiz).toHaveProperty('id', 1);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).not.toHaveProperty('correct_index');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.getQuizById(999))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_FOUND for unpublished course student access', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            title: 'Quiz 1',
            course_id: 1,
            published: false,
            instructor_id: 999,
            created_at: new Date()
          }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.getQuizById(1, 2))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('createQuestion', () => {
    it('should create question successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            prompt: 'What is 2 + 2?',
            choices: JSON.stringify(['3', '4', '5']),
            correct_index: 1,
            quiz_id: 1
          }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.createQuestion(1, 'What is 2 + 2?', ['3', '4', '5'], 1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('prompt', 'What is 2 + 2?');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quiz_questions'),
        expect.arrayContaining([1, 'What is 2 + 2?', JSON.stringify(['3', '4', '5']), 1])
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.createQuestion(999, 'Test?', ['A', 'B'], 0, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.createQuestion(1, 'Test?', ['A', 'B'], 0, 2))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateQuestion', () => {
    it('should update question prompt only', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, quiz_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            prompt: 'Updated prompt',
            choices: JSON.stringify(['A', 'B']),
            correct_index: 0,
            quiz_id: 1
          }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.updateQuestion(1, 1, { prompt: 'Updated prompt' }, 1);

      expect(result).toHaveProperty('prompt', 'Updated prompt');
    });

    it('should update choices and correct_index with JSONB handling', async () => {
      const newChoices = ['New A', 'New B', 'New C'];
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1, quiz_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            prompt: 'Question',
            choices: JSON.stringify(newChoices),
            correct_index: 2,
            quiz_id: 1
          }],
          rowCount: 1
        } as any);

      const result = await QuizzesService.updateQuestion(
        1,
        1,
        { choices: newChoices, correct_index: 2 },
        1
      );

      expect(result.choices).toEqual(JSON.stringify(newChoices));
      expect(result.correct_index).toBe(2);
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.updateQuestion(999, 1, { prompt: 'Test' }, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not authorized', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.updateQuestion(1, 1, { prompt: 'Test' }, 2))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question successfully', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      await QuizzesService.deleteQuestion(1, 1, 1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM quiz_questions'),
        [1, 1]
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.deleteQuestion(999, 1, 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN when user is not authorized', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.deleteQuestion(1, 1, 2))
        .rejects.toThrow('FORBIDDEN');
    });
  });

  describe('submitQuiz', () => {
    it('should calculate 100% score for all correct answers', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1, 2], 1);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should calculate 0% score for all wrong answers', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [1, 2, 0], 1);

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
    });

    it('should calculate 60% score for 3 out of 5 correct', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 },
            { id: 4, correct_index: 0 },
            { id: 5, correct_index: 1 }
          ],
          rowCount: 5
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await QuizzesService.submitQuiz(1, [0, 1, 2, 1, 2], 1);

      expect(result.score).toBe(60);
      expect(result.correct).toBe(3);
    });

    it('should save submission with JSON stringified answers', async () => {
      const answers = [0, 1, 2];
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      await QuizzesService.submitQuiz(1, answers, 1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quiz_submissions'),
        expect.arrayContaining([1, 1, JSON.stringify(answers), 100])
      );
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.submitQuiz(999, [0, 1], 1))
        .rejects.toThrow('NOT_FOUND');
    });

    it('should throw FORBIDDEN for unpublished course', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, course_id: 1, published: false }],
        rowCount: 1
      } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_ENROLLED when user is not enrolled', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('NOT_ENROLLED');
    });

    it('should throw INVALID_ANSWERS_LENGTH when answer count mismatches', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, published: true }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { id: 1, correct_index: 0 },
            { id: 2, correct_index: 1 },
            { id: 3, correct_index: 2 }
          ],
          rowCount: 3
        } as any);

      await expect(QuizzesService.submitQuiz(1, [0, 1], 1))
        .rejects.toThrow('INVALID_ANSWERS_LENGTH');
    });
  });

  describe('getLatestSubmission', () => {
    it('should return latest submission', async () => {
      const mockSubmission = {
        id: 1,
        quiz_id: 1,
        user_id: 1,
        answers: JSON.stringify([0, 1, 2]),
        score: 100.0,
        submitted_at: new Date()
      };
      
      mockQuery.mockResolvedValueOnce({
        rows: [mockSubmission],
        rowCount: 1
      } as any);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result?.score).toBe(100.0);
      expect(result?.answers).toEqual(JSON.stringify([0, 1, 2]));
    });

    it('should return null when no submission exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await QuizzesService.getLatestSubmission(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('listSubmissions', () => {
    it('should return submissions for course owner', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 1 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'instructor' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              quiz_id: 1,
              user_id: 2,
              user_name: 'Student',
              user_email: 'student@test.com',
              answers: JSON.stringify([0, 1]),
              score: 100.0,
              created_at: new Date()
            }
          ],
          rowCount: 1
        } as any);

      const result = await QuizzesService.listSubmissions(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].user).toHaveProperty('email', 'student@test.com');
    });

    it('should return submissions for admin', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'admin' }], rowCount: 1 } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              quiz_id: 1,
              user_id: 3,
              user_name: 'Student',
              user_email: 'student@test.com',
              answers: JSON.stringify([0]),
              score: 50.0,
              created_at: new Date()
            }
          ],
          rowCount: 1
        } as any);

      const result = await QuizzesService.listSubmissions(1, 2);

      expect(result).toHaveLength(1);
    });

    it('should throw FORBIDDEN when user is not owner or admin', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, course_id: 1, instructor_id: 999 }],
          rowCount: 1
        } as any)
        .mockResolvedValueOnce({ rows: [{ role: 'student' }], rowCount: 1 } as any);

      await expect(QuizzesService.listSubmissions(1, 3))
        .rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND when quiz does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(QuizzesService.listSubmissions(999, 1))
        .rejects.toThrow('NOT_FOUND');
    });
  });
});
