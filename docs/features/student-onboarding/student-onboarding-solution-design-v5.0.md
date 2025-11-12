# student-onboarding-solution-design-v5.0

**student-onboarding-solution-design-v5.0**

**Prompt**

**Analyse my proposed solution in student-onboarding-solution-design-v5.0.md. Review and propose a solution that is functional, reliable, align to the standard dashboard Hub UI/UX and design-system.md. Implement and integrate with the application existing features/files. Ask me any questions.**

  

This version is now the final specification for the Student Onboarding epic. It incorporates all of our recent decisions, including:

1. **New Prerequisite:** This design is now dependent on `profile-graph-solution-design-v4.6`, which must be implemented first.
2. **Strategic Context:** The full **Business Case (Section 1.0)** is included, detailing the "Engagement Loop" and "Cost of Performance" metrics.
3. **Updated Data Model:** The architecture is refactored to use the new `profile_graph` table (v4.6). The `client_student_links` table is **deprecated** and will not be built. All references to the Client-Student link now point to the `GUARDIAN` type in the `profile_graph`.
4. **Updated Signup Flow:** The **"Client-Led Invitation Flow"** (Section 6.1) is now the *only* method for creating a `student` account, confirming the main signup page (`/signup`) is unchanged.
5. **Refined UI/UX:** The "My Students" page is confirmed as a new, dedicated page (Section 6.2), and the Student Sidebar is confirmed to be **limited** (Section 6.3), hiding features like Network and Referrals.

* * *

### **Solution Design: Student Onboarding & Integration (v5.0)**

- **Version:** 5.0
- **Date:** 2025-11-12
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite:** `profile-graph-solution-design-v4.6`

* * *

### 1.0 Business Case & Strategic Goals

This epic is the key to transforming Tutorwise from a simple transactional marketplace into a high-engagement, defensible "relationship hub."

#### 1.1 The Problem: Transactional Engagement

The platform is successful at bookings, but the core service—the tutoring itself—happens "off-platform" in tools like **Zoom**, with assignments shared via **email** or non-integrated **Google Classroom** instances. This creates two major problems:

1. **Low Stickiness:** The platform is not integral to the daily workflow, making us easily replaceable by competitors like **Pencil Spaces** or **Lessonspace**.
2. **No Proof of Value:** We cannot capture the data (grades, session recordings) that *proves* the service is working.

#### 1.2 The Solution: The "Engagement Loop"

By implementing this v5.0 architecture on top of the v4.6 `profile_graph` foundation, we create an "Engagement Loop" that anchors all three users (Client, Tutor, Student) to our platform.

- **For the Tutor (The "Single Pane of Glass"):** We save the tutor time and mental energy by making Tutorwise their central "cockpit." Their dashboard will automatically show a student's latest grades (from **Google Classroom**) and past session recordings (from **Lessonspace**) right next to their upcoming booking. This proof of value also helps the tutor justify their costs.
- **For the Client (The "Cost of Performance" Metric):** We provide the ultimate ROI. The Client (Parent) logs in and sees a direct correlation between their spending and their child's results:
  - **Cost:** 1 Session ($50)
  - **Performance:** 'Algebra Quiz' (Grade: 9/10)
  - **Proof:** `[View Session Recording]`
- **For the Student (The "Data Bridge"):** We create a limited, safe, 13+ account that acts as the "keyring" for all integrations.

#### 1.3 Strategic ROI: Fueling the Viral Flywheel

The "Cost of Performance" data is the fuel for our v4.3 referral system. When a Client (Parent) sees this tangible success, they are at their moment of maximum satisfaction. Presenting a referral prompt at this moment turns their data-backed endorsement into a powerful, high-conversion lead-generation engine.

This interconnected system (Marketplace + Booking + Referrals + Integrations) creates the **"defensible moat"** that separates us from competitors and is made possible by our **CAS framework's 4x velocity advantage**.

* * *

### 2.0 Technical Executive Summary

This document details the architecture for the **v5.0 "Student Role" epic**. The primary goal is **not** to create a new B2C social platform for students, but to implement the foundational architecture for a **3-party (Client-Student-Tutor) transactional model**.

The `student` role (13+) will function as a **"data bridge,"** enabling future integrations with third-party learning platforms (e.g., Google Classroom, Khan Academy). This allows us to build "Student-First Tools" (like progress trackers) while maintaining our core business logic.

This design explicitly confirms:

1. **Architecture:** This feature will be built on the `profile-graph-solution-design-v4.6`. The `client_student_links` table (originally proposed) is **deprecated** and will **not** be built.
2. **Linkage:** The new `profile_graph` (v4.6) table will be used to store **"Guardian Links"** (`relationship_type = 'GUARDIAN'`) between a Client/Tutor and a Student.
3. **Chat (v4.4):** Remains **unchanged**. The Tutor chats **only** with the Client (Parent).
4. **Reviews (v4.5):** Remains **unchanged**. The Client (Parent) **is the official participant** who reviews the Tutor on behalf of their student.
5. **Bookings:** The `bookings` table will be modified to track both the *payer* (`client_id`) and the *attendee* (`student_id`).

* * *

### 3.0 Architecture & Data Model

This architecture utilizes the "Unified Relationship Model" from v4.6.

#### 3.1 The "Linked Account" Model (ASCII Diagram)

This diagram shows how the new `student` role fits into our existing architecture, using the `profile_graph` table.

```
+--------------------------+
|   PROFILE (Parent)       |
|   role: 'client'         |
+--------------------------+
    |         ^
    |         | (2. Social Links - v4.4, also in `profile_graph`)
    |         | (e.g., Client-Tutor, Client-Agent)
    |         |
    | (1. Guardian Link - v5.0)
    | .------------------------.
    '--|    `profile_graph`     | ---.
      '------------------------'   |
      (relationship_type: 'GUARDIAN') |
                                 v
+--------------------------+     (2. Social Links - v4.4, also in `profile_graph`)
|   PROFILE (Child)        |
|   role: 'student'        |-----+-------------------.
+--------------------------+     | (Student-Tutor)   | (Student-Agent)
    |                            v                   v
    | (3. Data Bridge - v5.0)  .-------------------.
    | .------------------------.   |   `profile_graph`   |
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

#### 3.2 The 3-Party Transaction (ASCII Diagram)

This diagram shows how a `booking` (our "Booking Link") connects all three parties. This data is essential for populating the `metadata` field of a 'BOOKING' link in the `profile_graph`.

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

### 4.0 Database Schema Design

This epic requires two new migrations. **It will NOT create** `client_student_links`, as that table is replaced by the v4.6 `profile_graph`.

#### 4.1 Migration 1: `048_update_bookings_for_students.sql`

This migration re-architects the `bookings` table for 3-party transactions.

```
SQL
```

```
-- 1. Add 'student' to the existing 'user_role' enum
-- We must do this in a separate transaction
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';

-- 2. Add the new student_id column to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_bookings_student_id" ON public.bookings(student_id);

-- 3. Backfill existing data
-- For all past bookings, we assume the Client (payer) was also the attendee.
-- This ensures data integrity.
UPDATE public.bookings
SET student_id = client_id
WHERE student_id IS NULL;

-- 4. Add comments to clarify the new model
COMMENT ON COLUMN public.bookings.client_id IS 'The profile_id of the user who paid for the booking (e.g., the Parent).';
COMMENT ON COLUMN public.bookings.student_id IS 'v5.0: The profile_id of the user attending the lesson (e.g., the Student).';

```

#### 4.2 Migration 2: `049_create_integration_links_table.sql`

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

### 5.0 Backend & API Design

This feature requires a new API route group for managing Guardian Links and integrations.

- `POST /api/links/client-student`
  - **Purpose:** A Client (Parent) or Tutor invites a Student (13+) to create an account and form a "Guardian Link."
  - **Body:** `{ "student_email": "student@email.com", "is_13_plus": true }`
  - **Logic:** (Protected Route)
    1. Get `guardian_id` (Client or Tutor) from session.
    2. Check `is_13_plus` flag; fail if false.
    3. Send a secure, single-use invitation email to `student_email`. This link will contain a token to pre-validate the relationship.
    4. This route **does not** create the link. The link is created by the student signup flow (see 6.1).
    5. Log to `audit_log`.
- `DELETE /api/links/client-student/[link_id]`
  - **Purpose:** A Client (Parent) or Tutor unlinks a Student (removes their "Guardian Link").
  - **Logic:** (Protected Route)
    1. `DELETE FROM profile_graph WHERE id = [link_id] AND source_profile_id = auth.uid() AND relationship_type = 'GUARDIAN'`.
    2. Log to `audit_log`.
- `GET /api/links/my-students`
  - **Purpose:** For the Client or Tutor to see their managed students.
  - **Logic:** `SELECT * FROM profile_graph WHERE source_profile_id = auth.uid() AND relationship_type = 'GUARDIAN'`.
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

### 6.0 Frontend & UI Design

This epic requires significant UI changes for both the Client and the new Student role.

#### 6.1 Student Signup & Onboarding Flow (13+)

This **Client-Led Invitation Flow** is the *only* supported method for creating a `student` account. This flow ensures legal compliance (13+) and data integrity (no "orphan" accounts).

1. **Client/Tutor Initiates:** The logged-in user navigates to the new **"My Students"** page (see 6.2).
2. **User Invites:** The user clicks "Add Student" and enters their student's email. They must check a box: **"I confirm this student is 13 years of age or older."**
3. **Invite Sent:** The backend `POST /api/links/client-student` route sends a secure invitation email to the student's address.
4. **Student (13+) Accepts:** The student opens the email and clicks the invite link.
5. **Limited Account Creation:** The student is taken to a lightweight signup page (`/signup/invite?token=...`) where their email is pre-filled. They only need to create a password.
6. **Automatic Linking:** On submit, the backend:
  - Creates the new `auth.users` entry.
  - The `handle_new_user` trigger creates their `profiles` entry with `role: 'student'`.
  - A new function (or the API route) *automatically* creates the record in `profile_graph` (e.g., `source_profile_id = [guardian_id_from_token]`, `target_profile_id = [new_student_id]`, `relationship_type = 'GUARDIAN'`, `status = 'ACTIVE'`).
7. **First-Time Login:** The student uses the main `/login` page, and is redirected to their limited dashboard.

#### 6.2 Client (Parent) & Tutor UI

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** Add a new nav link to `AppSidebar.tsx` for **"My Students"**. This link will be visible to users with the `client` or `tutor` role.
- **New Page:** `apps/web/src/app/(authenticated)/my-students/page.tsx`
- **New Component:** This page will contain a `<StudentManagementCard />` to list students (from `GET /api/links/my-students`) and invite new ones.
- **File:** `apps/web/src/app/(authenticated)/bookings/page.tsx` (and Booking Modal)
- **Change (Client Role):** When a Client creates a *new* booking:
  1. The UI must first check if they have any linked students (from `GET /api/links/my-students`).
  2. If they have none, they must be prompted to add a student first.
  3. If they have one or more, the booking form **must** include a new, **required** `<Select>` field: **"Who is this booking for?"**
  4. This dropdown will be populated with their linked students.
  5. The selected `student_id` is passed to the booking creation API.

#### 6.3 Student (New Role) UI

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** `AppSidebar.tsx` must be "role-aware." When the user's role is `student`, it must render a **limited set of navigation links**:
  - "Dashboard" (`/dashboard`)
  - "My Students" (`/my-students`)
  - "My Bookings" (`/bookings`)
  - "Account" (`/account/settings`)
  - **Crucially, it will HIDE "Listings," "Network," "Referrals," and "Financials."**
- **File:** `apps/web/src/app/account/settings/page.tsx`
- **Change:** This page will be updated. When the user role is `student`, it will show a new UI card:
  - `<IntegrationLinksCard />`**:**
    - Title: "My Integrations"
    - Description: "Connect your learning accounts to help your tutors."
    - Logic: Renders a list of available integrations (e.g., "Google Classroom") with a "$$Connect$$" or "$$Disconnect$$" button.
    - "$$Connect$$" button `POST`s to `POST /api/integrations/connect/google_classroom` and redirects to the returned OAuth URL.

* * *

### 7.0 Integration Impact Analysis (Confirmation)

This v5.0 feature design **depends entirely** on the v4.6 architecture.

- **v4.3 Referrals:** **No change.** The `on_booking_completed` trigger (migration 045) will correctly identify the `client_id` (Parent) and `agent_id` as participants. The referral is tied to the *paying Client*, which is correct.
- **v4.4 Network:** **No change in behavior.** The v4.6 architecture refactors the `connections` table into the `profile_graph` table. "Social Links" (v4.4) and "Guardian Links" (v5.0) will co-exist in `profile_graph` as distinct `relationship_type` enums ('SOCIAL' and 'GUARDIAN').
- **v4.5 Reviews:** **No change.** Our v4.5 design (migration 044) correctly identifies the `participant_ids` as `[client_id, tutor_id, agent_id]` in the `review_sessions` table. This honors our rule that the **Client (Parent) reviews the Tutor**, not the Student.
- **v4.5 "Junction":** **No change.** The post-review modal will correctly be shown to the **Client (Parent)**, who can then "Rebook" (for their student) or "Refer a Friend" (using their own referral code).