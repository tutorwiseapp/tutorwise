# reviews-solution-design-v4.5

**reviews-solution-design-v4.5**

**Prompt:**

**Analyse my proposed solution in \`review-solution-design-v4.5.md\`.**

- **Create an enhanced proposed solution that is functional, reliable, with great UI/UX.**
- **Implement an advanced review & rating system integrated with the overral application; profile, bookings, referral system, payements for viral growth.**
- **The next features after this are the Messages/Chat using Tawk and Analytics & Reporting.**
- **Ask me any questions.**

* * *

This design is a **major architectural pivot**. It deprecates the simple "listing-centric" review system from `migration 032_...` and replaces it with the "user-centric" 6-way mutual review system, including the "blind" 7-day escrow, as you requested.

This document is designed to be read and implemented by an AI, providing specific file paths, component references, and code logic.

### **Solution Design: Mutual Ratings & Reviews (v4.5)**

- **Version:** 4.5
- **Date:** 2025-11-07
- **Status:** For Implementation
- **Owner:** AI Analysis
- **Prerequisite:** v4.3 (Referrals) & v4.4 (Network)
- **Deprecates:** `reviews` table from `apps/api/migrations/032_add_listing_details_v4.1_fields.sql`

### 1.0 Executive Summary

This document details the architecture for the **Mutual 6-Way Ratings & Reviews (RR) system (v4.5)**. This implementation is a strategic pivot from the simple v4.1 "listing-centric" review model to the "user-centric" 360-degree review model specified in the "TO-3.6" requirements document.

This system introduces a **"blind" 7-day escrow** for reviews, ensuring that all participants in a booking (Client, Tutor, and Agent) can rate each other without fear of retaliation. Reviews are only published after the 7-day deadline or once all participants have submitted, whichever comes first.

Crucially, this design introduces a **"Junction" UI** at the end of the review submission. This "junction" leverages the user's high-engagement moment to close two key "Missing" gaps from the Booking Pipeline analysis:

1. **"Recurring Bookings":** A "Rebook" Call-to-Action (CTA) is presented.
2. **"Viral Loop":** A "Refer a Friend" CTA is presented, directly integrating with the v4.3 Referral System.

### 2.0 Architecture & The "Growth Loop" Junction

The core of this design is a new "escrow" table, `booking_review_sessions`, which manages the state of the review process. This table is created *after* a booking is paid and its status is set to `completed`. It holds all submitted reviews in a `pending` state until the 7-day deadline expires or all participants have submitted.

#### 2.1 Technology Stack

- **Frontend:** Next.js (App Router), React, CSS Modules (using `apps/web/src/app/components/ui/` components).
- **Backend:** Next.js API Routes (`apps/web/src/app/api/reviews/`).
- **Database:** Supabase Postgres. We will add **three** new tables, **one** new enum, **three** new triggers, and **one** new scheduled function.
- **Logging:** All actions will be logged to the generic `audit_log` table designed in v4.4 (`040_create_audit_log_table.sql`).

#### 2.2 The "Review → Rebook/Refer" Growth Loop (ASCII Diagram)

This diagram illustrates the automated lifecycle of a review session, including the new "Junction" growth loop.

```
(1. Payment RPC)
.-------------------------.
| Booking Status Update:  |
| `status` -> 'completed' |
'-------------------------'
           |
           v (Fires Trigger 1)
.---------------------------------.
| 1. `on_booking_completed`       |
|---------------------------------|
| - Creates `booking_review_session`
| - Status: 'pending'
| - publish_at: NOW() + 7 days
| - Finds participants [C, T, A]
'---------------------------------'
           |
           v (User Action)
.---------------------------------.
| 2. `POST /api/reviews/submit`   |
|---------------------------------|
| - User submits 6-way reviews
| - `INSERT` into `profile_reviews`
'---------------------------------'
           |
           v (Fires Trigger 2)
.---------------------------------.
| 3. `on_review_submitted`        |
|---------------------------------|
| - Adds user to `submitted_ids`
| - Checks: Are `submitted_ids` ==
|   `participant_ids`?
'---------------------------------'
      | (No)            | (Yes)
      v                 v
.--------------.  .----------------------------.
| Wait for...  |  | - Set session `status = 'published'`
'--------------'  | - (Fires Trigger 4)
      |           '----------------------------'
      v
.---------------------------------.
| 4. `publish_expired_reviews`    |
|    (Daily Cron Job)             |
|---------------------------------|
| - Finds sessions where
|   `status = 'pending'` AND
|   `publish_at <= NOW()`
| - Sets `status = 'published'`
| - (Fires Trigger 4)
'---------------------------------'
           |
           v (Fires Trigger 4)
.---------------------------------.
| 5. `update_profile_ratings`     |
|---------------------------------|
| - (Triggered by session publish)
| - Recalculates `profiles.avg_rating`
'---------------------------------'


          (--- User's Screen ---)
.---------------------------------.
| 2. `POST /api/reviews/submit`   |
|    (Modal Submission)           |
'---------------------------------'
           |
           v (On Success)
.------------------------------.
|  NEW: "Thank You" Junction   |
|------------------------------|
| "Your review is in escrow."  |
|                              |
|  CTA 1: [ Rebook this Lesson ]
|  CTA 2: [ Refer a Friend ]
'------------------------------'
     |                |
     |                v
     |  .-----------------------.
     |  | v4.3 Referral System  |
     |  | (Opens ReferralAsset-  |
     |  | Widget)               |
     |  '-----------------------'
     v
.-----------------------.
| v4.6 (Future)         |
| Recurring Booking     |
| (Creates new booking) |
'-----------------------'

```

* * *

### 3.0 Database Schema Design

The following SQL migration files shall be created in `apps/api/migrations/`.

#### 3.1 Migration 1: `042_deprecate_listing_reviews.sql`

This migration renames the old v4.1 `reviews` table and trigger to preserve its data, and prepares the `profiles` table for the new user-centric average rating.

```
SQL
```

```
-- 1. Rename the old table from migration 032
ALTER TABLE public.reviews RENAME TO listing_reviews;

COMMENT ON TABLE public.listing_reviews IS 
  'DEPRECATED (Nov 7 2025): This table was for listing-centric reviews (v4.1). 
  It is replaced by profile_reviews and booking_review_sessions 
  to support the mutual 6-way review system (v4.5).';

-- 2. Drop the old trigger that calculates listing.average_rating
DROP TRIGGER IF EXISTS trigger_update_listing_rating ON public.listing_reviews;

-- 3. Add the new average_rating column to the PROFILES table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON public.profiles(average_rating);

COMMENT ON COLUMN public.profiles.average_rating IS 
  'Cached average rating from the user-centric profile_reviews table (v4.5).';

```

#### 3.2 Migration 2: `043_create_mutual_review_schema.sql`

This creates the two new tables and enum that form the core of the v4.5 "blind escrow" system.

```
SQL
```

```
-- 1. Create an enum for the review session status
CREATE TYPE booking_review_status AS ENUM (
  'pending',  -- In 7-day 'blind' escrow
  'published' -- All reviews are live
);

-- 2. Create the "Escrow" table (R-REF-F-RR-4)
-- This manages the state of the 7-day review process for one booking.
CREATE TABLE IF NOT EXISTS public.booking_review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    status booking_review_status NOT NULL DEFAULT 'pending',
    
    -- The 7-day deadline (R-REF-F-RR-4)
    publish_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + '7 days'::interval),
    
    -- All profiles involved in this booking (R-REF-F-RR-1)
    participant_ids UUID[] NOT NULL,
    
    -- Profiles who have submitted their review
    submitted_ids UUID[] DEFAULT '{}',

    CONSTRAINT unique_review_session_booking UNIQUE (booking_id)
);
CREATE INDEX idx_booking_review_sessions_status ON public.booking_review_sessions (status);
CREATE INDEX idx_booking_review_sessions_publish_at ON public.booking_review_sessions (publish_at);

-- 3. Create the table to store the actual reviews
CREATE TABLE IF NOT EXISTS public.profile_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.booking_review_sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "reviewer_cannot_be_reviewee" CHECK (reviewer_id <> reviewee_id),
    -- A user can only review another user ONCE per session
    CONSTRAINT "unique_review_pair_per_session" UNIQUE (session_id, reviewer_id, reviewee_id)
);
CREATE INDEX idx_profile_reviews_session_id ON public.profile_reviews (session_id);
CREATE INDEX idx_profile_reviews_reviewee_id ON public.profile_reviews (reviewee_id);


-- 4. Add RLS policies
ALTER TABLE public.booking_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

-- Users can see/manage sessions they are a part of.
CREATE POLICY "Users can manage review sessions they are in"
    ON public.booking_review_sessions
    FOR ALL
    USING (auth.uid() = ANY (participant_ids));

-- Users can view published reviews (R-REF-F-RR-4 "blind")
CREATE POLICY "Users can view PUBLISHED reviews for sessions they are in"
    ON public.profile_reviews FOR SELECT
    USING (
        (SELECT status FROM public.booking_review_sessions WHERE id = session_id) = 'published'
        AND (SELECT auth.uid() = ANY (participant_ids) FROM public.booking_review_sessions WHERE id = session_id)
    );

-- Users can submit their own reviews while session is pending
CREATE POLICY "Users can submit their own reviews"
    ON public.profile_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND (SELECT status FROM public.booking_review_sessions WHERE id = session_id) = 'pending'
    );

```

#### 3.3 Migration 3: `044_create_review_session_trigger.sql`

This trigger (Flow Step 1) fires when a booking is paid and completed, automatically creating the review session.

```
SQL
```

```
CREATE OR REPLACE FUNCTION public.create_review_session_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_ids UUID[];
    v_booking_client_id UUID;
    v_booking_tutor_id UUID;
    v_booking_referrer_id UUID;
BEGIN
    -- 1. Get all participants from the booking
    SELECT 
        b.client_id, 
        l.profile_id, -- The tutor (listing owner)
        b.referrer_profile_id -- The agent (if v4.3 referral exists)
    INTO 
        v_booking_client_id, 
        v_booking_tutor_id, 
        v_booking_referrer_id
    FROM public.bookings b
    JOIN public.listings l ON b.listing_id = l.id
    WHERE b.id = NEW.id;

    -- 2. Build participant list based on JobType (R-REF-F-RR-1)
    IF v_booking_referrer_id IS NULL THEN
        -- "Direct-job": Client and Tutor
        v_participant_ids := ARRAY[v_booking_client_id, v_booking_tutor_id];
    ELSE
        -- "Referral-job": Client, Tutor, and Agent
        v_participant_ids := ARRAY[v_booking_client_id, v_booking_tutor_id, v_booking_referrer_id];
    END IF;

    -- 3. Create the review session in escrow
    INSERT INTO public.booking_review_sessions
        (booking_id, publish_at, participant_ids)
    VALUES
        (NEW.id, (NOW() + '7 days'::interval), v_participant_ids);

    -- 4. Log to audit trail (R-REF-F-RR-16, uses v4.4 table)
    INSERT INTO public.audit_log (profile_id, action_type, module, details)
    VALUES (
        NEW.client_id, 
        'review_session.created', 
        'Reviews', 
        jsonb_build_object('booking_id', NEW.id, 'participants', v_participant_ids)
    );

    RETURN NEW;
END;
$$;

-- Create the trigger on the bookings table
CREATE TRIGGER on_booking_completed_create_review
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION public.create_review_session_on_booking_complete();

```

#### 3.4 Migration 4: `045_create_review_submission_trigger.sql`

This trigger (Flow Step 2) checks if all participants have submitted their reviews. If so, it publishes the session early.

```
SQL
```

```
CREATE OR REPLACE FUNCTION public.handle_review_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID := NEW.session_id;
    v_reviewer_id UUID := NEW.reviewer_id;
    v_participant_ids UUID[];
    v_submitted_ids UUID[];
BEGIN
    -- 1. Add this reviewer to the list of submitted users
    UPDATE public.booking_review_sessions
    SET submitted_ids = array_append(submitted_ids, v_reviewer_id)
    WHERE id = v_session_id
    RETURNING participant_ids, submitted_ids INTO v_participant_ids, v_submitted_ids;

    -- 2. Check if all participants have now submitted (using array contains operators)
    IF v_submitted_ids @> v_participant_ids AND v_participant_ids @> v_submitted_ids THEN
        -- All participants have submitted! Publish immediately.
        UPDATE public.booking_review_sessions
        SET status = 'published', publish_at = NOW()
        WHERE id = v_session_id;
        
        -- Log to audit trail (uses v4.4 table)
        INSERT INTO public.audit_log (action_type, module, details)
        VALUES (
            'review_session.published_early', 
            'Reviews', 
            jsonb_build_object('session_id', v_session_id)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger on the profile_reviews table
CREATE TRIGGER on_review_submitted_check_publish
    AFTER INSERT ON public.profile_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_review_submission();

```

#### 3.5 Migration 5: `046_create_profile_rating_update_trigger.sql`

This trigger (Flow Step 4) recalculates a user's `profiles.average_rating` *only* when a session is officially published.

```
SQL
```

```
CREATE OR REPLACE FUNCTION public.update_profile_ratings_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reviewee_id_to_update UUID;
BEGIN
    -- 1. Find all users who were reviewed in this session
    FOR reviewee_id_to_update IN
        SELECT DISTINCT reviewee_id
        FROM public.profile_reviews
        WHERE session_id = NEW.id
    LOOP
        -- 2. Recalculate and update their average rating in the profiles table
        UPDATE public.profiles
        SET average_rating = (
            SELECT AVG(r.rating)
            FROM public.profile_reviews r
            JOIN public.booking_review_sessions s ON r.session_id = s.id
            WHERE r.reviewee_id = reviewee_id_to_update
            AND s.status = 'published'
        )
        WHERE id = reviewee_id_to_update;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger on the booking_review_sessions table
CREATE TRIGGER on_session_published_update_ratings
    AFTER UPDATE ON public.booking_review_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'published' AND OLD.status != 'published')
    EXECUTE FUNCTION public.update_profile_ratings_on_publish();

```

#### 3.6 Cron Job: `supabase/functions/publish-expired-reviews/index.ts`

This function (Flow Step 3) satisfies the 7-day deadline (R-REF-F-RR-24, 25).

```
TypeScript
```

```
// Deployed as a Supabase Edge Function, scheduled to run daily: 0 1 * * *
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // 1. Find all review sessions that are past their deadline
    const { data: sessions, error } = await supabase
      .from('booking_review_sessions')
      .select('id, booking_id')
      .eq('status', 'pending')
      .lte('publish_at', new Date().toISOString());

    if (error) throw new Error(`Error fetching expired sessions: ${error.message}`);
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: "No expired reviews to publish." }), {
        headers: { "Content-Type": "application/json" }, status: 200
      });
    }

    const sessionIds = sessions.map(s => s.id);

    // 2. Publish them all
    const { error: updateError } = await supabase
      .from('booking_review_sessions')
      .update({ status: 'published' })
      .in('id', sessionIds);

    if (updateError) throw new Error(`Error publishing sessions: ${updateError.message}`);
    
    // 3. Log this bulk action to the audit log (uses v4.4 table)
    const { error: logError } = await supabase
      .from('audit_log')
      .insert({
        action_type: 'review_session.published_expired',
        module: 'Reviews',
        details: { count: sessions.length, session_ids: sessionIds }
      });
    
    if (logError) console.error(`Failed to log audit: ${logError.message}`);

    return new Response(JSON.stringify({ message: `Successfully published ${sessions.length} review sessions.` }), {
      headers: { "Content-Type": "application/json" }, status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" }, status: 500
    });
  }
});

```

* * *

### 4.0 Backend & API Design

A new API route group will be created at `apps/web/src/app/api/reviews/`.

- `GET /api/reviews/pending-tasks`
  - **Purpose:** Powers the "Pending Tasks" tab. Shows the user what reviews they *need to write*.
  - **Returns:** A list of `booking_review_sessions` where `status = 'pending'`, the user is in `participant_ids`, AND the user is NOT in `submitted_ids`.
- `POST /api/reviews/submit`
  - **Purpose:** Submits one or more reviews for a single booking.
  - **Body:** `{ "session_id": UUID, "reviews": [ { "reviewee_id": UUID, "rating": 5, "comment": "..." }, ... ] }`
  - **Logic:** (Protected Route)
    1. Get `reviewer_id` from session.
    2. Verify user is a participant and has not submitted.
    3. Loop through the `reviews` array.
    4. `INSERT` each review into `profile_reviews`. The `on_review_submitted_check_publish` trigger will handle the rest.
    5. `INSERT` "review.submitted" action into `audit_log`.
- `GET /api/reviews/received`
  - **Purpose:** Powers the "My Received Reviews" tab.
  - **Logic:** `SELECT` all reviews from `profile_reviews` where `reviewee_id = auth.uid()` AND the session `status = 'published'`. Join `profiles` on `reviewer_id` to get reviewer details.
  - **Returns:** A list of reviews written *about* the current user.
- `GET /api/reviews/given`
  - **Purpose:** Powers the "My Given Reviews" tab.
  - **Logic:** `SELECT` all reviews from `profile_reviews` where `reviewer_id = auth.uid()` AND the session `status = 'published'`. Join `profiles` on `reviewee_id` to get reviewee details.
  - **Returns:** A list of reviews written *by* the current user.

* * *

### 5.0 Frontend & UI Design

We will create a new "Reviews" hub, which is more sophisticated than the simple UI in `apps/web/src/app/components/profile/ReviewsSection.tsx` (which is now deprecated).

#### 5.1 Sidebar Navigation Update

- **File:** `apps/web/src/app/components/layout/sidebars/AppSidebar.tsx`
- **Action:** Add a new `NavLink` component to the `mainNavLinks` array.
- **Details:**
  - `href: "/reviews"`
  - `icon: PencilIcon` (import from `lucide-react`)
  - `label: "Reviews"`
  - **Placement:** Should be placed directly below the "Network" hub link.

#### 5.2 New Hub Page: `apps/web/src/app/(authenticated)/reviews/page.tsx`

This page will be the central hub for all review management.

- **ASCII Layout (Desktop):**
```
                                 <-- apps/web/src/app/(authenticated)/reviews/page.tsx -->
+-------------------------------------------------------------------------------------------------+
| [My Reviews]                                                                      [Help?]     |  <-- PageHeader
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
| [Tabs: Pending Tasks (2) | My Received Reviews (14) | My Given Reviews (18) ]                    |  <-- Tabs.tsx
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|  +------------------------------------------------------------------------------------------+   |
|  | [PendingReviewCard]                                                                        |   |
|  | Review your session for "GCSE Maths" (booked 3 days ago)                                   |   |
|  | [Leave Review] <--- This opens the modal                                                   |   |
|  | 4 days remaining                                [Progress: 1 of 3 submitted]               |   |
|  +------------------------------------------------------------------------------------------+   |
|  | [PendingReviewCard]                                                                        |   |
|  | Review your session for "A-Level Physics" (booked 1 day ago)                               |   |
|  | [Leave Review]                                                                             |   |
|  | 6 days remaining                                [Progress: 0 of 2 submitted]               |   |
|  +------------------------------------------------------------------------------------------+   |
|                                                                                                 |
+-------------------------------------------------------------------------------------------------+
```
- **File:** `apps/web/src/app/(authenticated)/reviews/page.tsx`
```
TypeScript
```
```
// New page file
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Tabs, Tab } from '@/app/components/ui/Tabs';
import { PendingReviewsList } from '@/app/components/reviews/PendingReviewsList';
import { ReceivedReviewsList } from '@/app/components/reviews/ReceivedReviewsList';
import { GivenReviewsList } from '@/app/components/reviews/GivenReviewsList';
import styles from './page.module.css';
export default function ReviewsPage() {
  return (
    <div className={styles.pageWrapper}>
      <PageHeader title="My Reviews" />
      <Tabs>
        <Tab title="Pending Tasks">
          <PendingReviewsList />
        </Tab>
        <Tab title="My Received Reviews">
          <ReceivedReviewsList />
        </Tab>
        <Tab title="My Given Reviews">
          <GivenReviewsList />
        </Tab>
      </Tabs>
    </div>
  );
}
```
- **File:** `apps/web/src/app/(authenticated)/reviews/page.module.css`
```
CSS
```
```
/* New CSS module file */
.pageWrapper {
  padding: var(--space-3); /* 24px */
}
@media (min-width: 768px) {
  .pageWrapper {
    padding: var(--space-4); /* 32px */
  }
}
```

#### 5.3 New Component: `apps/web/src/app/components/reviews/ReviewSubmissionModal.tsx`

This is the most complex UI component. It will now manage two states: "form" and "junction".

- **Purpose:** The modal for submitting 6-way reviews and presenting the post-submission "junction" CTAs.
- **Trigger:** Opened when "Leave Review" is clicked on a `<PendingReviewCard />`.
- **State Management:**
```
TypeScript
```
```
'use client';
import { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { ReferralAssetWidget } from '@/app/components/referrals/ReferralAssetWidget';
// ... other imports for forms
type ModalView = 'form' | 'junction' | 'refer';
export function ReviewSubmissionModal({ session, participants, ... }) {
  const [view, setView] = useState<ModalView>('form');
  // ... state for reviews
  const handleSubmit = async () => {
    // ... POST to /api/reviews/submit
    if (response.ok) {
      setView('junction'); // Change view on success
    }
  };
  const handleRebook = () => {
    // ... router.push(`/create-booking?listing_id=${session.booking.listing_id}`)
  };
  const handleRefer = () => {
    setView('refer'); // Show the referral widget view
  };
  return (
    <Modal 
      title={view === 'form' ? 'Submit Your Reviews' : 'Thank You!'}
      ...
    >
      {view === 'form' && (
        <>
          <p>Your reviews are hidden until all participants submit or 7 days pass.</p>
          {/* ... .map() over participants to render rating forms ... */}
          <Button onClick={handleSubmit}>Submit All Reviews</Button>
        </>
      )}
      {view === 'junction' && (
        <div className={styles.junction}>
          <h4>Your review is in escrow and will be published soon.</h4>
          <p>What would you like to do next?</p>
          <div className={styles.junctionActions}>
            <Button variant="primary" onClick={handleRebook}>
              Rebook this Lesson
            </Button>
            <Button variant="secondary" onClick={handleRefer}>
              Refer a Friend
            </Button>
          </div>
        </div>
      )}
      {view === 'refer' && (
        <>
          {/* This reuses the v4.3 component */}
          <ReferralAssetWidget variant="dashboard" />
          <Button variant="tertiary" onClick={() => setView('junction')}>
            Back
          </Button>
        </>
      )}
    </Modal>
  );
}
```
- **File:** `apps/web/src/app/components/reviews/ReviewSubmissionModal.module.css`
```
CSS
```
```
/* New CSS module file */
.reviewFormSection {
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-md);
}
.junction {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
}
.junctionActions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}
@media (min-width: 640px) {
  .junctionActions {
    flex-direction: row;
    justify-content: center;
  }
}
```

#### 5.4 Other New/Updated Components

- `apps/web/src/app/components/reviews/PendingReviewsList.tsx`**:** Fetches from `GET /api/reviews/pending-tasks` and maps results to `<PendingReviewCard />`.
- `apps/web/src/app/components/reviews/ReceivedReviewsList.tsx`**:** Fetches from `GET /api/reviews/received` and maps results to `<ProfileReviewCard />`.
- `apps/web/src/app/components/reviews/GivenReviewsList.tsx`**:** Fetches from `GET /api/reviews/given` and maps results to `<ProfileReviewCard />`.
- `appsD/web/src/app/components/reviews/ProfileReviewCard.tsx`**:** This new component will replace the deprecated `apps/web/src/app/components/profile/ReviewCard.tsx`. It will be designed to show a review *from* a user, *to* another user.
- `apps/web/src/app/profile/[id]/page.tsx`**:** This public profile page will be updated to fetch from `GET /api/reviews/[profile_id]` and use the new `<ProfileReviewCard />` to display a user's *public, published* reviews.