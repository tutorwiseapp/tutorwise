# Bookings

**Status**: 🟢 Active
**Last Code Update**: 2025-12-12 (v5.9 - free help bookings)
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 1 - Critical)
**Architecture**: Gold Standard Hub (HubPageLayout)

## Quick Links
- [Implementation Guide](./bookings-implementation.md)
- [AI Prompt Context](./bookings-ai-prompt.md)
- [Solution Design](./solution-design.md)

## Overview

The bookings feature is the core booking management system for TutorWise. It handles the complete booking lifecycle from creation through payment, completion, and review triggering. Built using the Gold Standard Hub architecture with React Query for state management and Stripe for payments.

## Key Features

- **Booking Management**: View, create, and manage bookings with comprehensive status tracking
- **Payment Processing**: Integrated Stripe checkout with payment status tracking
- **Real-Time Updates**: Optimistic UI updates with React Query
- **WiseSpace Integration**: Complete bookings through WiseSpace platform
- **Free Help Support**: v5.9 feature allowing free tutoring sessions
- **Role-Based Views**: Different booking views for clients, tutors, and agents
- **Listing Snapshots**: Preserve booking details even if listing changes (v5.8)

## Component Architecture

### Main Hub Page
- [page.tsx](../../../apps/web/src/app/(authenticated)/bookings/page.tsx) - Gold Standard Hub with 3x3 widget grid

### Core Components (9 total)
- **BookingCard.tsx** - Individual booking display card
- **BookingDetailModal.tsx** - Comprehensive booking details modal (19 fields)
- **BookingStatsWidget.tsx** - Statistics overview
- **UpcomingSessionWidget.tsx** - Next session preview
- **BookingHelpWidget.tsx** - Help/support widget
- **BookingTipWidget.tsx** - Usage tips
- **BookingVideoWidget.tsx** - Video tutorials
- **BookingsSkeleton.tsx** - Loading state
- **BookingsError.tsx** - Error state

## Routes

### Main Route
- `/bookings` - Hub page (authenticated)

### API Endpoints (5 total)
1. `GET /api/bookings` - Fetch user bookings with filtering
2. `POST /api/bookings` - Create new booking with validation
3. `POST /api/bookings/assign` - Agent assigns tutor to job
4. `POST /api/bookings/stripe-checkout` - Create Stripe checkout session
5. `POST /api/bookings/wisespace-complete` - Mark booking complete via WiseSpace

## Database Tables

### Primary Table: `bookings`
**Key Fields**:
- IDs: `id`, `client_id`, `tutor_id`, `listing_id`, `agent_profile_id`
- Status: `status` (Pending/Confirmed/Completed/Cancelled)
- Payment: `payment_status` (Pending/Paid/Failed/Refunded), `stripe_payment_intent_id`
- Pricing: `hourly_rate`, `hours_requested`, `total_cost`
- Type: `booking_type` (direct/referred/agent_job), `type` (paid/free_help)
- Timestamps: `created_at`, `updated_at`, `session_date`, `completed_at`

**Snapshot Fields** (v5.8 - preserves listing data):
- `subjects`, `levels`, `location_type`, `listing_slug`, `available_free_help`

## Key Workflows

### 1. Create Booking Flow
```
User selects listing → Fills booking form → API validates →
Snapshots listing data → Inserts booking (Pending) →
Creates Stripe checkout → Redirects to Stripe →
Webhook updates payment_status → Status: Confirmed
```

### 2. Payment Flow
```
Stripe checkout → User pays → Webhook fires →
Update payment_status to 'Paid' → Update status to 'Confirmed' →
Notify tutor → Session scheduled
```

### 3. Completion Flow
```
Session occurs → Mark complete (WiseSpace) →
Update status to 'Completed' → Set completed_at →
Trigger review request → Trigger payout (if applicable)
```

### 4. Cancellation Flow
```
User cancels → Update status to 'Cancelled' →
Handle refund (if paid) → Notify other party →
Optimistic UI update
```

## Booking States

1. **Pending** - Awaiting payment
2. **Confirmed** - Paid and scheduled
3. **Completed** - Session finished
4. **Cancelled** - Booking cancelled

## Payment States

1. **Pending** - Awaiting payment
2. **Paid** - Payment successful
3. **Failed** - Payment failed
4. **Refunded** - Payment refunded

## Booking Types

1. **direct** - Client books tutor directly
2. **referred** - Agent referred client to tutor
3. **agent_job** - Agent job requiring tutor assignment

## Integration Points

- **Stripe**: Payment processing and checkout sessions
- **WiseSpace**: Session completion and verification
- **Listings**: Service offerings (with snapshot preservation)
- **Profiles**: Client, tutor, and agent information
- **Financials**: Transaction records and payout tracking
- **Reviews**: Triggered after booking completion

## Recent Changes (v5.9)

### Free Help Bookings
- Added `type` column: 'paid' | 'free_help'
- Allows tutors to offer free sessions
- Skips payment flow for free bookings
- Migration 108: Add type column with default 'paid'

### Listing Snapshots (v5.8)
- Migration 104: Added 5 snapshot columns
- Preserves listing details at booking time
- Prevents data loss if listing is edited/deleted

### Database Migrations (12 total)
- 049: Create bookings table
- 050-054: Add fields (agent_profile_id, status updates)
- 090, 095: Stripe integration
- 100: Add hours_requested column
- 104: Add snapshot columns
- 108: Add type column (free_help support)

## User Roles

### Client View
- View own bookings
- Create new bookings
- Cancel bookings
- Mark complete via WiseSpace
- Leave reviews

### Tutor View
- View assigned bookings
- Accept/decline bookings (if applicable)
- Mark complete
- Request reviews

### Agent View
- View referred bookings
- Assign tutors to agent jobs
- Track commission-eligible bookings

## Status

- [x] Solution design documented
- [x] Implementation guide complete
- [x] AI prompt context complete
- [x] Component reference documented
- [x] API endpoints documented
- [x] Database migrations tracked
- [x] Workflows documented

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Support)
**Architecture**: Gold Standard Hub
**For Questions**: See [implementation.md](./implementation.md)
