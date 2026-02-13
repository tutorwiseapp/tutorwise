/**
 * Integration tests for Lexi Feedback API
 * Tests feedback submission endpoints
 */
import { POST } from '@/app/api/lexi/feedback/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Mock conversation store
jest.mock('@lexi/services/conversation-store', () => ({
  conversationStore: {
    submitFeedback: jest.fn(),
  },
}));

// Mock Supabase SSR
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => {
  class MockNextResponse {
    body: string;
    status: number;
    headers: Map<string, string>;

    constructor(body: string, options: { status?: number; headers?: Record<string, string> } = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.headers = new Map(Object.entries(options.headers || {}));
    }

    async json() {
      return JSON.parse(this.body);
    }

    static json(data: unknown, options: { status?: number } = {}) {
      return new MockNextResponse(JSON.stringify(data), options);
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: jest.fn(),
  };
});

import { conversationStore } from '@lexi/services/conversation-store';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockSubmitFeedback = conversationStore.submitFeedback as jest.MockedFunction<typeof conversationStore.submitFeedback>;

describe('/api/lexi/feedback - Lexi Feedback API', () => {
  let mockSupabase: Record<string, jest.Mock>;
  let mockCookieStore: {
    getAll: jest.Mock;
    setAll: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCookieStore = {
      getAll: jest.fn().mockReturnValue([]),
      setAll: jest.fn(),
    };

    mockCookies.mockResolvedValue(mockCookieStore as unknown as ReturnType<typeof cookies>);

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
    };

    mockCreateServerClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createServerClient>);
  });

  describe('POST /api/lexi/feedback', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ messageId: 'msg-123', rating: 1 }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid rating value', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ messageId: 'msg-123', rating: 0 }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_RATING');
    });

    it('should return 400 when messageId is missing', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ rating: 1 }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('MISSING_MESSAGE_ID');
    });

    it('should submit positive feedback successfully', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSubmitFeedback.mockResolvedValue(true);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ messageId: 'msg-123', rating: 1 }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockSubmitFeedback).toHaveBeenCalledWith('msg-123', 1, undefined);
    });

    it('should submit negative feedback with comment', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSubmitFeedback.mockResolvedValue(true);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          messageId: 'msg-456',
          rating: -1,
          comment: 'Response was not helpful',
        }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      expect(mockSubmitFeedback).toHaveBeenCalledWith('msg-456', -1, 'Response was not helpful');
    });

    it('should handle feedback submission failure', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSubmitFeedback.mockResolvedValue(false);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ messageId: 'msg-789', rating: 1 }),
      } as unknown as NextRequest;

      // Act
      const response = await POST(mockRequest);

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe('FEEDBACK_ERROR');
    });
  });
});
