# lessonspace-solution-design-v5.2

Here is the updated `lessonspace-solution-design-v5.2`.

This document has been revised to be the definitive specification for our Lessonspace integration. It formally depends on the **v5.0 Student Onboarding** and **v4.6 Profile Graph** architectures being implemented first.

It is now correctly versioned as `v5.2` and serves as the next epic in our implementation plan, directly preceding the **v5.5 CaaS Engine** (which will consume the data this integration provides).

* * *

### **Solution Design: Lessonspace Virtual Classroom (v5.2)**

- **Version:** 5.2
- **Date:** 2025-11-14
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite:** `profile-graph-solution-design-v4.6`, `student-onboarding-solution-design-v5.0`, `api-solution-design-v5.1`

* * *

### 1.0 Executive Summary

This design implements the **Lessonspace** virtual classroom as the core delivery mechanism for Tutorwise lessons. This is a strategic pivot from generic tools like Zoom to a purpose-built, embedded learning environment.

This integration will be **"Stateless,"** as defined in the `lessonspace-solution-design-v5.2`. We will not mirror our User Database into Lessonspace. Instead, we will generate ephemeral, secure access links on-the-fly when a user attempts to join a valid booking.

**Key Features:**

1. **One-Click Join:** A "Join Lesson" button embedded directly in the Booking Card.
2. **Embedded Experience:** The classroom opens in a streamlined window/tab, keeping the user "inside" the Tutorwise brand.
3. **Proof of Value (Automated):** Automatic capture of session recordings and duration via webhooks to populate the "Cost of Performance" metrics.
4. **Proof of Value (Manual):** A workflow for Tutors to upload session whiteboard snapshots, closing the feedback loop for Parents.

* * *

### 2.0 Strategic Context & Dependencies

This feature is the "delivery vehicle" for our service. It directly supports the **"Engagement Loop"** defined in v5.0.

- **For the Client (Parent):** It provides the raw data (recordings) that prove the tutor's value. "I paid for an hour, and I can *see* the hour of work."
- **For the Tutor:** It simplifies their workflow. No more creating Zoom links, emailing invites, or managing waiting rooms. The "Space" is automatically created and linked to the specific Booking.
- **For the Platform:** It moves the core service transaction *on-platform*, allowing us to capture usage data that was previously lost to external tools.

**Critical Dependency on v5.0:** This integration is entirely dependent on the **"Assignment Feature"** from `student-onboarding-solution-design-v5.0`. The `POST /api/bookings/[id]/launch` endpoint **must** check the `bookings.student_id` column to determine *who* is attending:

1. If `student_id` is `NULL`, the session is for the **Client (Adult Learner)**.
2. If `student_id` is set, the session is for the **Student**.

The API will then pass the correct user's name and role to Lessonspace, ensuring the correct attendee is launched into the room.

* * *

### 3.0 Architecture & Data Model

We will utilize the Lessonspace API (`/v2/spaces/launch`) to generate rooms.

#### 3.1 The "Stateless" Launch Flow (Sequence Diagram)

This workflow is a **"Pattern 1: User-Facing API"** as defined in `api-solution-design-v5.1`.

```
[Client/Tutor/Student]  [Tutorwise API (v5.1)]        [Lessonspace API]       [Database (Supabase)]
         |                       |                          |                        |
         |--(1) Click "Join" --> | `POST /api/bookings/[id]/launch`
         |                       |                          |                        |
         |                       |--(2) Validate Auth (User is part of booking)
         |                       |                          |                        |
         |                       |--(3) Validate Booking (Time, Status)
         |                       |                          |                        |
         |                       |--(4) Get booking `student_id` (from v5.0)
         |                       |                          |                        |
         |                       |--(5) Check `meeting_provider_id`
         |                       |                          |                        |
         |                       |--(6) POST /launch (Create or Join)
         |                       |    (Payload includes Student/Client name)
         |                       |<-(7) Return URL
         |                       |                          |                        |
         |                       |--(8) Save `meeting_provider_id` ---------------------->| (bookings table)
         |                       |                          |                        |
         |<-(9) Redirect (New Tab)
         |                       |                          |                        |

```

#### 3.2 Database Schema Updates

We need to store the persistent "Room ID" (Space ID) to ensure that subsequent joins for the same booking return the *same* room (preserving the whiteboard state).

**File:** `apps/api/migrations/065_add_lessonspace_fields_to_bookings.sql` *(This migration number follows the v5.0 migrations (063, 064)).*

```
SQL
```

```
ALTER TABLE public.bookings
-- Stores the unique Lessonspace Room ID (e.g., 'space-xxxx-yyyy')
ADD COLUMN IF NOT EXISTS meeting_provider_id TEXT,

-- Stores the last generated launch URL (optional cache)
ADD COLUMN IF NOT EXISTS meeting_url TEXT,

-- Stores the URL to the session recording (populated via webhook)
ADD COLUMN IF NOT EXISTS recording_url TEXT,

-- Metadata for the specific session artifacts
ADD COLUMN IF NOT EXISTS session_artifacts JSONB DEFAULT '{}'::jsonb;
-- Example: { "whiteboard_snapshot_url": "..." }

COMMENT ON COLUMN public.bookings.meeting_provider_id IS 'v5.2: The persistent Lessonspace Space ID.';

```

* * *

### 4.0 Backend & API Design (per v5.1 Spec)

We will implement two of the three API patterns defined in `api-solution-design-v5.1`.

#### 4.1 Pattern 1: User-Facing API

- **Route:** `POST /api/bookings/[id]/launch`
- **Purpose:** Securely generates a single-use login link for the user.
- **Security:** Supabase Auth (User must be the `client_id`, `tutor_id`, or `student_id` on the booking).
- **Logic:**
  1. Validate user access and booking time (e.g., within 15 minutes of start).
  2. `SELECT student_id, meeting_provider_id FROM bookings WHERE id = [id]`.
  3. Fetch the name of the attendee:
    - If `student_id` is `NULL`, get Client's name.
    - If `student_id` is *not* `NULL`, get Student's name.
  4. Call `LessonspaceService.launchSpace()` with the attendee's name and the `meeting_provider_id` (if it exists).
  5. Save the new `meeting_provider_id` to the `bookings` table if it was just created.
  6. Return the secure URL to the frontend.

#### 4.2 Pattern 3: Webhook API (Ingestion)

- **Route:** `POST /api/webhooks/lessonspace`
- **Purpose:** Receives `session.end` events to capture "Proof of Value."
- **Security:** **Webhook Signature Verification** (using `LESSONSPACE_SECRET`).
- **Logic:**
  1. Verify the webhook signature.
  2. On a `session.end` event:
    - Extract `recording_url` and `duration` from the payload.
    - `UPDATE bookings SET recording_url = [url], duration_actual = [duration] WHERE meeting_provider_id = [space_id]`.
    - This event will (in a future epic) trigger a CaaS score recalculation.

* * *

### 5.0 Frontend & UI Design

The integration surfaces primarily on the **Booking Card** and **Booking Details** page.

#### 5.1 The Booking Card Update

- **File:** `apps/web/src/app/components/bookings/BookingCard.tsx`
- **State:**
  - **Upcoming (> 15 mins):** Show "Scheduled for \[Time\]". Button disabled.
  - **Ready (Start Time +/- 15 mins):** Show **primary "Join Lesson" button**.
  - **Completed:** Show "View Recording" (if `recording_url` is not null).
- **Action:** "Join Lesson" calls `POST /api/bookings/[id]/launch` and opens the result in a new tab.

#### 5.2 The Tutor "Snapshot" Workflow

Since Lessonspace does not have an API to fetch the whiteboard image automatically, we must build a UI prompt for the Tutor. This is critical for the **CaaS (v5.5)** "Credibility Clip" score.

- **Location:** Tutor Dashboard or `/my-students` page -> **"Recent Sessions"** widget.
- **Logic:**
  - When a booking is complete, show a card: *"How was your session with \[Student Name\]?"*
  - **Action 1:** "Upload Whiteboard Snapshot" (File Picker).
    - Uploads to Supabase Storage (`booking-artifacts/[booking_id]`).
    - `UPDATE bookings SET session_artifacts = '{ "whiteboard_snapshot_url": "..." }'`.
  - **Action 2:** "Leave Review" (Triggers the v4.5 Review Modal).

* * *

### 6.0 Implementation Plan

1. **Database:** Run migration `065_add_lessonspace_fields_to_bookings.sql`.
2. **Backend:** Implement the `LessonspaceService` in `apps/web/src/lib/services/` (as defined in v5.1).
3. **API Routes:** Create the `POST /api/bookings/[id]/launch` and `POST /api/webhooks/lessonspace` routes, ensuring they follow the v5.1 security patterns (Auth Middleware and Signature Verification).
4. **Frontend:** Update `BookingCard.tsx` to handle the "Join" state and call the new API.
5. **Tutor UI:** Add the "Upload Snapshot" workflow to the Tutor's post-session experience.

* * *

### 7.0 Integration Impact

- `student-onboarding-solution-design-v5.0` **(Hard Dependency):** This implementation *requires* the v5.0 "Assignment Feature" to be functional. The `launch` API's logic **depends** on the `bookings.student_id` column being correctly populated (or `NULL`) to identify the attendee.
- `profile-graph-solution-design-v4.6` **(Dependency):** This feature uses the `profile_graph` to validate that a Client/Tutor has a `GUARDIAN` link to a student before they can assign them to a booking.
- `caas-solution-design-v5.5` **(Prerequisite for CaaS):** This v5.2 epic is a **prerequisite** for CaaS. The CaaS engine solution design (v5.5) will *read* the `recording_url` and `session_artifacts.whiteboard_snapshot_url` that this integration populates.