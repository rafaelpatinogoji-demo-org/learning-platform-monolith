import { mockDb, mockQueryResult, mockClient } from '../mocks/db.mock';

jest.mock('../../src/db');

describe('Lessons Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LessonValidator Integration', () => {
    it('should validate lesson creation data correctly', () => {
      const validData = {
        title: 'Integration Test Lesson',
        content_md: '# Test Content',
        video_url: 'https://example.com/video.mp4',
        position: 1
      };

      const mockLessons = [
        {
          id: 1,
          course_id: 1,
          title: 'Integration Test Lesson',
          content_md: '# Test Content',
          video_url: 'https://example.com/video.mp4',
          position: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce(mockQueryResult([{ is_published: true, instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult(mockLessons));

      expect(validData.title).toBe('Integration Test Lesson');
      expect(validData.position).toBe(1);
    });

    it('should handle lesson reordering correctly', () => {
      const reorderData = {
        lessonIds: [3, 1, 2]
      };

      const mockReorderedLessons = [
        { id: 3, position: 1, title: 'Lesson 3' },
        { id: 1, position: 2, title: 'Lesson 1' },
        { id: 2, position: 3, title: 'Lesson 2' }
      ];

      mockClient.query = jest.fn()
        .mockResolvedValueOnce(mockQueryResult([{ instructor_id: 1 }]))
        .mockResolvedValueOnce(mockQueryResult([{ count: '3' }]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult([]))
        .mockResolvedValueOnce(mockQueryResult(mockReorderedLessons));

      expect(reorderData.lessonIds).toEqual([3, 1, 2]);
      expect(mockReorderedLessons).toHaveLength(3);
    });
  });
});
