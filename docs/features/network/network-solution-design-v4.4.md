# network-solution-design-v4.4

network-solution-design-v4.4

This design builds directly upon the **Referral System v4.2-v4.3** (`REFERRAL-SYSTEM-V4.3-IMPLEMENTATION.md`) to create the viral growth loop you requested.

* * *

### **Solution Design: Network and Connections (v4.4)**

- **Version:** 4.4
- **Date:** 2025-11-07
- **Status:** For Implementation
- **Owner:** AI Analysis
- **Prerequisite:** Referral System v4.3 (Secure Codes & `connections` Table)

### 1.0 Executive Summary

This document details the architecture for the **Network and Connections (NC) feature (v4.4)**, a "LinkedIn-lite" professional networking system. This feature's primary business goal is to **create a powerful viral growth loop** by integrating a social networking tool with the v4.3 "First-to-Refer" lifetime commission model.

The networking feature provides the *tool* (e.g., "Invite by Email"), and the referral system provides the *financial incentive* (10% lifetime commission).

This solution will deliver:

1. A new, two-column **Network Hub** page (`/network`) for managing all connections, invitations, and suggestions.
2. A robust **Group Management** system for users to create private groups for their connections.
3. A **Bulk "Invite by Email"** feature that automatically embeds the user's v4.3 referral link to capture new signups.
4. Secure, scalable **throttling and limits** using Redis and database triggers.
5. A platform-wide, generic `audit_log` **table** for security and compliance.
6. User-facing **network statistic** components.

### 2.0 Architecture & Viral Loop Strategy

The architecture is **frontend-first**, with all business logic encapsulated in Next.js API Route Handlers. This leverages our existing stack: Vercel, Supabase (Postgres, Storage), and Redis.

#### 2.1 Technology Stack

- **Frontend:** Next.js (App Router), React, CSS Modules (as per `globals.css` and existing `*.module.css` files).
- **Backend:** Next.js API Routes (`apps/web/src/app/api/network/`).
- **Database:** Supabase Postgres. We will add three new tables and one scheduled function.
- **Limits & Caching:** Redis (from `.env.local` / `.ai/ARCHITECTURE.md`).
- **Logging:** A new generic `audit_log` table in Supabase.

#### 2.2 The "Networked Referral" Growth Loop (ASCII Diagram)

This diagram illustrates the primary viral loop created by integrating v4.4 and v4.3.

```
.--------------------.    (1. Invite)    .----------------------.
|   User (Jane) on   |------------------>|  Invite by Email API   |
|  /network UI/Page  |                   | (api/network/invite) |
'--------------------'                   '----------------------'
       ^                                            |
       |                                            | (2. Email Sent)
(6. Receives 10% Commission)                        | v
       |                               .----------------------------.
.--------------------.                   |  New User (John's Inbox)   |
| Payment RPC (v4.3) |                   | (Email w/ Jane's Ref Link) |
| (process_booking)  |                   '----------------------------'
'--------------------'                                |
       ^                                            | (3. Click & Signup)
       |                                            | v
(5. John books a session)              .--------------------------.
       |                               |   Referral Route (v4.3)  |
.--------------------.                   |   (/a/jAnE7kL)           |
|  New User (John)   |<------------------'--------------------------'
| (Now a Client)     |   (4. Cookie set & Profile Stamped)
'--------------------'    (referred_by_profile_id: [JANE'S ID])

```

* * *

### 3.0 Database Schema Design

The following SQL migration files shall be created in `apps/api/migrations/`.

#### 3.1 Migration 1: `039_create_network_groups.sql`

This migration creates the tables for group management (R-REF-F-NC-6, 7, 9) and modifies the existing `connections` table to support reminder emails (R-REF-F-NC-13).

```
SQL
```

```
-- 1. Create a table for user-defined connection groups
CREATE TABLE IF NOT EXISTS public.connection_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- R-REF-F-NC-9: Prevent duplicate group names per user
    CONSTRAINT unique_group_name_per_profile UNIQUE (profile_id, name)
);

-- 2. Create a join table to link connections to groups (many-to-many)
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,

    -- A connection can only be in a group once
    PRIMARY KEY (group_id, connection_id)
);

-- 3. Add RLS policies
ALTER TABLE public.connection_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connection groups"
    ON public.connection_groups
    FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can manage members of groups they own"
    ON public.group_members
    FOR ALL
    USING (
        (SELECT profile_id FROM public.connection_groups WHERE id = group_id) = auth.uid()
    );

-- 4. R-REF-F-NC-13: Add reminder tracking to existing connections table
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.connections.reminder_sent IS 'Tracks if a 30-day reminder has been sent for a pending request.';

```

#### 3.2 Migration 2: `040_create_audit_log_table.sql`

This creates a **generic, platform-wide** table for logging business-critical events for compliance and security (R-REF-F-NC-5, 8, 16).

```
SQL
```

```
-- Create a generic, platform-wide audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who did the action
    action_type TEXT NOT NULL, -- e.g., 'connection.removed', 'listing.created'
    module TEXT NOT NULL, -- e.g., 'Network', 'Listings'
    details JSONB, -- Rich context, e.g., '{"removed_user_id": "...", "group_name": "..."}'

    CONSTRAINT "audit_log_profile_id_fkey" FOREIGN KEY (profile_id)
        REFERENCES public.profiles (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_profile_id ON public.audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log(module);

-- RLS: No default access. Data must be inserted via service_role key from API.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.audit_log IS 'A generic, platform-wide log for critical business and security events.';

```

#### 3.3 Migration 3: `041_create_connection_limit_trigger.sql`

This implements the database-level trigger to enforce the 1,000 connection limit (R-REF-F-NC-2).

```
SQL
```

```
-- Function to check connection limits
CREATE OR REPLACE FUNCTION public.check_connection_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_connections INT;
    receiver_connections INT;
BEGIN
    -- Only check if the status is being set to 'accepted'
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        
        -- Check requester's limit
        SELECT COUNT(*)
        INTO requester_connections
        FROM public.connections
        WHERE (requester_id = NEW.requester_id OR receiver_id = NEW.requester_id)
        AND status = 'accepted';

        IF requester_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.requester_id;
        END IF;

        -- Check receiver's limit
        SELECT COUNT(*)
        INTO receiver_connections
        FROM public.connections
        WHERE (requester_id = NEW.receiver_id OR receiver_id = NEW.receiver_id)
        AND status = 'accepted';

        IF receiver_connections >= 1000 THEN
            RAISE EXCEPTION 'Connection limit (1000) reached for user %', NEW.receiver_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_connection_accepted_check_limit ON public.connections;

-- Create the trigger
CREATE TRIGGER on_connection_accepted_check_limit
    AFTER INSERT OR UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.check_connection_limit();

COMMENT ON TRIGGER on_connection_accepted_check_limit ON public.connections IS 'Enforces the 1,000 connection limit per user when a connection is accepted.';

```

* * *

### 4.0 Backend & API Design

All new API routes will be created as Route Handlers within `apps/web/src/app/api/network/`.

#### 4.1 Throttling & Limits (Redis) (R-REF-F-NC-4)

All connection-sending APIs (`/request`, `/invite-by-email`) **must** be wrapped in this Redis logic.

```
TypeScript
```

```
// Example: apps/web/src/app/api/network/request/route.ts
import { createClient } from 'redis';
// ...
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
const countKey = `conn_req_count:${userId}`;
const currentCount = await redis.incr(countKey);
if (currentCount === 1) {
  await redis.expire(countKey, 60 * 60 * 24); // 24 hours
}
await redis.disconnect();
if (currentCount > 100) {
  return NextResponse.json({ error: 'Daily connection limit reached' }, { status: 429 });
}
// ... proceed with logic

```

#### 4.2 New API Endpoints

- `POST /api/network/request`
  - **Purpose:** Send connection requests to *existing* platform users.
  - **Body:** `{ "receiver_ids": [UUID, ...] }` (Max 10)
  - **Logic:** (Protected Route)
    1. Check Redis daily limit (R-REF-F-NC-4).
    2. `INSERT` into `connections` table with `status: 'pending'` for each ID.
    3. Trigger email notifications to receivers (R-REF-F-NC-12).
- `POST /api/network/invite-by-email`
  - **Purpose:** The viral loop entry point (R-REF-F-NC-3).
  - **Body:** `{ "emails": ["user1@example.com", "user2@gmail.com", ...] }` (Max 10)
  - **Logic:** (Protected Route)
    1. Get `user` (and their `referral_code`) from Supabase session.
    2. Check Redis daily limit (R-REF-F-NC-4).
    3. Find existing users: `supabase.from('profiles').select('id, email').in('email', emails)`.
    4. **For existing users:** Call `.../request` logic with their IDs.
    5. **For new users:** Send an invitation email (e.g., via Resend) that includes the user's v4.3 referral link: `https://tutorwise.io/a/${user.referral_code}?redirect=/signup`.
- `POST /api/network/respond`
  - **Purpose:** Accept or reject a pending request (R-REF-F-NC-1).
  - **Body:** `{ "connection_id": UUID, "status": "accepted" | "rejected" }`
  - **Logic:**
    1. `UPDATE connections SET status = newStatus WHERE id = connection_id AND receiver_id = auth.uid()`.
    2. (On "accepted") The `041_...` trigger will fire, checking the 1,000-connection limit (R-REF-F-NC-2).
    3. Insert into `audit_log` (R-REF-F-NC-16).
    4. Send email notification to original requester (R-REF-F-NC-12).
- `DELETE /api/network/remove`
  - **Purpose:** Remove an existing connection (R-REF-F-NC-5).
  - **Body:** `{ "connection_id": UUID }`
  - **Logic:**
    1. `DELETE FROM connections WHERE id = connection_id AND (requester_id = auth.uid() OR receiver_id = auth.uid())`.
    2. Insert into `audit_log` with `action_type: 'connection.removed'`.
- `GET /api/network/my-stats`
  - **Purpose:** Power the user-facing stats widget (R-REF-F-NC-18).
  - **Logic:** Returns `{ total_connections, pending_sent, pending_received }` for the `auth.uid()`.
- **CRUD Endpoints for Groups (R-REF-F-NC-6, 7, 8)**
  - `POST /api/network/groups` (Body: `{ name: string }`)
  - `PUT /api/network/groups/[id]` (Body: `{ name: string }`)
  - `DELETE /api/network/groups/[id]`
  - `POST /api/network/group-members` (Body: `{ group_id: UUID, connection_id: UUID }`)
  - `DELETE /api/network/group-members` (Body: `{ group_id: UUID, connection_id: UUID }`)
  - All actions must be logged to the `audit_log` table.

#### 4.3 Scheduled Notification (R-REF-F-NC-13)

A new Supabase scheduled function will be created.

- **Function:** `supabase/functions/send-pending-reminders/index.ts`
- **Cron:** `0 1 * * *` (Once per day at 1 AM UTC)
- **Logic:**
  1. `SELECT id, receiver_id FROM public.connections WHERE status = 'pending' AND created_at < (NOW() - '30 days'::interval) AND reminder_sent = false;`
  2. Loop through results, send a reminder email to each `receiver_id`, and `UPDATE` the row to `reminder_sent = true`.

* * *

### 5.0 Frontend & UI/UX Design

This section specifies the new UI layout, which is a **significant upgrade** from the simple referral widget. We will create a modern, two-column dashboard hub.

#### 5.1 Main Page: `apps/web/src/app/(authenticated)/network/page.tsx`

This file will be updated from its placeholder state to be the main server component for the layout.

- **ASCII Layout (Desktop):**
```
                              <-- apps/web/src/app/(authenticated)/network/page.tsx -->
+-------------------------------------------------------------------------------------------------+
| [My Network]                                                        [Export CSV] [Invite Friends] |  <-- PageHeader
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
| [Main Column (70%)]                                               | [Sidebar (30%)]             |
|                                                                   |                             |
|  +-------------------------------------------------------------+  |  +-----------------------+  |
|  | [Tabs: My Connections(24) | Invitations(3) | Suggestions ]  |  |  | [My Network Stats]    |  |
|  +-------------------------------------------------------------+  |  | +-------+ +------+ +--+ |
|  | [Search...] [Groups v] [Sort v]                             |  |  | | 24    | | 3    | | 5| |
|  +-------------------------------------------------------------+  |  | | Total | | Sent | |Rx| |
|  |                                                             |  |  | +-------+ +------+ +--+ |
|  | +---------------------------------------------------------+ |  |  +-----------------------+  |
|  | | [Avatar] Jane Doe [StatusBadge: Tutor]                  | |  |                             |
|  | |  Physics Tutor at Quantum...    [Groups v] [Remove]     | |  |  +-----------------------+  |
|  | +---------------------------------------------------------+ |  |  | [Invite by Email]     |  |
|  | | [Avatar] Bob Smith [StatusBadge: Agent]                 | |  |  | [user1@..., user2@...] |  |
|  | |  Owner at Bob's Store           [Groups v] [Remove]     | |  |  | [ Send Invites ]      |  |
|  | +---------------------------------------------------------+ |  |  +-----------------------+  |
|  | ...                                                         |  |                             |
+-------------------------------------------------------------------------------------------------+
```
- **File:** `apps/web/src/app/(authenticated)/network/page.tsx`
```
TypeScript
```
```
// This file acts as the Server Component layout container
import { createClient } from '@/utils/supabase/server';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { NetworkPageClient } from '@/app/components/network/NetworkPageClient';
import styles from './page.module.css'; // New CSS Module
export default async function NetworkPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Pre-fetch initial data (e.g., connection count, first page of connections)
  // This improves initial page load speed.
  const { data: connections, count } = await supabase
    .from('connections')
    .select('*, profile:receiver_id(*), profile_requester:requester_id(*)', { count: 'exact' })
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .limit(20);
  return (
    <div className={styles.pageWrapper}>
      <PageHeader 
        title="My Network" 
        actionButton={{ href: '/api/network/export', text: 'Export CSV' }}
      />
      <NetworkPageClient 
        initialConnections={connections || []}
        initialCount={count || 0}
        user={user}
      />
    </div>
  );
}
```
- **File:** `apps/web/src/app/(authenticated)/network/page.module.css`
```
CSS
```
```
/* This defines the main responsive layout for the page */
.pageWrapper {
  padding: var(--space-3); /* 24px */
}
.layoutContainer {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4); /* 32px */
}
.mainColumn {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.sidebarColumn {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
/* On desktop, switch to a 2-column layout */
@media (min-width: 1024px) {
  .pageWrapper {
    padding: var(--space-4); /* 32px */
  }
  .layoutContainer {
    /* Use CSS Grid for robust column layout */
    grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr);
  }
}
```

#### 5.2 New Component: `apps/web/src/app/components/network/NetworkPageClient.tsx`

This **Client Component** will manage all state, tabs, and interactions.

```
TypeScript
```

```
'use client';
import { useState } from 'react';
import { Tabs, Tab } from '@/app/components/ui/Tabs';
import { ConnectionList } from '@/app/components/network/ConnectionList';
import { InvitationList } from '@/app/components/network/InvitationList';
import { SuggestionList } from '@/app/components/network/SuggestionList';
import { MyNetworkStats } from '@/app/components/network/MyNetworkStats';
import { InviteByEmail } from '@/app/components/network/InviteByEmail';
import styles from '@/app/(authenticated)/network/page.module.css';
// ... other imports

export function NetworkPageClient({ initialConnections, initialCount, user }) {
  // State for tabs, search, filters, etc.
  const [invitationCount, setInvitationCount] = useState(0); // Will be fetched

  return (
    <div className={styles.layoutContainer}>
      <main className={styles.mainColumn}>
        <Tabs>
          <Tab title={`My Connections (${initialCount || 0})`}>
            <ConnectionList initialConnections={initialConnections} />
          </Tab>
          <Tab title={`Invitations (${invitationCount})`}>
            <InvitationList onCountChange={setInvitationCount} />
          </Tab>
          <Tab title="Suggestions">
            <SuggestionList />
          </Tab>
        </Tabs>
      </main>
      <aside className={styles.sidebarColumn}>
        <MyNetworkStats />
        <InviteByEmail user={user} />
      </aside>
    </div>
  );
}

```

#### 5.3 New Component: `apps/web/src/app/components/network/MyNetworkStats.tsx`

- **Purpose:** (R-REF-F-NC-18) Displays user's personal network stats.
- **Implementation:** Reuses existing `StatCard` and `StatGrid` components from `apps/web/src/app/components/ui/reports/`.
- **Data:** Fetches from `GET /api/network/my-stats` on the client.

#### 5.4 New Component: `apps/web/src/app/components/network/InviteByEmail.tsx`

- **Purpose:** (R-REF-F-NC-3) The "Invite by Email" form.
- **Implementation:** Reuses `Card`, `FormSection`, `Textarea`, and `Button` from `apps/web/src/app/components/ui/`.
- **Logic:**
  1. Uses a `Textarea` for email input (up to 10).
  2. Provides client-side validation for email format and count.
  3. `onSubmit`, it `POST`s `{ emails: [...] }` to `api/network/invite-by-email`.
  4. The API handles the referral link integration automatically.

#### 5.5 New Component: `apps/web/src/app/components/network/ConnectionCard.tsx`

This is the **core UI component** for this feature. It must be highly polished, responsive, and follow our design system.

- **File:** `apps/web/src/app/components/network/ConnectionCard.module.css`
```
CSS
```
```
/*
  DESIGN SYSTEM COMPLIANCE:
  - Spacing: var(--space-2) (8px), var(--space-3) (16px)
  - Colors: var(--color-text-primary), var(--color-text-secondary), var(--color-border)
  - Radius: var(--border-radius-full) (avatar), var(--border-radius-sm) (buttons)
  - Typography: 600 weight for names, 0.9rem for secondary text
*/
.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.card:last-child {
  border-bottom: none;
}
.profileInfo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  /* Allow this section to shrink */
  min-width: 0;
}
.avatar {
  width: 50px;
  height: 50px;
  border-radius: var(--border-radius-full);
  object-fit: cover;
  flex-shrink: 0;
}
.textInfo {
  display: flex;
  flex-direction: column;
  /* Prevent long text from breaking layout */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.headline {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
/* MOBILE RESPONSIVENESS */
@media (max-width: 640px) {
  .card {
    flex-direction: column;
    align-items: flex-start;
  }
  .actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
}
```
- **File:** `apps/web/src/app/components/network/ConnectionCard.tsx`
```
TypeScript
```
```
'use client';
import Image from 'next/image';
import { Button } from '@/app/components/ui/Button';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import styles from './ConnectionCard.module.css';
type ConnectionCardProps = {
  profile: {
    id: string;
    full_name: string;
    headline: string;
    avatar_url: string;
    primary_role: 'tutor' | 'client' | 'agent';
  };
  variant: 'connection' | 'invitation' | 'suggestion';
  connectionId?: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onRemove?: (id: string) => void;
  onConnect?: (id: string) => void;
};
export function ConnectionCard({
  profile,
  variant,
  connectionId,
  // ...handlers
}: ConnectionCardProps) {
  const { full_name, headline, avatar_url, primary_role } = profile;
  return (
    <div className={styles.card}>
      <div className={styles.profileInfo}>
        <Image
          src={avatar_url || '/default-avatar.png'} // Add a default avatar
          alt={`${full_name}'s profile picture`}
          width={50}
          height={50}
          className={styles.avatar}
        />
        <div className={styles.textInfo}>
          <span className={styles.name}>{full_name}</span>
          <span className={styles.headline}>{headline || 'No headline'}</span>
        </div>
        <StatusBadge role={primary_role} />
      </div>
      <div className={styles.actions}>
        {variant === 'invitation' && (
          <>
            <Button variant="secondary">Reject</Button>
            <Button variant="primary">Accept</Button>
          </>
        )}
        {variant === 'connection' && (
          <>
            {/* <GroupDropdownMenu /> */}
            <Button variant="tertiary">Remove</Button>
          </>
        )}
        {variant === 'suggestion' && (
          <Button variant="primary">Connect</Button>
        )}
      </div>
    </div>
  );
}
```

* * *

### 6.0 Requirement Traceability Matrix

|     |     |
| --- | --- |
| **Requirement** | **Design Solution** |
| R-REF-F-NC-1 | `connections` table (from v4.3) + `POST /api/network/respond`. |
| R-REF-F-NC-2 | `041_create_connection_limit_trigger.sql` database trigger. |
| R-REF-F-NC-3 | `InviteByEmail.tsx` UI + `POST /api/network/invite-by-email` API. |
| R-REF-F-NC-4 | Redis `conn_req_count:{user_id}` key, checked in API routes. |
| R-REF-F-NC-5 | `DELETE /api/network/remove` API + `040_create_audit_log_table.sql`. |
| R-REF-F-NC-6 | `039_create_network_groups.sql` (10-group limit enforced in API). |
| R-REF-F-NC-7 | `connection_groups.name` column. |
| R-REF-F-NC-8 | `PUT/DELETE /api/network/groups/[id]` + `040_create_audit_log_table.sql`. |
| R-REF-F-NC-9 | `UNIQUE(profile_id, name)` constraint in `039_...` migration. |
| R-REF-F-NC-12 | Email notifications triggered by `POST /api/network/respond`. |
| R-REF-F-NC-13 | `supabase/functions/send-pending-reminders` (cron) + `connections.reminder_sent` column. |
| R-REF-F-NC-14 | `SuggestionList.tsx` component (query by `profiles.roles`). |
| R-REF-F-NC-15 | `SuggestionList.tsx` component (query by job interests). |
| R-REF-F-NC-16 | `040_create_audit_log_table.sql` (generic platform table). |
| R-REF-F-NC-17 | `GET /api/network/export` API route (returns CSV). |
| R-REF-F-NC-18 | `MyNetworkStats.tsx` component powered by `GET /api/network/my-stats`. |