/**
 * Integration tests for Lexi History API
 * Tests conversation history endpoints
 */
import { GET } from '@/app/api/lexi/history/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Mock conversation store
jest.mock('@lexi/services/conversation-store', () => ({
  conversationStore: {
    getUserConversations: jest.fn(),
    getConversation: jest.fn(),
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
const mockGetUserConversations = conversationStore.getUserConversations as jest.MockedFunction<typeof conversationStore.getUserConversations>;
const mockGetConversation = conversationStore.getConversation as jest.MockedFunction<typeof conversationStore.getConversation>;

describe('/api/lexi/history - Lexi History API', () => {
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

  describe('GET /api/lexi/history', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const mockRequest = {
        url: 'http://localhost/api/lexi/history',
      } as unknown as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should return user conversations list', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockConversations = [
        {
          id: 'conv-1',
          session_id: 'session-1',
          persona: 'student',
          started_at: '2026-02-13T10:00:00Z',
          message_count: 5,
          status: 'ended',
        },
        {
          id: 'conv-2',
          session_id: 'session-2',
          persona: 'tutor',
          started_at: '2026-02-12T15:00:00Z',
          message_count: 10,
          status: 'ended',
        },
      ];

      mockGetUserConversations.mockResolvedValue(mockConversations);

      const mockRequest = {
        url: 'http://localhost/api/lexi/history?limit=20&offset=0',
      } as unknown as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.conversations).toHaveLength(2);
      expect(data.pagination).toEqual({
        limit: 20,
        offset: 0,
        hasMore: false,
      });
      expect(mockGetUserConversations).toHaveBeenCalledWith('user-123', {
        limit: 20,
        offset: 0,
        status: undefined,
      });
    });

    it('should filter conversations by status', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetUserConversations.mockResolvedValue([]);

      const mockRequest = {
        url: 'http://localhost/api/lexi/history?status=active',
      } as unknown as NextRequest;

      // Act
      await GET(mockRequest);

      // Assert
      expect(mockGetUserConversations).toHaveBeenCalledWith('user-123', {
        limit: 20,
        offset: 0,
        status: 'active',
      });
    });

    it('should return specific conversation with messages', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockConversation = {
        id: 'conv-1',
        session_id: 'session-1',
        persona: 'student',
        started_at: '2026-02-13T10:00:00Z',
        message_count: 3,
        status: 'ended',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', created_at: '2026-02-13T10:00:00Z' },
          { id: 'msg-2', role: 'assistant', content: 'Hi! How can I help?', created_at: '2026-02-13T10:00:05Z' },
          { id: 'msg-3', role: 'user', content: 'Thanks!', created_at: '2026-02-13T10:00:30Z' },
        ],
      };

      mockGetConversation.mockResolvedValue(mockConversation);

      const mockRequest = {
        url: 'http://localhost/api/lexi/history?id=conv-1',
      } as unknown as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.conversation.id).toBe('conv-1');
      expect(data.conversation.messages).toHaveLength(3);
      expect(mockGetConversation).toHaveBeenCalledWith('conv-1', 'user-123');
    });

    it('should return 404 for non-existent conversation', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockGetConversation.mockResolvedValue(null);

      const mockRequest = {
        url: 'http://localhost/api/lexi/history?id=non-existent',
      } as unknown as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should respect pagination parameters', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      // Return exactly limit number of items to indicate more may exist
      mockGetUserConversations.mockResolvedValue(
        Array(10).fill(null).map((_, i) => ({
          id: `conv-${i}`,
          session_id: `session-${i}`,
          persona: 'student',
          started_at: '2026-02-13T10:00:00Z',
          message_count: 5,
          status: 'ended',
        }))
      );

      const mockRequest = {
        url: 'http://localhost/api/lexi/history?limit=10&offset=20',
      } as unknown as NextRequest;

      // Act
      const response = await GET(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination).toEqual({
        limit: 10,
        offset: 20,
        hasMore: true,
      });
    });
  });
});
