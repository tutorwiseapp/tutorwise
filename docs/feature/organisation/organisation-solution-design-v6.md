# organisation-solution-design-v6

### **Solution Design: Organisation & Agency Management (v6)**

- **Document Name:** `organisation-solution-design-v6.md`
- **Version:** 6.0 (Integrated System Flow)
- **Date:** 2025-11-20
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Dependencies:** v4.4 (Network Groups), v4.6 (Profile Graph), v5.0 (Student Invites)

* * *

### 1.0 Executive Summary

This document details the architecture for the **Organisation Hub** (`/organisation`).

The Strategic Shift:

We are moving beyond the "Solo Tutor" model to support Multi-User Businesses. By introducing the "Organisation" entity, we support three key personas with a single feature:

1. **Tutoring Agencies:** An Agent managing a roster of Tutors.
2. **Schools:** A Headteacher managing Teachers and Students.
3. **Enterprises:** L&D departments managing Trainers and Employees.

The Solution:

We will not create a complex new "Organisation User Type". Instead, we will upgrade the existing Network Groups system (v4.4) to support "Business Identities." An Organisation is simply a special type of Group that owns branding, invites members, and aggregates data.

* * *

### 2.0 Architecture & Data Model

#### 2.1 The "Virtual Entity" Model

An Organisation is a data container owned by a User (`profile_id`). It is not a separate login.

**Why this wins:**

- **Reuse:** Leverages the `network_groups` table (v4.4) and `wiselist_invitations` (v5.0).
- **Flexibility:** A user can own multiple organisations (e.g., "Michael's Math Agency" AND "Coding Bootcamp").

#### 2.2 Entity Relationship Diagram (ASCII)

This diagram shows how the Organisation acts as the "Hub" connecting Agents, Tutors, and Students.

```
Code snippet
```

```
graph TD
    Agent[User: Agent] -->|Owns| Org[Network Group: Organisation]
    
    Org -->|Contains| Member1[Member: Tutor A]
    Org -->|Contains| Member2[Member: Tutor B]
    
    Member1 -->|Teaches| Student1[Student X]
    Member1 -->|Teaches| Student2[Student Y]
    
    %% The 'Clients' Tab Logic
    Org -.->|Aggregates| Student1
    Org -.->|Aggregates| Student2

```

#### 2.3 Profile Graph Integration

We leverage the **v4.6 Profile Graph** to map the relationships.

- **Tutor-Student:** Stored in `profile_graph` (`type='GUARDIAN'` or `'SOCIAL'`).
- **Agency-Tutor:** Stored in `network_group_members`.
- **Agency-Student:** **Derived Relationship.** The Agency "sees" a student if *any* of its Tutors has a link to that student in the `profile_graph`.

* * *

### 3.0 Database Schema Design

We upgrade the existing tables rather than creating new ones.

#### 3.1 Migration: `091_upgrade_network_groups.sql`

```
SQL
```

```
-- Upgrade network_groups to support business identities
ALTER TABLE public.network_groups
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('personal', 'organisation')) DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE, -- e.g. 'michael-tutoring'
ADD COLUMN IF NOT EXISTS avatar_url TEXT, -- Organisation Logo
ADD COLUMN IF NOT EXISTS description TEXT, -- Public Bio
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'; -- For future config

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_network_groups_type ON public.network_groups(type);
CREATE INDEX IF NOT EXISTS idx_network_groups_slug ON public.network_groups(slug);

-- RLS: Allow public read access for Organisations (for public profile pages)
CREATE POLICY "Public can view organisations"
  ON public.network_groups FOR SELECT
  USING (type = 'organisation');

```

* * *

### 4.0 Frontend & UI Design

This feature is the **First Full Implementation** of the standardized Hub Architecture.

#### 4.1 Page Layout (`/organisation`)

- **Route:** `apps/web/src/app/(authenticated)/organisation/page.tsx`
- **Layout:** Standard 2-Column Hub (Main + Context Sidebar).

**UI Diagram (ASCII):**

```
+-----------------------------------------------------------------------+
|  [PageHeader: My Organisation]          [Settings] [View Public Page] |
+-----------------------------------------------------------------------+
|  Main Column (70%)                    |  Context Sidebar (30%)        |
|                                       |                               |
|  +---------------------------------+  | +---------------------------+ |
|  | [Tabs: Team | Clients | Info ]  |  | | [OrganisationStatsWidget] | |
|  +---------------------------------+  | |                           | |
|  |                                 |  | |  Team Size             12 | |
|  | [Filter: Search Tutors...]      |  | |  Total Clients         45 | |
|  |                                 |  | |  Monthly Rev    £3,450.00 | |
|  | +-----------------------------+ |  | +---------------------------+ |
|  | | [HubRowCard: Tutor]         | |  |                               |
|  | | [Img] Michael Quan          | |  | +---------------------------+ |
|  | |       Maths Tutor           | |  | | [OrganisationInviteWidget]| |
|  | |       5 Active Students     | |  | |                           | |
|  | |       [ Message ] [Remove ] | |  | |  [ Email Address...     ] | |
|  | +-----------------------------+ |  | |  [ Send Invite          ] | |
|  |                                 |  | +---------------------------+ |
|  | +-----------------------------+ |  |                               |
|  | | [HubRowCard: Tutor]         | |  |                               |
|  | | ...                         | |  |                               |
+--+---------------------------------+--+-------------------------------+

```

#### 4.2 Tab Strategy

1. **Team (Default):**
  - **Content:** List of Tutors (`network_group_members`).
  - **Component:** `HubRowCard` (Variant: `agency-member`).
  - **Actions:** Message, Remove from Organisation.
2. **Clients:**
  - **Content:** List of Students linked to the Team's Tutors.
  - **Logic:** Query `profile_graph` for all `target_profile_id` where `source_profile_id` IN (My\_Tutor\_IDs).
  - **Value:** Gives the Agent visibility into the "Revenue Source."
3. **Info (Settings):**
  - **Content:** Edit Form (Name, Slug, Logo, Description).
  - **Component:** Reused `PersonalInfoForm` logic.

* * *

### 5.0 System Integration & Process Flow

#### 5.1 Integrated Sequence Diagram

This diagram illustrates how the **Organisation Hub** triggers and consumes data from all other platform systems.

```
Code snippet
```

```
sequenceDiagram
    autonumber
    
    box "Organisation Hub" #e6f0f0
        participant Agent as Agent (Owner)
        participant UI as Organisation UI
    end
    
    box "Core Systems" #f9f9f9
        participant API as /api/organisation
        participant DB as Database
        participant Invite as Wiselist Invitations
    end

    box "Integrated Modules" #ffe6e6
        participant Net as Network (Groups)
        participant List as Listings
        participant Book as Bookings
        participant Stu as My Students
    end

    %% 1. INVITATION FLOW (Wiselists Integration)
    Note over Agent, Invite: 1. Invitation Phase
    Agent->>UI: Invite Tutor (email)
    UI->>API: POST /invite
    API->>Invite: INSERT (type='organisation')
    Invite-->>Agent: Email Sent

    %% 2. ACCEPTANCE (Network Integration)
    Note over Tutor, Net: 2. Acceptance Phase
    participant Tutor as Tutor (Invitee)
    Tutor->>API: Accepts Invite
    API->>Net: INSERT into network_group_members
    Net->>DB: Create 'SOCIAL' link in profile_graph

    %% 3. DATA AGGREGATION (Listings & Students Integration)
    Note over Agent, Stu: 3. Data Aggregation Phase (Dashboard View)
    Agent->>UI: View Organisation Dashboard
    
    par Fetch Team Listings
        UI->>List: SELECT * FROM listings WHERE profile_id IN (Team_IDs)
        List-->>UI: Return Aggregated Services
    and Fetch Team Clients
        UI->>Stu: SELECT target_id FROM profile_graph WHERE source_id IN (Team_IDs) AND type='GUARDIAN'
        Stu-->>UI: Return Aggregated Student List
    end

    %% 4. REVENUE (Bookings Integration)
    Note over Student, Book: 4. Revenue Phase
    participant Student as Student (Client)
    Student->>Book: Books Session with Tutor
    Book->>DB: Process Payment
    DB->>Agent: Calculate 10% Commission (Referral Logic)
    DB-->>UI: Update 'Monthly Revenue' Stat

```

#### 5.2 Data Fetching Strategy (Performance)

- **Problem:** Calculating "Total Clients" for an agency with 50 tutors is expensive.
- **Solution:** **Lazy Loading.**
  - The "Overview" stats are fetched via a dedicated RPC function `get_organisation_stats(group_id)`.
  - The "Clients" tab data is only fetched when the user clicks the tab.

* * *

### 6.0 Implementation Plan (File References)

#### Phase 1: Backend Layer

- `apps/api/migrations/091_upgrade_network_groups.sql`: Schema changes.
- `apps/web/src/lib/api/organisation.ts`: Fetch functions (`getOrganisation`, `getMembers`, `inviteMember`).
- `apps/web/src/app/api/organisation/invite/route.ts`: API Route reuse of v5.0 logic.

#### Phase 2: Sidebar Widgets (Context Sidebar v3.2)

- `apps/web/src/app/components/organisation/OrganisationStatsWidget.tsx`: Uses `SidebarStatsWidget`.
- `apps/web/src/app/components/organisation/OrganisationInviteWidget.tsx`: Uses `SidebarComplexWidget` + Input.

#### Phase 3: Main Content (Hub Row Card v1)

- `apps/web/src/app/(authenticated)/organisation/page.tsx`: The Hub Container.
- `apps/web/src/app/components/organisation/MemberRow.tsx`: A wrapper around `HubRowCard` that formats the Tutor data correctly.

* * *

### 7.0 Requirement Traceability

|     |     |     |
| --- | --- | --- |
| **Requirement** | **Source Design** | **Implementation in v6.1** |
| **Agency Management** | User Request | `/organisation` Hub Route |
| **Invite Logic** | v5.0 (Student) | Reused `wiselist_invitations` table |
| **Grouping Logic** | v4.4 (Network) | Reused `network_groups` table |
| **UI Consistency** | v3.2 (Sidebar) | `OrganisationStatsWidget` (No Icons) |
| **List UI** | v1 (HubRow) | `HubRowCard` implementation |
| **Revenue Visibility** | Business Goal | "Clients" Tab (Derived Data) |