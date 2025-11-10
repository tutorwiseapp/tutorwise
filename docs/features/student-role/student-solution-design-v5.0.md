# student-solution-design-v5.0

student-solution-design-v5.0  
  
**Prompt:**

**Analyse my proposed solution in \`student-solution-design-v5.0.md\`.**

- **Create an enhanced proposed solution that is functional, reliable, with great UI/UX.**
- **Implement an advanced review & rating system integrated with the overral application; profile, bookings, referral system, payements for viral growth.**
- **The next features after this are the Messages/Chat using Tawk and Analytics & Reporting.**
- **Ask me any questions.**

* * *

  
  
This design is based on our detailed discussion. It confirms that the purpose of the `student` role is to act as a **"data bridge"** for integrations (like Google Classroom) and that all primary platform interactions (chat, reviews, payments) remain the responsibility of the `client` **(Parent)**.

This architecture is designed to "close the gap" you identified, enabling future integrations while having **minimal impact** on our completed v4.4 (Network) and v4.5 (Reviews) systems.

* * *

### **Solution Design: Student Role & Integration Data Bridge (v5.0)**

- **Version:** 5.0
- **Date:** 2025-11-08
- **Status:** For Implementation
- **Owner:** AI Analysis
- **Prerequisite:** v4.3 (Referrals), v4.4 (Network), v4.5 (Reviews)

### 1.0 Executive Summary

This document details the architecture for the **v5.0 "Student Role" epic**. The primary goal of this feature is **not** to create a new B2C social platform for students, but to implement the foundational architecture for a **3-party (Client-Student-Tutor) transactional model**.

The `student` role (13+) will function as a **"data bridge,"** enabling future integrations with third-party learning platforms (e.g., Google Classroom, Khan Academy). This allows us to build "Student-First Tools" (like progress trackers) while maintaining our core business logic.

This design explicitly confirms:

1. **Chat (v4.4):** Remains **unchanged**. The Tutor chats **only** with the Client (Parent).
2. **Reviews (v4.5):** Remains **unchanged**. The Client (Parent) **is the official participant** who reviews the Tutor on behalf of their student.
3. **Linkage:** A new `client_student_links` table will be created for legal/payment authority, separate from the v4.4 `connections` table.
4. **Bookings:** The `bookings` table will be modified to track both the *payer* (`client_id`) and the *attendee* (`student_id`).

### 2.0 Architecture & Data Model

This architecture introduces a "Linked Account" model, separating the **social graph** (v4.4 `connections`) from the new **administrative graph** (v5.0 `client_student_links`).

#### 2.1 The "Linked Account" Model (ASCII Diagram)

This diagram shows how the new `student` role fits into our existing architecture.

```
+--------------------------+
|   PROFILE (Parent)       |
|   role: 'client'         |
+--------------------------+
    |         ^
    |         | (2. General Links - v4.4 `connections` table)
    |         | (e.g., Client-Tutor, Client-Agent)
    |         |
    | (1. Special Link - v5.0)
    | .------------------------.
    '--| `client_student_links` | ---.
      '------------------------'   |
      (Legal/Payment Authority)    |
                                 v
+--------------------------+     (2. General Links - v4.4 `connections` table)
|   PROFILE (Child)        |
|   role: 'student'        |-----+-------------------.
+--------------------------+     | (Student-Tutor)   | (Student-Agent)
    |                            v                   v
    | (3. Data Bridge - v5.0)  .-------------------.
    | .------------------------.   |   `connections`   |
    '--| `student_integration_links`|   '-------------------'
      '------------------------'   |   (Tutor-Agent)
      (e.g., Google Classroom)     |         |
                                 |         |
+--------------------------+     |         |
|   PROFILE (Tutor)        |<----'         |
|   role: 'tutor'          |               |
+--------------------------+               |
                                           |
+--------------------------+               |
|   PROFILE (Agent)        |<--------------'
|   role: 'agent'          |
+--------------------------+

```

#### 2.2 The 3-Party Transaction (ASCII Diagram)

This diagram shows how a `booking` now connects all three parties.

```
+---------------------+
|   Client (Parent)   |
| (profile_id: 'C1')  |
+---------------------+
    | (Payer)
    |
    v
.--------------------------.
|   `bookings` table       |
|--------------------------|
| id: 'B1'                 |
| client_id: 'C1'  (Payer) |
| student_id: 'S1' (Attendee)|
| listing_id: 'L1'         |
| ...                      |
'--------------------------'
    | (Attendee)     | (Service)
    |                |
    v                v
+---------------------+  .---------------------+
|   Student (Child)   |  |   `listings` table  |
| (profile_id: 'S1')  |  |---------------------|
+---------------------+  | id: 'L1'            |
                         | profile_id: 'T1'    |
                         '---------------------'
                                 | (Owner)
                                 v
                         +---------------------+
                         |    Tutor            |
                         | (profile_id: 'T1')  |
                         +---------------------+

```

* * *

### 3.0 Database Schema Design

The following SQL migration files shall be created in `apps/api/migrations/`.

#### 3.1 Migration 1: `047_add_student_role_and_links.sql`

This migration officially adds the `student` role and the table for linking accounts.

```
SQL
```

```
-- 1. Add 'student' to the existing 'user_role' enum
-- We must do this in a separate transaction
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';

-- 2. Create the client_student_links table
-- This is for the legal/payment link, NOT a social connection.
CREATE TABLE IF NOT EXISTS public.client_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A student can only be linked to one client (parent)
    CONSTRAINT "unique_student_link" UNIQUE (student_id),
    -- A client/student pair can only be linked once
    CONSTRAINT "unique_client_student_pair" UNIQUE (client_id, student_id)
);

CREATE INDEX "idx_client_student_links_client_id" ON public.client_student_links(client_id);
CREATE INDEX "idx_client_student_links_student_id" ON public.client_student_links(student_id);

-- 3. Add RLS policies
ALTER TABLE public.client_student_links ENABLE ROW LEVEL SECURITY;

-- Clients can manage links for their own profile
CREATE POLICY "Clients can manage their own student links"
    ON public.client_student_links
    FOR ALL
    USING (auth.uid() = client_id);

-- Students can see who they are linked to
CREATE POLICY "Students can view their own links"
    ON public.client_student_links
    FOR SELECT
    USING (auth.uid() = student_id);

COMMENT ON TABLE public.client_student_links IS 'v5.0: Administrative link between a paying Client (parent) and a Student (child).';

```

#### 3.2 Migration 2: `048_update_bookings_for_students.sql`

This migration re-architects the `bookings` table for 3-party transactions.

```
SQL
```

```
-- 1. Add the new student_id column
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_bookings_student_id" ON public.bookings(student_id);

-- 2. Backfill existing data
-- For all past bookings, we assume the Client (payer) was also the attendee.
-- This ensures data integrity.
UPDATE public.bookings
SET student_id = client_id
WHERE student_id IS NULL;

-- 3. Add comments to clarify the new model
COMMENT ON COLUMN public.bookings.client_id IS 'The profile_id of the user who paid for the booking (e.g., the Parent).';
COMMENT ON COLUMN public.bookings.student_id IS 'v5.0: The profile_id of the user attending the lesson (e.g., the Student).';

```

#### 3.3 Migration 3: `049_create_integration_links_table.sql`

This migration creates the "data bridge" table to hold external platform credentials for students.

```
SQL
```

```
-- This table holds OAuth tokens for student integrations
CREATE TABLE IF NOT EXISTS public.student_integration_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL, -- e.g., 'google_classroom', 'khan_academy'
    external_user_id TEXT, -- The user's ID on the external platform
    
    -- Tokens must be stored using Supabase's encrypted columns
    -- pgsodium must be enabled on the database
    auth_token TEXT,
    refresh_token TEXT,
    
    scopes TEXT[], -- e.g., ['classroom.courses.readonly']
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT "unique_student_platform_link" UNIQUE (student_profile_id, platform_name)
);

-- RLS: Only the student can manage their own integrations
ALTER TABLE public.student_integration_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own integration links"
    ON public.student_integration_links
    FOR ALL
    USING (auth.uid() = student_profile_id)
    WITH CHECK (auth.uid() = student_profile_id);

COMMENT ON TABLE public.student_integration_links IS 'v5.0: Stores OAuth tokens for linking a Student account to external learning platforms.';

```

* * *

### 4.0 Backend & API Design

This feature requires a new API route group for managing links and integrations.

- `POST /api/links/client-student`
  - **Purpose:** A Client (Parent) invites a Student to link accounts.
  - **Body:** `{ "student_email": "student@email.com" }`
  - **Logic:** (Protected Route)
    1. Get `client_id` from session.
    2. Find `student_id` from `student_email`.
    3. `INSERT` into `client_student_links` (or send an invite email if not yet signed up).
    4. Log to `audit_log`.
- `DELETE /api/links/client-student/[link_id]`
  - **Purpose:** A Client (Parent) unlinks a Student.
  - **Logic:** (Protected Route)
    1. `DELETE FROM client_student_links WHERE id = [link_id] AND client_id = auth.uid()`.
    2. Log to `audit_log`.
- `GET /api/links/my-students`
  - **Purpose:** For the Client (Parent) to see their managed students.
  - **Logic:** `SELECT * FROM client_student_links WHERE client_id = auth.uid()`.
  - **Returns:** Array of linked student profiles.
- `POST /api/integrations/connect/[platform]`
  - **Purpose:** (Student Role) Initiates the OAuth flow for a platform (e.g., 'google\_classroom').
  - **Logic:** Generates and returns the external OAuth consent URL.
- `GET /api/integrations/callback/[platform]`
  - **Purpose:** The OAuth callback URL.
  - **Logic:** (Protected Route - Student)
    1. Exchanges the `code` from the URL for an `auth_token` and `refresh_token`.
    2. Fetches the `external_user_id` from the platform's API.
    3. `INSERT` or `UPDATE` the row in `student_integration_links` with the new tokens and scopes.
    4. Redirects back to the student's settings page: `/account/settings?integration=success`.

* * *

### 5.0 Frontend & UI Design

This epic requires significant UI changes for both the Client and the new Student role.

#### 5.1 Onboarding & Signup

- **File:** `apps/web/src/app/signup/page.tsx`
- **Change:** The signup form must now include an **age gate** (e.g., Date of Birth picker).
  - **If < 13:** Block signup (per COPPA).
  - **If 13-17:** Assign `role: 'student'`. Redirect to a new page: "Link Your Parent's Account... You must be linked to a Client account to book lessons."
  - **If 18+:** Proceed to `apps/web/src/app/onboarding/page.tsx` as normal.

#### 5.2 Client (Parent) UI

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** The `AppSidebar.tsx` component needs a new nav link.
  - `href: "/my-students"`
  - `icon: Users` (from `lucide-react`)
  - `label: "My Students"`
- **New Page:** `apps/web/src/app/(authenticated)/my-students/page.tsx`
  - **Purpose:** A new hub for Clients to manage their linked Student accounts.
  - **UI:** A `PageHeader` ("My Students") and a `StatGrid` (reusing `apps/web/src/app/components/ui/reports/StatGrid.tsx`) showing "Total Students" and "Pending Invites."
  - **Component:** A `<StudentManagementCard />` (new component) that:
    - Fetches from `GET /api/links/my-students`.
    - Renders a list of linked students.
    - Has an "Invite Student" button that opens a modal to `POST` to `/api/links/client-student`.
- **File:** `apps/web/src/app/(authenticated)/bookings/page.tsx` (and Booking Modal)
- **Change:** When a Client creates a *new* booking:
  1. The UI must first check if they have any linked students (from `GET /api/links/my-students`).
  2. If they have none, they must be prompted to add a student first.
  3. If they have one or more, the booking form **must** include a new, **required** `<Select>` field: **"Who is this booking for?"**
  4. This dropdown will be populated with their linked students.
  5. The selected `student_id` is passed to the booking creation API.

#### 5.3 Student (New Role) UI

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** The `AppSidebar.tsx` component must be "role-aware." When the user's role is `student`, it must render a **limited set of navigation links**:
  - `mainNavLinks`: "Dashboard" (`/dashboard`), "My Bookings" (`/bookings`), "Settings" (`/account/settings`).
  - **Crucially, it will HIDE "Listings," "Network," "Referrals," and "Financials."**
- **File:** `apps/web/src/app/account/settings/page.tsx`
- **Change:** This page will be updated. When the user role is `student`, it will show a new UI card:
  - `<IntegrationLinksCard />`**:**
    - Title: "My Integrations"
    - Description: "Connect your learning accounts to help your tutors."
    - Logic: Renders a list of available integrations (e.g., "Google Classroom") with a "\[Connect\]" or "\[Disconnect\]" button.
    - "\[Connect\]" button `POST`s to `POST /api/integrations/connect/google_classroom` and redirects to the returned OAuth URL.

* * *

### 6.0 Integration Impact Analysis (Confirmation)

This v5.0 design **does not break** our previous work.

- **v4.3 Referrals:** **No change.** The `on_booking_completed` trigger (migration 044) will correctly identify the `client_id` (Parent) and `agent_id` as participants. The referral is tied to the *paying Client*, which is correct.
- **v4.4 Network:** **No change.** The `connections` table is for social links. The `client_student_links` table is for administrative links. The separation is clean.
- **v4.5 Reviews:** **No change.** Our v4.5 design (migration 044) correctly identifies the `participant_ids` as `[client_id, tutor_id, agent_id]`. This honors our rule that the **Client (Parent) reviews the Tutor**, not the Student.
- **v4.5 "Junction":** **No change.** The post-review modal will correctly be shown to the **Client (Parent)**, who can then "Rebook" (for their student) or "Refer a Friend" (using their own referral code).