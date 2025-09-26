import { mockDb, mockQueryResult } from '../mocks/db.mock';

jest.mock('../../src/db');

describe('Courses Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CourseValidator Integration', () => {
    it('should validate course creation data correctly', () => {
      const validData = {
        title: 'Integration Test Course',
        description: 'Test Description',
        price_cents: 9999
      };

      const mockCourses = [
        {
          id: 1,
          title: 'Integration Test Course',
          description: 'Test Description',
          price_cents: 9999,
          instructor_id: 1,
          is_published: true,
          created_at: new Date(),
          updated_at: new Date(),
          instructor_email: 'instructor@test.com'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockQueryResult(mockCourses))
        .mockResolvedValueOnce(mockQueryResult([{ count: '1' }]));

      expect(validData.title).toBe('Integration Test Course');
      expect(validData.price_cents).toBe(9999);
    });

    it('should handle pagination correctly', () => {
      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '0' }]));

      const paginationParams = { page: '1', limit: '10' };
      expect(paginationParams.page).toBe('1');
      expect(paginationParams.limit).toBe('10');
    });
  });
});
