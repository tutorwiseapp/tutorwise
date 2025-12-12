# Bookings - AI Prompt Context

**Version**: v5.9
**Last Updated**: 2025-12-12
**Purpose**: Context for AI assistants working on bookings feature

---

## Quick Context for AI

When a user asks you to modify the bookings system, here's what you need to know:

### What This Feature Does
Manages the complete booking lifecycle for tutoring sessions - from creation through payment, completion, and review triggering. Built with React Query for state management, Stripe for payments, and WiseSpace for session verification.

### Key Files

**Main Hub Page**:
- [page.tsx](../../../apps/web/src/app/(authenticated)/bookings/page.tsx) - Gold Standard Hub

**Components**:
- `apps/web/src/app/components/feature/bookings/*.tsx` (9 total)
- BookingCard, BookingDetailModal, Stats/Upcoming/Help widgets

**API Routes**:
- `apps/web/src/app/api/bookings/route.ts` - GET/POST bookings
- `apps/web/src/app/api/bookings/stripe-checkout/route.ts` - Payment
- `apps/web/src/app/api/bookings/wisespace-complete/route.ts` - Completion
- `apps/web/src/app/api/bookings/assign/route.ts` - Agent assignment

**Database**:
- Table: `bookings`
- Migrations: 049, 050-054, 090, 095, 100, 104, 108

---

## Common Modification Prompts

### 1. "Add a new booking status"

**Steps**:
1. Update database enum (migration)
2. Update TypeScript types
3. Add to status badge rendering
4. Update status filter

```typescript
// Migration: Add new status
ALTER TYPE booking_status ADD VALUE 'InProgress';

// Type: packages/shared-types/src/booking.ts
export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'InProgress'  // NEW
  | 'Completed'
  | 'Cancelled';

// Component: BookingCard.tsx
const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'Pending': return 'yellow';
    case 'Confirmed': return 'blue';
    case 'InProgress': return 'purple';  // NEW
    case 'Completed': return 'green';
    case 'Cancelled': return 'red';
  }
};
```

### 2. "Add email notifications when booking is confirmed"

**File**: `apps/web/src/app/api/webhooks/stripe/route.ts`

```typescript
// After successful payment
if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.booking_id;

  // Update booking
  await updateBooking(bookingId, {
    payment_status: 'Paid',
    status: 'Confirmed',
  });

  // NEW: Send email notifications
  const booking = await getBooking(bookingId);

  await sendEmail({
    to: booking.client.email,
    subject: 'Booking Confirmed',
    template: 'booking-confirmed',
    data: { booking },
  });

  await sendEmail({
    to: booking.tutor.email,
    subject: 'New Booking Received',
    template: 'tutor-booking-notification',
    data: { booking },
  });
}
```

### 3. "Allow clients to reschedule bookings"

**Create API endpoint**:
```typescript
// apps/web/src/app/api/bookings/reschedule/route.ts

export async function POST(request: Request) {
  const { bookingId, newSessionDate } = await request.json();

  // Validate: Only Pending or Confirmed can be rescheduled
  const booking = await getBooking(bookingId);
  if (!['Pending', 'Confirmed'].includes(booking.status)) {
    return Response.json(
      { error: 'Cannot reschedule completed/cancelled booking' },
      { status: 400 }
    );
  }

  // Update session date
  const { error } = await supabase
    .from('bookings')
    .update({ session_date: newSessionDate })
    .eq('id', bookingId);

  if (error) throw error;

  // Notify tutor of reschedule
  await notifyTutor(booking.tutor_id, bookingId, 'rescheduled');

  return Response.json({ success: true });
}
```

**Add to BookingDetailModal**:
```typescript
// BookingDetailModal.tsx
const [showReschedule, setShowReschedule] = useState(false);

const handleReschedule = async (newDate: string) => {
  await fetch('/api/bookings/reschedule', {
    method: 'POST',
    body: JSON.stringify({
      bookingId: booking.id,
      newSessionDate: newDate,
    }),
  });

  queryClient.invalidateQueries({ queryKey: ['bookings'] });
  setShowReschedule(false);
};

// In modal
{['Pending', 'Confirmed'].includes(booking.status) && (
  <button onClick={() => setShowReschedule(true)}>
    Reschedule
  </button>
)}
```

### 4. "Add recurring booking support"

**Migration**: Add recurring fields
```sql
-- Migration: 109_add_recurring_bookings.sql

ALTER TABLE bookings ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN recurrence_pattern TEXT; -- 'weekly', 'biweekly', 'monthly'
ALTER TABLE bookings ADD COLUMN recurrence_end_date TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN parent_booking_id UUID REFERENCES bookings(id);
```

**Update booking creation**:
```typescript
// apps/web/src/app/api/bookings/route.ts

export async function POST(request: Request) {
  const { isRecurring, recurrencePattern, recurrenceEndDate, ...bookingData } =
    await request.json();

  if (isRecurring) {
    // Create parent booking
    const parentBooking = await createBooking({
      ...bookingData,
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      recurrence_end_date: recurrenceEndDate,
    });

    // Generate child bookings
    const childBookings = generateRecurringBookings(
      parentBooking,
      recurrencePattern,
      recurrenceEndDate
    );

    // Insert child bookings
    for (const child of childBookings) {
      await createBooking({
        ...child,
        parent_booking_id: parentBooking.id,
      });
    }

    return Response.json({ booking: parentBooking, childBookings });
  }

  // Regular booking flow
  const booking = await createBooking(bookingData);
  return Response.json({ booking });
}
```

### 5. "Add booking cancellation with refund logic"

**File**: `apps/web/src/app/api/bookings/cancel/route.ts`

```typescript
export async function POST(request: Request) {
  const { bookingId, reason } = await request.json();

  const booking = await getBooking(bookingId);

  // Cancellation policy: 24 hours before session
  const sessionDate = new Date(booking.session_date);
  const now = new Date();
  const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundAmount = 0;
  if (hoursUntilSession > 24) {
    refundAmount = booking.total_cost; // Full refund
  } else if (hoursUntilSession > 12) {
    refundAmount = booking.total_cost * 0.5; // 50% refund
  }
  // else: No refund

  // Process refund via Stripe
  if (refundAmount > 0 && booking.stripe_payment_intent_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
    });
  }

  // Update booking
  await supabase
    .from('bookings')
    .update({
      status: 'Cancelled',
      cancellation_reason: reason,
      refund_amount: refundAmount,
      payment_status: refundAmount > 0 ? 'Refunded' : booking.payment_status,
    })
    .eq('id', bookingId);

  return Response.json({ refundAmount });
}
```

### 6. "Show tutor availability when creating booking"

**Create availability check API**:
```typescript
// apps/web/src/app/api/bookings/check-availability/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tutorId = searchParams.get('tutorId');
  const date = searchParams.get('date');

  // Get tutor's existing bookings for that day
  const { data: bookings } = await supabase
    .from('bookings')
    .select('session_date, hours_requested')
    .eq('tutor_id', tutorId)
    .gte('session_date', `${date}T00:00:00Z`)
    .lt('session_date', `${date}T23:59:59Z`)
    .in('status', ['Pending', 'Confirmed']);

  // Get tutor's availability settings
  const { data: availability } = await supabase
    .from('tutor_availability')
    .select('*')
    .eq('profile_id', tutorId);

  // Calculate available time slots
  const availableSlots = calculateAvailableSlots(
    availability,
    bookings,
    date
  );

  return Response.json({ availableSlots });
}
```

### 7. "Add booking analytics dashboard"

**Create stats aggregation**:
```typescript
// apps/web/src/lib/api/bookings.ts

export async function getBookingStats(userId: string, role: string) {
  const query = supabase
    .from('bookings')
    .select('*');

  if (role === 'client') {
    query.eq('client_id', userId);
  } else if (role === 'tutor') {
    query.eq('tutor_id', userId);
  }

  const { data: bookings } = await query;

  return {
    total: bookings.length,
    byStatus: {
      pending: bookings.filter(b => b.status === 'Pending').length,
      confirmed: bookings.filter(b => b.status === 'Confirmed').length,
      completed: bookings.filter(b => b.status === 'Completed').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length,
    },
    revenue: {
      total: bookings.reduce((sum, b) => sum + (b.total_cost || 0), 0),
      paid: bookings
        .filter(b => b.payment_status === 'Paid')
        .reduce((sum, b) => sum + (b.total_cost || 0), 0),
    },
    upcomingSessions: bookings.filter(b =>
      b.status === 'Confirmed' &&
      new Date(b.session_date) > new Date()
    ).length,
  };
}
```

**Use in StatsWidget**:
```typescript
// BookingStatsWidget.tsx

const { data: stats } = useQuery({
  queryKey: ['bookings', 'stats'],
  queryFn: () => getBookingStats(user.id, user.role),
});

return (
  <div className={styles.statsGrid}>
    <StatCard label="Total Bookings" value={stats.total} />
    <StatCard label="Upcoming" value={stats.upcomingSessions} />
    <StatCard label="Revenue" value={`$${stats.revenue.total}`} />
  </div>
);
```

### 8. "Snapshot listing data when creating booking (v5.8)"

**Already implemented in Migration 104, but here's the pattern**:

```typescript
// When creating booking
const listing = await getListing(listing_id);

const bookingData = {
  ...baseBookingData,
  // Snapshot listing fields (v5.8)
  subjects: listing.subjects,
  levels: listing.levels,
  location_type: listing.location_type,
  hourly_rate: listing.hourly_rate,
  listing_slug: listing.slug,
  available_free_help: listing.available_free_help,
};

// Even if listing is deleted/edited, booking preserves this data
```

---

## Important Constraints

### MUST DO:
1. **Always validate booking permissions** - Check user owns the booking
2. **Use optimistic updates** - React Query for instant UI feedback
3. **Snapshot listing data** - Preserve details at booking time (v5.8)
4. **Handle free bookings** - Skip payment for type='free_help' (v5.9)
5. **Verify WiseSpace completion** - Don't trust client, verify on server
6. **Use React Query** - For all data fetching and mutations
7. **Invalidate queries** - After mutations to refetch fresh data
8. **Handle Stripe webhooks** - Always verify webhook signature

### MUST NOT DO:
1. **Don't skip payment verification** - Always verify Stripe payment
2. **Don't trust session_date from client** - Validate against tutor availability
3. **Don't allow cancellation without policy** - Implement cancellation rules
4. **Don't hardcode booking types** - Use database enums
5. **Don't bypass RLS policies** - Respect database security

---

## Key Workflows

### Booking Creation Flow
```
1. User selects listing
2. Fills booking form (date, hours)
3. API validates:
   - Listing exists and active
   - Tutor available
   - User has permission
4. Create booking (status: Pending)
5. Snapshot listing data
6. If paid:
   a. Create Stripe checkout
   b. Redirect to Stripe
   c. User pays
   d. Webhook updates status to Confirmed
7. If free_help:
   a. Set status to Confirmed immediately
   b. Skip payment flow
```

### Completion Flow
```
1. Session occurs in WiseSpace
2. Either party marks complete
3. API verifies WiseSpace session
4. Update booking:
   - status: Completed
   - completed_at: now
5. Trigger review request
6. Calculate payout (if applicable)
7. Notify both parties
```

### Cancellation Flow
```
1. User requests cancel
2. Calculate refund based on policy
3. Process Stripe refund (if applicable)
4. Update booking:
   - status: Cancelled
   - refund_amount: calculated
   - payment_status: Refunded (if refund)
5. Notify other party
6. Optimistic UI update
```

---

## Database Schema Quick Reference

### bookings table
```sql
Key Fields:
- id, client_id, tutor_id, listing_id, agent_profile_id
- booking_type: 'direct' | 'referred' | 'agent_job'
- type: 'paid' | 'free_help' (v5.9)
- status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
- payment_status: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
- hourly_rate, hours_requested, total_cost
- session_date, completed_at
- Snapshot fields (v5.8): subjects, levels, location_type, etc.
- stripe_payment_intent_id
```

---

## React Query Patterns

### Fetch Bookings
```typescript
const { data: bookings } = useQuery({
  queryKey: ['bookings', { status }],
  queryFn: () => getBookings({ status }),
});
```

### Create Booking
```typescript
const { mutate: createBooking } = useMutation({
  mutationFn: (data) => fetch('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  },
});
```

### Cancel Booking (Optimistic)
```typescript
const { mutate: cancel } = useMutation({
  mutationFn: cancelBooking,
  onMutate: async (bookingId) => {
    await queryClient.cancelQueries({ queryKey: ['bookings'] });
    const prev = queryClient.getQueryData(['bookings']);
    queryClient.setQueryData(['bookings'], (old) =>
      old.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b)
    );
    return { prev };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['bookings'], context.prev);
  },
});
```

---

## Common Gotchas

1. **Booking created but payment never completes**
   - **Fix**: Stripe webhook not configured, check webhook endpoint

2. **Optimistic update shows wrong data**
   - **Fix**: Invalidate queries after mutation settles

3. **WiseSpace completion fails**
   - **Fix**: Verify WiseSpace session exists before marking complete

4. **Free booking charged client**
   - **Fix**: Check type='free_help' before creating Stripe checkout

5. **Listing deleted, booking shows no data**
   - **Fix**: Use snapshot fields (v5.8), not listing relationship

6. **Agent can't assign tutor**
   - **Fix**: Verify agent_profile_id matches booking

---

## Testing Checklist

When making changes, verify:
- [ ] Create booking (paid and free)
- [ ] Stripe payment flow works
- [ ] Webhook updates status
- [ ] Booking appears in hub
- [ ] Cancel booking works
- [ ] Refund processed (if applicable)
- [ ] Mark complete works
- [ ] WiseSpace verification passes
- [ ] Review request triggered
- [ ] Payout calculated
- [ ] Optimistic updates work
- [ ] Error states handled
- [ ] Loading states shown

---

## File Paths Quick Reference

```
apps/web/src/app/
├─ (authenticated)/bookings/
│   └─ page.tsx                         # Main hub
├─ components/feature/bookings/
│   ├─ BookingCard.tsx                  # Card component
│   ├─ BookingDetailModal.tsx           # Modal
│   ├─ BookingStatsWidget.tsx           # Stats
│   └─ [other widgets]
└─ api/bookings/
    ├─ route.ts                         # GET/POST
    ├─ stripe-checkout/route.ts         # Payment
    ├─ wisespace-complete/route.ts      # Complete
    └─ assign/route.ts                  # Agent assign
```

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Support)
**For Questions**: See [implementation.md](./implementation.md)
