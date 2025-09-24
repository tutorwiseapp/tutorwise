/**
 * Unit tests for Supabase Profile API integration
 * Testing authentication and database operations
 */
import { GET, POST } from '@/app/api/profile/route'
import { createClient } from '@/utils/supabase/server'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/utils/supabase/server')

// Mock NextResponse
jest.mock('next/server', () => {
  const NextResponseMock = class {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.headers = new Map(Object.entries(options.headers || {}))
    }

    async json() {
      if (typeof this.body === 'string') {
        try {
          return JSON.parse(this.body)
        } catch {
          return { error: this.body }
        }
      }
      return this.body || {}
    }

    static json(data, options = {}) {
      return new NextResponseMock(JSON.stringify(data), options)
    }
  }

  return {
    NextResponse: NextResponseMock,
    NextRequest: jest.fn()
  }
})

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('/api/profile - Supabase Integration', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis()
    }

    mockCreateClient.mockReturnValue(mockSupabase)
  })

  describe('GET /api/profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      // Act
      const response = await GET()

      // Assert
      expect(response.status).toBe(401)
    })

    it('should fetch user profile when authenticated', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user123',
        display_name: 'Test User',
        bio: 'Test bio',
        categories: ['math', 'science'],
        achievements: ['expert'],
        cover_photo_url: 'https://example.com/cover.jpg'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null })

      // Act
      const response = await GET()
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user123')
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' }
      })

      // Act
      const response = await GET()

      // Assert
      expect(response.status).toBe(500)
    })

    it('should handle missing profile record', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      // Act
      const response = await GET()

      // Assert
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/profile', () => {
    const mockRequest = {
      json: jest.fn()
    } as unknown as Request

    beforeEach(() => {
      (mockRequest.json as jest.Mock).mockClear()
    })

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(401)
    })

    it('should update user profile successfully', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const updateData = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
        categories: ['physics'],
        achievements: ['mentor'],
        cover_photo_url: 'https://example.com/new-cover.jpg',
        custom_picture_url: 'https://example.com/avatar.jpg'
      }

      const updatedProfile = { ...updateData, id: 'user123' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      ;(mockRequest.json as jest.Mock).mockResolvedValue(updateData)
      mockSupabase.single.mockResolvedValue({ data: updatedProfile, error: null })

      // Act
      const response = await POST(mockRequest)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.user).toEqual(updatedProfile)

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        display_name: updateData.display_name,
        bio: updateData.bio,
        categories: updateData.categories,
        achievements: updateData.achievements,
        cover_photo_url: updateData.cover_photo_url,
        custom_picture_url: updateData.custom_picture_url
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user123')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should handle partial updates', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const partialUpdateData = {
        display_name: 'New Name Only'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      ;(mockRequest.json as jest.Mock).mockResolvedValue(partialUpdateData)
      mockSupabase.single.mockResolvedValue({
        data: { ...partialUpdateData, id: 'user123' },
        error: null
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(mockSupabase.update).toHaveBeenCalledWith({
        display_name: 'New Name Only',
        bio: undefined,
        categories: undefined,
        achievements: undefined,
        cover_photo_url: undefined,
        custom_picture_url: undefined
      })
    })

    it('should handle database update errors', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const updateData = { display_name: 'Test' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      ;(mockRequest.json as jest.Mock).mockResolvedValue(updateData)
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
    })

    it('should handle invalid JSON in request body', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      ;(mockRequest.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'))

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
    })

    it('should validate required fields', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const invalidData = {
        // Missing required fields or invalid data
        categories: 'not-an-array'
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      ;(mockRequest.json as jest.Mock).mockResolvedValue(invalidData)
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Validation error' }
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
    })
  })

  describe('Database Transaction Safety', () => {
    it('should handle concurrent profile updates', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const updateData = { display_name: 'Concurrent Update' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(updateData)
      } as unknown as Request

      // Simulate optimistic concurrency conflict
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Concurrent modification detected' }
      })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      // In a real scenario, you might want to retry the operation
    })
  })

  describe('Security Considerations', () => {
    it('should only allow users to access their own profile', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      // Act
      await GET()

      // Assert
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user123')
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('id', 'different-user-id')
    })

    it('should only allow users to update their own profile', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      const updateData = { display_name: 'Updated' }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(updateData)
      } as unknown as Request

      mockSupabase.single.mockResolvedValue({
        data: { ...updateData, id: 'user123' },
        error: null
      })

      // Act
      await POST(mockRequest)

      // Assert
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user123')
    })
  })
})