/**
 * Integration tests for Lexi Session API
 * Tests session management endpoints
 */
import { POST, DELETE } from '@/app/api/lexi/session/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

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

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('/api/lexi/session - Lexi Session API', () => {
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
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockCreateServerClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createServerClient>);
  });

  describe('POST /api/lexi/session', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      // Act
      const response = await POST();

      // Assert
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a session for authenticated student user', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'student@example.com' };
      const mockProfile = { id: 'user-123', user_type: 'student', display_name: 'Test Student' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null });

      // Act
      const response = await POST();

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBeDefined();
      expect(data.persona).toBe('student');
      expect(data.greeting).toBeDefined();
      expect(data.capabilities).toBeInstanceOf(Array);
    });

    it('should create a session for authenticated tutor user', async () => {
      // Arrange
      const mockUser = { id: 'user-456', email: 'tutor@example.com' };
      const mockProfile = { id: 'user-456', user_type: 'tutor', display_name: 'Test Tutor' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null });

      // Act
      const response = await POST();

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.persona).toBe('tutor');
    });

    it('should handle profile fetch errors gracefully', async () => {
      // Arrange
      const mockUser = { id: 'user-789', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Profile not found' } });

      // Act
      const response = await POST();

      // Assert
      // Should still create session with default persona
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/lexi/session', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const mockRequest = {
        url: 'http://localhost/api/lexi/session?sessionId=test-session',
      } as unknown as NextRequest;

      // Act
      const response = await DELETE(mockRequest);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 400 when sessionId is missing', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockRequest = {
        url: 'http://localhost/api/lexi/session',
      } as unknown as NextRequest;

      // Act
      const response = await DELETE(mockRequest);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should end session successfully', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const mockRequest = {
        url: 'http://localhost/api/lexi/session?sessionId=test-session-123',
      } as unknown as NextRequest;

      // Act
      const response = await DELETE(mockRequest);

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
