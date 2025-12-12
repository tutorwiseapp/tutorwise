# pencilspaces-solution-design-v5.3

Here is the updated `pencilspaces-solution-design-v5.3`.

This document has been revised to be the definitive specification for the **Pencil Spaces** integration. It is the "stateful" alternative to the Lessonspace (v5.2) integration.

The key updates are:

1. **New Versioning:** Renamed to `v5.3` as requested.
2. **New Prerequisite:** It is now dependent on the foundational `api-solution-design-v5.1` (which defines the 3-pattern API architecture).
3. **CaaS Integration:** Section 2.0 now explicitly states that the primary purpose of this integration is to **feed objective data** (like `engagement_metrics`) directly into the `caas-solution-design-v5.5` engine.
4. **API Pattern Alignment:** The design is now aligned with the new v5.1 API architecture, specifying how it uses **Pattern 1 (User-Facing)** and **Pattern 3 (Webhook)**.
5. **Data Flow:** The backend logic now includes the critical step of adding a job to the `caas_recalculation_queue` (from v5.5) when a session ends.

* * *

### **Solution Design: Pencil Spaces Integration (v5.3)**

- **Version:** 5.3
- **Date:** 2025-11-14
- **Status:** Draft / Alternative
- **Owner:** Senior Architect
- **Prerequisite:** `profile-graph-solution-design-v4.6`, `student-onboarding-solution-design-v5.0`, `api-solution-design-v5.1`

* * *

### 1.0 Executive Summary

This document details the integration architecture for **Pencil Spaces** as the virtual classroom provider. This is the "Stateful" alternative to the "Stateless" Lessonspace (v5.2) integration.

Pencil Spaces operates on an "Institution" model, which requires that our Tutorwise `profiles` be synchronized as `users` within their system before a session can be launched. This introduces a higher level of implementation complexity but provides a significant strategic advantage: **granular engagement analytics.**

### 2.0 Strategic Context & CaaS Integration

While more complex than Lessonspace, Pencil Spaces offers superior data depth for our **"Engagement Loop"** and is a primary data source for the `caas-solution-design-v5.5` engine.

- **Automated "Proof of Value":** We don't just know *that* a lesson happened. The Pencil Spaces webhook can tell us "Student A spoke for 15 minutes" and "had their camera on for 45 minutes."
- **CaaS Data Source:** This objective data is **consumed directly by the CaaS Engine (v5.5)**. It feeds the **"Performance & Quality"** bucket of the Tutor's CaaS score, making their credibility score far more accurate and defensible than a simple star rating.

* * *

### 3.0 API Architectural Alignment (per v5.1)

This feature is a direct implementation of two patterns from the foundational `api-solution-design-v5.1`.

#### 3.1 Pattern 1: User-Facing API (The "Stateful" Launch)

The launch flow is complex and requires multiple "check-or-create" steps, all securely orchestrated by our API.

```
[User]          [Tutorwise API (v5.1)]      [Pencil Spaces API]      [Database (Supabase)]
  |                    |                          |                     |
  |-- (1) Click Join ->| POST /api/bookings/[id]/launch
  |                    |                          |                     |
  |                    |--(2) Get User Profile ------------------------>|
  |                    |                          |                     |
  |                    |--(3) Check `pencil_user_id`?
  |                    |    (If Null, POST /users/createAPIUser)
  |                    |-- (4) Sync User --------->|
  |                    |                          |                     |
  |                    |--(5) Save `pencil_user_id` ------------------->| (profiles table)
  |                    |                          |                     |
  |                    |--(6) Get Booking ----------------------------->|
  |                    |                          |                     |
  |                    |--(7) Check `meeting_provider_id`?
  |                    |    (If Null, POST /spaces/create)
  |                    |-- (8) Sync Space -------->|
  |                    |                          |                     |
  |                    |--(9) Save `spaceId` -------------------------->| (bookings table)
  |                    |                          |                     |
  |                    |--(10) POST /users/login (Get Magic Link)
  |                    |     (Payload: { userId, redirectUrl })
  |                    |<---(11) Return Magic Link -|                     |
  |                    |                          |                     |
  |<--(12) Redirect ---| (To Magic Link)          |                     |

```

#### 3.2 Pattern 3: Webhook API (Analytics Ingestion)

This flow is how we receive the "Proof of Value" and trigger the CaaS update.

```
[Pencil Spaces] --(1) POST Event (session_ended) w/ Signature--> [Tutorwise API (v5.1)]
     |                                                             |
     |                                                       (2) Verify Webhook Signature
     |                                                             |
     |                                                       (3) Parse `engagement_metrics`
     |                                                             |
     |                                                       (4) UPDATE `bookings` table
     |                                                             |
     |                                                       (5) INSERT into `caas_recalculation_queue`
     |                                                             |
     |<--(6) Return 200 OK --------------------------------------   |

```

* * *

### 4.0 Database Schema Design

This integration requires updates to two tables.

**File:** `apps/api/migrations/066_add_pencil_spaces_schema.sql` *(This number assumes it follows the Lessonspace migration* `065`*)*

```
SQL
```

```
-- 1. Add external ID to profiles for User Sync
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pencil_user_id TEXT UNIQUE;

CREATE INDEX idx_profiles_pencil_user_id ON public.profiles(pencil_user_id);

COMMENT ON COLUMN public.profiles.pencil_user_id IS 'v5.3: The synced User ID from Pencil Spaces.';

-- 2. Add Space details and analytics fields to Bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS meeting_provider_id TEXT, -- The Pencil Space ID
ADD COLUMN IF NOT EXISTS meeting_url TEXT,         -- The generic Space URL
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS engagement_metrics JSONB DEFAULT '{}'::jsonb; 

COMMENT ON COLUMN public.bookings.engagement_metrics IS 'v5.3: Stores Pencil Spaces analytics (talk_time, attendance_duration) for CaaS v5.5.';

```

* * *

### 5.0 Backend & API Design

#### 5.1 Pattern 1: `POST /api/bookings/[id]/launch`

- **Logic (Orchestrated by** `PencilSpacesService.ts`**):**
  1. **Auth:** Validate user is part of this booking (Client, Student, or Tutor).
  2. **User Sync:**
    - Fetch the user's `profiles.pencil_user_id`.
    - If `NULL`: Call `POST /users/createAPIUser` with the user's name, email, and role (Teacher/Student).
    - Save the returned `userId` to `profiles.pencil_user_id`.
  3. **Space Sync:**
    - Fetch the `bookings.meeting_provider_id` (this is the `spaceId`).
    - If `NULL`: Call `POST /spaces/create` to create a new persistent Space.
    - Save the returned `spaceId` and `link` (as `meeting_url`) to the `bookings` table.
  4. **Launch:**
    - Call `POST /users/login` with the user's `pencil_user_id` and the `meeting_url`.
  5. **Return:** The secure, one-time login URL (`{ "url": "..." }`) to the client.

#### 5.2 Pattern 3: `POST /api/webhooks/pencilspaces`

- **Logic:**
  1. **Security:** Verify the `X-Pencil-Signature` header to authenticate the request.
  2. Parse the event `type`.
  3. **On** `session_ended`**:**
    - Extract `spaceId`, `participation_metrics` (duration, talk\_time, etc.).
    - Find `booking` where `meeting_provider_id = spaceId`.
    - `UPDATE bookings SET engagement_metrics = [...] WHERE id = booking.id`.
    - **Trigger CaaS:** `INSERT INTO caas_recalculation_queue (profile_id) VALUES ([tutor_id])`.
  4. **On** `recording_available`**:**
    - Extract `spaceId` and `download_url`.
    - Find `booking` where `meeting_provider_id = spaceId`.
    - `UPDATE bookings SET recording_url = [download_url] WHERE id = booking.id`.
  5. Return `200 OK`.

* * *

### 6.0 Frontend & UI Design

#### 6.1 The Booking Card

- **File:** `apps/web/src/app/components/bookings/BookingCard.tsx`
- **Update:** The "Join Lesson" button logic is identical to the Lessonspace v5.2 design. It calls the `POST /launch` endpoint, and the user is redirected. All complexity is hidden on the backend.

#### 6.2 The "Lesson Insights" Card (New)

- **File:** `apps/web/src/app/components/bookings/LessonInsights.tsx`
- **Location:** Booking Details Page (for Client and Tutor).
- **Logic:** This component is the "payoff" for this integration. It renders the `engagement_metrics` from the `bookings` table.
- **Display:**
  - "Lesson Duration: \[X\] minutes"
  - "Student Speaking Time: \[Y\] minutes"
  - "Student Attention: \[Z\]%"
  - "\[View Recording\]" (if `recording_url` exists).

* * *

### 7.0 Integration Impact

- `api-solution-design-v5.1` **(Dependency):** This feature is a direct implementation of the Patterns (1 and 3) defined in the foundational API doc.
- `caas-solution-design-v5.5` **(Critical Data Provider):** This is the **primary reason** to choose this integration. The `engagement_metrics` and `recording_url` are critical, objective data sources for the `TutorCaaSStrategy`.
- **Complexity:** This design is **significantly more complex** than the Lessonspace (v5.2) alternative because it requires a persistent user synchronization layer. We must now manage an external `pencil_user_id` for our users.