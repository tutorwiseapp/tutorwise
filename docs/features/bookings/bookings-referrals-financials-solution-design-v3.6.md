# Bookings-Referrals-Financials-Solution-Design-v3.6

# Bookings-Referrals-Financials-Solution-Design-v3.6

Here is the latest, most comprehensive version of the Solution Design Document (SDD), updated to **Version 3.6**.

This document incorporates all of our architectural decisions, including:

1. **Three-Hub Separation:** The creation of three distinct hubs (`/bookings`, `/financials`, `/referrals`) to properly separate concerns.
2. **Full Referral Lifecycle:** A new `referrals` table and hub to track the complete *lead generation* pipeline (`Refer` ➡️ `Sign Up` ➡️ `Convert`) for new users.
3. **Robust Referral Tracking:** A dual-system for tracking via both the implicit referral *link* (for anonymous leads) and the explicit, reusable referral *code* (for robust, cross-device claims at signup).
4. **Updated UI/UX (from Figma):** A new application-wide 3-column layout, a 4-card stats grid hero section for all hubs, and a "card-first" responsive design (replacing the old table-based layout).
5. **New Commission Model:** A **"Lifetime Attribution"** model that rewards referrers with a 10% commission on *every* booking made by the clients they acquire.

This document is complete and ready for a development team.

* * *

### **Solution Design: Universal Booking, Financials & Referral System**

**Version: 3.6 (Updated)**

**Date: 2025-11-02**

**Status: For Implementation**

**Owner: Senior Architect**

* * *

### 1.0 Executive Summary

This document outlines the design for three distinct, integrated user-facing hubs that replace and refactor the application's legacy systems. This design fully separates the logic for managing sessions, tracking money, and managing referral pipelines.

1. **The Booking Hub (/bookings):** A new, role-aware module for managing the session pipeline (e.g., Pending, Upcoming, Completed). This page will be driven by the user's `activeRole` (client, tutor, or agent).
2. **The Financial Hub (/financials):** A refactored and renamed version of the existing `transaction-history` page. This will become a universal ledger for the financial pipeline (e.g., Pending, Paid).
3. **The Referral Hub (/referrals):** (NEW) A new, dedicated pipeline management tool for all users to track their referral *lead generation* pipeline (e.g., Referred, Signed Up, Converted) for new users.

This design is based on the critical business logic that any user (not just agents) can earn referral commissions. This design deprecates the `src/app/referral-activities/page.tsx` file, which incorrectly mixed all three of these concerns.

### 1.5 Architectural Decisions Log (from Q&A)

This section formalizes the architectural decisions made to clarify the scope of SDD v3.6.

1. **Commission Model: Lifetime Attribution (Model 3).** We will adopt a "agent-of-Record" model. This is the simplest and most powerful incentive.
  - **Logic:** When a new user signs up with a referral code/link, the agent's ID is **permanently stamped** onto the new user's `profiles` record in a new `referred_by_profile_id` column.
  - **Impact:** The agent will receive a commission (defined as 10% of the booking amount) on *every* future booking that client makes, forever. This provides a strong incentive for both solo referrers and large agencies.
2. **Stripe Payment Flow:** To support this, the booking flow is as follows:
  - When a client clicks "Book Now," we **immediately create a** `bookings` **record** in our database with `payment_status: 'Pending'`.
  - The `booking` record must be tagged with the client's "agent-of-Record" (from their `profile.referred_by_profile_id`).
  - We then redirect to Stripe checkout, passing our `booking_id` in the metadata.
  - The Stripe Webhook (Section 8.6) uses this `booking_id` to find the record and execute the correct commission split.
3. **Commission Split:** The business rules for payment are:
  - **Direct Booking:** 90% to Tutor, 10% to Platform.
  - **Referred Booking:** 80% to Tutor, 10% to agent, 10% to Platform.
4. **Referral Code Generation:** We will use **Human-readable codes** (e.g., `JANE-123`), as specified in the `handle_new_user` trigger. The MD5 hash logic in the original migration file was a placeholder and will be removed.
5. **3-Column Layout:** This is a **new, separate layout** implemented in `src/app/(authenticated)/layout.tsx` and will apply *only* to the new hubs (`/bookings`, `/financials`, `/referrals`). It will not replace the existing `Header.tsx`/`NavMenu.tsx` used on public-facing pages.
6. **Data Migration:** This is a **clean slate**. No data migration is required from old tables.
7. **Existing UI:** The developer must **use all existing UI components** (`<Card>`, `<Tabs>`, `<StatGrid>`, etc.) as specified in the "System First" principle.
8. **Testing Strategy:** We will build incrementally as defined in the 4-phase plan (Section 13.0), with API and database tests built in Phase 1 before frontend work begins.

### 2.0 Guiding Principles

- **Role-Aware by Default:** The Booking Hub's UI must be driven by the `activeRole` from the `useUserProfile` hook. The Financial and Referral Hubs will be universal, as all roles can now earn and spend money, and all roles can refer.
- **Component-Driven ("System First"):** This design must adhere to the "System First" principle, respect the "cas/docs/DESIGN-SYSTEM.md" and exclusively use existing, standardized UI components from the repository, including `<Container>`, `<Card>` <Button>, <Tabs>, <StatCard>, and <StatGrid>.
- **Separation of Concerns:** Managing a session (an appointment), tracking money (a transaction), and managing a sales lead (a referral) are three different user jobs. This design separates these functions into three distinct pages: `/bookings`, `/financials`, and `/referrals`.
- **Server-Side Logic:** All data filtering (by tab, status, etc.) must be performed via API query parameters, not client-side, to ensure performance and scalability.

### 3.0 File & Component Structure

This implementation requires the following file system changes:

**NEW/MODIFIED ROOT LAYOUT:**

- `src/app/(authenticated)/layout.tsx` (NEW): This file will implement the new 3-column application layout.
- `src/app/components/layout/AppSidebar.tsx` (NEW): The main navigation (Column 1).
- `src/app/components/layout/ContextualSidebar.tsx` (NEW): The context-aware sidebar (Column 3).

**NEW DIRECTORY (Booking Hub):**

- `src/app/bookings/page.tsx`
- `src/app/bookings/components/ClientBookingView.tsx`
- `src/app/bookings/components/TutorBookingView.tsx`
- `src/app/bookings/components/AgentBookingView.tsx`
- `src/app/bookings/components/BookingCard.tsx` (New Mobile/Desktop Component)
- `src/app/bookings/components/BookingView.module.css` (New CSS Module for Card Grid)

**RENAMED DIRECTORY (Financial Hub):**

- `src/app/transaction-history/` will be renamed to `src/app/financials/`.
- `src/app/financials/page.tsx` (This file will be heavily refactored).
- `src/app/financials/page.module.css` (This file will be kept as-is for its `.amountPositive` and `.amountNegative` styles).
- `src/app/financials/components/TransactionCard.tsx` (New Mobile/Desktop Component)
- `src/app/financials/components/FinancialsView.module.css` (New CSS Module for Card Grid)

**NEW DIRECTORY (Referral Hub):** (NEW)

- `src/app/referrals/page.tsx`
- `src/app/referrals/components/ReferralCard.tsx` (New Mobile/Desktop Component)
- `src/app/referrals/components/ReferralView.module.css` (New CSS Module for Card Grid)

**MODIFIED INTEGRATION FILE:**

- `src/app/signup/page.tsx` (Must be updated to add the "Referral Code" field).

**DELETED DIRECTORY:**

- `src/app/referral-activities/` (and all its contents) will be removed.

### 4.0 Data Model & Status Definitions

To ensure a 100% clean break from legacy systems, this project will create three (3) NEW tables and update one (1) existing table.

#### 4.0.1 `profiles` Table (Update)

To support robust, lifetime referral tracking, **two** new columns will be added to the existing `profiles` table:

1. `referral_code` (TEXT, Unique, Not Null): A human-readable, unique code (e.g., JANE-123) for explicit referral claims during signup.
2. `referred_by_profile_id` (UUID, Nullable, FK to `profiles.id`): **(NEW PER Q&A)** The "agent-of-Record". This stamps the agent onto the user's profile permanently at signup. This is the driver for all future commission payments.

#### 4.1 `bookings` Table (NEW)

This NEW table will be created to track all sessions and will be the single source of truth for the `/bookings` hub.

- `id` (UUID, PK)
- `student_id` (FK to `profiles.id`)
- `tutor_id` (FK to `profiles.id`)
- `listing_id` (FK to `listings.id`)
- `referrer_profile_id` (UUID, Nullable, FK to `profiles.id`): **(UPDATED)** Tracks the "agent-of-Record" for this booking, enabling the 80/10/10 commission split.
- `service_name` (String)
- `session_start_time` (Timestamp)
- `session_duration` (Integer, minutes)
- `amount` (Decimal, e.g., 50.00)
- `status` (Enum, Booking Status)
- `payment_status` (Enum, Transaction Status)

##### 4.1.1 Booking Status (B-STAT)

Used by the `/bookings` hub.

- `B-STAT-1: Pending` (Awaiting tutor confirmation)
- `B-STAT-2: Confirmed` (Tutor confirmed, session is upcoming)
- `B-STAT-3: Completed` (Session has passed)
- `B-STAT-4: Cancelled` (Cancelled by either party)
- `B-STAT-5: Declined` (Tutor declined the request)

#### 4.2 `transactions` Table (NEW)

This is the SECOND NEW table and will be the single source of truth for the `/financials` hub. It serves as the universal ledger for all financial events for all users.

- `id` (UUID, PK)
- `profile_id` (FK to `profiles.id`, the user this transaction belongs to)
- `booking_id` (FK to `bookings.id`, optional, links to the session)
- `type` (Enum, Transaction Type): (KEY FIELD)
- `description` (String, e.g., "Commission from Booking #12345")
- `status` (Enum, Transaction Status):
- `amount` (Decimal, e.g., -50.00 or +5.00)
- `created_at` (Timestamp)

##### 4.2.1 Transaction Type (T-TYPE)

Used by the `/financials` hub.

- `T-TYPE-1: Booking Payment` (A client paying for a session. `amount` is negative.)
- `T-TYPE-2: Tutoring Payout` (A tutor's earnings. `amount` is positive.)
- `T-TYPE-3: Referral Commission` (Any user's earnings from a referral. `amount` is positive.)
- `T-TYPE-4: Withdrawal` (A user transferring from platform balance to their bank. `amount` is negative.)
- `T-TYPE-5: Platform Fee` (Internal tracking. `amount` is negative. **Used for 80/10/10 split.**)

##### 4.2.2 Transaction Status (T-STAT)

Used by the `/financials` hub. This represents the "Pay" lifecycle (Pending Paid).

- `T-STAT-1: Pending` (Awaiting completion or payout, e.g., commission for a booked session not yet completed)
- `T-STAT-2: Paid / Completed` (Funds have cleared, e.g., a completed payment or a successful payout)
- `T-STAT-3: Failed` (e.g., Payment declined, payout failed)
- `T-STAT-4: Cancelled` (e.g., A booking was cancelled, invalidating the transaction)

#### 4.3 `referrals` Table (NEW)

This THIRD NEW table will be the single source of truth for the `/referrals` hub. **Purpose Update:** This table's primary purpose is now **Lead Generation Tracking**. It tracks the *first conversion* of a new user. It is **no longer used** to calculate ongoing commissions.

- `id` (UUID, PK)
- `referrer_profile_id` (FK to `profiles.id`) - The user who made the referral.
- `referred_profile_id` (FK to `profiles.id`, Nullable) - The new user who signed up.
- `status` (Enum, Referral Status) - This is the referral pipeline.
- `booking_id` (FK to `bookings.id`, Nullable) - The *first* booking that triggered the conversion.
- `transaction_id` (FK to `transactions.id`, Nullable) - The *first* resulting commission payment.
- `created_at` (Timestamp) - Tracks the initial "Refer" step.
- `signed_up_at` (Timestamp, Nullable) - Tracks the "Sign Up" step.
- `converted_at` (Timestamp, Nullable) - Tracks the "Convert" step (the first booking).

##### 4.3.1 Referral Status (R-STAT)

Used by the `/referrals` hub.

- `R-STAT-1: Referred` (Link clicked by an anonymous user, or a referral was initiated for an existing user).
- `R-STAT-2: Signed Up` (The anonymous user created an account, "claiming" the referral).
- `R-STAT-3: Converted` (The user (new or registered) made their first paid booking. This triggers the commission transaction).
- `R-STAT-4: Expired` (e.g., if no signup after 30 days).

### 5.0 New Application Layout (UPDATED)

Based on the new Figma designs (`image_08c81e.png`), the authenticated application will adopt a 3-column desktop layout. This will be implemented in a new `src/app/(authenticated)/layout.tsx` file.

1. **Column 1:** `<AppSidebar>`
  - This is the new primary, sitewide navigation.
  - Contains links to "Home," "My Bookings," "Referrals," "Financials," "Messages," etc.
2. **Column 2:** `<PageContent>` (i.e., `{children}`)
  - This is the main content area for the specific page.
  - This is where our new Hubs (`/bookings`, `/financials`, `/referrals`) will be rendered.
3. **Column 3:** `<ContextualSidebar>`
  - This is a context-aware sidebar.
  - On the `/bookings` page, it will show the "Next Session" card.
  - On the `/referrals` page, it will show the user's referral link and code.

### 6.0 Component Specification: The Booking Hub (/bookings) (UPDATED)

This page is for managing the session pipeline. It is rendered inside the new 3-column AppLayout.

#### 6.1 `src/app/bookings/page.tsx` (The Hub)

This is a client component (`'use client'`) that functions as a role-based router.

- **Logic:**
  - Get `profile`, `activeRole`, `isLoading` from `useUserProfile()`.
  - If `isLoading`, render a loading component.
  - Render `<PageHeader title={titleMap[activeRole]} />`.
  - Use a `switch (activeRole)` statement to render the correct view component below.

#### 6.2 `ClientBookingView.tsx` (Role: client) (UPDATED)

This view is for a user's own bookings, matching the Figma design (`Figma_booking_2.png`).

- **Layout:**
  - **Hero Section (NEW):** A `<StatGrid>` at the top with four `<StatCard>` components: "Total Bookings," "Upcoming," "Completed," and "Cancelled."
  - **Booking Tabs:** A `<Tabs>` component with options: `Upcoming` (Default), `Pending`, `Completed`, `Cancelled`.
  - **Responsive View (NEW):** Renders a responsive card grid (e.g., `styles.cardGrid`). This view does not use a `<DataTable>`.
  - **Empty State:** If data is empty, show a `<Card>`.

#### 6.3 `TutorBookingView.tsx` (Role: tutor) (UPDATED)

This view is for managing sessions as a provider.

- **Layout:**
  - **Hero Section (NEW):** A `<StatGrid>` at the top with four `<StatCard>` components: "Pending Confirmation," "Upcoming," "Completed," and "Total Earnings (MTD)."
  - **Booking Tabs:** `Pending Confirmation` (Default, for `B-STAT-1`), `Upcoming` (`B-STAT-2`), `Completed` (`B-STAT-3`), `Cancelled` (`B-STAT-4`).
  - **Responsive View (NEW):** Renders a responsive card grid of `<BookingCard>` components. This view does not use a `<DataTable>`.
  - **Empty State:** "You have no pending bookings."

#### 6.4 `AgentBookingView.tsx` (Role: agent) (No Change)

This is the "power-user" view for the "super-role". It is the exception to the card-grid rule.

- **Layout:**
  - **Summary Cards:** A `<StatGrid>` with `<StatCard>` components:
    - "Agency Bookings (MTD)" (Referred bookings)
    - "My Sessions (MTD)" (Bookings as a tutor)
    - "My Bookings (MTD)" (Bookings as a client)
  - **Filter Bar:** A `<Card>` containing filters: Search, Date Range, and a `<Select>` dropdown for Booking Type: `All`, `Agency`, `As Tutor`, `As Client`.
  - **Bookings Table:** This view retains the `<DataTable>` for power-users.
  - **Table Columns:** Date & Time, Type (Icon + Text: "Agency," "Tutor," "Client"), Tutor, Student, Service, Amount, Commission, Status (`B-STAT-*`), Action.

### 7.0 Component Specification: The Financial Hub (/financials) (UPDATED)

This page is for managing money. It is universal for all roles.

- **Page:** `src/app/financials/page.tsx` (Refactored from `transaction-history`)
- **Layout:**
  - **Hero Section (NEW):** A `<StatGrid>` at the top. Cards are conditionally rendered based on the user's `profile.roles` array.
    - "Total Balance" (Always rendered)
    - "Referral Commissions (MTD)" (Always rendered)
    - "Tutoring Earnings (MTD)" (Rendered only if `profile.roles.includes('tutor')`)
    - "My Spend (MTD)" (Rendered only if `profile.roles.includes('client')`)
  - **Financial Tabs (NEW):** A `<Tabs>` component for primary navigation.
    - `All` (Default)
    - `Referral Commissions` (Filters for `type='Referral Commission'`)
    - `Tutoring Earnings` (Filters for `type='Tutoring Payout'`, conditionally rendered)
    - `My Spend` (Filters for `type='Booking Payment'`, conditionally rendered)
  - **Filter Bar:** A `<Card>` containing secondary filters:
    - `<Input type="search" placeholder="Search transactions..." />`
    - `<Select>` for Status: `All`, `Pending` (`T-STAT-1`), `Paid` (`T-STAT-2`), `Failed` (`T-STAT-3`).
  - **Responsive View (NEW):** Renders a responsive card grid of `<TransactionCard>` components. This view does not use a `<DataTable>`.
  - **Amount Styling:** The `<TransactionCard>` will use `page.module.css` for `.amountPositive` and `.amountNegative` styles.

### 7.5 Component Specification: The Referral Hub (/referrals) (NEW)

This page is for managing the *lead generation* pipeline. It is universal for all roles.

- **Page:** `src/app/referrals/page.tsx`
- **Layout:**
  - **Hero Section (NEW):** A `<StatGrid>` at the top.
    - "Total Leads (MTD)" (Counts `Referred` + `Signed Up`)
    - "Total Signups (MTD)" (Counts `Signed Up`)
    - "Total Conversions (MTD)" (Counts `Converted`)
    - "Total Commissions (MTD)" (Sums `amount` from converted `transaction_id`s)
  - **Referral Tabs (NEW):** A `<Tabs>` component for primary lifecycle navigation, as defined in Section 4.3.1.
    - `All` (Default)
    - `Referred` (Filters for `status='Referred'`)
    - `Signed Up` (Filters for `status='Signed Up'`)
    - `Converted` (Filters for `status='Converted'`)
  - **Filter Bar:** A `<Card>` containing secondary filters:
    - `<Input type="search" placeholder="Search referrals..." />`
    - `<Select>` for Date Range.
  - **Responsive View (NEW):** Renders a responsive card grid of `<ReferralCard>` components. This view does not use a `<DataTable>`.

### 8.0 API & Backend Specification (UPDATED)

#### 8.1 GET /a/\[referral\_id\]/route.ts (Update)

- **Purpose:** To track the initial referral click and create the first record in the `referrals` (lead-gen) table.
- **Logic:** a. Get the `referrer_profile_id` from the `[referral_id]` param... b. Get the `current_user_id` from the session (if the user is logged in). c. **If user is logged in (Registered User Funnel):** i. Create a new row in the `referrals` table with: \* `referrer_profile_id`: `[referrer_id]` \* `referred_profile_id`: `[current_user_id]` \* `status`: `'Referred'` d. **If user is not logged in (Unregistered User Funnel):** i. Create a new row in the `referrals` table with: \* `referrer_profile_id`: `[referrer_id]` \* `referred_profile_id`: null \* `status`: `'Referred'` ii. Store the `id` of this new `referrals` record in a secure, `httpOnly` cookie. e. Redirect the user to the homepage.

#### 8.2 `handle_new_user` Trigger (Update)

- **Purpose:** (UPDATED) To "claim" a referral when a new user signs up, updating the `referrals` lead-gen table and **permanently stamping the agent on the** `profiles` **table for "Lifetime Attribution".**
- **Logic:** a. This function runs after a new row is inserted in `auth.users`. b. Check for `request.body.referral_code` from the signup form. c. Check for the referral cookie. d. **Priority 1 (Explicit Claim via Code):** If `referral_code` is present: i. Find the `referrer_profile_id` from the `profiles` table WHERE `referral_code` = `[the code]`. ii. **If found, stamp this new user's profile:** `UPDATE public.profiles SET referred_by_profile_id = [referrer_id] WHERE id = new.id;` iii. Check for a cookie record. If a matching cookie record exists, `UPDATE` that `referrals` row to `'Signed Up'`. If not, `INSERT` a new `referrals` row with `status: 'Signed Up'`. e. **Priority 2 (Implicit Claim via Cookie):** If no `referral_code` was provided, check for the referral cookie. i. If cookie is present, get the `referrals.id` from it. ii. Find the "Anonymous Lead" row in the `referrals` table. iii. **If found, get the** `referrer_profile_id` **from that row and stamp the new user's profile:** `UPDATE public.profiles SET referred_by_profile_id = [referrer_id_from_cookie] WHERE id = new.id;` iv. Update that `referrals` row: \* Set `referred_profile_id`: `new.id` \* Set `status`: `'Signed Up'` \* Set `signed_up_at`: `now()`

#### 8.3 GET /api/referrals (New Endpoint)

- **Purpose:** Fetches all pipeline items for the **Referral Hub (lead-gen)**.
- **Logic:**
  - Get the authenticated user's `id`.
  - `SELECT * FROM referrals WHERE referrer_profile_id = user.id`.
  - Must accept `status` query parameters for filtering (e.g., `?status=Signed Up`).

#### 8.4 GET /api/bookings

- **Purpose:** Fetches sessions for the Booking Hub from the NEW `bookings` table.
- **Logic:**
  - Get the authenticated user's `id` and `activeRole`...
  - `switch (activeRole):`
    - `case 'client'`: `SELECT * FROM bookings WHERE student_id = user.id`
    - `case 'tutor'`: `SELECT * FROM bookings WHERE tutor_id = user.id`
    - `case 'agent'`: Perform a `UNION` query to get all bookings WHERE `student_id = user.id` OR `tutor_id = user.id` OR `referrer_profile_id = user.id`.
  - Must accept `status` query parameters for filtering.

#### 8.5 GET /api/financials (New Endpoint)

- **Purpose:** Fetches all financial items for the Financial Hub from the NEW `transactions` table.
- **Logic:**
  - Get the authenticated user's `id`.
  - `SELECT * FROM transactions WHERE profile_id = user.id`.
  - Must accept `type` and `status` query parameters for filtering (e.g., `?type=Referral Commission&status=Pending`).

#### 8.6 POST /api/webhooks/stripe (Critical Integration Update)

- **Purpose:** (UPDATED) To create all necessary transactions based on the **Lifetime Attribution** model (80/10/10 split) and update the referral *lead-gen* pipeline upon successful payment.
- **Logic:** a. Receive and verify the `payment_intent.succeeded` webhook. b. Get the `booking_id` from the `payment_intent.metadata`. c. **Call the new** `handle_successful_payment` **database function (RPC) passing in** ***only*** **the** `booking_id`**.** This function will atomically: i. Fetch the `booking` record (which includes the `referrer_profile_id`). ii. **If** `booking.referrer_profile_id` **IS PRESENT** (Referred Booking): 1. Create **Client Transaction** (`type='Booking Payment'`, `amount` = -100%) 2. Create **Tutor Transaction** (`type='Tutoring Payout'`, `amount` = +80%) 3. Create **agent Transaction** (`type='Referral Commission'`, `amount` = +10%) 4. Create **Platform Fee** (`type='Platform Fee'`, `amount` = -10%) iii. **If** `booking.referrer_profile_id` **IS NULL** (Direct Booking): 1. Create **Client Transaction** (`type='Booking Payment'`, `amount` = -100%) 2. Create **Tutor Transaction** (`type='Tutoring Payout'`, `amount` = +90%) 3. Create **Platform Fee** (`type='Platform Fee'`, `amount` = -10%) iv. Update `bookings` table: set `payment_status` to `'Paid'`. v. **(First conversion only)** Find the `referrals` record for this user (if one exists with `status != 'Converted'`) and update it to `'Converted'`, linking the `booking_id` and `transaction_id`. This completes the *lead-gen* pipeline but does not affect future commissions.

### 9.0 Responsive Design Strategy (RE-WRITTEN)

This section defines the application-wide standard for responsive data display, based on the new Figma designs.

#### 9.1 How it Works: "Card-First Responsive Design"

- **Mobile (<768px): "Single-Column Card List"**
  - The page displays a single-column, vertically-stacked list of purpose-built `<Card>` components (e.g., `<BookingCard>`, `<TransactionCard>`).
  - This is the default, touch-friendly, mobile-first experience.
- **Tablet & Desktop (>=768px): "Responsive Card Grid"**
  - The same card components reflow into a responsive multi-column grid.
  - This is achieved with a simple CSS grid wrapper (see Appendix A).
  - This new design replaces the old "Table-to-Card-List" pattern, as the 3-column app layout moves complex details (like "Next Session") to the contextual sidebar.
- **Exception: "Power-User" Views**
  - The `AgentBookingView` (Section 6.4) is an exception. It is designed for data-heavy work and will retain the `<DataTable>` for desktop use.

### 10.0 Deprecation & File Cleanup Plan

- **DELETE DIRECTORY:** `src/app/referral-activities/`.
  - `page.tsx` is fully replaced by the new `/financials` and `/referrals` hubs.
  - The `page.module.css` from this directory is obsolete.
- **RENAME DIRECTORY:**
  - `src/app/transaction-history/` ➡️ `src/app/financials/`.
- **Global Search & Replace:**
  - All internal references and links (e.g., in `dashboard/page.tsx`) must be updated from `/transaction-history` and `/referral-activities` to `/financials` or `/referrals`.

### 11.0 Integration Points & Booking Funnels

This section defines the primary user pathways (funnels) that initiate the new workflows.

#### 11.1 Funnel 1: Signup (NEW)

- **User Story:** "As a new user, I want to give credit to the person who referred me."
- **File Dependency:** `src/app/signup/page.tsx`
- **Developer Notes:**
  - **Action Item:** This form must be updated with one new, optional text field: "Referral Code (Optional)". This is the "explicit claim" mechanism (Priority 1 in Section 8.2).

#### 11.2 Funnel 2: Marketplace Listing Booking

- **User Story:** "As a client, I want to browse for a service on the homepage, view its details, and book it."
- **File Dependencies:**
  - `src/app/page.tsx` (Marketplace Homepage)
  - `src/app/components/marketplace/ListingCard.tsx`
  - `src/app/tutor/[id]/[slug]/page.tsx` (Listing Detail Page)
- **Developer Notes:**
  - The "Book Now" button on the `[slug]/page.tsx` is the key integration point.
  - **Action Item (UPDATED):** This component must:
    1. Fetch the *current user's profile* (the client) from `useUserProfile()`.
    2. Check if `profile.referred_by_profile_id` exists.
    3. When creating the new `booking` record (with `payment_status: 'Pending'`), it **must** pass this `referred_by_profile_id` into the `bookings.referrer_profile_id` column.
  - This ensures all bookings from this client are correctly tagged for the 80/10/10 commission split.

#### 11.3 Funnel 3: Public Profile Listing Booking

- **User Story:** "As a client, I was sent a link to a tutor's profile, I want to see all their services and book one."
- **File Dependencies:**
  - `src/app/public-profile/[id]/page.tsx` (Public Profile Page)
- **Developer Notes:**
  - This flow is identical to Funnel 2. The "Book" buttons on this page will initiate the same booking workflow and must also pass the `referred_by_profile_id`.

#### 11.4 Funnel 4: Dashboard & Re-Booking

- **User Story:** "As an existing client, I'm on my dashboard and want to quickly find a new tutor or re-book a past session."
- **File Dependencies:**
  - `src/app/dashboard/page.tsx`
  - `src/app/bookings/components/ClientBookingView.tsx`
- **Developer Notes:**
  - **Action Item:** The `<BookingCard>` component, when used in the "Completed" tab of the `ClientBookingView`, must render a "Book Again" button. This button will be a `<Link>` that routes the user to the `src/app/tutor/[id]/[slug]/page.tsx` associated with that booking. This new booking will correctly pick up the client's `referred_by_profile_id` as per Funnel 2.

### 12.0 Appendix: Code & Implementation Guides

This appendix contains code skeletons and files to be created/updated for developers.

#### Appendix A: Responsive Component Implementation (TSX/CSS) (UPDATED)

This pattern should be implemented in `ClientBookingView.tsx`, `TutorBookingView.tsx`, `financials/page.tsx`, and `referrals/page.tsx`.

- **File:** `src/app/bookings/components/BookingView.module.css` (NEW FILE)
```
CSS
```
```
/* Card-First Responsive View Strategy */
.cardGrid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile-first: single column */
  gap: var(--space-3, 16px);
}
/* Show multi-column grid at the tablet breakpoint */
@media (min-width: 768px) {
  .cardGrid {
    /* Creates 2-3 responsive columns */
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}
```
- **File:** `src/app/bookings/components/ClientBookingView.tsx` (EXAMPLE IMPLEMENTATION)
```
TypeScript
```
```
import styles from './BookingView.module.css';
import { BookingCard } from './BookingCard';
//... inside component
return (
  <Card>
    {/* StatGrid and Tabs components */}
    {/* Responsive View: "Card-First Grid" */}
    <div className={styles.cardGrid}>
      {filteredData.length > 0 ? (
        filteredData.map(booking => (
          <BookingCard key={booking.id} booking={booking} />
        ))
      ) : (
        <p>No bookings found.</p>
      )}
    </div>
  </Card>
);
```

#### Appendix B: Mobile/Desktop Card Component Skeletons

- **File:** `src/app/bookings/components/BookingCard.tsx` (NEW FILE)
```
TypeScript
```
```
// Skeleton for the booking card
import { Card } from '@/app/components/ui/Card';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { Button } from '@/app/components/ui/Button';
import type { Booking } from '@/types';
interface BookingCardProps { booking: Booking; }
export const BookingCard = ({ booking }: BookingCardProps) => (
  <Card padding="md">
    <div>
      <h4>{booking.service_name}</h4>
      <p>{/* Formatted Date & Time */}</p>
      <p>with {booking.tutor_name_or_student_name}</p>
    </div>
    <div>
      <StatusBadge status={booking.status} />
      {/* Contextual Button, e.g., "Join Session" or "Book Again" */}
      <Button variant="primary" size="sm">Action</Button>
    </div>
  </Card>
);
```
- **File:** `src/app/financials/components/TransactionCard.tsx` (NEW FILE)
```
TypeScript
```
```
// Skeleton for the transaction card
import { Card } from '@/app/components/ui/Card';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import styles from '../page.module.css'; // Re-using the amount styles
import type { Transaction } from '@/types';
interface TransactionCardProps { transaction: Transaction; }
export const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const isPositive = transaction.amount >= 0;
  const amountClass = isPositive ? styles.amountPositive : styles.amountNegative;
  return (
    <Card padding="md">
      <div>
        <h4>{transaction.description}</h4>
        <p>{/* Formatted Date */}</p>
        <StatusBadge status={transaction.status} />
      </div>
      <div>
        <span className={amountClass}>
          {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
        </span>
      </div>
    </Card>
  );
};
```
- **File:** `src/app/referrals/components/ReferralCard.tsx` (NEW FILE)
```
TypeScript
```
```
// Skeleton for the referral card
import { Card } from '@/app/components/ui/Card';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import type { Referral } from '@/types';
interface ReferralCardProps { referral: Referral; }
export const ReferralCard = ({ referral }: ReferralCardProps) => {
  const userName = referral.referred_profile_name || 'Anonymous Lead';
  return (
    <Card padding="md">
      <div>
        <h4>{userName}</h4>
        <p>Referred: {/* Formatted Date */}</p>
        {referral.status === 'Converted' && (
          <p>Commission: {/* Formatted Amount */}</p>
        )}
      </div>
      <div>
        <StatusBadge status={referral.status} />
      </div>
    </Card>
  );
};
```

#### Appendix C: Update to Canonical `types/index.ts` (UPDATED)

- **File:** `src/types/index.ts` (UPDATE THIS FILE)
```
TypeScript
```
```
// ... existing types
// --- User & Profile Types ---
export type Profile = {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  website: string;
  roles: ('client' | 'tutor' | 'agent')[];
  referral_code: string; // <-- ADD THIS NEW PROPERTY
  referred_by_profile_id?: string; // <-- (NEW PER Q&A) ADD THIS NEW PROPERTY
  // ... other profile fields
};
// ... Data Table Types ...
export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (value: any) => React.ReactNode;
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
}
// --- NEW Types for Hubs (SDD v3.6, Section 4.0) ---
export type Booking = {
  id: string; // UUID
  student_id: string;
  tutor_id: string;
  listing_id: string;
  referrer_profile_id?: string;
  service_name: string;
  session_start_time: string; // Timestamp
  session_duration: number; // minutes
  amount: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Declined'; // B-STAT
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Cancelled'; // T-STAT
  // Joined data:
  tutor_name?: string;
  student_name?: string;
};
export type Transaction = {
  id: string; // UUID
  profile_id: string;
  booking_id?: string;
  type: 'Booking Payment' | 'Tutoring Payout' | 'Referral Commission' | 'Withdrawal' | 'Platform Fee'; // T-TYPE
  description: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Cancelled'; // T-STAT
  amount: number; // e.g., -50.00 or +5.00
  created_at: string; // Timestamp
};
// ADD THIS NEW TYPE
export type Referral = {
  id: string; // UUID
  referrer_profile_id: string;
  referred_profile_id?: string;
  status: 'Referred' | 'Signed Up' | 'Converted' | 'Expired'; // R-STAT
  booking_id?: string;
  transaction_id?: string;
  created_at: string; // Timestamp
  signed_up_at?: string;
  converted_at?: string;
  // Joined data
  referred_profile_name?: string;
  commission_amount?: number;
};
```

### 13.0 Implementation Plan (UPDATED)

This section outlines the step-by-step plan, incorporating our architectural decisions.

#### Phase 1: Backend & Database Foundation

1. **Execute Database Migrations (Section 4.0)**
  - **Update** `profiles` **table:**
    - Add `referral_code` (TEXT, UNIQUE, NOT NULL).
    - Add `referred_by_profile_id` (UUID, NULLABLE, FK to `public.profiles`).
  - Create NEW `bookings` table, `booking_status_enum`.
  - Create NEW `transactions` table, `transaction_status_enum`, and `transaction_type_enum`.
  - Create NEW `referrals` table, `referral_status_enum`.
2. **Update Backend Logic (Section 8.0)**
  - Update `GET /a/[referral_id]/route.ts` to create "Referred" records in the `referrals` table.
  - Update `handle_new_user` trigger to:
    1. Handle "Priority 1 (Code)" and "Priority 2 (Cookie)".
    2. Update `referrals` row to "Signed Up".
    3. **Stamp the new** `profiles.referred_by_profile_id` with the agent's ID.
  - **Create** `POST /api/webhooks/stripe` **(Section 8.6)** to call the new RPC.
  - **Create** `handle_successful_payment` **RPC** to execute the **80/10/10 or 90/10** commission split based on the `booking.referrer_profile_id`.
3. **Create New API Endpoints (Section 8.0)**
  - Create `GET /api/bookings` (role-aware session endpoint).
  - Create `GET /api/financials` (universal transaction endpoint).
  - Create `GET /api/referrals` (universal referral pipeline endpoint).
4. **Testing Strategy:** Write API and database-level integration tests for this new logic *before* proceeding to the frontend.

#### Phase 2: Core Frontend Components & Types

1. **Update Canonical Types (**`src/types/index.ts`**)**
  - Add `referral_code` and `referred_by_profile_id` to `Profile` type.
  - Add new `Booking`, `Transaction`, and `Referral` types (Appendix C).
2. **Create Card Components (Appendix B)**
  - Create `src/app/bookings/components/BookingCard.tsx`.
  - Create `src/app/financials/components/TransactionCard.tsx`.
  - Create `src/app/referrals/components/ReferralCard.tsx`.
3. **Create Responsive CSS Modules (Appendix A)**
  - Create `BookingView.module.css`, `FinancialsView.module.css`, and `ReferralView.module.css` with the new `.cardGrid` style.
4. **Create New Layout (Section 5.0)**
  - Create `src/app/(authenticated)/layout.tsx` to implement the 3-column layout.
  - Create `AppSidebar.tsx` (Column 1) and `ContextualSidebar.tsx` (Column 3).

#### Phase 3: Build New Frontend Hubs

1. **Build the New Booking Hub (Section 6.0)**
  - Create `src/app/bookings/page.tsx` (the router).
  - Create `ClientBookingView.tsx`, `TutorBookingView.tsx` (with StatGrids and Card Grids).
  - Create `AgentBookingView.tsx` (with StatGrid and DataTable).
2. **Refactor to Create the Financial Hub (Section 7.0)**
  - Rename `src/app/transaction-history` to `src/app/financials`.
  - Refactor `src/app/financials/page.tsx` to use the new API, StatGrid, Tabs, and Card Grid.
3. **Build the New Referral Hub (Section 7.5)**
  - Create `src/app/referrals/page.tsx`.
  - Implement the layout with `<StatGrid>`, `<Tabs>`, and the responsive Card Grid.

#### Phase 4: Integration, Cleanup & Deprecation

1. **Update Booking Funnels (Section 11.0)**
  - Update `src/app/signup/page.tsx` to include the new "Referral Code (Optional)" field.
  - Update "Book Now" button on `src/app/tutor/[id]/[slug]/page.tsx` (Listing Detail Page) to pass the `profile.referred_by_profile_id` into the new `booking` record.
  - Implement "Book Again" logic in `BookingCard.tsx` for the "Completed" tab.
2. **Full Deprecation & Cleanup (Section 10.0)**
  - Delete the entire `src/app/referral-activities/` directory.
  - Search and replace all internal links from `/referral-activities` and `/transaction-history` to point to the new `/bookings`, `/financials`, or `/referrals` routes.

* * *

### **COMPLETE IMPLEMENTATION FILES (v3.6)**

Based on the finalized SDD v3.6, here are the complete files ready for a developer to implement.

#### **File 1 (Backend): The Database Migration.**

- **File Path:** `apps/api/migrations/028_create_hubs_v3_5_schema.sql`
- **Description:** This is the first and most critical file to run. It executes Phase 1, Step 1 of the plan, creating the new schema for all three hubs and adding the **new columns to** `profiles` for the "Lifetime Attribution" model.

```
SQL
```

```
-- Migration 028: Create new tables for Hubs v3.6 (Bookings, Financials, Referrals)
-- Implements SDD v3.6, Section 4.0.
-- This migration creates the new, clean-break tables and adds the referral fields.

-- 1. Create ALL new ENUM Types for the Hubs

-- Booking Status (B-STAT) SDD Section 4.1.1
CREATE TYPE booking_status_enum AS ENUM (
    'Pending',      -- B-STAT-1: Awaiting tutor confirmation
    'Confirmed',    -- B-STAT-2: Tutor confirmed, session is upcoming
    'Completed',    -- B-STAT-3: Session has passed
    'Cancelled',    -- B-STAT-4: Cancelled by either party
    'Declined'      -- B-STAT-5: Tutor declined the request
);

-- Transaction Status (T-STAT) SDD Section 4.2.2
CREATE TYPE transaction_status_enum AS ENUM (
    'Pending',      -- T-STAT-1: Awaiting completion or payout
    'Paid',         -- T-STAT-2: Funds have cleared (alias for Completed)
    'Failed',       -- T-STAT-3: Payment declined, payout failed
    'Cancelled'     -- T-STAT-4: Booking was cancelled, invalidating transaction
);

-- Transaction Type (T-TYPE) SDD Section 4.2.1
CREATE TYPE transaction_type_enum AS ENUM (
    'Booking Payment',      -- T-TYPE-1: A client paying for a session
    'Tutoring Payout',      -- T-TYPE-2: A tutor's earnings
    'Referral Commission',  -- T-TYPE-3: Any user's earnings from a referral
    'Withdrawal',           -- T-TYPE-4: A user transferring from balance to bank
    'Platform Fee'          -- T-TYPE-5: Internal tracking
);

-- Referral Status (R-STAT) SDD Section 4.3.1
CREATE TYPE referral_status_enum AS ENUM (
    'Referred',     -- R-STAT-1: Link clicked or initiated
    'Signed Up',    -- R-STAT-2: User created an account and claimed
    'Converted',    -- R-STAT-3: User made first paid booking
    'Expired'       -- R-STAT-4: Lead expired
);

-- 2. Update existing 'profiles' table
-- SDD v3.6, Section 4.0.1
ALTER TABLE public.profiles
ADD COLUMN referral_code TEXT UNIQUE, -- Code generation is handled by the handle_new_user trigger
ADD COLUMN referred_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL; -- (NEW PER Q&A) The "agent-of-Record"

-- 3. Create NEW 'bookings' Table
-- SDD Section 4.1
CREATE TABLE public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    tutor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
    referrer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- (NEW PER Q&A) This is tagged on *every* booking
    service_name TEXT NOT NULL,
    session_start_time TIMESTAMPTZ NOT NULL,
    session_duration INT NOT NULL, -- in minutes
    amount DECIMAL(10, 2) NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'Pending',
    payment_status transaction_status_enum NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_student_id ON public.bookings (student_id);
CREATE INDEX idx_bookings_tutor_id ON public.bookings (tutor_id);
CREATE INDEX idx_bookings_referrer_profile_id ON public.bookings(referrer_profile_id);

-- 4. Create NEW 'transactions' Table
-- SDD Section 4.2
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE, -- The user this transaction belongs to
    booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL,
    type transaction_type_enum NOT NULL,
    description TEXT,
    status transaction_status_enum NOT NULL DEFAULT 'Pending',
    amount DECIMAL(10, 2) NOT NULL, -- Negative for debits, Positive for credits
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_profile_id ON public.transactions (profile_id);
CREATE INDEX idx_transactions_booking_id ON public.transactions (booking_id);

-- 5. Create NEW 'referrals' Table (For Lead-Gen Tracking)
-- SDD Section 4.3
CREATE TABLE public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE, -- The user who made the referral
    referred_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- The new user who signed up
    status referral_status_enum NOT NULL DEFAULT 'Referred',
    booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL, -- The *first* booking
    transaction_id uuid REFERENCES public.transactions (id) ON DELETE SET NULL, -- The *first* commission
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);
CREATE INDEX idx_referrals_referrer_id ON public.referrals (referrer_profile_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_profile_id);

```

#### **File 2 (Frontend): Core Type Definitions**

- **File Path:** `apps/web/src/types/index.ts` (Updated)
- **Description:** This file updates the existing canonical type definition file. It implements Phase 2, Step 1 and adds the **new** `referred_by_profile_id` to the `Profile` type.

```
TypeScript
```

```
/*
 * Filename: src/types/index.ts
 * Purpose: Centralized TypeScript type definitions for the application.
 *
 * Change History:
 * C006 2025-11-02 18:00 Added referred_by_profile_id to Profile per SDD v3.6.
 * C005 2025-11-02 11:45 Added new types for Bookings, Transactions, and Referrals.
 * C004 2025-11-01 18:00 Added 'responsiveClass' to ColumnDef per SDD v3.2.
 * ... previous changes
 */
import { User } from '@supabase/supabase-js';

// --- User & Profile Types ---
// Defines the shape of the user's public profile
export type Profile = {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  website: string;
  // This is the user's available roles, not their *active* role
  roles: ('client' | 'tutor' | 'agent')[];
  // (NEW) The user's unique, reusable referral code. SDD Section 4.0.1
  referral_code: string;
  // (NEW PER Q&A) The "agent-of-Record" for lifetime commissions. SDD v3.6
  referred_by_profile_id?: string; 
  // ... other profile fields
};

// ... other existing types (e.g., Listing)

// --- Data Table Types ---
/**
 * Defines a column for the <DataTable> component.
 * Retained for Agent view (Section 6.4) and other tables.
 */
export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T | string; // Use string for nested or custom keys
  cell?: (value: any) => React.ReactNode;
  /**
   * Controls column visibility based on screen width.
   * 'mobile': Visible on all sizes (>= 320px)
   * 'tablet': Visible on tablet and desktop (>= 768px)
   * 'desktop': Visible only on desktop (>= 1024px)
   */
  responsiveClass?: 'mobile' | 'tablet' | 'desktop';
}

// --- NEW Types for Hubs (SDD v3.6, Section 4.0) ---

/**
 * Type for the NEW 'bookings' table (SDD v3.6, Section 4.1)
 */
export type Booking = {
  id: string; // UUID
  student_id: string;
  tutor_id: string;
  listing_id: string;
  referrer_profile_id?: string;
  service_name: string;
  session_start_time: string; // Timestamp
  session_duration: number; // minutes
  amount: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Declined'; // B-STAT
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Cancelled'; // T-STAT
  // Joined data (from API)
  tutor_name?: string;
  tutor_avatar_url?: string;
  student_name?: string;
  student_avatar_url?: string;
};

/**
 * Type for the NEW 'transactions' table (SDD v3.6, Section 4.2)
 */
export type Transaction = {
  id: string; // UUID
  profile_id: string;
  booking_id?: string;
  type: 'Booking Payment' | 'Tutoring Payout' | 'Referral Commission' | 'Withdrawal' | 'Platform Fee'; // T-TYPE
  description: string;
  status: 'Pending' | 'Paid' | 'Failed' | 'Cancelled'; // T-STAT
  amount: number; // e.g., -50.00 or +5.00
  created_at: string; // Timestamp
};

/**
 * Type for the NEW 'referrals' table (SDD v3.6, Section 4.3)
 */
export type Referral = {
  id: string; // UUID
  referrer_profile_id: string;
  referred_profile_id?: string;
  status: 'Referred' | 'Signed Up' | 'Converted' | 'Expired'; // R-STAT
  booking_id?: string;
  transaction_id?: string;
  created_at: string; // Timestamp
  signed_up_at?: string;
  converted_at?: string;
  // Joined data (from API)
  referred_profile_name?: string;
  commission_amount?: number;
};

```

#### **File 3 (New): The 3-Column Application Layout**

- **File Path:** `apps/web/src/app/(authenticated)/layout.tsx` (New File & Directory)
- **Description:** This file creates the new 3-column layout specified in SDD Section 5.0. This is the container that all new hubs will be rendered inside.

```
TypeScript
```

```
/*
 * Filename: src/app/(authenticated)/layout.tsx
 * Purpose: Implements the new 3-column application layout for all authenticated pages.
 * Description: This layout uses a route group to wrap all authenticated hubs
 * (Bookings, Financials, Referrals, etc.) with the new UI.
 * Specification: SDD v3.6, Section 5.0
 */
import AppSidebar from '@/app/components/layout/AppSidebar';
import ContextualSidebar from '@/app/components/layout/ContextualSidebar';
import styles from '@/app/components/layout/AppLayout.module.css'; // This CSS file will need to be created

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.appLayout}>
      {/* Column 1: Main App Navigation */}
      <AppSidebar />
      
      {/* Column 2: Page Content */}
      <main className={styles.pageContent}>
        {children}
      </main>
      
      {/* Column 3: Contextual Sidebar */}
      <ContextualSidebar />
    </div>
  );
}

```

#### **File 4 (New): The Application Sidebar (Column 1)**

- **File Path:** `apps/web/src/app/components/layout/AppSidebar.tsx` (New File)
- **Description:** This is a skeleton component for the main navigation (Column 1). A developer would fully populate this with styled `NavLink` components.

```
TypeScript
```

```
/*
 * Filename: src/app/components/layout/AppSidebar.tsx
 * Purpose: The main application navigation sidebar (Column 1).
 * Specification: SDD v3.6, Section 5.0
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppSidebar.module.css'; // This CSS file will need to be created

// TODO: Replace with real NavLink component from repo
const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <Link href={href} className={isActive ? styles.activeLink : styles.link}>
      {children}
    </Link>
  );
};

const AppSidebar = () => {
  return (
    <nav className={styles.appSidebar}>
      <div className={styles.logoArea}>
        {/* Logo component would go here */}
        <span>Tutorwise</span>
      </div>
      <ul className={styles.navList}>
        <li><NavLink href="/dashboard">Home</NavLink></li>
        <li><NavLink href="/bookings">My Bookings</NavLink></li>
        <li><NavLink href="/referrals">Referrals</NavLink></li>
        <li><NavLink href="/financials">Financials</NavLink></li>
        <li><NavLink href="/messages">Messages</NavLink></li>
        <li><NavLink href="/my-listings">My Listings</NavLink></li>
        {/* ... other nav links */}
      </ul>
      <div className={styles.footer}>
        {/* User profile menu would go here */}
      </div>
    </nav>
  );
};

export default AppSidebar;

```

#### **File 5 (New): The Contextual Sidebar (Column 3)**

- **File Path:** `apps/web/src/app/components/layout/ContextualSidebar.tsx` (New File)
- **Description:** This is a skeleton component for the context-aware sidebar (Column 3). It renders different content based on the current route.

```
TypeScript
```

```
/*
 * Filename: src/app/components/layout/ContextualSidebar.tsx
 * Purpose: The context-aware sidebar (Column 3).
 * Description: This component will render different content based on the
 * current page (e.g., "Next Session" on /bookings).
 * Specification: SDD v3.6, Section 5.0
 */
'use client';

import { usePathname } from 'next/navigation';
import styles from './ContextualSidebar.module.css'; // This CSS file will need to be created
import { Card } from '@/app/components/ui/Card'; // Assuming Card is at this path

// Mock components for different contexts
const NextSessionCard = () => (
  <Card>
    <h4>Next Session</h4>
    <p>Maths Tutoring</p>
    <p>Today at 4:00 PM</p>
  </Card>
);

const MyReferralCodeCard = () => (
  <Card>
    <h4>Your Referral Code</h4>
    <p>Share this code with new users:</p>
    <code>JANE-123</code>
  </Card>
);

const ContextualSidebar = () => {
  const pathname = usePathname();

  const renderContextualContent = () => {
    if (pathname.startsWith('/bookings')) {
      return <NextSessionCard />;
    }
    if (pathname.startsWith('/referrals')) {
      return <MyReferralCodeCard />;
    }
    // ... other contexts
    
    return null; // Render nothing by default
  };

  return (
    <aside className={styles.contextualSidebar}>
      {renderContextualContent()}
    </aside>
  );
};

export default ContextualSidebar;

```

#### **File 6 (New): The Booking Hub Page (Router)**

- **File Path:** `apps/web/src/app/bookings/page.tsx` (New File & Directory)
- **Description:** This is the first new page file for our hubs (Phase 3, Step 1). It acts as a role-based router, rendering the correct view in Column 2.

```
TypeScript
```

```
/*
 * Filename: src/app/bookings/page.tsx
 * Purpose: The main "Booking Hub" page (the page router).
 * Description: This is a client component that acts as a role-based router.
 * It renders inside the new 3-column AppLayout. It fetches the user's
 * active role and renders the corresponding view (Client, Tutor, or Agent).
 * Specification: SDD v3.6, Section 6.1
 */
'use client';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './components/BookingView.module.css'; // Shared styles for the views

// Import the view components that this router will switch between
// These files will be created in the next steps (Section 6.2, 6.3, 6.4)
// import ClientBookingView from './components/ClientBookingView';
// import TutorBookingView from './components/TutorBookingView';
// import AgentBookingView from './components/AgentBookingView';

// --- Placeholder Components ---
// These are placeholders until the real files are created.
const ClientBookingView = () => <div>Client View (To be implemented)</div>;
const TutorBookingView = () => <div>Tutor View (To be implemented)</div>;
const AgentBookingView = () => <div>Agent View (To be implemented)</div>;
// --- End Placeholders ---

const BookingsPage = () => {
  const { profile, activeRole, isLoading } = useUserProfile();

  // 1. Handle Loading State
  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader title="Loading Bookings..." />
        <div>Loading...</div>
      </div>
    );
  }

  // 2. Define Title Map per Section 6.1
  const titleMap: { [role: string]: string } = {
    client: 'My Bookings',
    tutor: 'My Schedule',
    agent: 'Agency Bookings',
  };
  const title = titleMap[activeRole] || 'Bookings';

  // 3. Render the correct view based on the activeRole
  const renderView = () => {
    switch (activeRole) {
      case 'client':
        return <ClientBookingView />;
      case 'tutor':
        return <TutorBookingView />;
      case 'agent':
        return <AgentBookingView />;
      default:
        // Fallback for an unexpected or unhandled role
        return <div>Error: Unknown user role or no role selected.</div>;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <PageHeader title={title} />
      {renderView()}
    </div>
  );
};

export default BookingsPage;

```

#### **File 7 (New): Reusable Booking Card Component**

- **File Path:** `apps/web/src/app/bookings/components/BookingCard.tsx` (New File)
- **Description:** This is the "singular" component that renders a single booking. It is used by all roles and is responsive by default, per SDD v3.6, Appendix B & Section 11.4.

```
TypeScript
```

```
/*
 * Filename: src/app/bookings/components/BookingCard.tsx
 * Purpose: Renders a single booking as a card. Used by all booking views.
 * Description: This component displays booking details and a contextual
 * action button based on the booking's status.
 * Specification: SDD v3.6, Appendix B & Sections 6.2, 11.4
 */
'use client';

import Link from 'next/link';
import type { Booking } from '@/types';
import { Card } from '@/app/components/ui/Card';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { Button } from '@/app/components/ui/Button';
import styles from './BookingCard.module.css'; // This CSS file will need to be created

interface BookingCardProps {
  booking: Booking;
  /** The active role of the user, to show the correct name */
  activeRole: 'client' | 'tutor' | 'agent';
}

export const BookingCard = ({ booking, activeRole }: BookingCardProps) => {
  const formattedDate = new Date(booking.session_start_time).toLocaleDateString(
    'en-GB',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    }
  );
  
  const formattedTime = new Date(booking.session_start_time).toLocaleTimeString(
    'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  );

  // Show the other party in the booking
  const attendeeName =
    activeRole === 'client'
      ? `with ${booking.tutor_name || 'Tutor'}`
      : `with ${booking.student_name || 'Student'}`;

  /**
   * Renders the correct action button for a card based on the booking's status.
   */
  const renderAction = () => {
    // CLIENT ACTIONS (SDD v3.6, Section 6.2 & 11.4)
    if (activeRole === 'client') {
      switch (booking.status) {
        case 'Confirmed': // B-STAT-2
          return (
            <Button variant="secondary" size="sm" fullWidth={true}>
              Manage Session
            </Button>
          );
        case 'Completed': // B-STAT-3
          // (THIS IS THE MODIFICATION per SDD 11.4)
          return (
            <Link
              href={`/tutor/${booking.tutor_id}/${booking.listing_id || 'listing'}`}
              passHref
            >
              <Button variant="primary" size="sm" fullWidth={true}>
                Book Again
              </Button>
            </Link>
          );
        case 'Pending': // B-STAT-1
          return (
            <Button variant="danger" size="sm" fullWidth={true}>
              Cancel Request
            </Button>
          );
        default:
          return null; // No action for 'Cancelled' or 'Declined'
      }
    }
    
    // TUTOR ACTIONS (SDD v3.6, Section 6.3)
    if (activeRole === 'tutor') {
      switch (booking.status) {
        case 'Pending': // B-STAT-1
          return (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="danger" size="sm" fullWidth={true}>Decline</Button>
              <Button variant="primary" size="sm" fullWidth={true}>Confirm</Button>
            </div>
          );
        case 'Confirmed': // B-STAT-2
          return (
            <Button variant="secondary" size="sm" fullWidth={true}>
              Start Session
            </Button>
          );
        default:
          return null;
      }
    }
    
    // AGENT ACTIONS
    if (activeRole === 'agent') {
      return (
        <Button variant="secondary" size="sm" fullWidth={true}>
          View Details
        </Button>
      );
    }
    
    return null;
  };

  return (
    <Card padding="md" className={styles.bookingCard}>
      <div className={styles.cardHeader}>
        <h4 className={styles.serviceName}>{booking.service_name}</h4>
        <StatusBadge status={booking.status} />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.attendeeName}>{attendeeName}</p>
        <p className={styles.dateTime}>
          {formattedDate} at {formattedTime}
        </p>
      </div>
      <div className={styles.cardAction}>
        {renderAction()}
      </div>
    </Card>
  );
};

export default BookingCard;

```

#### **File 8 (New): Shared Responsive Card Grid CSS**

- **File Path:** `apps/web/src/app/bookings/components/BookingView.module.css` (New File)
- **Description:** This new CSS module implements the "Card-First Responsive Design" grid from SDD v3.6, Section 9.0 & Appendix A. It will be shared by all three new hubs.

```
CSS
```

```
/*
 * Filename: src/app/bookings/components/BookingView.module.css
 * Purpose: Implements the "Card-First Responsive Design" (SDD v3.6, Section 9.0)
 * This is the main layout for the hub views.
 */

.pageContainer {
  width: 100%;
}

.heroGrid {
  /* This is for the StatCard hero section */
  margin-bottom: var(--space-4, 24px);
}

/*
 * 1. Mobile-First: By default, we show a single-column list.
 * This is for screens < 768px
 */
.cardGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3, 16px);
  margin-top: var(--space-4, 24px); /* Space below the tabs */
}

/*
 * 2. Tablet & Desktop: At the 768px breakpoint,
 * we reflow the cards into a responsive multi-column grid.
 */
@media (min-width: 768px) {
  .cardGrid {
    /* Creates 2-3 responsive columns */
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4, 24px);
  }
}

.emptyState {
  padding: var(--space-5, 48px) var(--space-3, 16px);
  text-align: center;
  color: var(--color-text-secondary);
}

```

#### **File 9 (New): The Client Booking View Component**

- **File Path:** `apps/web/src/app/bookings/components/ClientBookingView.tsx` (New File)
- **Description:** This is the main component for the client role (Section 6.2). It renders the StatGrid, tabs, and the new responsive card grid.

```
TypeScript
```

```
/*
 * Filename: src/app/bookings/components/ClientBookingView.tsx
 * Purpose: Renders the booking management view for users with the 'client' role.
 * Description: This component fetches the client's bookings and displays them
 * in a tabbed, "card-first" interface, with a 4-card stat hero.
 * Specification: SDD v3.6, Section 6.2
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Booking } from '@/types';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

// Import all required "System First" components (SDD v3.6, Section 2.0)
import { Card } from '@/app/components/ui/Card';
import { Tabs } from '@/app/components/ui/Tabs';
import { StatCard } from '@/app/components/ui/reports/StatCard';
import { StatGrid } from '@/app/components/ui/reports/StatGrid';

// Import the new components
import styles from './BookingView.module.css'; // The shared responsive layout
import { BookingCard } from './BookingCard'; // The new responsive card

// --- Data Fetching Hook (Mock) ---
// This hook fetches data from the new server-side API (SDD v3.6, Section 8.4)
const useClientBookings = (userId: string, status: string) => {
  const [data, setData] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    // The filter logic is on the server, per SDD v3.6, Section 2.0
    // Example: GET /api/bookings?status=Confirmed
    fetch(`/api/bookings?status=${status}`)
      .then((res) => res.json())
      .then((bookings) => {
        // Mock data in case API is not ready
        if (bookings.length === 0) {
          setData(getMockBookings(status));
        } else {
          setData(bookings);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching bookings:', err);
        setData(getMockBookings(status)); // Fallback to mock data
        setIsLoading(false);
      });
  }, [userId, status]);

  return { data, isLoading };
};

// --- Main Component ---
const ClientBookingView = () => {
  const { profile } = useUserProfile();
  // Default tab is 'Upcoming' per SDD Section 6.2
  const [activeTab, setActiveTab] = useState('Upcoming');

  const tabOptions = [
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  // This maps our user-friendly tab names to the API/DB enum values
  const statusMap: { [key: string]: string } = {
    Upcoming: 'Confirmed', // B-STAT-2
    Pending: 'Pending', // B-STAT-1
    Completed: 'Completed', // B-STAT-3
    Cancelled: 'Cancelled', // B-STAT-4
  };
  
  const apiStatus = statusMap[activeTab] || 'Confirmed';

  // Fetch data based on the active tab
  const { data: bookings, isLoading } = useClientBookings(
    profile?.id || '',
    apiStatus
  );

  // Calculate stats for the Hero Grid (SDD v3.6, Section 6.2)
  // In a real app, this would come from a separate /api/bookings/stats endpoint
  const stats = useMemo(() => {
    // This is a placeholder. A real implementation would fetch all data
    // or use a dedicated stats endpoint.
    return {
      total: bookings.length, // This is incorrect, just for this tab
      upcoming: activeTab === 'Upcoming' ? bookings.length : 0,
      completed: activeTab === 'Completed' ? bookings.length : 0,
      cancelled: activeTab === 'Cancelled' ? bookings.length : 0,
    };
  }, [bookings, activeTab]);

  return (
    <div className={styles.pageContainer}>
      {/* 1. Hero Section (SDD v3.6, Section 6.2) */}
      <div className={styles.heroGrid}>
        <StatGrid>
          <StatCard title="Total Bookings" value={stats.total} />
          <StatCard title="Upcoming" value={stats.upcoming} />
          <StatCard title="Completed" value={stats.completed} />
          <StatCard title="Cancelled" value={stats.cancelled} />
        </StatGrid>
      </div>

      {/* 2. Main Bookings Card with Tabs and Card Grid */}
      <Card>
        <Tabs
          tabs={tabOptions}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as string)}
        />

        {/* 3. Responsive Card Grid (SDD v3.6, Section 9.0) */}
        {isLoading ? (
          <div className={styles.emptyState}>Loading bookings...</div>
        ) : (
          <div className={styles.cardGrid}>
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  activeRole="client"
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>You have no {activeTab.toLowerCase()} bookings.</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClientBookingView;

// --- Mock Data ---
// A developer would use this until the API is live.
const getMockBookings = (status: string): Booking[] => {
  const mockBooking: Booking = {
    id: 'b1',
    student_id: 'u1',
    tutor_id: 'u2',
    listing_id: 'l1',
    service_name: 'A-Level Maths Revision',
    session_start_time: new Date(Date.now() + 86400000).toISOString(),
    session_duration: 60,
    amount: 50.0,
    status: 'Confirmed',
    payment_status: 'Paid',
    tutor_name: 'Jane Doe',
    student_name: 'John Smith',
  };

  if (status === 'Confirmed') {
    return [mockBooking];
  }
  if (status === 'Pending') {
    return [
      {
        ...mockBooking,
        id: 'b2',
        status: 'Pending',
        payment_status: 'Pending',
      },
    ];
  }
  if (status === 'Completed') {
    return [
      {
        ...mockBooking,
        id: 'b3',
        status: 'Completed',
        session_start_time: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
  return [];
};

```

#### **File 10 (Modified): The Signup Page**

- **File Path:** `apps/web/src/app/signup/page.tsx` (Modified)
- **Description:** This file is modified to implement the "Explicit Claim" mechanism from SDD v3.6, Section 11.1, by adding the "Referral Code (Optional)" field. It also reads the anonymous referral cookie.

```
TypeScript
```

```
/*
 * Filename: src/app/signup/page.tsx
 * Purpose: Handles user registration.
 * Description: (MODIFIED) This page is updated per SDD v3.6 to include
 * the "Referral Code (Optional)" field for explicit claims, and to
 * pass the anonymous referral cookie ID (if present) to the Supabase auth trigger.
 * Specification: SDD v3.6, Sections 8.2, 11.1
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { getCookie } from 'cookies-next'; // Import cookie helper

// Import existing UI components
import Logo from '@/app/components/shared/Logo';
import { Card } from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/form/Input';
import FormField from '@/app/components/ui/form/FormField';
import Message from '@/app/components/ui/Message';
import styles from '@/app/styles/auth.module.css';
import { validationMessages } from '@/lib/validation/messages';

type FormData = {
  fullName: string;
  email: string;
  password: string;
  referralCode: string; // <-- NEW FIELD
};

export default function Signup() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const handleSignUp = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    
    // Get the anonymous referral ID from the cookie (SDD v3.6, Section 8.2)
    const cookieReferralId = getCookie('tutorwise_referral_id');
    
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            // Pass both claim methods to the handle_new_user trigger
            referral_code: data.referralCode || null,
            cookie_referral_id: cookieReferralId || null,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        // A confirmation email has been sent.
        // We can't redirect to /onboarding yet, user must confirm email.
        // Redirect to a "check your email" page.
        router.push('/auth/callback?message=Check your email to confirm signup');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authLogo}>
        <Logo />
      </div>
      <Card className={styles.authCard}>
        <h1 className={styles.authTitle}>Create an account</h1>
        <p className={styles.authSubtitle}>
          Start your journey with Tutorwise
        </p>
        
        {error && <Message variant="error" message={error} />}
        
        <form
          className={styles.authForm}
          onSubmit={handleSubmit(handleSignUp)}
          noValidate
        >
          <FormField
            label="Full Name"
            error={errors.fullName?.message}
            htmlFor="fullName"
          >
            <Input
              id="fullName"
              type="text"
              {...register('fullName', {
                required: validationMessages.required,
              })}
              aria-invalid={errors.fullName ? 'true' : 'false'}
            />
          </FormField>
          
          <FormField
            label="Email"
            error={errors.email?.message}
            htmlFor="email"
          >
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: validationMessages.required,
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: validationMessages.email,
                },
              })}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
          </FormField>
          
          <FormField
            label="Password"
            error={errors.password?.message}
            htmlFor="password"
          >
            <Input
              id="password"
              type="password"
              {...register('password', {
                required: validationMessages.required,
                minLength: {
                  value: 6,
                  message: validationMessages.minLength(6),
                },
              })}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
          </FormField>
          
          {/* --- NEW FIELD (SDD v3.6, Section 11.1) --- */}
          <FormField
            label="Referral Code (Optional)"
            error={errors.referralCode?.message}
            htmlFor="referralCode"
          >
            <Input
              id="referralCode"
              type="text"
              placeholder="e.g., JANE-123"
              {...register('referralCode')}
            />
          </FormField>
          {/* --- END NEW FIELD --- */}
          
          <Button
            type="submit"
            variant="primary"
            fullWidth={true}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        
        <p className={styles.authLink}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </Card>
    </div>
  );
}

```

#### **File 11 (New): The** `handle_new_user` **Database Trigger**

- **File Path:** `apps/api/migrations/029_update_handle_new_user_trigger_v3_5.sql`
- **Description:** This file **replaces** the old `handle_new_user` trigger. It implements the full "Lifetime Attribution" logic from SDD v3.6, Section 8.2, stamping the agent's ID onto the new user's profile.

```
SQL
```

```
-- Migration 029: Update handle_new_user trigger for SDD v3.6
-- This migration DROPS the old trigger and RE-CREATES it
-- with the new "Lifetime Attribution" logic.
-- Specification: SDD v3.6, Section 8.2

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- 2. Create the new, updated handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic
  referral_code_input TEXT;
  cookie_referral_id_input UUID;
  referrer_id_from_code UUID;
  referrer_id_from_cookie UUID;
  referral_row_from_cookie_id UUID;
  v_referrer_id UUID; -- The final determined agent ID
BEGIN
  -- Section 1: Create the user's public profile
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    -- Generate a unique human-readable code (e.g., JANE12345)
    UPPER(REPLACE(SUBSTRING(new.raw_user_meta_data ->> 'full_name', 1, 4), ' ', '')) || (FLOOR(random() * 90000) + 10000)::text
  );

  -- Section 2: Handle Referral Pipeline Logic (SDD v3.6, Section 8.2)
  referral_code_input := new.raw_user_meta_data ->> 'referral_code';
  cookie_referral_id_input := (new.raw_user_meta_data ->> 'cookie_referral_id')::UUID;
  v_referrer_id := NULL;

  -- Priority 1: Check for an EXPLICIT referral code claim
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    -- Find the agent who owns this code
    SELECT id INTO referrer_id_from_code
    FROM public.profiles
    WHERE referral_code = UPPER(referral_code_input)
    LIMIT 1;
    
    IF referrer_id_from_code IS NOT NULL THEN
      v_referrer_id := referrer_id_from_code;
    END IF;
  END IF;

  -- Priority 2: Check for an IMPLICIT cookie claim (if no code was used)
  IF v_referrer_id IS NULL AND cookie_referral_id_input IS NOT NULL THEN
    -- Find the "Anonymous Lead" record from the cookie
    SELECT referrer_profile_id INTO referrer_id_from_cookie
    FROM public.referrals
    WHERE id = cookie_referral_id_input
      AND status = 'Referred'
      AND referred_profile_id IS NULL
    LIMIT 1;

    IF referrer_id_from_cookie IS NOT NULL THEN
      v_referrer_id := referrer_id_from_cookie;
    END IF;
  END IF;

  -- Section 3: Stamp the user and update the lead-gen table
  IF v_referrer_id IS NOT NULL THEN
    -- (NEW PER Q&A) STAMP THE agent-OF-RECORD for lifetime attribution
    UPDATE public.profiles
    SET referred_by_profile_id = v_referrer_id
    WHERE id = new.id;

    -- Now, update the lead-gen 'referrals' table (find-or-create)
    IF cookie_referral_id_input IS NOT NULL THEN
        -- Check if cookie matches the code agent, or if it's a cookie-only claim
        UPDATE public.referrals
        SET
          referred_profile_id = new.id,
          status = 'Signed Up',
          signed_up_at = now()
        WHERE id = cookie_referral_id_input AND referrer_profile_id = v_referrer_id;
        
        -- If update failed (e.g., code mismatch), create a new record
        IF NOT FOUND THEN
          INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
          VALUES (v_referrer_id, new.id, 'Signed Up', now());
        END IF;
    ELSE
        -- No cookie, but a valid code was used. Create a new "Signed Up" record.
        INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
        VALUES (v_referrer_id, new.id, 'Signed Up', now());
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 3. Re-apply the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

```

#### **File 12 (New): The Stripe Webhook (Critical Integration)**

- **File Path:** `apps/web/src/app/api/webhooks/stripe/route.ts` (New File)
- **Description:** This new route is the "engine" that receives payment confirmations from Stripe and calls our database RPC to execute the 80/10/10 commission split.

```
TypeScript
```

```
/*
 * Filename: src/app/api/webhooks/stripe/route.ts
 * Purpose: Handles Stripe webhooks, specifically 'payment_intent.succeeded'.
 * Description: This is the critical backend logic. It validates the webhook
 * and calls the 'handle_successful_payment' RPC to do all the work.
 * Specification: SDD v3.6, Section 8.6
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Database } from '@/types/supabase'; // Assuming you have this type

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  const sig = request.headers.get('stripe-signature');
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error(`Error verifying Stripe webhook: ${err.message}`);
    return new NextResponse(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
      
      // Get the booking_id from metadata.
      const { booking_id } = paymentIntent.metadata;

      if (!booking_id) {
        console.error('Webhook Error: No booking_id in payment_intent metadata');
        // Return 200 to Stripe so it doesn't retry, but log the error
        return NextResponse.json({ received: true, error: 'No booking_id' });
      }

      try {
        // ATOMIC DATABASE TRANSACTION
        // We call a single Supabase RPC (database function) to perform all
        // updates atomically. This ensures if one step fails, they all roll back.
        // This function MUST be created in a new migration.
        const { error: rpcError } = await supabase.rpc(
          'handle_successful_payment',
          {
            p_booking_id: booking_id,
          }
        );

        if (rpcError) {
          throw new Error(
            `RPC Error (handle_successful_payment): ${rpcError.message}`
          );
        }
        
        console.log(`Successfully processed payment for booking: ${booking_id}`);
        break;

      } catch (e: any) {
        console.error(
          `Failed to process payment_intent ${paymentIntent.id}:`,
          e.message
        );
        return new NextResponse(
          JSON.stringify({ error: 'Database update failed' }),
          { status: 500 }
        );
      }
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to Stripe
  return NextResponse.json({ received: true });
}

```

#### **File 13 (New): The Database Function (RPC)**

- **File Path:** `apps/api/migrations/030_create_payment_webhook_rpc.sql` (New File)
- **Description:** This is the SQL database function that the Stripe webhook calls. It performs the atomic transaction described in SDD v3.6, Section 8.6, executing the 80/10/10 or 90/10 commission split.

```
SQL
```

```
-- Migration 030: Create RPC for atomic payment processing
-- This function is called by the Stripe webhook (SDD v3.6, Section 8.6)
-- to execute the 80/10/10 or 90/10 commission split.

CREATE OR REPLACE FUNCTION public.handle_successful_payment(
    p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_new_commission_tx_id UUID;
  v_platform_fee_percent DECIMAL := 0.10; -- 10%
  v_referrer_commission_percent DECIMAL := 0.10; -- 10%
  v_tutor_payout_amount DECIMAL;
  v_referrer_commission_amount DECIMAL;
  v_platform_fee_amount DECIMAL;
BEGIN
  -- 1. Fetch the booking to be processed
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE; -- Lock the row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found with id %', p_booking_id;
  END IF;

  -- 2. Create the client's 'Booking Payment' transaction (T-TYPE-1)
  -- This is always the full amount, and always negative.
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'Paid', -v_booking.amount);

  -- 3. Calculate commission splits based on Lifetime Attribution
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;

  IF v_booking.referrer_profile_id IS NOT NULL THEN
    -- THIS IS A REFERRED BOOKING (80/10/10 SPLIT)
    v_referrer_commission_amount := v_booking.amount * v_referrer_commission_percent;
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount - v_referrer_commission_amount; -- 80%
    
    -- 3a. Create agent's 'Referral Commission' transaction (T-TYPE-3)
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount)
    VALUES
      (v_booking.referrer_profile_id, p_booking_id, 'Referral Commission', 'Commission from ' || v_booking.service_name, 'Pending', v_referrer_commission_amount)
    RETURNING id INTO v_new_commission_tx_id; -- Get the ID for the lead-gen table

  ELSE
    -- THIS IS A DIRECT BOOKING (90/10 SPLIT)
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount; -- 90%
    v_new_commission_tx_id := NULL; -- No commission
  END IF;

  -- 4. Create the tutor's 'Tutoring Payout' transaction (T-TYPE-2)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout', 'Payout for ' || v_booking.service_name, 'Pending', v_tutor_payout_amount);

  -- 5. Create the 'Platform Fee' transaction (T-TYPE-5)
  -- This is an internal record, so we can assign it to the student's profile or a system profile
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Platform Fee', 'Platform fee for ' || v_booking.service_name, 'Paid', -v_platform_fee_amount);

  -- 6. Update the booking table
  UPDATE public.bookings
  SET payment_status = 'Paid'
  WHERE id = p_booking_id;

  -- 7. Update the lead-gen 'referrals' table (first conversion only)
  -- This updates the /referrals hub UI but does NOT drive future commission.
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status = 'Converted',
      booking_id = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at = now()
    WHERE referred_profile_id = v_booking.student_id
      AND status != 'Converted';
  END IF;

END;
$$;

```

#### **File 14 (Modified): The Listing Detail Page**

- **File Path:** `apps/web/src/app/tutor/[id]/[slug]/page.tsx` (Modified)
- **Description:** This file is modified to implement the "Book Now" funnel. The `handleBookSession` function is updated to fetch the user's `referred_by_profile_id` and pass it to the new booking record.

```
TypeScript
```

```
/*
 * Filename: src/app/tutor/[id]/[slug]/page.tsx
 * Purpose: Displays the public detail page for a single service listing.
 * Description: (MODIFIED) This is the primary "Book Now" funnel. The booking
 * logic is updated to integrate with the new /api/bookings endpoint and
 * pass all required data, including the referrer_profile_id.
 * Specification: SDD v3.6, Section 11.2
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

// Import all required UI components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import StatusBadge from '@/app/components/ui/StatusBadge';
import { toast } from 'react-hot-toast';

// Import types
import { Profile, Listing } from '@/types'; // Assuming 'Listing' is in types/index.ts
import styles from './page.module.css';

// A placeholder type for the joined listing data
type ListingDetails = Listing & {
  tutor: Profile;
};

export default function ListingDetailPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const { profile: userProfile } = useUserProfile(); // Get the current user
  
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const fetchListing = async () => {
      if (!params.id || !params.slug) return;
      setIsLoading(true);
      
      // This would be an API call to fetch listing details + tutor profile
      // e.g., GET /api/listings/${params.id}
      try {
        // Mocking the fetch for this example
        const mockListing: ListingDetails = {
          id: params.id as string,
          tutor_id: 'tutor-uuid',
          service_name: 'A-Level Maths Revision',
          description: 'A detailed course on A-Level Maths.',
          amount: 50.0,
          session_duration: 60,
          //... other listing fields
          tutor: {
            id: 'tutor-uuid',
            full_name: 'Jane Doe',
            //... other profile fields
          } as Profile,
        };
        setListing(mockListing);
      } catch (err: any) {
        setError('Failed to load listing.');
        toast.error('Failed to load listing.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [params.id, params.slug]);

  // (NEW) Booking Handler (SDD v3.6, Section 11.2)
  const handleBookSession = async () => {
    if (!listing || !selectedDate || !userProfile) {
      toast.error('Please select a date and be logged in to book.');
      return;
    }

    setIsBooking(true);
    toast.loading('Sending booking request...');

    // 1. Gather all required data
    const bookingData = {
      student_id: userProfile.id,
      tutor_id: listing.tutor_id,
      listing_id: listing.id,
      service_name: listing.service_name,
      session_start_time: selectedDate.toISOString(),
      session_duration: listing.session_duration,
      amount: listing.amount,
      // 2. (CRITICAL) Pass the "agent-of-Record" ID from the user's profile
      referrer_profile_id: userProfile.referred_by_profile_id || null,
    };

    try {
      // 3. Call the new /api/bookings endpoint (which creates the 'Pending' booking)
      // This is a new API route, e.g., POST /api/bookings
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error('Booking request failed');
      }

      const newBooking = await response.json();
      
      toast.dismiss();
      toast.success('Booking request sent!');
      
      // 4. Redirect the user to their new bookings hub.
      // (This could also open a payment modal first)
      window.location.href = '/bookings';

    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'An error occurred.');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <Container><div>Loading listing...</div></Container>;
  }
  
  if (error) {
    return <Container><div>{error}</div></Container>;
  }

  if (!listing) {
    return <Container><div>Listing not found.</div></Container>;
  }

  return (
    <Container>
      <div className={styles.pageLayout}>
        {/* Left Column: Listing Details */}
        <div className={styles.mainContent}>
          <Card>
            <PageHeader title={listing.service_name} />
            <div className={styles.tutorInfo}>
              {/* Tutor Avatar */}
              <span>with {listing.tutor.full_name}</span>
            </div>
            <div className={styles.description}>
              <p>{listing.description}</p>
              {/* ... other components like ReviewsSection ... */}
            </div>
          </Card>
        </div>
        
        {/* Right Column: Booking Card */}
        <aside className={styles.sidebar}>
          <Card>
            <div className={styles.bookingCard}>
              <div className={styles.price}>
                £{listing.amount.toFixed(2)}
                <span>/ {listing.session_duration} minutes</span>
              </div>
              
              {/* A placeholder for a Date/Time picker */}
              <div className={styles.datePicker}>
                <label>Select a date:</label>
                <input
                  type="datetime-local"
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
              </div>

              {/* (MODIFIED) This button now triggers the new handler */}
              <Button
                variant="primary"
                fullWidth={true}
                onClick={handleBookSession}
                loading={isBooking}
                disabled={isBooking}
              >
                Request to Book
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}

```

#### **File 15 (Action): Deprecation and Cleanup**

- **File Path:** `N/A (Action for developer)`
- **Description:** This is the final action from SDD v3.6, Section 10.0. This is a set of commands and actions for the developer to run.

**Action 1: Delete the Legacy** `referral-activities` **Directory**

The developer must delete the old, deprecated `referral-activities` directory and all its contents.

- **Action:** `DELETE DIRECTORY`
- **Files to Delete:**
  - `apps/web/src/app/referral-activities/page.tsx`
  - `apps/web/src/app/referral-activities/page.module.css`
- **Justification:** This directory is 100% replaced by our new, separated `/financials` and `/referrals` hubs. Its existence is now a technical debt and will cause confusion.

**Action 2: Rename the Legacy** `transaction-history` **Directory**

The developer must rename the old `transaction-history` directory to `financials`, which we have already populated with our new `FinancialsPage` component.

- **Action:** `RENAME DIRECTORY`
- **From:** `apps/web/src/app/transaction-history/`
- **To:** `apps/web/src/app/financials/`
- **Justification:** This finalizes the deprecation. Our new `apps/web/src/app/financials/page.tsx` (which we've already built) now lives in the correctly named route.

**Action 3: Update All Internal Application Links**

The developer must perform a global search and replace across the entire `apps/web` codebase to fix any broken links.

- **Action:** Find all instances of `<Link href="...">` or `router.push(...)` that point to the old routes and update them.
- **Search for:**
  - `/referral-activities`
  - `/transaction-history`
- **Replace with:**
  - `/referrals` (if the link was for tracking the pipeline).
  - `/financials` (if the link was for tracking payments/commissions).
- **Key File to Check:** A primary file to update will be the main dashboard (`apps/web/src/app/dashboard/page.tsx`), which likely still has links to these old pages.

* * *

After these three actions are completed, the implementation of SDD v3.6 is finished.