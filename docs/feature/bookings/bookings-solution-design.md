# Bookings Feature - Solution Design

**Version**: v5.9 (Free Help Support)
**Last Updated**: 2025-12-12
**Status**: Active
**Architecture**: Gold Standard Hub + Stripe Connect + WiseSpace Integration
**Owner**: Backend Team

---

## Executive Summary

The Bookings feature manages the complete tutoring session lifecycle from creation through payment, completion, and review triggering. Built with React Query for state management, Stripe for payments, and WiseSpace for session delivery, the system supports direct bookings, agent-referred bookings, guardian-student links, and free help sessions with comprehensive integration across 11 major platform features.

**Key Capabilities**:
- **Multiple Booking Types**: Direct, referred, agent_job, free_help (v5.9)
- **Listing Snapshot Mechanism**: Preserves booking context even if listing deleted (v5.8)
- **3-Party Bookings**: Support for guardian/student/tutor relationships (v5.0)
- **Stripe Payment Integration**: Checkout sessions, webhook processing, commission splits
- **WiseSpace Integration**: Virtual classroom with session artifacts and completion tracking
- **Automatic Review Triggering**: Creates review sessions after booking completion
- **CaaS Integration**: Triggers credibility score recalculation on key events
- **Wiselist Attribution**: Tracks in-network referrals for commission tracking (v5.7)

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                   BOOKINGS SYSTEM ARCHITECTURE                      │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                      ┌──────────────┐
│   Client     │                                      │    Tutor     │
│  (Buyer)     │                                      │  (Seller)    │
└──────┬───────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Create Booking                                  │
       ↓                                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│              BOOKING CREATION API (/api/bookings)                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Fetch listing (validate status='published')                 │ │
│ │ 2. Snapshot listing fields (subjects, levels, hourly_rate)     │ │
│ │ 3. Copy agent_profile_id from client's referred_by_agent_id    │ │
│ │ 4. Create booking (status: Pending, payment_status: Pending)   │ │
│ │ 5. Increment listing.booking_count                             │ │
│ │ 6. Return booking_id                                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 2. Redirect to Payment (if paid booking)
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│         STRIPE CHECKOUT (/api/stripe/create-booking-checkout)       │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Create Stripe Checkout Session                              │ │
│ │ 2. Metadata: booking_id, client_id, tutor_id, agent_id         │ │
│ │ 3. Success URL: /bookings?payment=success                      │ │
│ │ 4. Cancel URL: /bookings?payment=cancel                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 3. Client Pays
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       STRIPE PLATFORM                               │
│   Processes payment → Sends webhook: checkout.session.completed     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 4. Webhook Event
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│             STRIPE WEBHOOK (/api/webhooks/stripe)                   │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Verify signature                                            │ │
│ │ 2. Extract booking_id from metadata                            │ │
│ │ 3. Call handle_successful_payment RPC (ATOMIC)                 │ │
│ │    → Create transactions (client, tutor, agent, platform)      │ │
│ │    → Update booking: payment_status='Paid', status='Confirmed' │ │
│ │    → Update referrals table (first conversion)                 │ │
│ │ 4. Save wiselist_referrer_id (if present)                      │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 5. Session Occurs
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              WISESPACE VIRTUAL CLASSROOM                            │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ 1. Tutor and client join session                               │ │
│ │ 2. Whiteboard collaboration, video call                        │ │
│ │ 3. Save snapshot: /api/wisespace/[bookingId]/snapshot          │ │
│ │    → Uploads whiteboard to Supabase Storage                    │ │
│ │    → Stores URL in session_artifacts JSONB                     │ │
│ │ 4. Mark complete: /api/wisespace/[bookingId]/complete          │ │
│ │    → Updates booking status to 'Completed'                     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 6. Booking Complete Trigger
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              AUTOMATIC REVIEW SESSION CREATION                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Trigger: on_booking_completed_create_review (Migration 045)    │ │
│ │                                                                 │ │
│ │ IF booking.status = 'Completed' AND                            │ │
│ │    booking.payment_status = 'Confirmed':                       │ │
│ │                                                                 │ │
│ │   1. Create booking_review_sessions record                     │ │
│ │   2. Participant IDs: [client, tutor, agent (if exists)]       │ │
│ │   3. Deadline: publish_at = NOW() + 7 days                     │ │
│ │   4. Status: 'pending'                                         │ │
│ │   5. Snapshot fields: subjects, service_name, session_date     │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 7. CaaS Trigger
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│              CAAS RECALCULATION QUEUE                               │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Trigger: trigger_queue_on_booking_completion (Migration 078)   │ │
│ │                                                                 │ │
│ │ Queue tutor for CaaS recalculation:                            │ │
│ │   - Bucket 1 (Performance): completed_sessions, retention_rate │ │
│ │   - Bucket 5 (Digital Professionalism): if recording_url set  │ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

### 1. AUTH INTEGRATION

**How It Works**:

**API Route Protection**:
```typescript
// apps/web/src/app/api/bookings/route.ts

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Role-based filtering
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_role')
    .eq('id', userId)
    .single();

  let query = supabase
    .from('bookings')
    .select('*, listing:listings(*), client:profiles!client_id(*), tutor:profiles!tutor_id(*)');

  if (profile.active_role === 'client') {
    query = query.eq('client_id', userId);
  } else if (profile.active_role === 'tutor') {
    query = query.eq('tutor_id', userId);
  } else if (profile.active_role === 'agent') {
    query = query.eq('agent_profile_id', userId);
  }

  const { data: bookings } = await query;
  return Response.json({ bookings });
}
```

**Integration Points**:
- **Files**: `/apps/web/src/app/api/bookings/route.ts` - All booking endpoints
- **Purpose**: Authentication and role-based filtering
- **Context**: `UserProfileContext` provides active_role for UI filtering

---

### 2. LISTINGS INTEGRATION - CRITICAL DEPENDENCY

**How It Works**:

**Listing Snapshot Mechanism** (Migration 104 - v5.8):
```typescript
// apps/web/src/app/api/bookings/route.ts

// 1. Fetch listing
const { data: listing } = await supabase
  .from('listings')
  .select('*')
  .eq('id', listing_id)
  .single();

// Validate listing is published
if (listing.status !== 'published') {
  return Response.json({ error: 'Listing not available' }, { status: 400 });
}

// 2. Snapshot listing fields (CRITICAL for data preservation)
const bookingData = {
  client_id: clientProfile.id,
  tutor_id: listing.profile_id,
  listing_id: listing.id,
  service_name: listing.title,
  session_start_time: sessionDate,
  amount: totalCost,

  // SNAPSHOT FIELDS (v5.8) - Preserve even if listing deleted
  subjects: listing.subjects,              // TEXT[]
  levels: listing.levels,                  // TEXT[]
  location_type: listing.location_type,    // online/in_person/hybrid
  location_city: listing.location_city,    // For in-person sessions
  hourly_rate: listing.hourly_rate,        // Rate at booking time
  listing_slug: listing.slug,              // Reference link
  free_trial: listing.free_trial,          // Trial session flag
  available_free_help: listing.available_free_help, // Free help (v5.9)
};

// 3. Create booking
const { data: booking } = await supabase
  .from('bookings')
  .insert(bookingData)
  .select()
  .single();

// 4. Increment listing booking count (Migration 103)
await supabase.rpc('increment_listing_booking_count', {
  p_listing_id: listing.id,
});
```

**Why Snapshot?**
1. **Data Preservation**: Listing might be deleted/modified after booking
2. **Subject-Based Avatar Colors**: UI can display subject colors without joins
3. **Historical Pricing**: Preserves hourly_rate at booking time
4. **Analytics**: Query bookings by subject/level without listing join
5. **Complete Records**: Full booking context for audit trails

**Database Schema**:
```sql
-- Migration 104: Add listing snapshot fields
ALTER TABLE bookings ADD COLUMN subjects TEXT[];
ALTER TABLE bookings ADD COLUMN levels TEXT[];
ALTER TABLE bookings ADD COLUMN location_type TEXT;
ALTER TABLE bookings ADD COLUMN location_city TEXT;
ALTER TABLE bookings ADD COLUMN free_trial BOOLEAN;
ALTER TABLE bookings ADD COLUMN hourly_rate NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN listing_slug TEXT;

-- Migration 108: Add free help flag (v5.9)
ALTER TABLE bookings ADD COLUMN available_free_help BOOLEAN;
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/bookings/route.ts` - Snapshot on creation
- **Migration**: `104_add_listing_snapshot_to_bookings.sql` (v5.8)
- **Migration**: `108_add_free_help_to_bookings.sql` (v5.9)
- **RPC**: `increment_listing_booking_count()` (Migration 103)

---

### 3. PAYMENTS INTEGRATION (STRIPE) - CRITICAL DEPENDENCY

**How It Works**:

**Checkout Flow**:
```typescript
// apps/web/src/app/api/stripe/create-booking-checkout/route.ts

export async function POST(request: Request) {
  const { bookingId } = await request.json();

  // Fetch booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: booking.service_name,
          description: `${booking.hours_requested} hours @ £${booking.hourly_rate}/hr`,
        },
        unit_amount: Math.round(booking.total_cost * 100), // Convert to pence
      },
      quantity: 1,
    }],
    metadata: {
      booking_id: booking.id,
      client_id: booking.client_id,
      tutor_id: booking.tutor_id,
      agent_id: booking.agent_profile_id,
      wiselist_referrer_id: cookies.get('wiselist_referrer_id')?.value,
    },
    success_url: `${origin}/bookings?payment=success`,
    cancel_url: `${origin}/bookings?payment=cancel`,
  });

  return Response.json({ url: session.url });
}
```

**Webhook Processing**:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts

case 'checkout.session.completed':
  const session = event.data.object;
  const bookingId = session.metadata.booking_id;

  // Call atomic RPC to process payment
  const { data, error } = await supabase.rpc('handle_successful_payment', {
    p_booking_id: bookingId,
    p_stripe_checkout_id: session.id,
  });

  if (error) {
    // Log to Dead-Letter Queue
    await supabase.from('failed_webhooks').insert({
      event_id: event.id,
      event_type: event.type,
      status: 'failed',
      error_message: error.message,
      payload: event,
      booking_id: bookingId,
    });
  }

  // Save wiselist referrer attribution (v5.7)
  const wiselistReferrerId = session.metadata.wiselist_referrer_id;
  if (wiselistReferrerId) {
    await supabase
      .from('bookings')
      .update({ booking_referrer_id: wiselistReferrerId })
      .eq('id', bookingId);
  }

  break;
```

**RPC: handle_successful_payment** (Migration 030, 048, 060, 109):
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
  -- IDEMPOTENCY CHECK
  IF EXISTS (SELECT 1 FROM bookings WHERE stripe_checkout_id = p_stripe_checkout_id) THEN
    RETURN; -- Already processed
  END IF;

  -- FETCH BOOKING WITH CONTEXT
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;

  -- CALCULATE CLEARING PERIOD
  v_available_timestamp := v_booking.session_start_time + INTERVAL '7 days';

  -- CREATE TRANSACTIONS (Atomic)
  -- 1. Client Payment
  INSERT INTO transactions (profile_id, booking_id, type, amount, status, available_at)
  VALUES (v_booking.client_id, p_booking_id, 'Booking Payment', -v_booking.amount, 'paid_out', NOW());

  -- 2. Platform Fee (10%)
  v_platform_fee := v_booking.amount * 0.10;
  INSERT INTO transactions (profile_id, booking_id, type, amount, status, available_at)
  VALUES (NULL, p_booking_id, 'Platform Fee', v_platform_fee, 'paid_out', NOW());

  -- 3. Agent Commission (10% if referred)
  IF v_booking.agent_profile_id IS NOT NULL THEN
    v_agent_commission := v_booking.amount * 0.10;
    INSERT INTO transactions (profile_id, booking_id, type, amount, status, available_at)
    VALUES (v_booking.agent_profile_id, p_booking_id, 'Referral Commission', v_agent_commission, 'clearing', v_available_timestamp);
    v_tutor_payout := v_booking.amount * 0.80;
  ELSE
    v_tutor_payout := v_booking.amount * 0.90;
  END IF;

  -- 4. Tutor Payout
  INSERT INTO transactions (profile_id, booking_id, type, amount, status, available_at)
  VALUES (v_booking.tutor_id, p_booking_id, 'Tutoring Payout', v_tutor_payout, 'clearing', v_available_timestamp);

  -- UPDATE BOOKING
  UPDATE bookings
  SET payment_status = 'Paid',
      status = 'Confirmed',
      stripe_checkout_id = p_stripe_checkout_id
  WHERE id = p_booking_id;

  -- UPDATE REFERRALS (First conversion)
  UPDATE referrals
  SET status = 'Converted',
      booking_id = p_booking_id,
      converted_at = NOW()
  WHERE referred_profile_id = v_booking.client_id
    AND status = 'Signed Up';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/stripe/create-booking-checkout/route.ts`
- **File**: `/apps/web/src/app/api/webhooks/stripe/route.ts`
- **Migration**: `030_create_payment_webhook_rpc.sql` - RPC creation
- **Migration**: `056_add_stripe_checkout_id_to_bookings.sql` - Idempotency
- **Migration**: `060_update_payment_webhook_rpc_v4_9.sql` - 3-way/4-way splits

---

### 4. REVIEWS INTEGRATION

**How It Works**:

**Automatic Review Session Creation** (Migration 045):
```sql
-- Trigger: on_booking_completed_create_review
CREATE TRIGGER on_booking_completed_create_review
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'Completed' AND NEW.payment_status = 'Confirmed')
  EXECUTE FUNCTION create_review_session_for_booking();

-- Function: create_review_session_for_booking()
CREATE OR REPLACE FUNCTION create_review_session_for_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_participants UUID[];
BEGIN
  -- Build participants array: [client, tutor, agent (if exists)]
  v_participants := ARRAY[NEW.client_id, NEW.tutor_id];
  IF NEW.agent_profile_id IS NOT NULL THEN
    v_participants := array_append(v_participants, NEW.agent_profile_id);
  END IF;

  -- Create review session
  INSERT INTO booking_review_sessions (
    booking_id,
    participant_ids,
    deadline,
    publish_at,
    status
  ) VALUES (
    NEW.id,
    v_participants,
    NOW() + INTERVAL '7 days',  -- 7-day review deadline
    NOW() + INTERVAL '7 days',  -- Auto-publish after 7 days
    'pending'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Review Submission Flow**:
```typescript
// apps/web/src/app/api/reviews/submit/route.ts

export async function POST(request: Request) {
  const { sessionId, reviews } = await request.json();

  // Fetch booking to get snapshot fields (Migration 105)
  const { data: booking } = await supabase
    .from('bookings')
    .select('service_name, subjects, levels, session_start_time, location_type')
    .eq('id', session.booking_id)
    .single();

  // Create reviews with booking context
  for (const review of reviews) {
    await supabase
      .from('profile_reviews')
      .insert({
        ...review,
        // Snapshot from booking (Migration 105)
        service_name: booking.service_name,
        subjects: booking.subjects,
        levels: booking.levels,
        session_date: booking.session_start_time,
        location_type: booking.location_type,
      });
  }

  // Auto-publish if all participants submitted
  const allSubmitted = checkAllParticipantsSubmitted(sessionId);
  if (allSubmitted) {
    await publishReviews(sessionId);
    await sendAblyNotification('reviews:published', { sessionId });
  }
}
```

**Rating Aggregation** (Migration 047):
```sql
-- Trigger: update_profile_rating_on_review
CREATE TRIGGER update_profile_rating_on_review
  AFTER INSERT OR UPDATE ON profile_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();

CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL;
  v_total_reviews INT;
BEGIN
  -- Calculate average rating for reviewee
  SELECT AVG(rating), COUNT(*) INTO v_avg_rating, v_total_reviews
  FROM profile_reviews
  WHERE reviewee_id = NEW.reviewee_id
    AND status = 'published';

  -- Update profile
  UPDATE profiles
  SET average_rating = v_avg_rating,
      total_reviews = v_total_reviews
  WHERE id = NEW.reviewee_id;

  -- Queue CaaS recalculation
  INSERT INTO caas_queue (profile_id, priority)
  VALUES (NEW.reviewee_id, 'normal')
  ON CONFLICT (profile_id) DO UPDATE SET priority = 'normal';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Integration Points**:
- **Trigger**: `on_booking_completed_create_review` (Migration 045)
- **Trigger**: `update_profile_rating_on_review` (Migration 047)
- **Migration**: `105_add_booking_context_to_reviews.sql` - Snapshot fields
- **File**: `/apps/web/src/app/api/reviews/submit/route.ts`

---

### 5. WISESPACE INTEGRATION (VIRTUAL CLASSROOM)

**How It Works**:

**Session Artifacts Storage** (Migration 079):
```sql
-- Add session_artifacts JSONB column
ALTER TABLE bookings ADD COLUMN session_artifacts JSONB DEFAULT '{}'::JSONB;

-- Example structure:
{
  "whiteboard_snapshot_url": "https://...",
  "recording_url": "https://...",
  "session_notes": "Student struggled with algebra...",
  "materials_shared": ["worksheet.pdf", "practice_problems.pdf"]
}
```

**Save Whiteboard Snapshot**:
```typescript
// apps/web/src/app/api/wisespace/[bookingId]/snapshot/route.ts

export async function POST(request: Request, { params }) {
  const { bookingId } = params;
  const { whiteboardData } = await request.json();

  // Upload to Supabase Storage
  const fileName = `whiteboards/${bookingId}/${Date.now()}.png`;
  const { data: uploadData } = await supabase.storage
    .from('booking-artifacts')
    .upload(fileName, whiteboardData);

  const { data: { publicUrl } } = supabase.storage
    .from('booking-artifacts')
    .getPublicUrl(fileName);

  // Update booking session_artifacts
  const { data: booking } = await supabase
    .from('bookings')
    .select('session_artifacts')
    .eq('id', bookingId)
    .single();

  const updatedArtifacts = {
    ...booking.session_artifacts,
    whiteboard_snapshot_url: publicUrl,
  };

  await supabase
    .from('bookings')
    .update({ session_artifacts: updatedArtifacts })
    .eq('id', bookingId);

  // Queue CaaS recalculation (digital professionalism)
  await supabase.rpc('queue_caas_recalculation', {
    p_profile_id: booking.tutor_id,
    p_priority: 'normal',
  });

  return Response.json({ success: true, url: publicUrl });
}
```

**Mark Session Complete**:
```typescript
// apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts

export async function POST(request: Request, { params }) {
  const { bookingId } = params;

  // Update booking status
  const { data: booking } = await supabase
    .from('bookings')
    .update({ status: 'Completed' })
    .eq('id', bookingId)
    .select()
    .single();

  // Queue CaaS recalculation (completed sessions)
  await supabase.rpc('queue_caas_recalculation', {
    p_profile_id: booking.tutor_id,
    p_priority: 'normal',
  });

  // Trigger will create review session automatically

  return Response.json({ success: true });
}
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/wisespace/[bookingId]/snapshot/route.ts`
- **File**: `/apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts`
- **Migration**: `079_add_session_artifacts_to_bookings.sql`
- **Storage**: Supabase Storage bucket `booking-artifacts`

---

### 6. CAAS INTEGRATION (CREDIBILITY SCORE)

**How It Works**:

**Booking Completion Trigger** (Migration 078):
```sql
-- Queue tutor for CaaS recalculation when booking completes
CREATE TRIGGER trigger_queue_on_booking_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status != 'Completed' AND NEW.status = 'Completed')
  EXECUTE FUNCTION queue_caas_on_booking_complete();

CREATE OR REPLACE FUNCTION queue_caas_on_booking_complete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO caas_queue (profile_id, priority, triggered_by)
  VALUES (NEW.tutor_id, 'normal', 'booking_completion')
  ON CONFLICT (profile_id) DO UPDATE SET priority = 'normal';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Recording URL Trigger** (Migration 078):
```sql
-- Queue tutor when recording_url is added
CREATE TRIGGER trigger_queue_on_recording_url_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.recording_url IS NULL AND NEW.recording_url IS NOT NULL)
  EXECUTE FUNCTION queue_caas_on_recording_added();
```

**Free Help Session Trigger** (Migration 088 - v5.9):
```sql
-- High-priority CaaS boost for free help sessions
CREATE TRIGGER trigger_queue_caas_for_free_help
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.type = 'free_help' AND NEW.status = 'Completed')
  EXECUTE FUNCTION queue_caas_for_free_help();

CREATE OR REPLACE FUNCTION queue_caas_for_free_help()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO caas_queue (profile_id, priority, triggered_by)
  VALUES (NEW.tutor_id, 'high', 'free_help_completion')  -- HIGH priority
  ON CONFLICT (profile_id) DO UPDATE SET priority = 'high';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**CaaS Buckets Affected**:
- **Bucket 1 (Performance)**: `completed_sessions`, `retention_rate`
- **Bucket 5 (Digital Professionalism)**: `lessonspace_usage_rate`, `recording_url`
- **Bucket 7 (Community)**: Free help sessions boost community score

**Integration Points**:
- **Migration**: `078_create_caas_auto_queue_triggers.sql`
- **Migration**: `088_update_booking_triggers_for_caas_v5_9.sql`
- **Triggers**: Automatic CaaS queueing on completion, recording, free help

---

### 7. FREE HELP NOW INTEGRATION (v5.9)

**How It Works**:

**Create Instant Free Session**:
```typescript
// apps/web/src/app/api/sessions/create-free-help-session/route.ts

export async function POST(request: Request) {
  const { tutorId, studentId, subject } = await request.json();

  // 1. Validate tutor is online (Redis check)
  const isOnline = await isTutorOnline(tutorId);
  if (!isOnline) {
    return Response.json({ error: 'Tutor not online' }, { status: 400 });
  }

  // 2. Rate limit: 5 sessions per 7 days per student
  const { data: recentSessions } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', studentId)
    .eq('type', 'free_help')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (recentSessions.length >= 5) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 3. Create booking
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      client_id: studentId,
      tutor_id: tutorId,
      type: 'free_help',
      amount: 0,
      duration_minutes: 30,
      status: 'Confirmed', // No payment needed
      payment_status: 'Paid', // Mark as paid (£0)
      service_name: `Free Help: ${subject}`,
      session_start_time: new Date().toISOString(),
    })
    .select()
    .single();

  // 4. Generate Google Meet link
  const meetLink = await generateMeetLink(); // Via meet.new API

  return Response.json({ booking, meetLink });
}
```

**Database Schema** (Migration 087):
```sql
-- Add type column for free help support
ALTER TABLE bookings ADD COLUMN type TEXT DEFAULT 'paid';
ALTER TABLE bookings ADD COLUMN duration_minutes INT;

-- Add check constraint
ALTER TABLE bookings ADD CONSTRAINT booking_type_check
  CHECK (type IN ('paid', 'free_help'));
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/sessions/create-free-help-session/route.ts`
- **Migration**: `087_add_free_help_support_to_bookings.sql` (v5.9)
- **Migration**: `088_update_booking_triggers_for_caas_v5_9.sql` - CaaS boost
- **Feature**: Free Help Now marketplace with real-time tutor availability

---

### 8. GUARDIAN/STUDENT LINK INTEGRATION (v5.0)

**How It Works**:

**3-Party Booking Structure**:
```typescript
// Booking involves 3 parties:
// - client_id: Person who pays (parent/guardian)
// - tutor_id: Person who teaches
// - student_id: Person who attends (child/student)

// Assign Student to Booking
// apps/web/src/app/api/bookings/assign/route.ts

export async function POST(request: Request) {
  const { bookingId, studentId } = await request.json();

  // Validate guardian-student relationship exists
  const { data: link } = await supabase
    .from('profile_graph')
    .select('*')
    .eq('relationship_type', 'GUARDIAN')
    .eq('status', 'ACTIVE')
    .or(`source_profile_id.eq.${clientId},target_profile_id.eq.${clientId}`)
    .or(`source_profile_id.eq.${studentId},target_profile_id.eq.${studentId}`)
    .maybeSingle();

  if (!link) {
    return Response.json({ error: 'No guardian-student link' }, { status: 403 });
  }

  // Update booking
  await supabase
    .from('bookings')
    .update({ student_id: studentId })
    .eq('id', bookingId);

  return Response.json({ success: true });
}
```

**Database Schema** (Migration 063):
```sql
-- Add student_id column for 3-party bookings
ALTER TABLE bookings ADD COLUMN student_id UUID REFERENCES profiles(id);

-- Support adult learners: student_id = client_id
-- Support guardian bookings: student_id = child's profile_id
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/bookings/assign/route.ts`
- **Migration**: `063_add_student_id_to_bookings.sql` (v5.0)
- **Feature**: Guardian/Student relationship tracking via `profile_graph`

---

### 9. WISELIST ATTRIBUTION INTEGRATION (v5.7)

**How It Works**:

**Cookie-Based Attribution**:
```typescript
// 1. User visits shared wiselist: /w/[slug]
// Middleware sets cookie: wiselist_referrer_id (30-day expiry)

// 2. Checkout session includes cookie in metadata
// apps/web/src/app/api/stripe/create-booking-checkout/route.ts
const wiselistReferrerId = cookies.get('wiselist_referrer_id')?.value;

const session = await stripe.checkout.sessions.create({
  metadata: {
    booking_id: booking.id,
    wiselist_referrer_id: wiselistReferrerId || null,
  },
});

// 3. Webhook saves attribution after payment
// apps/web/src/app/api/webhooks/stripe/route.ts
const wiselistReferrerId = session.metadata.wiselist_referrer_id;
if (wiselistReferrerId) {
  await supabase
    .from('bookings')
    .update({ booking_referrer_id: wiselistReferrerId })
    .eq('id', bookingId);
}
```

**Database Schema** (Migration 084):
```sql
-- Add booking_referrer_id for wiselist attribution
ALTER TABLE bookings ADD COLUMN booking_referrer_id UUID REFERENCES profiles(id);
```

**Integration Points**:
- **Migration**: `084_add_booking_referrer_id.sql` (v5.7)
- **File**: `/apps/web/src/app/api/stripe/create-booking-checkout/route.ts`
- **File**: `/apps/web/src/app/api/webhooks/stripe/route.ts`
- **Future**: Can calculate commission for wiselist owner

---

### 10. REFERRALS INTEGRATION

**How It Works**:

**Lifetime Attribution**:
```typescript
// At booking creation, copy agent_profile_id from client's profile
const { data: clientProfile } = await supabase
  .from('profiles')
  .select('referred_by_agent_id')
  .eq('id', userId)
  .single();

const bookingData = {
  // ... other fields
  agent_profile_id: clientProfile.referred_by_agent_id, // Lifetime attribution
};
```

**First Conversion Tracking**:
```sql
-- In handle_successful_payment RPC
-- Mark first booking as conversion
UPDATE referrals
SET status = 'Converted',
    booking_id = p_booking_id,
    transaction_id = (SELECT id FROM transactions WHERE type='Referral Commission' LIMIT 1),
    converted_at = NOW()
WHERE referred_profile_id = v_client_id
  AND status = 'Signed Up';
```

**Integration Points**:
- **File**: `/apps/web/src/app/api/bookings/route.ts` - Lifetime attribution copy
- **RPC**: `handle_successful_payment()` - First conversion tracking
- **Table**: `referrals` - Pipeline tracking (Referred → Signed Up → Converted)

---

### 11. FINANCIALS INTEGRATION

**How It Works**:

**Transaction Context Snapshotting** (Migration 109, 111):
```sql
-- Transactions include booking context
INSERT INTO transactions (
  profile_id, booking_id, type, amount, status, available_at,
  -- Context fields (prevent data loss if booking deleted)
  service_name, subjects, session_date, location_type,
  tutor_name, client_name, agent_name
) VALUES (
  v_tutor_id, p_booking_id, 'Tutoring Payout', v_tutor_payout, 'clearing', v_available_timestamp,
  v_booking.service_name, v_booking.subjects, v_booking.session_start_time, v_booking.location_type,
  v_tutor_name, v_client_name, v_agent_name
);
```

**Benefits**:
- Transactions self-contained (no joins needed)
- Better UX: "Payment for GCSE Maths Tutoring" vs "Payment"
- Revenue analytics by subject without joins
- Historical accuracy preserved

**Integration Points**:
- **RPC**: `handle_successful_payment()` - Transaction creation
- **Migration**: `109_update_payment_rpc_with_context.sql`
- **Migration**: `111_update_rpc_with_agent_name.sql`

---

## Database Schema

### bookings Table (Complete Schema)

```sql
CREATE TABLE bookings (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parties (3-party support)
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agent_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  booking_referrer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Listing reference
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Session details
  service_name TEXT NOT NULL,
  session_start_time TIMESTAMPTZ NOT NULL,
  session_duration INT, -- minutes
  duration_minutes INT, -- v5.9

  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  hourly_rate NUMERIC(10,2), -- Snapshot from listing (v5.8)

  -- Type & Status
  type TEXT DEFAULT 'paid', -- 'paid' | 'free_help' (v5.9)
  booking_type TEXT, -- 'direct' | 'referred' | 'agent_job'
  status booking_status_enum NOT NULL DEFAULT 'Pending',
  payment_status transaction_status_enum NOT NULL DEFAULT 'Pending',

  -- Listing Snapshot Fields (v5.8 - Migration 104)
  subjects TEXT[],
  levels TEXT[],
  location_type TEXT, -- online | in_person | hybrid
  location_city TEXT,
  free_trial BOOLEAN,
  listing_slug TEXT,
  available_free_help BOOLEAN, -- v5.9 (Migration 108)

  -- WiseSpace Integration
  session_artifacts JSONB DEFAULT '{}'::JSONB,
  recording_url TEXT,

  -- Payment Integration
  stripe_checkout_id TEXT UNIQUE, -- Idempotency (Migration 056)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enums
CREATE TYPE booking_status_enum AS ENUM (
  'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Declined'
);

-- Indexes
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_tutor_id ON bookings(tutor_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_session_start_time ON bookings(session_start_time);
CREATE INDEX idx_bookings_type ON bookings(type);
```

---

## Security Considerations

### Row Level Security (RLS)

```sql
-- Users can view bookings they're involved in
CREATE POLICY bookings_select_own ON bookings
  FOR SELECT USING (
    auth.uid() = client_id OR
    auth.uid() = tutor_id OR
    auth.uid() = agent_profile_id OR
    auth.uid() = student_id
  );

-- Users can create bookings as client
CREATE POLICY bookings_insert_as_client ON bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Users can update their own bookings
CREATE POLICY bookings_update_own ON bookings
  FOR UPDATE USING (
    auth.uid() = client_id OR
    auth.uid() = tutor_id
  );
```

---

## Performance Considerations

### Optimizations

1. **Snapshot Fields**: Eliminates joins with listings table
2. **Database Indexes**: Fast filtering by status, client_id, tutor_id, session dates
3. **React Query Caching**: Booking list cached with 5-minute stale time
4. **Atomic RPCs**: Payment processing in single transaction

### Performance Metrics

- **Booking Creation**: ~300-500ms (listing fetch + snapshot + insert)
- **Payment Webhook**: ~500-1000ms (RPC execution + trigger chains)
- **Booking List Query**: ~100-200ms (indexed, with snapshot fields)

---

## Summary of System Integrations

### ✅ Strong Integrations (11 Total)

1. **Auth** - Authentication and role-based filtering
2. **Listings** - CRITICAL snapshot mechanism (v5.8)
3. **Payments (Stripe)** - CRITICAL checkout, webhooks, commission splits
4. **Reviews** - Automatic review session creation on completion
5. **WiseSpace** - Virtual classroom with session artifacts
6. **CaaS** - Automatic credibility score triggers
7. **Free Help** - Instant free sessions with rate limiting (v5.9)
8. **Guardian Links** - 3-party booking support (v5.0)
9. **Wiselist** - In-network referral attribution (v5.7)
10. **Referrals** - Lifetime attribution and first conversion tracking
11. **Financials** - Transaction creation with context snapshotting

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Support)
**Architecture**: Gold Standard Hub + Stripe Connect + WiseSpace
**Owner**: Backend Team
**For Questions**: See bookings-prompt.md and bookings-implementation.md
