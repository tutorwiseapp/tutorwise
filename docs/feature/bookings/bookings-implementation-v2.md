# Bookings Implementation Guide

**Status**: ✅ Active (v5.9 - Free Help Support)
**Last Updated**: 2025-12-15
**Target Audience**: Developers implementing or extending the bookings system

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.9 | Initial v2 implementation guide with full code examples |

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Implementation Patterns](#core-implementation-patterns)
3. [API Endpoints](#api-endpoints)
4. [Database Operations](#database-operations)
5. [React Query Integration](#react-query-integration)
6. [Testing Strategies](#testing-strategies)
7. [Common Tasks](#common-tasks)

---

## Quick Start

### Prerequisites

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

NEXT_PUBLIC_WISESPACE_URL=your_wisespace_url
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Open bookings page
open http://localhost:3000/bookings
```

---

## Core Implementation Patterns

### Pattern 1: Creating a Paid Booking

**File**: `apps/web/src/app/api/bookings/route.ts`

```typescript
export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookingData = await request.json();
  const { listing_id, session_date, hours_requested } = bookingData;

  // 2. Fetch and validate listing
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single();

  if (listingError || !listing) {
    return Response.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.status !== 'published') {
    return Response.json({ error: 'Listing not available' }, { status: 400 });
  }

  if (listing.profile_id === user.id) {
    return Response.json({ error: 'Cannot book own listing' }, { status: 400 });
  }

  // 3. Fetch client profile for agent attribution
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('referred_by_agent_id')
    .eq('id', user.id)
    .single();

  // 4. Calculate total cost
  const total_cost = listing.hourly_rate * hours_requested;

  // 5. Create booking with listing snapshot (v5.8)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      tutor_id: listing.profile_id,
      listing_id: listing.id,
      agent_profile_id: clientProfile?.referred_by_agent_id || null,
      service_name: listing.title,
      session_start_time: session_date,
      hours_requested: hours_requested,
      amount: total_cost,
      type: 'paid',
      booking_type: clientProfile?.referred_by_agent_id ? 'referred' : 'direct',
      status: 'Pending',
      payment_status: 'Pending',

      // Listing snapshot fields (v5.8)
      subjects: listing.subjects,
      levels: listing.levels,
      location_type: listing.location_type,
      location_city: listing.location_city,
      hourly_rate: listing.hourly_rate,
      listing_slug: listing.slug,
      available_free_help: listing.available_free_help,
    })
    .select()
    .single();

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  // 6. Increment listing booking count
  await supabase.rpc('increment_listing_booking_count', {
    p_listing_id: listing.id,
  });

  return Response.json({ booking }, { status: 201 });
}
```

### Pattern 2: Creating a Free Help Booking (v5.9)

**File**: `apps/web/src/app/api/bookings/free-help/route.ts`

```typescript
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tutor_id, listing_id } = await request.json();

  // 1. Check account age (7+ days required)
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', user.id)
    .single();

  const accountAge = Date.now() - new Date(profile.created_at).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (accountAge < sevenDays) {
    return Response.json({
      error: 'Account must be 7+ days old to book free help'
    }, { status: 403 });
  }

  // 2. Enforce rate limit (5 per 7 days)
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', user.id)
    .eq('type', 'free_help')
    .gte('created_at', new Date(Date.now() - sevenDays).toISOString());

  if (recentBookings && recentBookings.length >= 5) {
    return Response.json({
      error: 'Weekly limit of 5 free help sessions exceeded'
    }, { status: 429 });
  }

  // 3. Verify tutor is online (Redis check)
  // Note: Implementation depends on your Redis setup
  const isOnline = await checkTutorOnline(tutor_id);
  if (!isOnline) {
    return Response.json({
      error: 'Tutor is not currently available'
    }, { status: 400 });
  }

  // 4. Fetch listing for snapshot
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single();

  // 5. Create free help booking (instant confirmation)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      tutor_id: tutor_id,
      listing_id: listing_id,
      service_name: `Free Help: ${listing.title}`,
      session_start_time: new Date().toISOString(),
      duration_minutes: 30, // Fixed 30 minutes
      amount: 0,
      type: 'free_help',
      booking_type: 'direct',
      status: 'Confirmed', // Skip Pending state
      payment_status: 'Paid', // Mark as paid (no payment needed)

      // Listing snapshot
      subjects: listing.subjects,
      levels: listing.levels,
      location_type: 'online', // Always online for free help
      hourly_rate: 0,
      listing_slug: listing.slug,
      available_free_help: true,
    })
    .select()
    .single();

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  // 6. Generate Google Meet link
  const meetLink = await generateMeetLink();

  return Response.json({
    booking,
    meetLink,
    message: 'Free help session confirmed! Join the video call now.'
  }, { status: 201 });
}

// Helper function for Redis online check
async function checkTutorOnline(tutorId: string): Promise<boolean> {
  // Check Redis key: `tutor:${tutorId}:online`
  // Key expires after 5 minutes (heartbeat TTL)
  // Implementation example:
  // const redis = await getRedisClient();
  // const exists = await redis.exists(`tutor:${tutorId}:online`);
  // return exists === 1;
  return true; // Placeholder
}

// Helper function for Google Meet link
async function generateMeetLink(): Promise<string> {
  // Integration with meet.new API
  // Returns instant video room URL
  return 'https://meet.google.com/abc-defg-hij'; // Placeholder
}
```

### Pattern 3: Stripe Checkout Creation

**File**: `apps/web/src/app/api/bookings/stripe-checkout/route.ts`

```typescript
import Stripe from 'stripe';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  const { bookingId } = await request.json();
  const supabase = await createClient();

  // 1. Fetch booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // 2. Get wiselist referrer from cookies (v5.7 attribution)
  const cookieStore = cookies();
  const wiselistReferrerId = cookieStore.get('wiselist_referrer_id')?.value;

  // 3. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: booking.service_name,
          description: `${booking.hours_requested} hours @ £${booking.hourly_rate}/hr`,
        },
        unit_amount: Math.round(booking.amount * 100), // Convert to pence
      },
      quantity: 1,
    }],
    metadata: {
      booking_id: booking.id,
      client_id: booking.client_id,
      tutor_id: booking.tutor_id,
      agent_id: booking.agent_profile_id || '',
      wiselist_referrer_id: wiselistReferrerId || '',
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?payment=cancel`,
  });

  return Response.json({ sessionUrl: session.url });
}
```

### Pattern 4: Payment Webhook Handler

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  // 1. Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error('No booking_id in webhook metadata');
      return Response.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Idempotency check
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('stripe_checkout_id')
      .eq('id', bookingId)
      .single();

    if (existingBooking?.stripe_checkout_id) {
      console.log('Webhook already processed for booking:', bookingId);
      return Response.json({ received: true }); // Already processed
    }

    // 4. Call atomic RPC function
    const { error: rpcError } = await supabase.rpc('handle_successful_payment', {
      p_booking_id: bookingId,
      p_stripe_checkout_id: session.id,
    });

    if (rpcError) {
      console.error('RPC failed:', rpcError);

      // Log to failed webhooks table
      await supabase.from('failed_webhooks').insert({
        event_id: event.id,
        event_type: event.type,
        status: 'failed',
        error_message: rpcError.message,
        payload: event,
        booking_id: bookingId,
      });

      return Response.json({ error: 'Payment processing failed' }, { status: 500 });
    }

    // 5. Save wiselist attribution (v5.7)
    const wiselistReferrerId = session.metadata?.wiselist_referrer_id;
    if (wiselistReferrerId) {
      await supabase
        .from('bookings')
        .update({ booking_referrer_id: wiselistReferrerId })
        .eq('id', bookingId);
    }

    console.log('Payment processed successfully for booking:', bookingId);
  }

  return Response.json({ received: true });
}
```

---

## Database Operations

### RPC Function: handle_successful_payment

**File**: `apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql`

```sql
CREATE OR REPLACE FUNCTION handle_successful_payment(
  p_booking_id UUID,
  p_stripe_checkout_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_booking RECORD;
  v_platform_fee DECIMAL;
  v_agent_commission DECIMAL;
  v_tutor_payout DECIMAL;
  v_available_timestamp TIMESTAMPTZ;
BEGIN
  -- 1. Idempotency check
  IF EXISTS (SELECT 1 FROM bookings WHERE stripe_checkout_id = p_stripe_checkout_id) THEN
    RETURN; -- Already processed
  END IF;

  -- 2. Fetch booking context
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- 3. Calculate clearing period (7 days after session)
  v_available_timestamp := v_booking.session_start_time + INTERVAL '7 days';

  -- 4. Calculate commission split
  v_platform_fee := v_booking.amount * 0.10;

  IF v_booking.agent_profile_id IS NOT NULL THEN
    -- 4-way split: client, platform, agent, tutor
    v_agent_commission := v_booking.amount * 0.10;
    v_tutor_payout := v_booking.amount * 0.80;
  ELSE
    -- 3-way split: client, platform, tutor
    v_agent_commission := 0;
    v_tutor_payout := v_booking.amount * 0.90;
  END IF;

  -- 5. Create transaction records (atomic)

  -- Transaction 1: Client Payment (debit)
  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at
  ) VALUES (
    v_booking.client_id,
    p_booking_id,
    'Booking Payment',
    -v_booking.amount,
    'paid_out',
    NOW()
  );

  -- Transaction 2: Platform Fee
  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at
  ) VALUES (
    NULL, -- Platform revenue
    p_booking_id,
    'Platform Fee',
    v_platform_fee,
    'paid_out',
    NOW()
  );

  -- Transaction 3: Agent Commission (conditional)
  IF v_booking.agent_profile_id IS NOT NULL THEN
    INSERT INTO transactions (
      profile_id, booking_id, type, amount, status, available_at
    ) VALUES (
      v_booking.agent_profile_id,
      p_booking_id,
      'Referral Commission',
      v_agent_commission,
      'clearing',
      v_available_timestamp
    );
  END IF;

  -- Transaction 4: Tutor Payout
  INSERT INTO transactions (
    profile_id, booking_id, type, amount, status, available_at
  ) VALUES (
    v_booking.tutor_id,
    p_booking_id,
    'Tutoring Payout',
    v_tutor_payout,
    'clearing',
    v_available_timestamp
  );

  -- 6. Update booking status
  UPDATE bookings
  SET payment_status = 'Paid',
      status = 'Confirmed',
      stripe_checkout_id = p_stripe_checkout_id,
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- 7. Update referrals table (first conversion)
  UPDATE referrals
  SET status = 'Converted',
      booking_id = p_booking_id,
      converted_at = NOW()
  WHERE referred_profile_id = v_booking.client_id
    AND status = 'Signed Up';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Payment processing failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration: Add Listing Snapshot Fields (v5.8)

**File**: `apps/api/migrations/104_add_listing_snapshot_to_bookings.sql`

```sql
-- Add snapshot columns to preserve listing context
ALTER TABLE bookings
  ADD COLUMN subjects TEXT[],
  ADD COLUMN levels TEXT[],
  ADD COLUMN location_type TEXT,
  ADD COLUMN location_city TEXT,
  ADD COLUMN hourly_rate NUMERIC(10,2),
  ADD COLUMN listing_slug TEXT,
  ADD COLUMN free_trial BOOLEAN;

-- Backfill existing bookings from listings
UPDATE bookings b
SET subjects = l.subjects,
    levels = l.levels,
    location_type = l.location_type,
    location_city = l.location_city,
    hourly_rate = l.hourly_rate,
    listing_slug = l.slug,
    free_trial = l.free_trial
FROM listings l
WHERE b.listing_id = l.id
  AND b.subjects IS NULL; -- Only update unsnapshotted bookings

-- Create index for snapshot field queries
CREATE INDEX idx_bookings_subjects ON bookings USING GIN (subjects);
CREATE INDEX idx_bookings_levels ON bookings USING GIN (levels);
```

### Migration: Add Free Help Support (v5.9)

**File**: `apps/api/migrations/108_add_free_help_to_bookings.sql`

```sql
-- Add type column for free help support
ALTER TABLE bookings
  ADD COLUMN type TEXT DEFAULT 'paid' CHECK (type IN ('paid', 'free_help'));

-- Add duration_minutes for fixed-duration free sessions
ALTER TABLE bookings
  ADD COLUMN duration_minutes INTEGER;

-- Create index for filtering free help bookings
CREATE INDEX idx_bookings_type ON bookings(type);

-- Update existing bookings to 'paid' type (already default)
-- No data migration needed

COMMENT ON COLUMN bookings.type IS 'Booking type: paid (standard) or free_help (v5.9)';
COMMENT ON COLUMN bookings.duration_minutes IS 'Fixed duration for free help sessions (30 minutes)';
```

---

## React Query Integration

### Query: Fetch Bookings

**File**: `apps/web/src/lib/api/bookings.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export function useBookings(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);

      const response = await fetch(`/api/bookings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      return data.bookings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
```

### Mutation: Create Booking with Optimistic Update

**File**: `apps/web/src/lib/api/bookings.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: {
      listing_id: string;
      session_date: string;
      hours_requested: number;
    }) => {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      return response.json();
    },

    // Optimistic update for instant UI feedback
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings'] });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(['bookings']);

      // Optimistically update to new value
      queryClient.setQueryData(['bookings'], (old: any) => ({
        bookings: [
          ...(old?.bookings || []),
          {
            id: 'optimistic-' + Date.now(),
            status: 'Pending',
            payment_status: 'Pending',
            created_at: new Date().toISOString(),
            ...newBooking,
          },
        ],
      }));

      return { previousBookings };
    },

    // Rollback on error
    onError: (err, newBooking, context) => {
      queryClient.setQueryData(['bookings'], context?.previousBookings);
      console.error('Booking creation failed:', err);
    },

    // Refetch on success
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.booking.type === 'paid') {
        window.location.href = data.stripeCheckoutUrl;
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

### Mutation: Create Free Help Booking

**File**: `apps/web/src/lib/api/bookings.ts`

```typescript
export function useCreateFreeHelpBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tutor_id: string;
      listing_id: string;
    }) => {
      const response = await fetch('/api/bookings/free-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create free help booking');
      }

      return response.json();
    },

    onSuccess: (data) => {
      // Show success notification
      console.log('Free help session confirmed!', data.meetLink);

      // Invalidate bookings cache
      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      // Navigate to booking or open Meet link
      if (data.meetLink) {
        window.open(data.meetLink, '_blank');
      }
    },

    onError: (error: Error) => {
      // Handle rate limiting and other errors
      if (error.message.includes('limit')) {
        // Show rate limit UI
        alert('You have reached your weekly free help limit (5 sessions)');
      } else if (error.message.includes('Account must be')) {
        alert('Your account must be 7+ days old to book free help');
      } else {
        alert('Failed to create free help booking: ' + error.message);
      }
    },
  });
}
```

### Mutation: Cancel Booking

**File**: `apps/web/src/lib/api/bookings.ts`

```typescript
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: {
      bookingId: string;
      reason: string;
    }) => {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) throw new Error('Failed to cancel booking');
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

---

## Testing Strategies

### Unit Testing: API Routes

**File**: `apps/web/src/app/api/bookings/route.test.ts`

```typescript
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server');

describe('POST /api/bookings', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(),
      rpc: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('creates paid booking with listing snapshot', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'client-123' } },
      error: null,
    });

    // Mock listing fetch
    const mockListing = {
      id: 'listing-456',
      profile_id: 'tutor-789',
      title: 'Math Tutoring',
      hourly_rate: 50,
      subjects: ['Mathematics'],
      levels: ['GCSE'],
      location_type: 'online',
      slug: 'math-tutoring',
      status: 'published',
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockListing,
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'booking-999',
              status: 'Pending',
              payment_status: 'Pending',
              type: 'paid',
              // Snapshot fields preserved
              subjects: mockListing.subjects,
              levels: mockListing.levels,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: 'listing-456',
        session_date: '2025-12-20T10:00:00Z',
        hours_requested: 2,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.booking.id).toBe('booking-999');
    expect(data.booking.subjects).toEqual(['Mathematics']);
  });

  it('rejects booking own listing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { profile_id: 'user-123' }, // Same as authenticated user
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'listing-456' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot book own listing');
  });
});
```

### Integration Testing: Stripe Webhook

**File**: `apps/web/src/app/api/webhooks/stripe/route.test.ts`

```typescript
import { POST } from './route';
import Stripe from 'stripe';

describe('POST /api/webhooks/stripe', () => {
  it('processes payment webhook with idempotency', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          metadata: {
            booking_id: 'booking-789',
          },
        } as Stripe.Checkout.Session,
      },
    } as Stripe.Event;

    const signature = 'test_signature';
    const body = JSON.stringify(mockEvent);

    const request = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
      },
      body,
    });

    // Mock Stripe webhook verification
    jest.spyOn(Stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('rejects invalid signature', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid_signature',
      },
      body: JSON.stringify({}),
    });

    jest.spyOn(Stripe.webhooks, 'constructEvent').mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### E2E Testing: Complete Booking Flow

**File**: `apps/web/tests/e2e/bookings.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('complete paid booking from listing to confirmation', async ({ page }) => {
    // 1. Login as student
    await page.goto('/login');
    await page.fill('[name="email"]', 'student@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Browse marketplace
    await page.goto('/marketplace');
    await expect(page.locator('h1')).toContainText('Find a Tutor');

    // 3. Select listing
    await page.click('text=Math Tutoring');
    await expect(page.locator('.listing-detail')).toBeVisible();

    // 4. Book session
    await page.fill('[name="session_date"]', '2025-12-20T10:00');
    await page.fill('[name="hours_requested"]', '2');
    await page.click('button:has-text("Book Session")');

    // 5. Verify booking created
    await expect(page.locator('.booking-confirmation')).toBeVisible();
    await expect(page.locator('.booking-status')).toContainText('Pending');

    // 6. Stripe checkout redirect (mock in test environment)
    const stripeUrl = await page.getAttribute('a.checkout-button', 'href');
    expect(stripeUrl).toContain('checkout.stripe.com');

    // 7. Verify booking appears in dashboard
    await page.goto('/bookings');
    await expect(page.locator('.booking-card').first()).toContainText('Math Tutoring');
    await expect(page.locator('.payment-status').first()).toContainText('Pending');
  });

  test('create free help booking instantly', async ({ page }) => {
    await page.goto('/login');
    // Login as 7+ day old account
    await page.fill('[name="email"]', 'veteran@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Find tutor with free help enabled
    await page.goto('/marketplace');
    await page.click('[data-filter="free_help"]');

    // Click "Get Free Help Now"
    await page.click('button:has-text("Get Free Help Now")');

    // Verify instant confirmation
    await expect(page.locator('.confirmation-modal')).toBeVisible();
    await expect(page.locator('.meet-link')).toBeVisible();

    // Verify no payment required
    const meetLink = await page.getAttribute('.meet-link', 'href');
    expect(meetLink).toContain('meet.google.com');
  });
});
```

---

## Common Tasks

### Task 1: Cancel a Booking

**Scenario**: Client wants to cancel an upcoming booking.

```typescript
// API Route: apps/web/src/app/api/bookings/[id]/cancel/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { reason } = await request.json();
  const bookingId = params.id;

  // 1. Fetch booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  // 2. Verify authorization (client or tutor only)
  if (booking.client_id !== user.id && booking.tutor_id !== user.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 3. Check if cancellable (must be before session start)
  const now = new Date();
  const sessionStart = new Date(booking.session_start_time);
  if (now >= sessionStart) {
    return Response.json({
      error: 'Cannot cancel after session start time'
    }, { status: 400 });
  }

  // 4. Update booking status
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'Cancelled',
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 5. Process refund if paid
  if (booking.payment_status === 'Paid') {
    await processRefund(booking);
  }

  return Response.json({ success: true });
}

async function processRefund(booking: any) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Fetch Stripe payment intent
  const session = await stripe.checkout.sessions.retrieve(
    booking.stripe_checkout_id
  );

  // Create refund
  await stripe.refunds.create({
    payment_intent: session.payment_intent as string,
    amount: Math.round(booking.amount * 100), // Full refund
    reason: 'requested_by_customer',
  });

  // Update database
  const supabase = await createClient();
  await supabase
    .from('bookings')
    .update({
      payment_status: 'Refunded',
      refund_amount: booking.amount,
    })
    .eq('id', booking.id);
}
```

### Task 2: Mark Booking Complete

**Scenario**: WiseSpace calls completion endpoint after session ends.

```typescript
// API Route: apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const supabase = await createClient();
  const { session_artifacts } = await request.json();

  const bookingId = params.bookingId;

  // 1. Fetch booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }

  // 2. Verify session actually occurred (WiseSpace verification)
  const sessionValid = await verifyWiseSpaceSession(bookingId);
  if (!sessionValid) {
    return Response.json({
      error: 'Session verification failed'
    }, { status: 400 });
  }

  // 3. Update booking to Completed
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      session_artifacts: session_artifacts,
    })
    .eq('id', bookingId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 4. Trigger review session creation
  await supabase.from('review_sessions').insert({
    booking_id: bookingId,
    reviewer_id: booking.client_id,
    reviewee_id: booking.tutor_id,
    status: 'Pending',
  });

  // 5. Queue CaaS recalculation for tutor
  await supabase.from('caas_recalculation_queue').insert({
    tutor_id: booking.tutor_id,
    reason: 'booking_completed',
  });

  return Response.json({ success: true });
}

async function verifyWiseSpaceSession(bookingId: string): Promise<boolean> {
  // Call WiseSpace API to verify session occurred
  // Check duration, participants joined, etc.
  return true; // Placeholder
}
```

### Task 3: Handle Failed Payment Webhook

**Scenario**: Stripe webhook fails to process, logged in failed_webhooks table.

```typescript
// Script: tools/retry-failed-webhooks.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function retryFailedWebhooks() {
  // 1. Fetch failed webhooks from last 24 hours
  const { data: failedWebhooks } = await supabase
    .from('failed_webhooks')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .order('created_at', { ascending: false });

  console.log(`Found ${failedWebhooks?.length || 0} failed webhooks`);

  for (const webhook of failedWebhooks || []) {
    try {
      // 2. Retry RPC call
      const { error } = await supabase.rpc('handle_successful_payment', {
        p_booking_id: webhook.booking_id,
        p_stripe_checkout_id: webhook.payload.data.object.id,
      });

      if (!error) {
        // 3. Mark webhook as retried successfully
        await supabase
          .from('failed_webhooks')
          .update({
            status: 'retried_success',
            retried_at: new Date().toISOString(),
          })
          .eq('id', webhook.id);

        console.log(`✅ Successfully retried webhook for booking ${webhook.booking_id}`);
      } else {
        console.error(`❌ Retry failed for booking ${webhook.booking_id}:`, error);
      }
    } catch (err) {
      console.error(`❌ Error retrying webhook ${webhook.id}:`, err);
    }
  }
}

retryFailedWebhooks();
```

### Task 4: Query Bookings with Snapshot Data

**Scenario**: Display booking history without needing listing JOIN.

```typescript
// Component: apps/web/src/app/components/feature/bookings/BookingHistory.tsx
export function BookingHistory() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/bookings?status=Completed');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="booking-history">
      {bookings.map((booking: any) => (
        <div key={booking.id} className="booking-card">
          <h3>{booking.service_name}</h3>

          {/* Use snapshot data - no listing JOIN needed */}
          <p>Subjects: {booking.subjects?.join(', ')}</p>
          <p>Levels: {booking.levels?.join(', ')}</p>
          <p>Rate: £{booking.hourly_rate}/hr</p>
          <p>Location: {booking.location_type}</p>

          {/* Even if listing deleted, snapshot preserves context */}
          {booking.listing_id === null && (
            <span className="badge">Listing Deleted</span>
          )}

          <p>Session: {new Date(booking.session_start_time).toLocaleDateString()}</p>
          <p>Duration: {booking.hours_requested} hours</p>
          <p>Total: £{booking.amount}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Issue 1: Optimistic Update Not Reverting on Error

**Symptom**: UI shows successful booking creation even though API returned error.

**Cause**: Missing `onError` handler in React Query mutation.

**Solution**:

```typescript
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    // ... mutationFn ...

    onMutate: async (newBooking) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      const previousBookings = queryClient.getQueryData(['bookings']);

      queryClient.setQueryData(['bookings'], (old: any) => ({
        bookings: [...(old?.bookings || []), { ...newBooking, id: 'temp' }],
      }));

      // ✅ Return context for rollback
      return { previousBookings };
    },

    onError: (err, newBooking, context) => {
      // ✅ Rollback to previous state
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings'], context.previousBookings);
      }

      // Show error notification
      alert('Failed to create booking: ' + err.message);
    },

    onSettled: () => {
      // ✅ Always refetch for source of truth
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

### Issue 2: Webhook Not Updating Booking Status

**Symptom**: Payment successful in Stripe but booking still shows "Pending".

**Cause**: Webhook signature verification failing or RPC function error.

**Solution**:

```bash
# 1. Check webhook logs in Stripe dashboard
# Look for 400 or 500 responses

# 2. Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 3. Trigger test webhook
stripe trigger checkout.session.completed

# 4. Check failed_webhooks table
PGPASSWORD="xxx" psql -h xxx -U postgres -d postgres -c "
  SELECT id, booking_id, error_message, created_at
  FROM failed_webhooks
  ORDER BY created_at DESC
  LIMIT 10;
"

# 5. Manually retry failed webhook (if RPC was the issue)
PGPASSWORD="xxx" psql -h xxx -U postgres -d postgres -c "
  SELECT handle_successful_payment(
    'booking-id-here'::UUID,
    'stripe-checkout-session-id-here'
  );
"
```

### Issue 3: Free Help Rate Limit Not Working

**Symptom**: Student books more than 5 free help sessions in 7 days.

**Cause**: Query filtering not checking created_at correctly.

**Solution**:

```typescript
// ❌ WRONG - Uses updated_at instead of created_at
const { data: recentBookings } = await supabase
  .from('bookings')
  .select('id')
  .eq('client_id', user.id)
  .eq('type', 'free_help')
  .gte('updated_at', sevenDaysAgo); // Wrong column!

// ✅ CORRECT - Uses created_at for accurate rate limiting
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const { data: recentBookings } = await supabase
  .from('bookings')
  .select('id')
  .eq('client_id', user.id)
  .eq('type', 'free_help')
  .gte('created_at', sevenDaysAgo); // Correct column

if (recentBookings && recentBookings.length >= 5) {
  return Response.json({
    error: 'Weekly limit of 5 free help sessions exceeded'
  }, { status: 429 });
}
```

### Issue 4: Commission Split Calculation Wrong

**Symptom**: Tutor receives incorrect payout amount.

**Cause**: Agent commission calculated even when agent_profile_id is NULL.

**Solution**:

```sql
-- ❌ WRONG - Always calculates agent commission
v_agent_commission := v_booking.amount * 0.10;
v_tutor_payout := v_booking.amount * 0.80;

-- ✅ CORRECT - Conditional commission split
IF v_booking.agent_profile_id IS NOT NULL THEN
  -- 4-way split: 80/10/10 (tutor/platform/agent)
  v_agent_commission := v_booking.amount * 0.10;
  v_tutor_payout := v_booking.amount * 0.80;
ELSE
  -- 3-way split: 90/10 (tutor/platform)
  v_agent_commission := 0;
  v_tutor_payout := v_booking.amount * 0.90;
END IF;
```

---

## Performance Optimization

### Query Optimization: Avoid Listing JOINs

**Before (v5.7 and earlier)**:

```sql
-- ❌ SLOW - JOINs listings table for every booking query
SELECT
  b.*,
  l.subjects,
  l.levels,
  l.hourly_rate,
  l.slug
FROM bookings b
LEFT JOIN listings l ON b.listing_id = l.id
WHERE b.client_id = 'user-123'
ORDER BY b.created_at DESC;

-- Query time: ~450ms for 50 bookings
```

**After (v5.8 with listing snapshots)**:

```sql
-- ✅ FAST - All data in bookings table (no JOIN)
SELECT
  id,
  service_name,
  subjects,      -- Snapshot field
  levels,        -- Snapshot field
  hourly_rate,   -- Snapshot field
  listing_slug,  -- Snapshot field
  session_start_time,
  amount,
  status
FROM bookings
WHERE client_id = 'user-123'
ORDER BY created_at DESC;

-- Query time: ~120ms for 50 bookings (3.75x faster!)
```

### React Query Stale Time Tuning

```typescript
// ✅ Optimize refetch behavior based on data freshness needs
export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings,

    // Don't refetch for 5 minutes (bookings rarely change)
    staleTime: 1000 * 60 * 5,

    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,

    // Don't refetch on mount if cache exists
    refetchOnMount: false,

    // Cache for 10 minutes even when unmounted
    cacheTime: 1000 * 60 * 10,
  });
}
```

### Webhook Processing Timeout

```typescript
// ✅ Set Vercel/Next.js function timeout for webhooks
export const config = {
  maxDuration: 60, // 60 seconds max (Stripe requires <30s response)
};

export async function POST(request: Request) {
  // Webhook handler implementation
  // Must respond to Stripe within 30 seconds or marked as failed
}
```

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing recurring bookings (v6.0)
**Maintained By**: Backend Team + Payments Team