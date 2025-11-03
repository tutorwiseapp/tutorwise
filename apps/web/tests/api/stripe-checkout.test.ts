/**
 * @jest-environment node
 *
 * Filename: tests/api/stripe-checkout.test.ts
 * Purpose: Smoke test for POST /api/stripe/create-booking-checkout endpoint
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 8.6 - Stripe checkout session validation
 */
import { POST } from '@/app/api/stripe/create-booking-checkout/route';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    customers: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

describe('POST /api/stripe/create-booking-checkout', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(),
      update: jest.fn(() => mockSupabase),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should create Stripe checkout session with booking_id in metadata', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';
    const mockCustomerId = 'cus_test123';
    const mockSessionId = 'cs_test_session123';
    const mockCheckoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_session123';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: mockUserId,
          email: 'student@test.com',
        }
      },
      error: null,
    });

    // Mock booking fetch
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        student_id: mockUserId,
        amount: 50,
        service_name: 'GCSE Mathematics Tutoring',
        payment_status: 'Pending',
      },
      error: null,
    });

    // Mock profile fetch (with existing Stripe customer)
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        stripe_customer_id: mockCustomerId,
        full_name: 'Test Student',
      },
      error: null,
    });

    // Mock Stripe session creation
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: mockSessionId,
      url: mockCheckoutUrl,
      metadata: {
        booking_id: mockBookingId,
        supabase_user_id: mockUserId,
      },
    } as unknown as Stripe.Checkout.Session);

    // Create request
    const requestBody = {
      booking_id: mockBookingId,
    };

    const request = new NextRequest('http://localhost:3000/api/stripe/create-booking-checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // Execute
    const response = await POST(request);
    const result = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(result.sessionId).toBe(mockSessionId);
    expect(result.url).toBe(mockCheckoutUrl);

    // CRITICAL: Verify booking_id is in metadata
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer: mockCustomerId,
        metadata: expect.objectContaining({
          booking_id: mockBookingId,
          supabase_user_id: mockUserId,
        }),
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'gbp',
              product_data: expect.objectContaining({
                name: 'GCSE Mathematics Tutoring',
              }),
              unit_amount: 5000, // 50 * 100 pence
            }),
            quantity: 1,
          }),
        ]),
      })
    );
  });

  it('should create new Stripe customer if user does not have one', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';
    const mockNewCustomerId = 'cus_new123';
    const mockSessionId = 'cs_test_session123';
    const mockCheckoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_session123';

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: mockUserId,
          email: 'newstudent@test.com',
        }
      },
      error: null,
    });

    // Mock booking fetch
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        student_id: mockUserId,
        amount: 50,
        service_name: 'GCSE Mathematics Tutoring',
        payment_status: 'Pending',
      },
      error: null,
    });

    // Mock profile fetch (NO Stripe customer)
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        stripe_customer_id: null,
        full_name: 'New Student',
      },
      error: null,
    });

    // Mock Stripe customer creation
    (stripe.customers.create as jest.Mock).mockResolvedValue({
      id: mockNewCustomerId,
    } as Stripe.Customer);

    // Mock Stripe session creation
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: mockSessionId,
      url: mockCheckoutUrl,
      metadata: {
        booking_id: mockBookingId,
        supabase_user_id: mockUserId,
      },
    } as unknown as Stripe.Checkout.Session);

    // Create request
    const requestBody = {
      booking_id: mockBookingId,
    };

    const request = new NextRequest('http://localhost:3000/api/stripe/create-booking-checkout', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // Execute
    const response = await POST(request);
    const result = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(result.sessionId).toBe(mockSessionId);

    // Verify new Stripe customer was created
    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: 'newstudent@test.com',
      name: 'New Student',
      metadata: { supabaseId: mockUserId },
    });

    // Verify profile was updated with new Stripe customer ID
    expect(mockSupabase.update).toHaveBeenCalledWith({
      stripe_customer_id: mockNewCustomerId,
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/stripe/create-booking-checkout', {
      method: 'POST',
      body: JSON.stringify({ booking_id: 'test' }),
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe('Unauthorized');
  });

  it('should return 400 if booking_id is missing', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/stripe/create-booking-checkout', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('booking_id is required');
  });

  it('should return 400 if booking is not Pending', async () => {
    const mockUserId = '11111111-1111-1111-1111-111111111111';
    const mockBookingId = '55555555-5555-5555-5555-555555555555';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Mock booking with already-processed payment
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: mockBookingId,
        student_id: mockUserId,
        amount: 50,
        service_name: 'GCSE Mathematics Tutoring',
        payment_status: 'Paid', // Already paid
      },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/stripe/create-booking-checkout', {
      method: 'POST',
      body: JSON.stringify({ booking_id: mockBookingId }),
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('Booking already processed');
  });
});
