export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class CourseValidator {
  /**
   * Validate course creation data
   */
  static validateCreateCourse(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push({ field: 'title', message: 'Title is required and must be a string' });
    } else if (data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
    }

    // Description validation (optional)
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      }
    }

    // Price validation
    if (data.price_cents === undefined || data.price_cents === null) {
      errors.push({ field: 'price_cents', message: 'Price is required' });
    } else {
      const price = this.normalizePrice(data.price_cents);
      if (price === null) {
        errors.push({ field: 'price_cents', message: 'Price must be a valid number' });
      } else if (price < 0) {
        errors.push({ field: 'price_cents', message: 'Price cannot be negative' });
      }
    }

    // Instructor ID validation (optional, for admin use)
    if (data.instructor_id !== undefined && data.instructor_id !== null) {
      if (!Number.isInteger(data.instructor_id) || data.instructor_id <= 0) {
        errors.push({ field: 'instructor_id', message: 'Instructor ID must be a positive integer' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate course update data
   */
  static validateUpdateCourse(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation (optional for updates)
    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        errors.push({ field: 'title', message: 'Title must be a string' });
      } else if (data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title cannot be empty' });
      } else if (data.title.length > 255) {
        errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
      }
    }

    // Description validation (optional)
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push({ field: 'description', message: 'Description must be a string' });
      }
    }

    // Price validation (optional for updates)
    if (data.price_cents !== undefined && data.price_cents !== null) {
      const price = this.normalizePrice(data.price_cents);
      if (price === null) {
        errors.push({ field: 'price_cents', message: 'Price must be a valid number' });
      } else if (price < 0) {
        errors.push({ field: 'price_cents', message: 'Price cannot be negative' });
      }
    }

    // Instructor ID validation (optional, admin only)
    if (data.instructor_id !== undefined && data.instructor_id !== null) {
      if (!Number.isInteger(data.instructor_id) || data.instructor_id <= 0) {
        errors.push({ field: 'instructor_id', message: 'Instructor ID must be a positive integer' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize price to integer cents
   * Accepts numbers, strings, and handles decimal conversion
   */
  static normalizePrice(price: any): number | null {
    if (typeof price === 'number') {
      if (isNaN(price) || !isFinite(price)) {
        return null;
      }
      // Convert to cents if it looks like a dollar amount (has decimals)
      if (price % 1 !== 0) {
        return Math.round(price * 100);
      }
      return Math.round(price);
    }

    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      if (isNaN(parsed) || !isFinite(parsed)) {
        return null;
      }
      // Convert to cents if it has decimals
      if (parsed % 1 !== 0) {
        return Math.round(parsed * 100);
      }
      return Math.round(parsed);
    }

    return null;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(query: any): { page: number; limit: number } {
    let page = 1;
    let limit = 10;

    if (query.page) {
      const parsedPage = parseInt(query.page);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }

    if (query.limit) {
      const parsedLimit = parseInt(query.limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    return { page, limit };
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearch(search: any): string | undefined {
    if (typeof search === 'string' && search.trim().length > 0) {
      return search.trim();
    }
    return undefined;
  }
}

export class QuizValidator {
  /**
   * Validate quiz creation data
   */
  static validateCreateQuiz(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push({ field: 'title', message: 'Title is required and must be a string' });
    } else if (data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quiz question creation data
   */
  static validateCreateQuestion(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Prompt validation
    if (!data.prompt || typeof data.prompt !== 'string') {
      errors.push({ field: 'prompt', message: 'Prompt is required and must be a string' });
    } else if (data.prompt.trim().length === 0) {
      errors.push({ field: 'prompt', message: 'Prompt cannot be empty' });
    }

    // Choices validation
    if (!data.choices) {
      errors.push({ field: 'choices', message: 'Choices array is required' });
    } else if (!Array.isArray(data.choices)) {
      errors.push({ field: 'choices', message: 'Choices must be an array' });
    } else if (data.choices.length < 2) {
      errors.push({ field: 'choices', message: 'At least 2 choices are required' });
    } else {
      // Validate each choice
      for (let i = 0; i < data.choices.length; i++) {
        if (typeof data.choices[i] !== 'string' || data.choices[i].trim().length === 0) {
          errors.push({ 
            field: 'choices', 
            message: `Choice at index ${i} must be a non-empty string` 
          });
          break;
        }
      }
    }

    // Correct index validation
    if (data.correct_index === undefined || data.correct_index === null) {
      errors.push({ field: 'correct_index', message: 'Correct index is required' });
    } else if (!Number.isInteger(data.correct_index)) {
      errors.push({ field: 'correct_index', message: 'Correct index must be an integer' });
    } else if (data.choices && Array.isArray(data.choices)) {
      if (data.correct_index < 0 || data.correct_index >= data.choices.length) {
        errors.push({ 
          field: 'correct_index', 
          message: `Correct index must be between 0 and ${data.choices.length - 1}` 
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quiz question update data
   */
  static validateUpdateQuestion(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Prompt validation (optional for updates)
    if (data.prompt !== undefined) {
      if (typeof data.prompt !== 'string') {
        errors.push({ field: 'prompt', message: 'Prompt must be a string' });
      } else if (data.prompt.trim().length === 0) {
        errors.push({ field: 'prompt', message: 'Prompt cannot be empty' });
      }
    }

    // Choices validation (optional for updates)
    if (data.choices !== undefined) {
      if (!Array.isArray(data.choices)) {
        errors.push({ field: 'choices', message: 'Choices must be an array' });
      } else if (data.choices.length < 2) {
        errors.push({ field: 'choices', message: 'At least 2 choices are required' });
      } else {
        // Validate each choice
        for (let i = 0; i < data.choices.length; i++) {
          if (typeof data.choices[i] !== 'string' || data.choices[i].trim().length === 0) {
            errors.push({ 
              field: 'choices', 
              message: `Choice at index ${i} must be a non-empty string` 
            });
            break;
          }
        }
      }
    }

    // Correct index validation (optional for updates)
    if (data.correct_index !== undefined) {
      if (!Number.isInteger(data.correct_index)) {
        errors.push({ field: 'correct_index', message: 'Correct index must be an integer' });
      } else if (data.choices && Array.isArray(data.choices)) {
        if (data.correct_index < 0 || data.correct_index >= data.choices.length) {
          errors.push({ 
            field: 'correct_index', 
            message: `Correct index must be between 0 and ${data.choices.length - 1}` 
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quiz submission
   */
  static validateSubmission(data: any, questionCount: number): ValidationResult {
    const errors: ValidationError[] = [];

    // Answers validation
    if (!data.answers) {
      errors.push({ field: 'answers', message: 'Answers array is required' });
    } else if (!Array.isArray(data.answers)) {
      errors.push({ field: 'answers', message: 'Answers must be an array' });
    } else if (data.answers.length !== questionCount) {
      errors.push({ 
        field: 'answers', 
        message: `Expected ${questionCount} answers, got ${data.answers.length}` 
      });
    } else {
      // Validate each answer is a valid integer
      for (let i = 0; i < data.answers.length; i++) {
        if (!Number.isInteger(data.answers[i]) || data.answers[i] < 0) {
          errors.push({ 
            field: 'answers', 
            message: `Answer at index ${i} must be a non-negative integer` 
          });
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class LessonValidator {
  /**
   * Validate lesson creation data
   */
  static validateCreateLesson(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push({ field: 'title', message: 'Title is required and must be a string' });
    } else if (data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
    }

    // Content markdown validation (optional)
    if (data.content_md !== undefined && data.content_md !== null) {
      if (typeof data.content_md !== 'string') {
        errors.push({ field: 'content_md', message: 'Content must be a string' });
      }
    }

    // Video URL validation (optional)
    if (data.video_url !== undefined && data.video_url !== null && data.video_url !== '') {
      if (typeof data.video_url !== 'string') {
        errors.push({ field: 'video_url', message: 'Video URL must be a string' });
      } else if (!this.isValidUrl(data.video_url)) {
        errors.push({ field: 'video_url', message: 'Video URL must be a valid URL' });
      }
    }

    // Position validation (optional)
    if (data.position !== undefined && data.position !== null) {
      if (!Number.isInteger(data.position) || data.position <= 0) {
        errors.push({ field: 'position', message: 'Position must be a positive integer' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate lesson update data
   */
  static validateUpdateLesson(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Title validation (optional for updates)
    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        errors.push({ field: 'title', message: 'Title must be a string' });
      } else if (data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title cannot be empty' });
      } else if (data.title.length > 255) {
        errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
      }
    }

    // Content markdown validation (optional)
    if (data.content_md !== undefined && data.content_md !== null) {
      if (typeof data.content_md !== 'string') {
        errors.push({ field: 'content_md', message: 'Content must be a string' });
      }
    }

    // Video URL validation (optional)
    if (data.video_url !== undefined && data.video_url !== null && data.video_url !== '') {
      if (typeof data.video_url !== 'string') {
        errors.push({ field: 'video_url', message: 'Video URL must be a string' });
      } else if (!this.isValidUrl(data.video_url)) {
        errors.push({ field: 'video_url', message: 'Video URL must be a valid URL' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate reorder request
   */
  static validateReorder(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.lessonIds) {
      errors.push({ field: 'lessonIds', message: 'Lesson IDs array is required' });
    } else if (!Array.isArray(data.lessonIds)) {
      errors.push({ field: 'lessonIds', message: 'Lesson IDs must be an array' });
    } else if (data.lessonIds.length === 0) {
      errors.push({ field: 'lessonIds', message: 'Lesson IDs array cannot be empty' });
    } else {
      // Check each ID is a positive integer
      for (let i = 0; i < data.lessonIds.length; i++) {
        if (!Number.isInteger(data.lessonIds[i]) || data.lessonIds[i] <= 0) {
          errors.push({ 
            field: 'lessonIds', 
            message: `Invalid lesson ID at index ${i}: must be a positive integer` 
          });
          break;
        }
      }

      // Check for duplicates
      const uniqueIds = new Set(data.lessonIds);
      if (uniqueIds.size !== data.lessonIds.length) {
        errors.push({ field: 'lessonIds', message: 'Lesson IDs must not contain duplicates' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a string is a valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

export class EnrollmentValidator {
  /**
   * Validate enrollment creation data
   */
  static validateCreateEnrollment(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Course ID validation
    if (data.courseId === undefined || data.courseId === null) {
      errors.push({ field: 'courseId', message: 'Course ID is required' });
    } else if (!Number.isInteger(data.courseId) || data.courseId <= 0) {
      errors.push({ field: 'courseId', message: 'Course ID must be a positive integer' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate enrollment status update
   */
  static validateStatusUpdate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Status validation
    if (!data.status) {
      errors.push({ field: 'status', message: 'Status is required' });
    } else if (!['active', 'completed', 'refunded'].includes(data.status)) {
      errors.push({ 
        field: 'status', 
        message: 'Status must be one of: active, completed, refunded' 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pagination parameters for enrollments
   */
  static validatePagination(query: any): { page: number; limit: number } {
    let page = 1;
    let limit = 10;

    if (query.page) {
      const parsedPage = parseInt(query.page);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        page = parsedPage;
      }
    }

    if (query.limit) {
      const parsedLimit = parseInt(query.limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    return { page, limit };
  }
}

export class ProgressValidator {
  /**
   * Validate lesson progress marking data
   */
  static validateMarkProgress(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate enrollmentId
    if (!data.enrollmentId) {
      errors.push({
        field: 'enrollmentId',
        message: 'Enrollment ID is required'
      });
    } else if (!Number.isInteger(data.enrollmentId) || data.enrollmentId <= 0) {
      errors.push({
        field: 'enrollmentId',
        message: 'Enrollment ID must be a positive integer'
      });
    }

    // Validate lessonId
    if (!data.lessonId) {
      errors.push({
        field: 'lessonId',
        message: 'Lesson ID is required'
      });
    } else if (!Number.isInteger(data.lessonId) || data.lessonId <= 0) {
      errors.push({
        field: 'lessonId',
        message: 'Lesson ID must be a positive integer'
      });
    }

    // Validate completed flag
    if (data.completed === undefined || data.completed === null) {
      errors.push({
        field: 'completed',
        message: 'Completed status is required'
      });
    } else if (typeof data.completed !== 'boolean') {
      errors.push({
        field: 'completed',
        message: 'Completed must be a boolean value'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate course ID query parameter
   */
  static validateCourseIdQuery(query: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!query.courseId) {
      errors.push({
        field: 'courseId',
        message: 'Course ID is required in query parameters'
      });
    } else {
      const courseId = parseInt(query.courseId);
      if (isNaN(courseId) || courseId <= 0) {
        errors.push({
          field: 'courseId',
          message: 'Course ID must be a positive integer'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class CertificateValidator {
  /**
   * Validate certificate issuance data
   */
  static validateIssueCertificate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Handle null or undefined data
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Invalid data provided'
      });
      return {
        isValid: false,
        errors
      };
    }

    // Validate userId
    if (data.userId === undefined || data.userId === null) {
      errors.push({
        field: 'userId',
        message: 'User ID is required'
      });
    } else if (!Number.isInteger(data.userId) || data.userId <= 0) {
      errors.push({
        field: 'userId',
        message: 'User ID must be a positive integer'
      });
    }

    // Validate courseId
    if (data.courseId === undefined || data.courseId === null) {
      errors.push({
        field: 'courseId',
        message: 'Course ID is required'
      });
    } else if (!Number.isInteger(data.courseId) || data.courseId <= 0) {
      errors.push({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate certificate claim data
   */
  static validateClaimCertificate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Handle null or undefined data
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Invalid data provided'
      });
      return {
        isValid: false,
        errors
      };
    }

    // Validate courseId
    if (data.courseId === undefined || data.courseId === null) {
      errors.push({
        field: 'courseId',
        message: 'Course ID is required'
      });
    } else if (!Number.isInteger(data.courseId) || data.courseId <= 0) {
      errors.push({
        field: 'courseId',
        message: 'Course ID must be a positive integer'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate certificate code for verification
   */
  static validateCertificateCode(code: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!code) {
      errors.push({
        field: 'code',
        message: 'Certificate code is required'
      });
    } else if (typeof code !== 'string') {
      errors.push({
        field: 'code',
        message: 'Certificate code must be a string'
      });
    } else if (code.length < 10 || code.length > 100) {
      errors.push({
        field: 'code',
        message: 'Invalid certificate code format'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
export class AuthValidator {
  /**
   * Validate user registration data
   */
  static validateRegister(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Email validation
    if (!data.email || typeof data.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required and must be a string' });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }
    }

    // Password validation
    if (!data.password || typeof data.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required and must be a string' });
    } else if (data.password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
    }

    // Name validation
    if (!data.name || typeof data.name !== 'string') {
      errors.push({ field: 'name', message: 'Name is required and must be a string' });
    } else if (data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name cannot be empty' });
    }

    // Role validation (optional)
    if (data.role !== undefined && data.role !== null) {
      if (!['admin', 'instructor', 'student'].includes(data.role)) {
        errors.push({ 
          field: 'role', 
          message: 'Invalid role. Must be admin, instructor, or student' 
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user login data
   */
  static validateLogin(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Email validation
    if (!data.email || typeof data.email !== 'string') {
      errors.push({ field: 'email', message: 'Email is required and must be a string' });
    }

    // Password validation
    if (!data.password || typeof data.password !== 'string') {
      errors.push({ field: 'password', message: 'Password is required and must be a string' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
