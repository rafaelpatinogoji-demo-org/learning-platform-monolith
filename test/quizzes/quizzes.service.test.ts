import { QuizzesService } from '../../src/services/quizzes.service';
import { db } from '../../src/db';

// Mock de la base de datos
jest.mock('../../src/db', () => ({
  db: {
    query: jest.fn()
  }
}));

describe('QuizzesService', () => {
  // Datos de prueba
  const mockQuiz = {
    id: 1,
    course_id: 1,
    title: 'Test Quiz',
    created_at: new Date()
  };

  const mockQuestion = {
    id: 1,
    quiz_id: 1,
    prompt: '¿Cuál es la capital de Francia?',
    choices: ['Londres', 'París', 'Berlín', 'Madrid'],
    correct_index: 1,
    created_at: new Date()
  };

  const mockSubmission = {
    id: 1,
    quiz_id: 1,
    user_id: 2,
    answers: [1, 0],
    score: 1,
    created_at: new Date()
  };

  // Limpiar mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('debe crear un nuevo cuestionario correctamente', async () => {
      // Mock de la función canModifyCourseQuizzes
      jest.spyOn(QuizzesService as any, 'canModifyCourseQuizzes').mockResolvedValue(true);
      
      // Configurar el mock de la base de datos
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockQuiz] });

      const result = await QuizzesService.createQuiz(1, 'Test Quiz', 1);

      expect(result).toEqual(mockQuiz);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO quizzes (course_id, title) VALUES ($1, $2) RETURNING *',
        [1, 'Test Quiz']
      );
    });

    it('debe lanzar un error si el usuario no tiene permisos', async () => {
      jest.spyOn(QuizzesService as any, 'canModifyCourseQuizzes').mockResolvedValue(false);
      
      await expect(QuizzesService.createQuiz(1, 'Test Quiz', 1))
        .rejects
        .toThrow('FORBIDDEN');
    });
  });

  describe('listQuizzesForCourse', () => {
    it('debe listar los cuestionarios de un curso', async () => {
      jest.spyOn(QuizzesService as any, 'canViewCourseQuizzes').mockResolvedValue(true);
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockQuiz] });

      const result = await QuizzesService.listQuizzesForCourse(1, 1);

      expect(result).toEqual([mockQuiz]);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
        [1]
      );
    });
  });

  describe('getQuizById', () => {
    it('debe devolver un cuestionario con sus preguntas', async () => {
      // Mock para la consulta del quiz
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          ...mockQuiz,
          published: true,
          instructor_id: 1
        }]
      });

      // Mock para la consulta de preguntas
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockQuestion]
      });

      // Mock para isAdmin
      jest.spyOn(QuizzesService as any, 'isAdmin').mockResolvedValue(false);

      const result = await QuizzesService.getQuizById(1, 1);

      expect(result.quiz).toEqual(mockQuiz);
      expect(result.questions).toHaveLength(1);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('debe ocultar las respuestas correctas a los estudiantes', async () => {
      // Mock para la consulta del quiz (curso publicado)
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          ...mockQuiz,
          published: true,
          instructor_id: 2 // Diferente al usuario actual
        }]
      });

      // Mock para la consulta de preguntas
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockQuestion]
      });

      // Mock para isAdmin (no es admin)
      jest.spyOn(QuizzesService as any, 'isAdmin').mockResolvedValue(false);

      const result = await QuizzesService.getQuizById(1, 1); // user_id = 1
      
      // Verificar que se haya eliminado correct_index
      expect(result.questions[0].correct_index).toBeUndefined();
    });
  });

  describe('createQuestion', () => {
    it('debe crear una pregunta correctamente', async () => {
      // Mock para la consulta del quiz
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          instructor_id: 1 // El usuario es el instructor
        }]
      });

      // Mock para la inserción de la pregunta
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockQuestion]
      });

      // Mock para isAdmin (no es necesario en este caso)
      jest.spyOn(QuizzesService as any, 'isAdmin').mockResolvedValue(false);

      const result = await QuizzesService.createQuestion(
        1, // quizId
        '¿Cuál es la capital de Francia?',
        ['Londres', 'París', 'Berlín', 'Madrid'],
        1, // correct_index
        1  // userId (instructor)
      );

      expect(result).toEqual(mockQuestion);
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO quiz_questions (quiz_id, prompt, choices, correct_index) VALUES ($1, $2, $3, $4) RETURNING *',
        [1, '¿Cuál es la capital de Francia?', '["Londres","París","Berlín","Madrid"]', 1]
      );
    });
  });

  describe('submitQuiz', () => {
    it("debe calcular la puntuación correctamente", async () => {
      // Mock para obtener el quiz con información del curso
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          course_id: 1,
          title: "Test Quiz",
          published: true,
          created_at: new Date()
        }]
      });

      // Mock para verificar la inscripción del estudiante
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 2,
          course_id: 1,
          status: "active"
        }]
      });

      // Mock para obtener las preguntas del cuestionario
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: 1, correct_index: 1 }, // Respuesta correcta
          { id: 2, correct_index: 0 }  // Respuesta incorrecta
        ]
      });

      // Mock para la inserción del envío
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: []
      });

      const result = await QuizzesService.submitQuiz(
        1, // quizId
        [1, 1], // answers
        2 // userId
      );
      expect(result.score).toBe(50);
      expect(result.total).toBe(2);
      expect(result.correct).toBe(1);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].correct).toBe(true);
      expect(result.questions[1].correct).toBe(false);
    });
  });
});
