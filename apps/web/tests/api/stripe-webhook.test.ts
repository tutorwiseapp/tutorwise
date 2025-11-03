/**
 * @jest-environment node
 *
 * Filename: tests/api/stripe-webhook.test.ts
 * Purpose: Smoke test for POST /api/webhooks/stripe endpoint
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 8.6 - Webhook RPC validation and commission splits
 * CRITICAL: This test validates the entire payment flow and commission logic
 */
import { POST } from '@/app/api/webhooks/stripe/route';
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
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

describe('POST /api/webhooks/stripe', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client with RPC support
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('checkout.session.completed event', () => {
    it('should call handle_successful_payment RPC with booking_id', async () => {
      const mockBookingId = '55555555-5555-5555-5555-555555555555';

      // Mock Stripe webhook signature verification
      const mockCheckoutSession: Stripe.Checkout.Session = {
        id: 'cs_test_session123',
        object: 'checkout.session',
        metadata: {
          booking_id: mockBookingId,
          supabase_user_id: '11111111-1111-1111-1111-111111111111',
        },
      } as unknown as Stripe.Checkout.Session;

      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: mockCheckoutSession,
        },
      } as Stripe.Event;

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Mock RPC success
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      // Create webhook request
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      // Execute
      const response = await POST(request);
      const result = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(result.received).toBe(true);

      // CRITICAL: Verify RPC was called with correct booking_id
      expect(mockSupabase.rpc).toHaveBeenCalledWith('handle_successful_payment', {
        p_booking_id: mockBookingId,
      });
    });

    it('should return 400 if booking_id is missing from metadata', async () => {
      // Mock Stripe webhook with NO booking_id
      const mockCheckoutSession: Stripe.Checkout.Session = {
        id: 'cs_test_session123',
        object: 'checkout.session',
        metadata: {
          // No booking_id!
          supabase_user_id: '11111111-1111-1111-1111-111111111111',
        },
      } as unknown as Stripe.Checkout.Session;

      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: mockCheckoutSession,
        },
      } as Stripe.Event;

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 500 if RPC function fails', async () => {
      const mockBookingId = '55555555-5555-5555-5555-555555555555';

      const mockCheckoutSession: Stripe.Checkout.Session = {
        id: 'cs_test_session123',
        object: 'checkout.session',
        metadata: {
          booking_id: mockBookingId,
        },
      } as unknown as Stripe.Checkout.Session;

      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: mockCheckoutSession,
        },
      } as Stripe.Event;

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Mock RPC failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Booking not found or already processed' },
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('payment_intent.payment_failed event', () => {
    it('should update booking payment_status to Failed', async () => {
      const mockBookingId = '55555555-5555-5555-5555-555555555555';

      const mockPaymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test123',
        object: 'payment_intent',
        metadata: {
          booking_id: mockBookingId,
        },
      } as unknown as Stripe.PaymentIntent;

      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: mockPaymentIntent,
        },
      } as Stripe.Event;

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.received).toBe(true);

      // Verify booking was updated
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings');
      expect(mockSupabase.update).toHaveBeenCalledWith({ payment_status: 'Failed' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockBookingId);
    });
  });

  describe('Webhook signature validation', () => {
    it('should return 400 if stripe-signature header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing signature');
    });

    it('should return 400 if signature verification fails', async () => {
      (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Webhook signature verification failed');
    });
  });

  describe('Unhandled events', () => {
    it('should return 200 for unhandled event types', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'customer.created',
        data: {
          object: {} as any,
        },
      } as Stripe.Event;

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.received).toBe(true);
    });
  });
});

/*
 * INTEGRATION NOTE:
 * This test validates that the webhook correctly calls handle_successful_payment RPC.
 * The RPC function itself is tested in apps/api/migrations/tests/test_rpc_functions.sql
 *
 * The RPC tests verify:
 * - 90/10 split (no referrer): 3 transactions (Tutor Payout 90%, Platform Fee 10%)
 * - 80/10/10 split (with referrer): 4 transactions (Tutor 80%, Platform 10%, Referrer 10%)
 * - Idempotency (calling RPC twice doesn't create duplicate transactions)
 *
 * Together, these tests validate the entire payment → commission flow.
 */
