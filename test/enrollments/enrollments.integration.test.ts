/**
 * Integration tests for enrollments API endpoints
 * 
 * Tests the complete request/response flow with minimal mocking,
 * focusing on middleware integration and API contract validation.
 */

import { Request, Response } from 'express';
import { enrollmentsController } from '../../src/controllers/enrollments.controller';
import { testUtils } from '../setup';

interface TestRequest extends Request {
  requestId: string;
}

jest.mock('../../src/services/enrollments.service');
jest.mock('../../src/modules/notifications/publisher');

import { EnrollmentsService } from '../../src/services/enrollments.service';
import { publish, isNotificationsEnabled } from '../../src/modules/notifications/publisher';

const mockEnrollmentsService = EnrollmentsService as jest.Mocked<typeof EnrollmentsService>;
const mockPublish = publish as jest.MockedFunction<typeof publish>;
const mockIsNotificationsEnabled = isNotificationsEnabled as jest.MockedFunction<typeof isNotificationsEnabled>;

describe('Enrollments API Integration', () => {
  let mockReq: Partial<TestRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = testUtils.createMockRequest();
    mockRes = testUtils.createMockResponse();
    jest.clearAllMocks();
  });

  describe('POST /api/enrollments - Complete enrollment flow', () => {
    it('should handle complete successful enrollment flow', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };
      mockReq.requestId = 'integration-test-123';

      const mockEnrollment = {
        id: 1,
        user_id: 1,
        course_id: 2,
        status: 'active' as const,
        created_at: new Date('2023-01-01T00:00:00Z')
      };

      mockEnrollmentsService.createEnrollment.mockResolvedValue(mockEnrollment);
      mockIsNotificationsEnabled.mockReturnValue(true);
      mockPublish.mockResolvedValue(1);

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockEnrollment,
        version: expect.any(String)
      });

      expect(mockEnrollmentsService.createEnrollment).toHaveBeenCalledWith(1, 2);
      
      expect(mockPublish).toHaveBeenCalledWith('enrollment.created', {
        enrollmentId: 1,
        userId: 1,
        courseId: 2
      });
    });

    it('should handle validation errors with proper error structure', async () => {
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = {}; // Missing courseId
      mockReq.requestId = 'integration-test-456';

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrollment data',
          fields: expect.any(Array),
          requestId: 'integration-test-456',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle authentication flow correctly', async () => {
      mockReq.user = undefined;
      mockReq.body = { courseId: 2 };

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockEnrollmentsService.createEnrollment).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/enrollments/me - User enrollments flow', () => {
    it('should handle complete user enrollments retrieval', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = { page: '2', limit: '5' };

      const mockResult = {
        enrollments: [
          {
            id: 1,
            user_id: 1,
            course_id: 2,
            status: 'active' as const,
            created_at: new Date(),
            course: {
              id: 2,
              title: 'Integration Test Course',
              description: 'Test Description',
              published: true,
              price_cents: 2000,
              instructor_id: 3
            }
          }
        ],
        pagination: {
          page: 2,
          limit: 5,
          total: 8,
          totalPages: 2
        }
      };

      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: expect.any(String)
      });

      expect(mockEnrollmentsService.getUserEnrollments).toHaveBeenCalledWith(1, { page: 2, limit: 5 });
    });

    it('should handle empty results gracefully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = {};

      const mockResult = {
        enrollments: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };

      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });
  });

  describe('GET /api/courses/:courseId/enrollments - Course enrollments flow', () => {
    it('should handle instructor access to course enrollments', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { courseId: '5' };
      mockReq.query = { page: '1', limit: '20' };

      const mockResult = {
        enrollments: [
          {
            id: 10,
            user_id: 3,
            course_id: 5,
            status: 'completed' as const,
            created_at: new Date(),
            student: {
              id: 3,
              name: 'Jane Student',
              email: 'jane@example.com'
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(5, 2, 'instructor');
      expect(mockEnrollmentsService.getCourseEnrollments).toHaveBeenCalledWith(5, { page: 1, limit: 20 });
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockResult.enrollments,
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });

    it('should handle admin access to any course enrollments', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { courseId: '10' };
      mockReq.query = {};

      const mockResult = {
        enrollments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(true);
      mockEnrollmentsService.getCourseEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentsService.canViewCourseEnrollments).toHaveBeenCalledWith(10, 1, 'admin');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: [],
        pagination: mockResult.pagination,
        version: expect.any(String)
      });
    });

    it('should reject unauthorized access attempts', async () => {
      // Arrange
      mockReq.user = { id: 3, email: 'student@example.com', role: 'student' };
      mockReq.params = { courseId: '5' };

      mockEnrollmentsService.canViewCourseEnrollments.mockResolvedValue(false);

      // Act
      await enrollmentsController.getCourseEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockEnrollmentsService.getCourseEnrollments).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/enrollments/:id/status - Status update flow', () => {
    it('should handle admin status update successfully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '15' };
      mockReq.body = { status: 'refunded' };

      const mockUpdatedEnrollment = {
        id: 15,
        user_id: 4,
        course_id: 6,
        status: 'refunded' as const,
        created_at: new Date()
      };

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(mockUpdatedEnrollment);

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockEnrollmentsService.updateEnrollmentStatus).toHaveBeenCalledWith(15, 'refunded');
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: true,
        data: mockUpdatedEnrollment,
        version: expect.any(String)
      });
    });

    it('should handle non-existent enrollment gracefully', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'completed' };

      mockEnrollmentsService.updateEnrollmentStatus.mockResolvedValue(null);

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'ENROLLMENT_NOT_FOUND',
          message: 'Enrollment not found',
          requestId: expect.any(String),
          timestamp: expect.any(String)
        }
      });
    });

    it('should enforce admin-only access', async () => {
      // Arrange
      mockReq.user = { id: 2, email: 'instructor@example.com', role: 'instructor' };
      mockReq.params = { id: '15' };
      mockReq.body = { status: 'completed' };

      // Act
      await enrollmentsController.updateStatus(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockEnrollmentsService.updateEnrollmentStatus).not.toHaveBeenCalled();
    });
  });

  describe('Error handling integration', () => {
    it('should include consistent error structure across endpoints', async () => {
      const endpoints = [
        { method: 'getMyEnrollments', setup: () => { mockReq.user = undefined; } },
        { method: 'getCourseEnrollments', setup: () => { mockReq.user = undefined; mockReq.params = { courseId: '1' }; } },
        { method: 'updateStatus', setup: () => { mockReq.user = undefined; mockReq.params = { id: '1' }; mockReq.body = { status: 'active' }; } }
      ];

      for (const endpoint of endpoints) {
        jest.clearAllMocks();
        mockReq = testUtils.createMockRequest();
        mockRes = testUtils.createMockResponse();
        
        endpoint.setup();

        // Act
        await (enrollmentsController as any)[endpoint.method](mockReq as TestRequest, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId: expect.any(String),
            timestamp: expect.any(String)
          }
        });
      }
    });

    it('should handle service layer errors consistently', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.body = { courseId: 2 };

      mockEnrollmentsService.createEnrollment.mockRejectedValue(new Error('Unexpected database error'));

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create enrollment',
          requestId: expect.any(String),
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Request/Response contract validation', () => {
    it('should validate request ID propagation', async () => {
      // Arrange
      const customRequestId = 'custom-integration-test-789';
      mockReq.requestId = customRequestId;
      mockReq.user = undefined; // Force error to see requestId in response

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.requestId).toBe(customRequestId);
    });

    it('should validate timestamp format in responses', async () => {
      // Arrange
      mockReq.user = undefined; // Force error to see timestamp
      const beforeTime = new Date().toISOString();

      // Act
      await enrollmentsController.enroll(mockReq as TestRequest, mockRes as Response);

      // Assert
      const afterTime = new Date().toISOString();
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = callArgs.error.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });

    it('should validate version inclusion in success responses', async () => {
      // Arrange
      mockReq.user = { id: 1, email: 'student@example.com', role: 'student' };
      mockReq.query = {};

      const mockResult = {
        enrollments: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };

      mockEnrollmentsService.getUserEnrollments.mockResolvedValue(mockResult);

      // Act
      await enrollmentsController.getMyEnrollments(mockReq as TestRequest, mockRes as Response);

      // Assert
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.version).toBeDefined();
      expect(typeof callArgs.version).toBe('string');
    });
  });
});
