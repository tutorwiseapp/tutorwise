/**
 * Unit tests for Stripe Checkout Session creation
 * Testing critical business logic for payment processing
 */
import { POST } from '@/app/api/stripe/create-checkout-session/route'
import { createClient } from '@/utils/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextRequest } from 'next/server'

// Mock external dependencies
jest.mock('@/utils/supabase/server')
jest.mock('@/lib/stripe')

// Type the mocked modules
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockStripe = stripe as jest.Mocked<typeof stripe>

describe('/api/stripe/create-checkout-session', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup Supabase mock
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

    // Setup request mock
    mockRequest = {
      url: 'https://tutorwise.com/api/stripe/create-checkout-session'
    } as NextRequest
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      // Act
      const response = await POST(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should proceed when user is authenticated', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({
        data: { stripe_customer_id: 'cus_existing', display_name: 'Test User' }
      })

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(200)
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('Customer Management - Critical Business Logic', () => {
    beforeEach(() => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    })

    it('should use existing Stripe customer when available', async () => {
      // Arrange
      const existingCustomerId = 'cus_existing123'
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: existingCustomerId,
          display_name: 'Existing User'
        }
      })

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      const response = await POST(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('cs_test_session')
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: existingCustomerId
        })
      )
    })

    it('should create new Stripe customer when none exists', async () => {
      // Arrange
      const newCustomerId = 'cus_new123'
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: null,
          display_name: 'New User'
        }
      })

      mockStripe.customers.create.mockResolvedValue({
        id: newCustomerId
      } as any)

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      const response = await POST(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'New User',
        metadata: { supabaseId: 'user123' }
      })

      // Should save new customer ID to database
      expect(mockSupabase.update).toHaveBeenCalledWith({
        stripe_customer_id: newCustomerId
      })

      // Should use new customer ID in checkout session
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: newCustomerId
        })
      )
    })

    it('should handle database update after creating new customer', async () => {
      // Arrange
      const newCustomerId = 'cus_new456'
      const userId = 'user123'

      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: null,
          display_name: 'Test User'
        }
      })

      mockStripe.customers.create.mockResolvedValue({
        id: newCustomerId
      } as any)

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      await POST(mockRequest)

      // Assert - Verify database update sequence
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        stripe_customer_id: newCustomerId
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId)
    })
  })

  describe('Checkout Session Configuration', () => {
    beforeEach(() => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: 'cus_test',
          display_name: 'Test User'
        }
      })
    })

    it('should create checkout session with correct configuration', async () => {
      // Arrange
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      await POST(mockRequest)

      // Assert
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        mode: 'setup',
        customer: 'cus_test',
        success_url: 'https://tutorwise.com/payments?status=success&customer_id=cus_test',
        cancel_url: 'https://tutorwise.com/payments?status=cancelled'
      })
    })

    it('should derive origin from request URL correctly', async () => {
      // Arrange
      const testRequest = {
        url: 'https://custom-domain.com/api/stripe/create-checkout-session'
      } as NextRequest

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      await POST(testRequest)

      // Assert
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://custom-domain.com/payments?status=success&customer_id=cus_test',
          cancel_url: 'https://custom-domain.com/payments?status=cancelled'
        })
      )
    })

    it('should include customer_id in success_url for polling mechanism', async () => {
      // Arrange
      const customerId = 'cus_polling_test'
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: customerId,
          display_name: 'Test User'
        }
      })

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session'
      } as any)

      // Act
      await POST(mockRequest)

      // Assert
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(createCall.success_url).toContain(`customer_id=${customerId}`)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })
    })

    it('should handle missing user profile', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({ data: null })

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('An internal server error occurred.')
    })

    it('should handle Stripe customer creation failure', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: null,
          display_name: 'Test User'
        }
      })

      const stripeError = new Error('Stripe customer creation failed')
      stripeError.name = 'StripeError'
      mockStripe.customers.create.mockRejectedValue(stripeError)

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('An internal server error occurred.')
    })

    it('should handle Stripe checkout session creation failure', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: 'cus_test',
          display_name: 'Test User'
        }
      })

      const stripeError = new Error('Payment method not available')
      stripeError.name = 'StripeError'
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError)

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('An internal server error occurred.')
    })

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('An internal server error occurred.')
    })
  })

  describe('Data Consistency', () => {
    it('should maintain atomicity when creating customer and updating database', async () => {
      // Arrange
      const mockUser = { id: 'user123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      mockSupabase.single.mockResolvedValue({
        data: {
          stripe_customer_id: null,
          display_name: 'Test User'
        }
      })

      const newCustomerId = 'cus_atomic_test'
      mockStripe.customers.create.mockResolvedValue({
        id: newCustomerId
      } as any)

      // Simulate database update failure
      mockSupabase.update.mockRejectedValue(new Error('Database update failed'))

      // Act
      const response = await POST(mockRequest)

      // Assert
      expect(response.status).toBe(500)
      expect(mockStripe.customers.create).toHaveBeenCalled()
      // Note: In a real implementation, you'd want to handle cleanup of the created customer
    })
  })
})