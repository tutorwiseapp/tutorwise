# wiselists-solution-design-v5.7

Here is the comprehensive, updated Solution Design Document for the Collaborative Wiselists feature, incorporating all the details, UI layouts, and optimizations we have discussed.

* * *

### **Solution Design: Collaborative Wiselists (v5.7)**

- **Version:** 5.7 (Consolidated & Refined)
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites:**
  - `referral-system-solution-design-v4.3`
  - `profile-graph-solution-design-v4.6`
  - `payments-solution-design-v4.9`
  - `caas-solution-design-v5.5`

* * *

### 1.0 Executive Summary

This document outlines the architecture for the **Collaborative Wiselists** feature, our core "Save & Share" growth engine. It replaces "favorites" with an "Airbnb-style" planning tool that allows users to create named Wiselists (e.g., "A-Level Maths") and save items (Tutor Profiles, Listings) to them.

The innovation lies in its deep integration with our existing systems:

1. **"Save" (Planning & CaaS):** A Client/Student saves a tutor for planning. This action feeds the **CaaS (v5.5)** "Platform Trust" metric, improving marketplace ranking.
2. **"Share" (Growth & Attribution):** This single action powers our entire viral and sales ecosystem, handling all use cases:
  - **External Growth (v4.3):** Inviting a *new user* automatically uses the inviter's personal referral link.
  - **Network Growth (v4.6):** A successful external invite automatically creates a `SOCIAL` link in the `profile_graph`.
  - **In-Network Sales (v4.9):** A Tutor/Agent sharing their *public Wiselist link* (`.../w/[slug]`) attributes any resulting bookings from *existing users*, enabling commission payouts.
3. **UI/UX Consistency:** This feature will strictly adhere to the established 3-column "Hub" layout and "avatar-left" card patterns to ensure a consistent and predictable user experience.

* * *

### 2.0 Core Architectural Loops (Data Flow)

#### 2.1 Loop 1: External Growth & Collaboration (v4.3 + v4.6)

This loop leverages `Wiselists` to drive **new user acquisition** by re-using our existing v4.3 Referral System.

```
+------------------+
|   User A         |
| (e.g., Parent)   |
+------------------+
        |
        1. Clicks "Share" on
           their Wiselist
        |
        v
+------------------+
|   Wiselist UI    |
| (Invite Modal)   |
+------------------+
        |
        2. Enters new email:
           "spouse@example.com"
        |
        v
+------------------+
|   API Endpoint   |
| (POST /api/wiselists/[id]/collaborators)
+------------------+
        |
        3. API checks: "Does this
           email exist in `profiles`?"
           (User is EXTERNAL)
        |
        v
+------------------+
| Referral Service |
| (v4.3)           |
+------------------+
        |
        4. Fetches User A's `referral_code`.
           Generates contextual link:
           ".../a/[USER_A_CODE]?redirect=/wiselists/[id]"
        |
        v
+------------------+
|  Email Service   |
| (Resend)         |
+------------------+
        |
        5. Sends invite email with
           the v4.3 referral link.
        |
        v
+------------------+
|   New User B     |
| (e.g., Spouse)   |
+------------------+
        |
        6. Clicks link, signs up.
        |
        v
+------------------+
|  Database Trigger|
| (handle_new_user)|
+------------------+
        |
        7. New user created.
        8. `profile_graph` (v4.6) link
           created: (User A) -[REFERRED_BY]-> (User B)
        9. `profile_graph` (v4.6) link
           created: (User A) -[SOCIAL]-> (User B)
       10. User B is added to
           `wiselist_collaborators`.


```

#### 2.2 Loop 2: In-Network Sales Attribution (v4.9)

This loop leverages `Wiselists` to create an **internal sales channel**, paying commissions for referrals *between existing users* by re-using our v4.9 Payments System.

```
+------------------+
|   Tutor A        |
| (Maths)          |
+------------------+
        |
        1. Creates public Wiselist
           with `slug = 'tutor-a-recs'`
        2. Adds Tutor B (English)
        |
        v
+------------------+
|   Existing Client|
+------------------+
        |
        3. Clicks Tutor A's public
           link: ".../w/tutor-a-recs"
        |
        v
+------------------+
| Middleware (v5.7)|
| (middleware.ts)  |
+------------------+
        |
        4. Detects "/w/" route.
           User IS logged in.
        5. Sets session storage:
           `wiselist_referrer_id = 'TUTOR_A_ID'`
        |
        v
+------------------+
|   Wiselist Page  |
| (/w/tutor-a-recs)|
+------------------+
        |
        6. Client browses list,
           clicks "Book" on Tutor B.
        |
        v
+------------------+
|   Checkout API   |
| (POST /api/stripe/create-booking-checkout)
+------------------+
        |
        7. Reads `sessionStorage`.
           Creates booking with new
           `booking_referrer_id = 'TUTOR_A_ID'`
        |
        v
+------------------+
|  Stripe Webhook  |
| (POST /api/webhooks/stripe)
+------------------+
        |
        8. Event `checkout.session.completed`.
           Handler finds booking.
        9. Sees `booking_referrer_id` IS NOT NULL.
        |
        v
+------------------+
| Payment Service  |
| (v4.9)           |
+------------------+
        |
       10. Creates `transaction` records.
       11. Splits platform fee and
           creates `CREDIT` transaction
           for Tutor A's wallet.

```

* * *

### 3.0 UI & Layout Diagrams

#### 3.1 UI Layout: Wiselists Hub (`/wiselists`)

This is the main hub page, which adheres to the standard 3-column application layout.

```
+------------------------+------------------------------------------+---------------------------+
|      AppSidebar        |              Main Content                |    Contextual Sidebar     |
|      (240px)           |                 (1fr)                    |        (300px)            |
+------------------------+------------------------------------------+---------------------------+
|                        |                                          |                           |
|  [User Avatar/Name]    |  +-------------------------------------+ |  +-----------------------+  |
|                        |  | PageHeader: "Wiselists"               | |  | ✏️ Create New Wiselist |  |
|  > Dashboard           |  +-------------------------------------+ |  | --------------------- |  |
|  > Bookings            |                                          |  | [Input: "List Name"]  |  |
|  > Messages            |  +-------------------------------------+ |  | [Textarea: "Desc..."] |  |
|  > Network             |  | Tabs: [My Lists] [Shared With Me]     | |  | [Toggle: Private/Public]|  |
|  > Listings            |  +-------------------------------------+ |  | [Button: Save List]   |  |
|  > Financials          |                                          |  +-----------------------+  |
|  > Referrals           |  (List of Wiselist Cards)                | |                           |
|  > My Students         |                                          |  +-----------------------+  |
|  > Wiselists (Active)  |  +--------------------------------------+ |  | 📊 Wiselist Stats      |  |
|  > Reviews             |  | +--------+-------------------------+ |  | --------------------- |  |
|                        |  | | [Avtr] | A-Level Maths [🔒 Pri]  | |  | > Total Lists: 5      |  |
|  ---                   |  | | [Avtr] | "Top tutors for..."     | |  | > Items Saved: 23     |  |
|  > Account             |  | |  [+1]  | 3 Items | Shared w/ 2   | |  | > Items Shared: 10    |  |
|  > Settings            |  | +--------+-------------------------+ |  | > Public Lists: 1     |  |
|                        |  | [Share]  [Edit]  [Delete]            |  | > Collaborators: 3    |  |
|                        |  +--------------------------------------+ |  +-----------------------+  |
|                        |                                          |  |                           |
|                        |  +--------------------------------------+ |  |                           |
|                        |  | +--------+-------------------------+ |  |                           |
|                        |  | | [MyAvtr] | Top London Tutors [🌍 Pub]| |  |                           |
|                        |  | |        | "My public recs..."     | |  |                           |
|                        |  | |        | 8 Items | /w/top-london | |  |                           |
|                        |  | +--------+-------------------------+ |  |                           |
|                        |  | [Copy Link]  [Edit]  [Delete]        |  |                           |
|                        |  +--------------------------------------+ |  |                           |
+------------------------+------------------------------------------+---------------------------+

```

#### 3.2 UI Layout: Wiselist Detail Page (`/wiselists/[id]`)

This is the page for viewing and managing the items *inside* a single Wiselist. It reuses the 3-column layout but features an optimized 2-widget sidebar for actions and stats.

```
+------------------------+------------------------------------------+---------------------------+
|      AppSidebar        |              Main Content                |    Contextual Sidebar     |
|      (240px)           |                 (1fr)                    |        (300px)            |
+------------------------+------------------------------------------+---------------------------+
|                        |                                          |                           |
|  [User Avatar/Name]    |  +-------------------------------------+ |  +-----------------------+  |
|                        |  | PageHeader: "A-Level Maths"           | |  | 🔗 Share & Collaborate |  |
|  > Dashboard           |  | "Top tutors for Physics and Maths..." | |  | --------------------- |  |
|  > Bookings            |  +-------------------------------------+ |  | [Tabs: Invite | Get Link] |  |
|  > Messages            |                                          |  | [Input: "Email..."]   |  |
|  > Network             |  +-------------------------------------+ |  | [Button: Send Invite] |  |
|  > Listings            |  | Tabs: [Items (4)] [Collaborators (2)] | |  +-----------------------+  |
|  > Financials          |  +-------------------------------------+ |  |                           |
|  > Referrals           |                                          |  +-----------------------+  |
|  > My Students         |  (List of Item Cards)                    |  |  | ℹ️ List Details        |  |
|  > Wiselists (Active)  |                                          |  | --------------------- |  |
|  > Reviews             |  +--------------------------------------+ |  | > Status: 🌍 Public     |  |
|                        |  | +--------+-------------------------+ |  | > Owner: You            |  |
|  ---                   |  | | [Avatar] | Dr. Evelyn Reed (Profile) | |  | > Items: 4              |  |
|  > Account             |  | |        | "PhD in Physics..."     | |  | > Collaborators: 2    |  |
|  > Settings            |  | |        | [Tag: Tutor] [Tag: London]  | |  +-----------------------+  |
|                        |  | +--------+-------------------------+ |  |                           |
|                        |  | [View Profile]  [Remove]             |  |                           |
|                        |  +--------------------------------------+ |  |                           |
+------------------------+------------------------------------------+---------------------------+

```

* * *

### 4.0 Database Implementation

We will add three new tables and modify the `bookings` table.

#### 4.1 New Table: `wiselists`

Stores the "folders" or "collections" created by a user. **Migration:** `apps/api/migrations/070_create_wiselists_table.sql`

```
SQL
```

```
CREATE TYPE collection_visibility AS ENUM ('private', 'public');

CREATE TABLE public.wiselists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visibility collection_visibility NOT NULL DEFAULT 'private',
  slug TEXT UNIQUE, -- e.g., /w/top-london-tutors
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_list_name_per_user UNIQUE (profile_id, name)
);
ALTER TABLE public.wiselists ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.wiselists IS 'v5.7: A user-created collection (Wiselist) of tutors or listings.';

```

#### 4.2 New Table: `wiselist_items`

This polymorphic table stores the items (Profiles or Listings) inside each Wiselist. **Migration:** `apps/api/migrations/071_create_wiselist_items_table.sql`

```
SQL
```

```
CREATE TABLE public.wiselist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  notes TEXT,
  added_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_item_in_list UNIQUE (wiselist_id, profile_id, listing_id),
  CONSTRAINT check_item_has_target CHECK (profile_id IS NOT NULL OR listing_id IS NOT NULL)
);
ALTER TABLE public.wiselist_items ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.wiselist_items IS 'v5.7: An item (tutor or listing) saved to a Wiselist.';

```

#### 4.3 New Table: `wiselist_collaborators`

This table links multiple users to a single Wiselist for collaboration. **Migration:** `apps/api/migrations/072_create_wiselist_collaborators_table.sql`

```
SQL
```

```
CREATE TYPE wiselist_role AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE public.wiselist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES public.wiselists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role wiselist_role NOT NULL DEFAULT 'EDITOR',
  invited_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_collaborator_in_list UNIQUE (wiselist_id, profile_id)
);
ALTER TABLE public.wiselist_collaborators ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.wiselist_collaborators IS 'v5.7: Users who have access to a specific Wiselist.';

```

#### 4.4 Update Table: `bookings`

This new column is the lynchpin for the **in-network sales attribution** loop. **Migration:** `apps/api/migrations/073_add_booking_referrer_id.sql`

```
SQL
```

```
ALTER TABLE public.bookings
ADD COLUMN booking_referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.booking_referrer_id IS 
'v5.7: Tracks if this booking was initiated from a shared Wiselist (e.g., /w/[slug]).';

```

* * *

### 5.0 Backend & Integration Design

This feature integrates all four of our core platform pillars.

#### 5.1 Integration 1: Referral System (v4.3) - "External Growth"

- **Target API:** `POST /api/wiselists/[id]/collaborators`
- **Logic:** When an email is provided for a *new user*, the API will fetch the inviter's `referral_code` and generate a contextual, trackable v4.3 referral link.

#### 5.2 Integration 2: Network Graph (v4.6) - "Social Connection"

- **Target Trigger:** `handle_new_user`
- **Logic:** When a new user signs up *from* a Wiselist invite, the trigger will automatically create two links in the `profile_graph` table: `(Inviter) -[REFERRED_BY]-> (New User)` and `(Inviter) -[SOCIAL]-> (New User)`.

#### 5.3 Integration 3: CaaS Engine (v5.5) - "Data Flywheel"

- **Target:** `TutorCaaSStrategy`
- **Trigger:** A new database trigger `on insert into public.wiselist_items` will add the item's `profile_id` to the `caas_recalculation_queue`.
- **Logic:** The "Network" bucket of the CaaS (v5.5) score will be updated to include a "Platform Trust" score derived from `COUNT(wiselist_items.id)`.

#### 5.4 Integration 4: Payments (v4.9) - "In-Network Sales"

- **Target Middleware:** `apps/web/src/middleware.ts`
- **Logic (Part 1):** The middleware will be updated to detect the `/w/[slug]` route. If a logged-in user visits, it will store the owner's `profile_id` in `sessionStorage` as `wiselist_referrer_id`.
- **Target API:** `POST /api/stripe/create-booking-checkout`
- **Logic (Part 2):** This API will check `sessionStorage` for `wiselist_referrer_id` and save it to the new `bookings.booking_referrer_id` column.
- **Target Webhook:** `POST /api/webhooks/stripe`
- **Logic (Part 3):** The webhook handler will check if `booking_referrer_id` is set and, if so, execute the v4.9 commission logic to pay the referrer.

* * *

### 6.0 Frontend Implementation Guide

This section details the new pages, components, and modifications required to build the Wiselists feature in alignment with the UI layouts (Section 3.0) and existing design patterns.

#### 6.1 Core Pages & Navigation

- `apps/web/src/app/components/layout/sidebars/AppSidebar.tsx` **(Modified)**
  - A new `<NavLink>` for "Wiselists" will be added, linking to `/wiselists`.
- `apps/web/src/app/(authenticated)/wiselists/page.tsx` **(New Page)**
  - This page will render the 3-column layout as seen in Section 3.1.
  - It will fetch and display a list of all `wiselists` the user owns or is a collaborator on.
- `apps/web/src/app/(authenticated)/wiselists/[id]/page.tsx` **(New Page)**
  - This page will render the 3-column layout as seen in Section 3.2.
  - It will fetch the specific `wiselist` by its `id` and its associated `wiselist_items`.

#### 6.2 Hub Page Components (`/wiselists`)

- `WiselistCard.tsx` **(New Component)**
  - **Pattern:** Must adhere to the "avatar-left" card pattern.
  - **Content:** Displays `name`, `description`, `visibility` (as a chip), and counts for items and collaborators. The avatar stack will show the owner and collaborators.
  - **Actions (Bottom Bar):** `[Share]`, `[Edit]`, `[Delete]`. For public lists, `[Share]` becomes `[Copy Link]`.
- `CreateWiselistWidget.tsx` **(New Component)**
  - **Pattern:** A standard sidebar widget (`<Card>`).
  - **Content:** A form with `Input` for `name`, `Textarea` for `description`, and a `ToggleSwitch` for `visibility` (Private/Public).
- `WiselistStatsWidget.tsx` **(New Component)**
  - **Pattern:** A standard sidebar widget (`<Card>`).
  - **Content:** Displays key stats: "Total Lists," "Items Saved," "Items Shared," "Public Lists," and "Total Collaborators."

#### 6.3 Detail Page Components (`/wiselists/[id]`)

- `WiselistItemCard.tsx` **(New Component)**
  - **Pattern:** Must adhere to the "avatar-left" card pattern.
  - **Logic:** This is a **polymorphic** component. It must be able to render *either* a `Profile` or a `Listing` based on which foreign key (`profile_id` or `listing_id`) is present in the `wiselist_items` row.
  - **Actions (Bottom Bar):** `[View Profile]` (or `[View Listing]`) and `[Remove]`.
- `ShareCollaborateWidget.tsx` **(New Component)**
  - **Pattern:** A standard sidebar widget (`<Card>`) with `<Tabs>`.
  - **Tab 1 ("Invite"):** Contains an email input and "Send Invite" button. Calls `POST /api/wiselists/[id]/collaborators` to trigger the v4.3 referral loop.
  - **Tab 2 ("Get Link"):** *Only visible if list is public*. Shows a read-only input with the `/w/[slug]` link and a "Copy" button. This enables the v4.9 sales loop.

#### 6.4 Modifications to Existing Components

- `apps/web/src/app/components/marketplace/ListingCard.tsx` **(Modified)**
  - A "Save" (Heart) icon button will be added. Clicking it opens a modal to add/remove the item from one or more Wiselists.
- `apps/web/src/app/components/public-profile/ProfileHeroSection.tsx` **(Modified)**
  - A "Save" (Heart) icon button will be added, with the same modal functionality.
- `apps/web/src/app/(authenticated)/dashboard/page.tsx` **(Modified)**
  - A new `SavedWiselistsWidget.tsx` will be created and added to the user's main dashboard to show their most recent lists.

* * *

### 7.0 Dependencies & System Impacts

This feature is an integration layer; its primary impact is on connecting existing systems.

- **Dependencies:**
  - **v4.3 Referral System:** Required for the `referral_code` logic used in the external growth loop.
  - **v4.6 Profile Graph:** Required for creating `SOCIAL` links between new collaborators.
  - **v4.9 Payments System:** Required for the `booking_referrer_id` logic to pay commissions on in-network sales.
  - **v5.5 CaaS Engine:** Required to consume the "Total Saves" data point for calculating tutor credibility.
- **Impacted Systems:**
  - `middleware.ts`**:** Must be updated to listen for `/w/[slug]` routes to enable session-based sales attribution.
  - `handle_new_user` **(DB Trigger):** Must be modified to create `profile_graph` links when a user joins from a Wiselist invite.
  - `POST /api/stripe/create-booking-checkout` **(API):** Must be modified to read `wiselist_referrer_id` from `sessionStorage`.
  - `POST /api/webhooks/stripe` **(API):** Must be modified to check for `booking_referrer_id` and trigger the v4.9 commission logic.

* * *

### 8.0 Business Impact

- **Unlocks Viral Loop:** Creates the platform's first true viral acquisition loop, directly tying a core utility (planning) to the v4.3 referral system.
- **Creates New Sales Channel:** Incentivizes tutors and agents to act as an internal sales force by creating public, shareable lists that earn them a commission on bookings from *existing* users.
- **Enriches CaaS Data:** Provides a new, high-intent, pre-booking quality signal ("Total Saves") to the CaaS engine (v5.5), making our marketplace rankings smarter and more defensible.