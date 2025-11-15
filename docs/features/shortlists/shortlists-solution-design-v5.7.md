# shortlists-solution-design-v5.7

You've solved the core problem. The user's *action* is simple ("Save" or "Share"), and our architecture will intelligently handle the *intent* in the background.

- **"Save"** is the **Planning** tool (for Clients) and the **CaaS (v5.5)** data source.
- **"Share"** is the **Growth** tool. It will be smart enough to handle all use cases:
  1. **External Referral (v4.3):** If a user shares with a *new email*, we use their `.../a/[referral_id]` link.
  2. **Collaboration (v4.6):** If a user shares with an *existing connection*, we link them as a collaborator and strengthen the `profile_graph`.
  3. **In-Network Sale (v4.9):** If a user shares their *public Shortlist link* (`.../s/[slug]`), we use the `booking_referrer_id` to attribute the sale and pay them a commission.

This is the final, unified design. I have updated the SDD to reflect this "Save & Share" model and integrated all our optimizations.

* * *

### **Solution Design: Collaborative Shortlists (v5.7)**

- **Version:** 5.7 (Optimized for "Save & Share")
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites:**
  - `referral-system-solution-design-v4.3` (Provides external referral route)
  - `profile-graph-solution-design-v4.6` (Provides `profile_graph` for social links)
  - `payments-solution-design-v4.9` (Provides payment/commission logic)
  - `api-solution-design-v5.1` (Provides API patterns)
  - `caas-solution-design-v5.5` (Provides CaaS engine)

* * *

### 1.0 Executive Summary

This document outlines the architecture for the **Collaborative Shortlists** feature. This system is a core growth engine, framed to the user as a simple **"Save & Share"** tool.

It replaces "favorites" with an "Airbnb-style" planning tool that allows users to create named Shortlists (e.g., "A-Level Maths") and save items (Tutor Profiles, Listings) to them.

The innovation lies in its deep integration with our existing systems, creating four interconnected loops from two simple user actions:

1. **"Save" (Planning & CaaS):** A Client/Student saves a tutor for planning. This action feeds the **CaaS (v5.5)** "Platform Trust" metric, improving marketplace ranking.
2. **"Share" (Growth & Attribution):** This single action powers our entire viral and sales ecosystem:
  - **External Growth (v4.3):** Inviting a *new user* (e.g., a spouse) via email automatically uses the inviter's personal referral link.
  - **Network Growth (v4.6):** A successful external invite automatically creates a `SOCIAL` link in the `profile_graph`.
  - **In-Network Sales (v4.9):** A Tutor/Agent sharing their *public Shortlist link* (`.../s/[slug]`) attributes any resulting bookings from *existing users*, enabling commission payouts.

* * *

### 2.0 Database Implementation

We will add three new tables and modify the `bookings` table.

#### 2.1 New Table: `shortlists`

Stores the "folders" or "collections" created by a user. **Migration:** `apps/api/migrations/070_create_shortlists_table.sql`

```
SQL
```

```
CREATE TYPE collection_visibility AS ENUM ('private', 'public');

CREATE TABLE public.shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 'private' for Client/Student planning, 'public' for Tutor/Agent sharing
  visibility collection_visibility NOT NULL DEFAULT 'private',
  
  -- Public-facing slug for shareable links (e.g., /s/top-london-tutors)
  slug TEXT UNIQUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_list_name_per_user UNIQUE (profile_id, name)
);

ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own shortlists" ON public.shortlists FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public shortlists are read-only" ON public.shortlists FOR SELECT USING (visibility = 'public');
COMMENT ON TABLE public.shortlists IS 'v5.7: A user-created collection (Shortlist) of tutors or listings.';

```

#### 2.2 New Table: `shortlist_items`

This polymorphic table stores the items (Profiles or Listings) inside each shortlist. **Migration:** `apps/api/migrations/071_create_shortlist_items_table.sql`

```
SQL
```

```
CREATE TABLE public.shortlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id UUID NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
  
  -- Polymorphic link: Can save a Profile OR a Listing
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- The tutor profile saved
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE, -- The service listing saved
  
  -- The user's personal note for this item (e.g., "Recommended by Sarah")
  notes TEXT,
  
  added_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_item_in_list UNIQUE (shortlist_id, profile_id, listing_id),
  CONSTRAINT check_item_has_target CHECK (profile_id IS NOT NULL OR listing_id IS NOT NULL)
);
ALTER TABLE public.shortlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage items in their own shortlists" ON public.shortlist_items FOR ALL USING (auth.uid() = added_by_profile_id);
COMMENT ON TABLE public.shortlist_items IS 'v5.7: An item (tutor or listing) saved to a shortlist.';

```

#### 2.3 New Table: `shortlist_collaborators`

This table links multiple users to a single shortlist for collaboration. **Migration:** `apps/api/migrations/072_create_shortlist_collaborators_table.sql`

```
SQL
```

```
CREATE TYPE shortlist_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE public.shortlist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id UUID NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role shortlist_role NOT NULL DEFAULT 'EDITOR',
  
  -- Tracks who sent the invite for the referral/network graph
  invited_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_collaborator_in_list UNIQUE (shortlist_id, profile_id)
);
ALTER TABLE public.shortlist_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage collaborators on lists they own" ON public.shortlist_collaborators FOR ALL USING (auth.uid() IN (SELECT profile_id FROM shortlists WHERE id = shortlist_id));
CREATE POLICY "Users can see/manage their own invitations" ON public.shortlist_collaborators FOR ALL USING (auth.uid() = profile_id);
COMMENT ON TABLE public.shortlist_collaborators IS 'v5.7: Users who have access to a specific shortlist.';

```

#### 2.4 Update Table: `bookings`

This new column is the lynchpin for the **in-network sales attribution** loop. **Migration:** `apps/api/migrations/073_add_booking_referrer_id.sql`

```
SQL
```

```
ALTER TABLE public.bookings
ADD COLUMN booking_referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.booking_referrer_id IS 
'v5.7: Tracks if this booking was initiated from a shared Shortlist (e.g., /s/[slug]).';

```

* * *

### 3.0 Backend & Integration Design

This feature integrates all four of our core platform pillars.

#### 3.1 API Endpoints (Pattern 1 & 3)

We will implement a new API group (`/api/shortlists/*`) following the `api-solution-design-v5.1` patterns.

- `GET /api/shortlists`: Get all shortlists the user owns or collaborates on.
- `POST /api/shortlists`: Create a new shortlist (e.g., `{ name, visibility, slug }`).
- `POST /api/shortlists/items`: Add an item (e.g., `{ shortlist_id, profile_id }`).
- `POST /api/shortlists/[id]/collaborators`: **The External Growth Loop (v4.3)**
  - **Payload:** `{ email: string }`
  - **Logic:**
    1. Check if a user exists with this email.
    2. **If user is external:**
      - Fetch the inviter's `referral_code` from the `profiles` table.
      - Generate a contextual link: `https://tutorwise.com/a/[referral_code]?redirect=/shortlists/[id]`
      - Send an invite email (via Resend) with this link.
    3. **If user is internal:**
      - Add them to `shortlist_collaborators` directly and send an in-app notification.

#### 3.2 Middleware & Attribution (The "In-Network" Loop)

This logic handles the `Tutor A` -> `Tutor B` use case.

- **New Route:** `GET /s/[slug]` (e.g., `/s/tutor-a-recs`)
- **File:** `apps/web/src/middleware.ts`
- **Logic:**
  1. Check for a path matching `/s/[slug]`.
  2. If found, fetch the `shortlist` and its owner's `profile_id`.
  3. Check if the user is logged in.
  4. **If Logged In:** Set a session storage item: `sessionStorage.setItem('shortlist_referrer_id', '[shortlist_owner_profile_id]')`. This tags the session for attribution.
  5. **If Logged Out:** This is a new user. Get the shortlist owner's `referral_code` and set the v4.3 referral cookie (`.../a/[code]`).

#### 3.3 CaaS (v5.5) Integration

This provides a new, high-intent data signal to the CaaS Engine.

- **Trigger:** A database trigger `on insert into public.shortlist_items` will add the item's `profile_id` to the `caas_recalculation_queue`.
- **Logic:** The `TutorCaaSStrategy` will be modified as proposed:
  - Performance & Quality: `30%` -> `20%`
  - Network & Referrals: `20%` -> `30%`
- **New Metric:** The 30-point "Network" bucket will now include a 10-point "Platform Trust" score derived from `COUNT(shortlist_items.id)`.

#### 3.4 Network Graph (v4.6) Integration

This automates the growth of our social graph.

- **Trigger:** The `handle_new_user` function will be modified.
- **Logic:** When a new user signs up *after being invited to a shortlist* (via the v4.3 flow), we will automatically create a `SOCIAL` link in the `profile_graph` (v4.6) between the inviter and the new user.

#### 3.5 Payment (v4.9) Integration

This pays our users for in-network sales.

- **Checkout API:** The `POST /api/stripe/create-booking-checkout` route will be modified to check `sessionStorage` for `shortlist_referrer_id` and save it to the `bookings.booking_referrer_id` column.
- **Webhook API:** The `POST /api/webhooks/stripe` route will be modified.
  - On a successful payment, it will check if `booking_referrer_id` exists.
  - If it exists, it will execute the commission logic from v4.9, creating a `CREDIT` transaction for the `booking_referrer_id`'s wallet.

* * *

### 4.0 Frontend Implementation

We will create two clear, separate user experiences.

#### 4.1 Feature 1: "Refer & Earn" (External Acquisition)

- **UI:** This is the existing `/referrals` hub.
- **Change:** **No change.** This feature is simple, works, and should not be complicated. Its one job is to give users their `.../a/[code]` link for *new signups*.

#### 4.2 Feature 2: "Shortlists" (Internal Planning & Sharing)

- **New "Save" Button:**
  - A "Save" (Bookmark/Heart) icon will be added to `ListingCard.tsx` and `ProfileHeroSection.tsx`.
  - **We will REMOVE the old "Refer" button from these components.**
  - Clicking "Save" opens a `<Modal>`: "Add to Shortlist...". The modal shows their lists and a "+ Create New List" input.
- **New "Shortlists" Hub:**
  - A new "Shortlists" link will be added to the main `AppSidebar.tsx`.
  - This links to a new page: `apps/web/src/app/(authenticated)/shortlists/page.tsx`.
  - This page is the hub for all lists:
    - **Private Lists (for Clients):** Shows items, notes, and a `[+ Invite Collaborator]` button (which uses the v4.3 *external* referral flow).
    - **Public Lists (for Tutors/Agents):** Shows items and provides the public share link: `.../s/[slug]`. This is the *in-network* sales tool.