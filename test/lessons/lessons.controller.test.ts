/**
 * Tests for lessonsController
 * 
 * Tests HTTP request handling, validation, authentication, and service integration
 * for all lesson endpoints with mocked service layer.
 */

import { Request, Response, NextFunction } from 'express';
import { lessonsController } from '../../src/controllers/lessons.controller';
import { lessonsService } from '../../src/services/lessons.service';
import { LessonValidator } from '../../src/utils/validation';
import { testUtils } from '../setup';

jest.mock('../../src/services/lessons.service');
const mockLessonsService = lessonsService as jest.Mocked<typeof lessonsService>;

jest.mock('../../src/utils/validation');
const mockLessonValidator = LessonValidator as jest.Mocked<typeof LessonValidator>;

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

describe('lessonsController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validLessonData = {
      title: 'Test Lesson',
      video_url: 'https://example.com/video.mp4',
      content_md: 'Test content',
      position: 1
    };

    beforeEach(() => {
      mockReq.params = { courseId: '1' };
      mockReq.body = validLessonData;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
    });

    it('should create lesson successfully when validation passes', async () => {
      // Arrange
      const createdLesson = { id: 1, course_id: 1, ...validLessonData };
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.createLesson.mockResolvedValue(createdLesson as any);

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateCreateLesson).toHaveBeenCalledWith(validLessonData);
      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        { course_id: 1, ...validLessonData },
        1,
        'instructor'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: createdLesson,
        version: 'v0.8'
      });
    });

    it('should return 400 error when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'invalid' };

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.createLesson).not.toHaveBeenCalled();
    });

    it('should return 400 error when validation fails', async () => {
      // Arrange
      const validationErrors = [
        { field: 'title', message: 'Title is required' }
      ];
      mockLessonValidator.validateCreateLesson.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: validationErrors,
        version: 'v0.8'
      });
      expect(mockLessonsService.createLesson).not.toHaveBeenCalled();
    });

    it('should return 401 error when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockLessonsService.createLesson).not.toHaveBeenCalled();
    });

    it('should return 403 error when user role is student', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can create lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockLessonsService.createLesson).not.toHaveBeenCalled();
    });

    it('should allow admin to create lessons', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      const createdLesson = { id: 1, course_id: 1, ...validLessonData };
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.createLesson.mockResolvedValue(createdLesson as any);

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.createLesson).toHaveBeenCalledWith(
        { course_id: 1, ...validLessonData },
        1,
        'admin'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle service errors with status codes', async () => {
      // Arrange
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.createLesson.mockRejectedValue({ 
        status: 404, 
        message: 'Course not found' 
      });

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Course not found',
        version: 'v0.8'
      });
    });

    it('should call next() for unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockLessonValidator.validateCreateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.createLesson.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.create(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('listByCourse', () => {
    beforeEach(() => {
      mockReq.params = { courseId: '1' };
    });

    it('should list lessons for valid course ID', async () => {
      // Arrange
      const mockLessons = [
        { id: 1, course_id: 1, title: 'Lesson 1', position: 1 },
        { id: 2, course_id: 1, title: 'Lesson 2', position: 2 }
      ];
      mockLessonsService.listLessons.mockResolvedValue(mockLessons as any);

      // Act
      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: mockLessons,
        count: 2,
        version: 'v0.8'
      });
    });

    it('should pass user information when authenticated', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'user@example.com', role: 'student' };
      const mockLessons: any[] = [];
      mockLessonsService.listLessons.mockResolvedValue(mockLessons);

      // Act
      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.listLessons).toHaveBeenCalledWith(1, 1, 'student');
    });

    it('should return 400 error when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'not-a-number' };

      // Act
      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.listLessons).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      mockLessonsService.listLessons.mockRejectedValue({ 
        status: 403, 
        message: 'Access denied' 
      });

      // Act
      await lessonsController.listByCourse(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Access denied',
        version: 'v0.8'
      });
    });
  });

  describe('show', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
    });

    it('should return lesson for valid lesson ID', async () => {
      // Arrange
      const mockLesson = { id: 1, course_id: 1, title: 'Test Lesson' };
      mockLessonsService.getLessonById.mockResolvedValue(mockLesson as any);

      // Act
      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: mockLesson,
        version: 'v0.8'
      });
    });

    it('should pass user information when authenticated', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      const mockLesson = { id: 1, course_id: 1, title: 'Test Lesson' };
      mockLessonsService.getLessonById.mockResolvedValue(mockLesson as any);

      // Act
      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.getLessonById).toHaveBeenCalledWith(1, 2, 'instructor');
    });

    it('should return 400 error when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.getLessonById).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      mockLessonsService.getLessonById.mockRejectedValue({ 
        status: 404, 
        message: 'Lesson not found' 
      });

      // Act
      await lessonsController.show(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v0.8'
      });
    });
  });

  describe('update', () => {
    const updateData = {
      title: 'Updated Lesson',
      video_url: 'https://example.com/new-video.mp4',
      content_md: 'Updated content'
    };

    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.body = updateData;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
    });

    it('should update lesson successfully when validation passes', async () => {
      // Arrange
      const updatedLesson = { id: 1, ...updateData };
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.updateLesson.mockResolvedValue(updatedLesson as any);

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateUpdateLesson).toHaveBeenCalledWith(updateData);
      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(1, updateData, 1, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: updatedLesson,
        version: 'v0.8'
      });
    });

    it('should return 400 error when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.updateLesson).not.toHaveBeenCalled();
    });

    it('should return 400 error when validation fails', async () => {
      // Arrange
      const validationErrors = [
        { field: 'video_url', message: 'Invalid URL format' }
      ];
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: validationErrors,
        version: 'v0.8'
      });
      expect(mockLessonsService.updateLesson).not.toHaveBeenCalled();
    });

    it('should return 401 error when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockLessonsService.updateLesson).not.toHaveBeenCalled();
    });

    it('should return 403 error when user role is student', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can update lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockLessonsService.updateLesson).not.toHaveBeenCalled();
    });

    it('should allow admin to update lessons', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      const updatedLesson = { id: 1, ...updateData };
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.updateLesson.mockResolvedValue(updatedLesson as any);

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.updateLesson).toHaveBeenCalledWith(1, updateData, 1, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lesson: updatedLesson,
        version: 'v0.8'
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockLessonValidator.validateUpdateLesson.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.updateLesson.mockRejectedValue({ 
        status: 403, 
        message: 'Permission denied' 
      });

      // Act
      await lessonsController.update(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Permission denied',
        version: 'v0.8'
      });
    });
  });

  describe('reorder', () => {
    const reorderData = {
      lessonIds: [3, 1, 2]
    };

    beforeEach(() => {
      mockReq.params = { courseId: '1' };
      mockReq.body = reorderData;
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
    });

    it('should reorder lessons successfully when validation passes', async () => {
      // Arrange
      const reorderedLessons = [
        { id: 3, position: 1 },
        { id: 1, position: 2 },
        { id: 2, position: 3 }
      ];
      mockLessonValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.reorderLessons.mockResolvedValue(reorderedLessons as any);

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonValidator.validateReorder).toHaveBeenCalledWith(reorderData);
      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(1, [3, 1, 2], 1, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        lessons: reorderedLessons,
        count: 3,
        version: 'v0.8'
      });
    });

    it('should return 400 error when course ID is invalid', async () => {
      // Arrange
      mockReq.params = { courseId: 'invalid' };

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid course ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.reorderLessons).not.toHaveBeenCalled();
    });

    it('should return 400 error when validation fails', async () => {
      // Arrange
      const validationErrors = [
        { field: 'lessonIds', message: 'Lesson IDs must not contain duplicates' }
      ];
      mockLessonValidator.validateReorder.mockReturnValue({ 
        isValid: false, 
        errors: validationErrors 
      });

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        errors: validationErrors,
        version: 'v0.8'
      });
      expect(mockLessonsService.reorderLessons).not.toHaveBeenCalled();
    });

    it('should return 401 error when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;
      mockLessonValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockLessonsService.reorderLessons).not.toHaveBeenCalled();
    });

    it('should return 403 error when user role is student', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockLessonValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can reorder lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockLessonsService.reorderLessons).not.toHaveBeenCalled();
    });

    it('should allow admin to reorder lessons', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      const reorderedLessons = [{ id: 1, position: 1 }];
      mockLessonValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.reorderLessons.mockResolvedValue(reorderedLessons as any);

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.reorderLessons).toHaveBeenCalledWith(1, [3, 1, 2], 1, 'admin');
    });

    it('should handle service errors', async () => {
      // Arrange
      mockLessonValidator.validateReorder.mockReturnValue({ isValid: true, errors: [] });
      mockLessonsService.reorderLessons.mockRejectedValue({ 
        status: 400, 
        message: 'Invalid lesson IDs' 
      });

      // Act
      await lessonsController.reorder(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson IDs',
        version: 'v0.8'
      });
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1, email: 'instructor@example.com', role: 'instructor' };
    });

    it('should delete lesson successfully', async () => {
      // Arrange
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(1, 1, 'instructor');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
    });

    it('should return 400 error when lesson ID is invalid', async () => {
      // Arrange
      mockReq.params = { id: 'invalid' };

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid lesson ID',
        version: 'v0.8'
      });
      expect(mockLessonsService.deleteLesson).not.toHaveBeenCalled();
    });

    it('should return 401 error when user is not authenticated', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Authentication required',
        version: 'v0.8'
      });
      expect(mockLessonsService.deleteLesson).not.toHaveBeenCalled();
    });

    it('should return 403 error when user role is student', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Only instructors and admins can delete lessons',
        role: 'student',
        version: 'v0.8'
      });
      expect(mockLessonsService.deleteLesson).not.toHaveBeenCalled();
    });

    it('should allow admin to delete lessons', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockLessonsService.deleteLesson.mockResolvedValue(undefined);

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockLessonsService.deleteLesson).toHaveBeenCalledWith(1, 1, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        message: 'Lesson deleted successfully',
        version: 'v0.8'
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      mockLessonsService.deleteLesson.mockRejectedValue({ 
        status: 404, 
        message: 'Lesson not found' 
      });

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Lesson not found',
        version: 'v0.8'
      });
    });

    it('should call next() for unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockLessonsService.deleteLesson.mockRejectedValue(unexpectedError);

      // Act
      await lessonsController.remove(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
