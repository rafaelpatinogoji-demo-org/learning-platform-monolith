import { CourseValidator, LessonValidator } from '../../src/utils/validation';

describe('CourseValidator', () => {
  describe('validateCreateCourse', () => {
    it('should validate a valid course creation', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Introduction to TypeScript',
        description: 'Learn TypeScript basics',
        price_cents: 9999,
        instructor_id: 1
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing title', () => {
      const result = CourseValidator.validateCreateCourse({ price_cents: 1000 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty string title', () => {
      const result = CourseValidator.validateCreateCourse({ title: '   ', price_cents: 1000 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should accept short title', () => {
      const result = CourseValidator.validateCreateCourse({ title: 'a', price_cents: 1000 });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title that is too long', () => {
      const result = CourseValidator.validateCreateCourse({ 
        title: 'a'.repeat(256), 
        price_cents: 1000 
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should reject non-string title', () => {
      const result = CourseValidator.validateCreateCourse({ title: 123, price_cents: 1000 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject missing price_cents', () => {
      const result = CourseValidator.validateCreateCourse({ title: 'Test Course' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price is required'
      });
    });

    it('should reject negative price_cents', () => {
      const result = CourseValidator.validateCreateCourse({ title: 'Test Course', price_cents: -100 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept zero price_cents for free courses', () => {
      const result = CourseValidator.validateCreateCourse({ title: 'Free Course', price_cents: 0 });

      expect(result.isValid).toBe(true);
    });

    it('should reject non-numeric price_cents', () => {
      const result = CourseValidator.validateCreateCourse({ title: 'Test Course', price_cents: 'invalid' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price must be a valid number'
      });
    });

    it('should accept valid description', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        description: 'This is a valid description',
        price_cents: 1000
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept long description', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        description: 'a'.repeat(10000),
        price_cents: 1000
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string description', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        description: 123,
        price_cents: 1000
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Description must be a string'
      });
    });

    it('should accept missing instructor_id', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        price_cents: 1000
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-integer instructor_id', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        price_cents: 1000,
        instructor_id: 'invalid'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should reject zero or negative instructor_id', () => {
      const result = CourseValidator.validateCreateCourse({
        title: 'Test Course',
        price_cents: 1000,
        instructor_id: 0
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'instructor_id',
        message: 'Instructor ID must be a positive integer'
      });
    });

    it('should collect multiple validation errors', () => {
      const result = CourseValidator.validateCreateCourse({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateCourse', () => {
    it('should validate a valid course update', () => {
      const result = CourseValidator.validateUpdateCourse({
        title: 'Updated Title',
        price_cents: 1999
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow empty update object', () => {
      const result = CourseValidator.validateUpdateCourse({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty string title if provided', () => {
      const result = CourseValidator.validateUpdateCourse({ title: '   ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should accept short title if provided', () => {
      const result = CourseValidator.validateUpdateCourse({ title: 'a' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative price_cents if provided', () => {
      const result = CourseValidator.validateUpdateCourse({ price_cents: -100 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'price_cents',
        message: 'Price cannot be negative'
      });
    });

    it('should accept long description if provided', () => {
      const result = CourseValidator.validateUpdateCourse({ description: 'a'.repeat(10000) });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('normalizePrice', () => {
    it('should handle integer price correctly', () => {
      expect(CourseValidator.normalizePrice(1000)).toBe(1000);
    });

    it('should convert string integer to number', () => {
      expect(CourseValidator.normalizePrice('1000')).toBe(1000);
    });

    it('should convert decimal dollar amount to cents', () => {
      expect(CourseValidator.normalizePrice(19.99)).toBe(1999);
    });

    it('should convert string decimal to cents', () => {
      expect(CourseValidator.normalizePrice('19.99')).toBe(1999);
    });

    it('should handle zero price', () => {
      expect(CourseValidator.normalizePrice(0)).toBe(0);
    });

    it('should handle string zero', () => {
      expect(CourseValidator.normalizePrice('0')).toBe(0);
    });

    it('should return null for non-numeric string', () => {
      expect(CourseValidator.normalizePrice('invalid')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(CourseValidator.normalizePrice(undefined)).toBeNull();
    });

    it('should return null for null', () => {
      expect(CourseValidator.normalizePrice(null)).toBeNull();
    });
  });

  describe('validatePagination', () => {
    it('should return default values for empty query', () => {
      const result = CourseValidator.validatePagination({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should parse valid page and limit', () => {
      const result = CourseValidator.validatePagination({ page: '2', limit: '50' });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should default to page 1 for invalid page', () => {
      const result = CourseValidator.validatePagination({ page: 'invalid' });

      expect(result.page).toBe(1);
    });

    it('should default to limit 10 for invalid limit', () => {
      const result = CourseValidator.validatePagination({ limit: 'invalid' });

      expect(result.limit).toBe(10);
    });

    it('should cap limit at 100', () => {
      const result = CourseValidator.validatePagination({ limit: '150' });

      expect(result.limit).toBe(10);
    });

    it('should handle string numbers', () => {
      const result = CourseValidator.validatePagination({ page: '3', limit: '25' });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
    });
  });

  describe('sanitizeSearch', () => {
    it('should trim whitespace from search query', () => {
      const result = CourseValidator.sanitizeSearch('  test query  ');

      expect(result).toBe('test query');
    });

    it('should return undefined for undefined input', () => {
      const result = CourseValidator.sanitizeSearch(undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const result = CourseValidator.sanitizeSearch(null);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = CourseValidator.sanitizeSearch('   ');

      expect(result).toBeUndefined();
    });

    it('should preserve internal spaces', () => {
      const result = CourseValidator.sanitizeSearch('  test   query  ');

      expect(result).toBe('test   query');
    });
  });
});

describe('LessonValidator', () => {
  describe('validateCreateLesson', () => {
    it('should validate a valid lesson creation', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Introduction to Variables',
        video_url: 'https://example.com/video.mp4',
        content_md: '# Lesson Content'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing title', () => {
      const result = LessonValidator.validateCreateLesson({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a string'
      });
    });

    it('should reject empty string title', () => {
      const result = LessonValidator.validateCreateLesson({ title: '   ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should accept short title', () => {
      const result = LessonValidator.validateCreateLesson({ title: 'a' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title that is too long', () => {
      const result = LessonValidator.validateCreateLesson({ 
        title: 'a'.repeat(256)
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should accept valid video_url', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        video_url: 'https://example.com/video.mp4'
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid video_url', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        video_url: 'not-a-url'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should reject video_url with invalid protocol', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        video_url: 'ftp://example.com/video.mp4'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept valid content_md', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        content_md: '# Introduction\n\nThis is some content.'
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept long content_md', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        content_md: 'a'.repeat(100000)
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow lesson without video_url or content_md', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson'
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept valid position', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        position: 5
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject negative position', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        position: -1
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should reject zero position', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        position: 0
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should reject non-integer position', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson',
        position: 1.5
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'position',
        message: 'Position must be a positive integer'
      });
    });

    it('should accept lesson without course_id in validator', () => {
      const result = LessonValidator.validateCreateLesson({ title: 'Test Lesson' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not validate course_id', () => {
      const result = LessonValidator.validateCreateLesson({
        title: 'Test Lesson'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUpdateLesson', () => {
    it('should validate a valid lesson update', () => {
      const result = LessonValidator.validateUpdateLesson({
        title: 'Updated Title',
        video_url: 'https://example.com/new-video.mp4'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow empty update object', () => {
      const result = LessonValidator.validateUpdateLesson({});

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty string title if provided', () => {
      const result = LessonValidator.validateUpdateLesson({ title: '   ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title cannot be empty'
      });
    });

    it('should reject invalid video_url if provided', () => {
      const result = LessonValidator.validateUpdateLesson({ video_url: 'not-a-url' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'video_url',
        message: 'Video URL must be a valid URL'
      });
    });

    it('should accept long content_md if provided', () => {
      const result = LessonValidator.validateUpdateLesson({ content_md: 'a'.repeat(100000) });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateReorder', () => {
    it('should validate valid reorder data', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1, 2, 3] });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing lessonIds', () => {
      const result = LessonValidator.validateReorder({});

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array is required'
      });
    });

    it('should reject non-array lessonIds', () => {
      const result = LessonValidator.validateReorder({ lessonIds: 'not-an-array' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must be an array'
      });
    });

    it('should reject empty lessonIds array', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [] });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs array cannot be empty'
      });
    });

    it('should reject lessonIds with non-integer elements', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1, 'two', 3] });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should reject lessonIds with negative numbers', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1, -2, 3] });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should reject lessonIds with zero', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1, 0, 3] });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Invalid lesson ID at index 1: must be a positive integer'
      });
    });

    it('should reject lessonIds with duplicate values', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1, 2, 2, 3] });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lessonIds',
        message: 'Lesson IDs must not contain duplicates'
      });
    });

    it('should handle single lesson reorder', () => {
      const result = LessonValidator.validateReorder({ lessonIds: [1] });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
