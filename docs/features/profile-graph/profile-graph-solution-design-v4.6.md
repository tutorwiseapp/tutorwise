# profile-graph-solution-design-v4.6

**profile-graph-solution-design-v4.6**

**Prompt**

**Analyse my proposed solution in profile-graph-solution-design-v4.6.md. Review and propose a solution that is functional, reliable, align to the standard dashboard Hub UI/UX and design-system.md. Implement and integrate with the application existing features/files. Ask me any questions.**

This document formally defines the **Unified Profile Graph Architecture**. This new architecture is now the foundational prerequisite for the `student-onboarding-solution-design-v5.0` epic.

* * *

### **Solution Design: Unified Profile Graph Architecture (v4.6)**

- **Version:** 4.6
- **Date:** 2025-11-11
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisite for:** `student-onboarding-solution-design-v5.0`
- **Replaces Data Model from:** `student-onboarding-solution-design-v5.0` and `network-solution-design-v4.4`.

* * *

### 1.0 Executive Summary

This document outlines a significant architectural upgrade for the Tutorwise MVP. We are moving from our current **"Isolated Relationship Model"** (using separate tables like `connections` and the proposed `client_student_links`) to a superior **"Unified Relationship Model"**.

This new model will be implemented via a single `profile_graph` table in our existing Supabase (Postgres) database. This table will consolidate all user-to-user links (Social, Guardian, and Booking) by using a `relationship_type` enum.

Given the MVP status of the project, the migration risk is low. This change provides immense long-term flexibility, simplifies complex queries, and creates the ideal foundation for our "Engagement Loop" and "Cost of Performance" metrics. This upgrade is the key to accelerating our path to a defensible, scalable, and high-value platform.

* * *

### 2.0 Strategic Context & Business Case

The current "Isolated Model" was a good starting point but creates data silos. To build our key value propositions (like the v5.0 Student Onboarding), we need a 360-degree view of our users.

- **The "Engagement Loop":** To become a "relationship hub," we must be able to show a Client (Parent) all activity related to them: their "Social Links" to Tutors, their "Guardian Links" to their Students, and their past "Booking Links."
- **The "Cost of Performance" Metric:** To prove our value, we must programmatically link a `booking` to the `client` who paid and the `tutor` who provided the service.
- **Future AI Recommendations:** To power a recommendation engine (Phase 2), we will need to run deep, 3rd- and 4th-degree queries (e.g., "tutors my social links have booked").

The `profile_graph` design makes these features radically simpler to build and more performant to run. It moves our business logic from the *database schema* (which tables to `JOIN`) into the *data itself*.

* * *

### 3.0 Infrastructure & Integration Proposal (The "Hybrid Phased Approach")

This architecture will be implemented in two phases to balance cost and performance.

#### **Phase 1 (MVP - Now): Vercel + Supabase (Relational Graph)**

This is the recommended immediate implementation. We will create the `profile_graph` table (designed below) directly within our existing Supabase (Postgres) database.

- **Pros:**
  - **Zero New Costs:** Uses our existing Vercel and Supabase stack.
  - **Fastest Implementation:** Our team's expertise is in this stack.
  - **MVP-Ready:** Postgres is highly optimized and more than capable of handling the 1st and 2nd-degree queries required for our dashboard and marketplace (e.g., "show me my students," "show me my social links").
- **Cons:**
  - **Deep Query Limitation:** This model is not suitable for deep, recursive 3rd-degree+ queries (e.g., "friends of friends"). We accept this trade-off for the MVP.

#### **Phase 2 (Post-MVP Scale): Vercel + Railway/Neo4j**

When we are ready to build advanced AI-powered recommendation features, we will activate our dormant native graph database infrastructure.

- **Implementation:**
  1. Activate the Railway + Neo4j services.
  2. Create a data pipeline (e.g., using Supabase triggers or a scheduled job) that syncs data from our primary `profile_graph` (Postgres) table into the Neo4j instance.
  3. Our `apps/api` on Railway will query Neo4j for these complex analytics, while the core app continues to use Postgres for standard transactions.

This hybrid approach gives us the reliability of Postgres and the power of a native graph database, using infrastructure already provisioned in our architecture.

* * *

### 4.0 Database Design (Phase 1)

This implementation will consist of one new migration file to add the enums and the `profile_graph` table.

#### 4.1 New ENUM Types

```
SQL
```

```
-- Creates the 'relationship_type' enum
CREATE TYPE relationship_type AS ENUM (
  'GUARDIAN', -- A Client (Parent) has authority over a Student
  'SOCIAL',   -- A mutual "Social Link" (replaces 'connections')
  'BOOKING',  -- A Client (Payer) has a completed booking with a Tutor
  'AGENT_DELEGATION', -- A Tutor delegates commission to an Agent
  'AGENT_REFERRAL'   -- An Agent referred a Client
);

-- Creates the 'relationship_status' enum
CREATE TYPE relationship_status AS ENUM (
  'PENDING',   -- Awaiting acceptance (e.g., for a 'SOCIAL' link)
  'ACTIVE',    -- The link is current and valid
  'BLOCKED',   -- One user has blocked the other
  'COMPLETED'  -- The link represents a past event (e.g., 'BOOKING')
);

```

#### 4.2 `profile_graph` Table Schema

```
SQL
```

```
-- This table will consolidate all user-to-user links.
CREATE TABLE IF NOT EXISTS public.profile_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The 'from' side of the relationship
  source_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- The 'to' side of the relationship
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- The type of relationship (the "what")
  relationship_type relationship_type NOT NULL,
  
  -- The state of the relationship (the "when" or "if")
  status relationship_status NOT NULL DEFAULT 'ACTIVE',
  
  -- Contextual data about the link (e.g., booking_id, student_id)
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT "no_self_links" CHECK (source_profile_id <> target_profile_id),
  
  -- Ensure a unique relationship path. 
  -- A Client can only have one 'GUARDIAN' link to a Student.
  -- A User can only have one 'SOCIAL' link to another User.
  CONSTRAINT "unique_relationship_path" UNIQUE (source_profile_id, target_profile_id, relationship_type)
);

-- 3. Create high-performance indexes
CREATE INDEX "idx_profile_graph_source_id" ON public.profile_graph(source_profile_id);
CREATE INDEX "idx_profile_graph_target_id" ON public.profile_graph(target_profile_id);
CREATE INDEX "idx_profile_graph_type" ON public.profile_graph(relationship_type);

COMMENT ON TABLE public.profile_graph IS 'v4.6: Unified relationship table. Consolidates Social, Guardian, and Booking links.';

```

#### 4.3 Data Modeling Examples

- **To store a "Guardian Link" (for v5.0):**
  - **Replaces:** `INSERT` into `client_student_links`.
  - **New:** `INSERT INTO profile_graph (source_profile_id, target_profile_id, relationship_type, status) VALUES ([client_id], [student_id], 'GUARDIAN', 'ACTIVE')`
- **To store a "Social Link" (v4.4):**
  - **Replaces:** `INSERT` into `connections`.
  - **New (Request):** `INSERT INTO profile_graph (source_profile_id, target_profile_id, relationship_type, status) VALUES ([requester_id], [receiver_id], 'SOCIAL', 'PENDING')`
  - **New (Accept):** `UPDATE profile_graph SET status = 'ACTIVE' WHERE ...`
- **To store a "Booking Link" (v4.5):**
  - **Replaces:** An implied link in `bookings` and `review_sessions`.
  - **New (Created by trigger on** `review_sessions` **insertion):** `INSERT INTO profile_graph (source_profile_id, target_profile_id, relationship_type, status, metadata) VALUES ([client_id], [tutor_id], 'BOOKING', 'COMPLETED', '{"booking_id": "...", "student_id": "...", "review_session_id": "..."}')`

* * *

### 5.0 Low-Risk Migration Plan

We will follow a 5-step parallel migration plan to ensure a safe, testable transition.

- **Step 1: Create Feature Branch:**
  - Create a new branch: `feature/profile-graph-v4.6`.
- **Step 2: Build in Parallel:**
  - Create the new Supabase migration file (as defined in 4.0) to add the `profile_graph` table and its enums.
  - This leaves the existing `connections` table and its data completely untouched.
- **Step 3: Refactor Codebase:**
  - **Backend (**`apps/api`**):** Create a new `ProfileGraphService` to handle all link logic.
  - **Frontend (**`apps/web`**):** Refactor all API clients (e.g., `lib/api/network.ts`) and React Query hooks (`useConnectionsRealtime`) to read from and write to the new `profile_graph` table *instead of* the `connections` table.
  - **Onboarding (v5.0):** Implement the "Guardian Link" logic from `student-onboarding-solution-design-v5.0` to write to `profile_graph` *instead of* the (now-defunct) `client_student_links` table.
- **Step 4: Test:**
  - All existing unit and E2E tests for v4.4 (Network) and v4.5 (Reviews) must pass without modification, proving the new system is a successful replacement.
  - New unit tests must be written for the `ProfileGraphService` and the `GUARDIAN` link type.
- **Step 5: Backup & Data Migration:**
  - Before deployment, run a full database backup.
  - Execute a one-time data migration script (SQL or Typescript) to move all data from `connections` into `profile_graph` with `relationship_type = 'SOCIAL'`.
  - Once validated, a final migration will be created to `DROP TABLE public.connections`.

* * *

### 6.0 Key Implementation Context (for v5.0 Features)

For the AI dev team, these diagrams and file references (from the v5.0 spec) are critical for implementing the *next* epic (`student-onboarding-solution-design-v5.0`) on top of this new v4.6 foundation.

#### 6.1 The 3-Party Transaction (ASCII Diagram)

This diagram shows how a `booking` (our "Booking Link") connects all three parties and will be used to populate the `profile_graph` metadata.

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

#### 6.2 Student Signup & Onboarding Flow (13+)

This **Client-Led Invitation Flow** is the *only* supported method for creating a `student` account.

1. **Client (Parent) Initiates:** The logged-in Client (Parent) navigates to their dashboard and finds the new `<MyStudentsWidget />` (see 6.3).
2. **Client Invites:** The Client clicks "Add Student" and enters their student's email, checking a box: **"I confirm my child is 13 years of age or older."**
3. **Invite Sent:** The backend `POST /api/links/client-student` route (which will now write to `profile_graph`) sends a secure invitation email.
4. **Student (13+) Accepts:** The student clicks the invite link.
5. **Limited Account Creation:** The student is taken to a lightweight signup page (`/signup/invite?token=...`) to create a password.
6. **Automatic Linking:** On submit, the backend creates the `profiles` entry (role: `student`) and automatically inserts the `GUARDIAN` link into `profile_graph`.
7. **First-Time Login:** The student is redirected to their limited dashboard, which prompts them to connect their integrations (see 6.4).

#### 6.3 Client (Parent) UI References

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** Add a new nav link to `AppSidebar.tsx` for "My Students".
- **New Page:** `apps/web/src/app/(authenticated)/my-students/page.tsx`
- **New Component:** This page will contain `<StudentManagementCard />` to list students and invite new ones.
- **File:** `apps/web/src/app/(authenticated)/bookings/page.tsx` (and Booking Modal)
- **Change:** The booking form **must** be updated with a **required** `<Select>` field: **"Who is this booking for?"** populated with the Client's "Guardian Links."

#### 6.4 Student (New Role) UI References

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Change:** `AppSidebar.tsx` must be role-aware and HIDE "Listings," "Network," "Referrals," and "Financials" for the `student` role.
- **File:** `apps/web/src/app/account/settings/page.tsx`
- **Change:** Show the new `<IntegrationLinksCard />` when the user's role is `student`, allowing them to connect Google Classroom.

* * *

### 7.0 Impact Analysis

- `student-onboarding-solution-design-v5.0`: This v4.6 design **replaces the data model** of v5.0. The `client_student_links` table defined in that document will **not be built**. All other aspects of that SDD (Business Case, Signup Flow, Integration Endpoints) remain valid and will use `profile_graph` as their data target.
- **v4.4 Network (**`connections`**):** The `connections` table is **deprecated**. It will be removed in Step 5 of the migration plan.
- **v4.5 Reviews (**`review_sessions`**):** This is **unaffected**. The `review_sessions` table will continue to function as our review task manager. We will add a trigger to it that creates an additional "Booking Link" entry in `profile_graph` for analytics.