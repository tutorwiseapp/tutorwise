# Bookings - Implementation Guide

**Version**: v5.9
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/(authenticated)/bookings/
│   ├─ page.tsx                           # Main hub page (Server Component)
│   └─ page.module.css
│
├─ app/components/feature/bookings/
│   ├─ BookingCard.tsx                    # Individual booking card
│   ├─ BookingCard.module.css
│   ├─ BookingDetailModal.tsx             # Full details modal
│   ├─ BookingDetailModal.module.css
│   ├─ BookingStatsWidget.tsx             # Stats overview
│   ├─ BookingStatsWidget.module.css
│   ├─ UpcomingSessionWidget.tsx          # Next session
│   ├─ UpcomingSessionWidget.module.css
│   ├─ BookingHelpWidget.tsx              # Help/support
│   ├─ BookingTipWidget.tsx               # Usage tips
│   ├─ BookingVideoWidget.tsx             # Video tutorials
│   ├─ BookingsSkeleton.tsx               # Loading state
│   └─ BookingsError.tsx                  # Error state
│
├─ app/api/bookings/
│   ├─ route.ts                           # GET/POST bookings
│   ├─ assign/route.ts                    # Agent assigns tutor
│   ├─ stripe-checkout/route.ts           # Payment checkout
│   └─ wisespace-complete/route.ts        # Mark complete
│
└─ lib/api/
    └─ bookings.ts                        # Client-side API functions
```

---

## Component Overview

### HubPageLayout Architecture (Gold Standard)

The bookings hub uses the standard 3x3 widget grid pattern:

```
┌─────────────────────────────────────────────┐
│ HubPageLayout                               │
│ ┌─────────────────────────────────────────┐ │
│ │ Stats Widget │ Upcoming │ Help/Tip     │ │
│ ├──────────────┼──────────┼──────────────┤ │
│ │ BookingCard  │ Card     │ Card         │ │
│ ├──────────────┼──────────┼──────────────┤ │
│ │ Card         │ Card     │ Video        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Component Breakdown

**BookingCard** (apps/web/src/app/components/feature/bookings/BookingCard.tsx)
- Displays individual booking with status badge
- Shows: Client/tutor name, listing title, date, price
- Actions: View details, cancel, mark complete
- Role-based rendering (client sees tutor, tutor sees client)

**BookingDetailModal** (apps/web/src/app/components/feature/bookings/BookingDetailModal.tsx)
- Comprehensive 19-field display
- Fields: All booking data + profile info + listing snapshot
- Actions: Cancel, complete, contact, navigate to listing

**BookingStatsWidget**
- Total bookings count
- Breakdown by status (Pending, Confirmed, Completed)
- Revenue stats (for tutors/agents)

**UpcomingSessionWidget**
- Next scheduled session
- Countdown timer
- Quick access to session details

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Stripe account set up
- React Query installed

### Environment Variables

Required in `.env.local`:
```bash
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

# 3. Run migrations (if needed)
npm run db:migrate

# 4. Start dev server
npm run dev

# 5. Open bookings page
open http://localhost:3000/bookings
```

---

## Common Tasks

### Task 1: Create a New Booking

```typescript
// Client-side API call
import { createBooking } from '@/lib/api/bookings';

const handleCreateBooking = async () => {
  const bookingData = {
    listing_id: 'listing-uuid',
    client_id: 'client-uuid',
    tutor_id: 'tutor-uuid',
    session_date: '2025-12-15T10:00:00Z',
    hours_requested: 2,
    type: 'paid', // or 'free_help'
    booking_type: 'direct', // or 'referred', 'agent_job'
  };

  try {
    const booking = await createBooking(bookingData);

    // If paid booking, redirect to Stripe
    if (booking.type === 'paid') {
      const { sessionUrl } = await createStripeCheckout(booking.id);
      window.location.href = sessionUrl;
    } else {
      // Free booking confirmed immediately
      router.push(`/bookings`);
    }
  } catch (error) {
    console.error('Booking creation failed:', error);
  }
};
```

### Task 2: Handle Payment with Stripe

```typescript
// API Route: apps/web/src/app/api/bookings/stripe-checkout/route.ts

import Stripe from 'stripe';

export async function POST(request: Request) {
  const { bookingId } = await request.json();

  // Fetch booking
  const booking = await getBooking(bookingId);

  // Create Stripe checkout session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Tutoring Session - ${booking.listing.title}`,
        },
        unit_amount: Math.round(booking.total_cost * 100),
      },
      quantity: 1,
    }],
    metadata: {
      booking_id: bookingId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?cancelled=true`,
  });

  return Response.json({ sessionUrl: session.url });
}
```

### Task 3: Handle Stripe Webhook (Payment Confirmation)

```typescript
// API Route: apps/web/src/app/api/webhooks/stripe/route.ts

import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        payment_status: 'Paid',
        status: 'Confirmed',
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq('id', bookingId);
  }

  return Response.json({ received: true });
}
```

### Task 4: Cancel a Booking

```typescript
// Using React Query mutation
import { useMutation, useQueryClient } from '@tanstack/react-query';

const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      return response.json();
    },
    onMutate: async (bookingId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['bookings'] });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(['bookings']);

      // Optimistically update
      queryClient.setQueryData(['bookings'], (old: Booking[]) =>
        old.map(b =>
          b.id === bookingId
            ? { ...b, status: 'Cancelled' }
            : b
        )
      );

      return { previousBookings };
    },
    onError: (err, bookingId, context) => {
      // Rollback on error
      queryClient.setQueryData(['bookings'], context?.previousBookings);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
};

// Usage in component
const { mutate: cancelBooking } = useCancelBooking();

<button onClick={() => cancelBooking(booking.id)}>
  Cancel Booking
</button>
```

### Task 5: Mark Booking Complete (WiseSpace Integration)

```typescript
// API Route: apps/web/src/app/api/bookings/wisespace-complete/route.ts

export async function POST(request: Request) {
  const { bookingId, wisespaceSessionId } = await request.json();

  // Verify with WiseSpace that session actually occurred
  const wisespaceSession = await verifyWiseSpaceSession(wisespaceSessionId);

  if (!wisespaceSession.completed) {
    return Response.json(
      { error: 'Session not completed in WiseSpace' },
      { status: 400 }
    );
  }

  // Update booking
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) throw error;

  // Trigger review request (async)
  await triggerReviewRequest(bookingId);

  // Trigger payout calculation (async)
  await calculatePayout(bookingId);

  return Response.json({ success: true });
}
```

### Task 6: Display Bookings with Filtering

```typescript
// apps/web/src/app/(authenticated)/bookings/page.tsx

import { useQuery } from '@tanstack/react-query';
import { getBookings } from '@/lib/api/bookings';

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: () => getBookings({ status: statusFilter }),
  });

  if (isLoading) return <BookingsSkeleton />;
  if (error) return <BookingsError error={error} />;

  return (
    <div>
      {/* Filter */}
      <select onChange={(e) => setStatusFilter(e.target.value || null)}>
        <option value="">All</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Completed">Completed</option>
      </select>

      {/* Bookings Grid */}
      <div className={styles.bookingsGrid}>
        {bookings.map(booking => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  );
}
```

### Task 7: Agent Assigns Tutor to Job

```typescript
// API Route: apps/web/src/app/api/bookings/assign/route.ts

export async function POST(request: Request) {
  const { bookingId, tutorId, agentProfileId } = await request.json();

  // Verify agent owns this booking
  const booking = await getBooking(bookingId);
  if (booking.agent_profile_id !== agentProfileId) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Assign tutor
  const { error } = await supabase
    .from('bookings')
    .update({
      tutor_id: tutorId,
      status: 'Confirmed',
    })
    .eq('id', bookingId);

  if (error) throw error;

  // Notify tutor (async)
  await notifyTutor(tutorId, bookingId);

  return Response.json({ success: true });
}
```

### Task 8: Create Free Help Booking (v5.9)

```typescript
const handleCreateFreeBooking = async () => {
  const bookingData = {
    listing_id: 'listing-uuid',
    client_id: 'client-uuid',
    tutor_id: 'tutor-uuid',
    session_date: '2025-12-15T10:00:00Z',
    hours_requested: 1,
    type: 'free_help',          // NEW: Mark as free
    booking_type: 'direct',
    hourly_rate: 0,             // Free
    total_cost: 0,              // Free
  };

  const booking = await createBooking(bookingData);

  // Skip payment, go straight to confirmed
  await updateBooking(booking.id, {
    status: 'Confirmed',
    payment_status: 'Paid',  // Mark as "paid" (no payment needed)
  });
};
```

---

## API Reference

### GET /api/bookings

Fetch bookings with optional filtering.

**Query Parameters**:
- `status` - Filter by status (Pending, Confirmed, Completed, Cancelled)
- `type` - Filter by type (paid, free_help)
- `booking_type` - Filter by booking type (direct, referred, agent_job)

**Response**:
```typescript
{
  bookings: Booking[];
}
```

### POST /api/bookings

Create a new booking.

**Request Body**:
```typescript
{
  listing_id: string;
  client_id: string;
  tutor_id: string;
  session_date: string; // ISO 8601
  hours_requested: number;
  type: 'paid' | 'free_help';
  booking_type: 'direct' | 'referred' | 'agent_job';
  agent_profile_id?: string; // For referred/agent_job
}
```

**Response**:
```typescript
{
  booking: Booking;
}
```

### POST /api/bookings/stripe-checkout

Create Stripe checkout session for booking.

**Request Body**:
```typescript
{
  booking_id: string;
}
```

**Response**:
```typescript
{
  sessionUrl: string;
}
```

### POST /api/bookings/wisespace-complete

Mark booking complete via WiseSpace.

**Request Body**:
```typescript
{
  booking_id: string;
  wisespace_session_id: string;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

### POST /api/bookings/assign

Agent assigns tutor to job.

**Request Body**:
```typescript
{
  booking_id: string;
  tutor_id: string;
  agent_profile_id: string;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

---

## Database Schema

### bookings table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  client_id UUID NOT NULL REFERENCES profiles(id),
  tutor_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  agent_profile_id UUID REFERENCES profiles(id),

  -- Booking details
  booking_type TEXT NOT NULL, -- 'direct' | 'referred' | 'agent_job'
  type TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'free_help' (v5.9)
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'

  -- Pricing
  hourly_rate DECIMAL(10, 2),
  hours_requested DECIMAL(5, 2),
  total_cost DECIMAL(10, 2),

  -- Payment
  payment_status TEXT DEFAULT 'Pending', -- 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  stripe_payment_intent_id TEXT,

  -- Scheduling
  session_date TIMESTAMPTZ,

  -- Listing snapshot (v5.8 - Migration 104)
  subjects TEXT,
  levels TEXT,
  location_type TEXT,
  hourly_rate DECIMAL(10, 2),
  listing_slug TEXT,
  available_free_help BOOLEAN,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_tutor_id ON bookings(tutor_id);
CREATE INDEX idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
```

### Migration History

1. **049**: Create bookings table
2. **050-054**: Add fields (agent_profile_id, status columns)
3. **090**: Add Stripe payment fields
4. **095**: Add payment_status column
5. **100**: Add hours_requested column
6. **104**: Add listing snapshot columns (v5.8)
7. **108**: Add type column for free_help support (v5.9)

---

## State Management

### React Query Setup

```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});
```

### Query Keys Structure

```typescript
// Bookings queries
['bookings'] // All bookings
['bookings', { status: 'Confirmed' }] // Filtered by status
['bookings', bookingId] // Single booking
['bookings', 'stats'] // Booking statistics
```

### Optimistic Updates Pattern

```typescript
const mutation = useMutation({
  mutationFn: updateBooking,
  onMutate: async (updatedBooking) => {
    await queryClient.cancelQueries({ queryKey: ['bookings'] });
    const previous = queryClient.getQueryData(['bookings']);
    queryClient.setQueryData(['bookings'], (old) => {
      // Update optimistically
    });
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['bookings'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  },
});
```

---

## Testing

### Component Testing

```typescript
// __tests__/BookingCard.test.tsx

import { render, screen } from '@testing-library/react';
import { BookingCard } from '../BookingCard';

describe('BookingCard', () => {
  const mockBooking = {
    id: '123',
    status: 'Confirmed',
    client: { full_name: 'John Doe' },
    tutor: { full_name: 'Jane Smith' },
    listing: { title: 'Math Tutoring' },
    session_date: '2025-12-15T10:00:00Z',
    total_cost: 100,
  };

  it('renders booking details', () => {
    render(<BookingCard booking={mockBooking} />);

    expect(screen.getByText('Math Tutoring')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
// __tests__/api/bookings.test.ts

import { POST } from '@/app/api/bookings/route';

describe('POST /api/bookings', () => {
  it('creates a booking', async () => {
    const request = new Request('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: 'listing-123',
        client_id: 'client-123',
        tutor_id: 'tutor-123',
        session_date: '2025-12-15T10:00:00Z',
        hours_requested: 2,
        type: 'paid',
        booking_type: 'direct',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.booking).toBeDefined();
    expect(data.booking.status).toBe('Pending');
  });
});
```

---

## Troubleshooting

### Issue: Booking creation fails

**Solution**: Check listing availability and user permissions

```typescript
// Validate before creating
const listing = await getListing(listing_id);
if (!listing.is_active) {
  throw new Error('Listing is not active');
}
```

### Issue: Stripe webhook not firing

**Solution**: Verify webhook endpoint and secret

```bash
# Test webhook locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### Issue: Optimistic update shows stale data

**Solution**: Invalidate queries after mutation

```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['bookings'] });
}
```

---

## Related Files

- API: [apps/web/src/lib/api/bookings.ts](../../../apps/web/src/lib/api/bookings.ts)
- Types: [packages/shared-types/src/booking.ts](../../../packages/shared-types/src/booking.ts)
- Migrations: `apps/api/migrations/049-*.sql` through `108-*.sql`

---

**Last Updated**: 2025-12-12
**Version**: v5.9
**Maintainer**: Backend Team
