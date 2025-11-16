# free-help-solution-design-v5.9

Here is the updated Solution Design Document, refined with the new "Free Help Now" model and all corresponding architectural changes.

* * *

### **Solution Design: Free Help Now (v5.9)**

- **Version:** 5.9 (Refined)
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites (Core Systems):**
  - `caas-solution-design-v5.5.md` (Provides the CaaS engine)
  - `student-onboarding-solution-design-v5.0.md` (Provides Google integration APIs)
  - `profile-graph-solution-design-v4.6.md` (Provides user relationship data)
  - `referral-system-solution-design-v4.3.md` (Provides viral loop mechanics)
- **Dependent (Bypassed):**
  - `payments-solution-design-v4.9.md` (This flow **intentionally bypasses** the payment system)

* * *

### 1.0 Executive Summary

This document outlines the architecture for the **Free Help Now (v5.9)** feature. This is a strategic, non-monetized feature designed to achieve several core business goals:

1. **Democratize Tutoring:** Reach and serve the underserved market segment by removing all cost barriers.
2. **Increase Tutor Utility:** Allow tutors to convert "idle time" into a valuable asset.
3. **Create a CaaS Flywheel:** Provide a new, high-value data source for the CaaS (Credibility as a Service) engine.
4. **Drive Lead Generation:** Act as a powerful, free lead-generation tool for tutors to convert students into full-price clients.

#### The "Reputation as a Reward" Model

This feature is a "freemium" model where **no money changes hands**.

- **For Students:** A student can instantly connect with a verified tutor for a 30-minute free session.
- **For Tutors:** The tutor is "paid" in a currency more valuable than cash: **reputation**. Every completed free session will grant the tutor a significant point boost to their **CaaS Score**, directly increasing their visibility and ranking in the marketplace for paid bookings.

This creates a virtuous cycle: tutors are incentivized to volunteer, which builds their CaaS reputation, which in turn drives their paid business. This is our "innovation achievement," allowing us to use our core architecture to decentralize and democratize education.

#### Key Naming & Technical Decisions:

- **Feature Name:** **Free Help Now**
- **Tutor-Facing Toggle:** **"Offer Free Help"**
- **Student-Facing Badge:** **"Free Help Now"**
- **Student-Facing Button:** **"Get Free Help Now"** (with subtext: "Starts in 5 minutes")
- **Cost:** **£0**. This flow will architecturally bypass all Stripe APIs.
- **Video Platform:** **Google Meet**. This is the optimal, zero-cost, and lowest-risk path, leveraging the existing Google integration APIs specified in v5.0.

* * *

### 2.0 Core Architectural Components

#### 2.1 Component 1: Real-time Presence System

This system reliably tracks tutor availability across multiple devices.

- **Technology:** A high-speed **Redis** cache will be used to manage presence state with a short Time-To-Live (TTL).
- **Mechanism (User-Centric Heartbeat):**
  1. **Tutor Toggles ON:** Tutor enables the **"Offer Free Help"** toggle in `apps/web/src/app/(authenticated)/account/settings/page.tsx`. The client app sends `POST /api/presence/free-help/online`.
  2. **Server Sets Status:** The server creates a Redis key (e.g., `presence:free-help:<tutor_id>`) with a 5-minute expiry and updates the `available_free_help` column in the `profiles` table to `true`.
  3. **Heartbeat:** As long as *any* of the tutor's authenticated devices are active, that device will send a silent `POST /api/presence/free-help/heartbeat` request every 4 minutes. This request resets the 5-minute expiry on the Redis key.
  4. **Tutor Toggles OFF (or Closes All Devices):**
    - **Graceful Offline:** `POST /api/presence/free-help/offline` deletes the key and updates the database.
    - **"Closed Laptop" Offline (Multi-device):** When the *last* active device stops sending heartbeats, the key expires. The system detects the expiry and sets `available_free_help` to `false`.

#### 2.2 Component 2: Marketplace Integration

This component surfaces available tutors to high-intent clients.

- **CaaS (v5.5) Integration:** The `available_free_help = true` status will be a high-priority input for the CaaS engine. It will provide a significant, temporary boost to the tutor's `total_score`, ranking them at the top of the marketplace. The `caas_scores` table will be updated to include this flag for fast indexing.
- **UI Modification:**
  - `apps/web/src/app/components/marketplace/ListingCard.tsx`: Will display a green **"Free Help Now"** badge.
  - `apps/web/src/app/components/public-profile/ProfileHeroSection.tsx`: Will display the "Free Help Now" status and change the primary CTA to **"Get Free Help Now"**.

#### 2.3 Component 3: Instant Session Workflow (No Payment)

This component handles the "booking" and connection, bypassing all payment systems.

1. **Client Action:** Client clicks "Get Free Help Now."
2. **API Call:** The frontend calls a **new endpoint**: `POST /api/sessions/create-free-help-session`.
3. **Session Creation:** This new, secure endpoint performs the following: a. Calls the Google Meet API via our existing integration (per v5.0 spec) to generate a `joinUrl`. b. Creates a new `bookings` record (e.g., `type: 'free_help'`, `amount: 0`, `status: 'confirmed'`). c. Sends a high-priority email (via Resend) and push notification to the tutor with the `joinUrl`. d. Returns the `joinUrl` to the client.
4. **Connection:** The client is immediately redirected to the `joinUrl`. The tutor joins via their notification.
5. **CaaS "Payment":** A new database trigger `on_booking_completed` will detect when a `free_help` session finishes and add the tutor's `profile_id` to the `caas_recalculation_queue` table. This ensures they are "paid" with their CaaS score boost.

* * *

### 3.0 UI & Workflow Diagrams

#### 3.1 UI: Tutor Settings & Public Profile

This diagram shows the tutor's new toggle and the resulting client-facing button.

```
+---------------------------+         +--------------------------------------+
| ⚙️ Account Settings        |         | 🦸 ProfileHeroSection.tsx            |
| ------------------------- |         | ------------------------------------ |
| [Input: "Full Name"]      |         | [Avatar] Dr. Evelyn Reed             |
| ...                       |         | [Badge: ✅ Free Help Now]            |
|                           |         |                                      |
| [Toggle: Offer Free Help] 🟢 |        | +-------------------------+        |
| (Offer 30min free sessions) |       | | [Button: Get Free Help Now]|     |
+---------------------------+         | | (Starts in 5 minutes)   |        |
  (Tutor View in Settings)            | +-------------------------+        |
                                      +--------------------------------------+
 (Client View on Public Profile)

```

#### 3.2 Sequence Diagram: "Free Help Now" Workflow

This diagram shows the new, payment-free flow.

```
+--------+   +----------+   +----------------+   +-------------+   +-------+
| Client |   | Frontend |   | API (Internal) |   | Google Meet |   | Tutor |
+--------+   +----------+   +----------------+   +-------------+   +-------+
    |            |                |                  |           |
    | 1. Click "Get Free Help Now" |                |                  |           |
    |----------->|                |                  |           |
    |            | 2. POST /api/sessions/create-free-help-session |                  |           |
    |            |----------------->|                  |           |
    |            |                | 3. POST /api/google/create-meet |           |
    |            |                |----------------->|           |
    |            |                | 4. Returns { joinUrl } |           |
    |            |                |<-----------------|           |
    |            |                | 5. Create `bookings` (type: 'free_help') |           |
    |            |                | 6. Notify Tutor (Email/Push) |
    |            |                |------------------------------------------->|
    |            |                | 7. Returns { joinUrl } |           |
    |            |<---------------|                  |           |
    | 8. Redirect to joinUrl |                |                  |           |
    |-------------> (Joins Meet) |                |                  |           |
    |            |                |                  |           | (Receives Notify)
    |            |                |                  |           | 9. Clicks joinUrl
    |            |                |                  |           | (Joins Meet)
    |            |                |                  |           |
    |            |                | 10. (Later) Trigger: on_booking_completed |           |
    |            |                | 11. Add tutor to `caas_recalculation_queue` |           |
    |            |                |-----------------> (DB)           |

```

* * *

### 4.0 System Impacts & File Modifications

#### 4.1 Database Changes

- `profiles` **Table:**
  - `ADD COLUMN available_free_help BOOLEAN DEFAULT false;`
  - **Impact:** New flag to control free help availability, indexed for search.
- `bookings` **Table:**
  - `ALTER TYPE booking_type ADD VALUE 'free_help';`
  - **Impact:** Allows the system to log these sessions for CaaS calculation.
- `caas_scores` **Table:**
  - `ADD COLUMN available_free_help BOOLEAN DEFAULT false;`
  - **Impact:** Allows the marketplace search API to sort/filter by this status with high performance.

#### 4.2 New API Endpoints

- `POST /api/presence/free-help/online`
  - **Description:** Authenticated endpoint for a tutor to set their status to "Offer Free Help."
- `POST /api/presence/free-help/offline`
  - **Description:** Authenticated endpoint for a tutor to manually go offline.
- `POST /api/presence/free-help/heartbeat`
  - **Description:** Authenticated endpoint for an active client (web/mobile) to send a heartbeat.
- `POST /api/sessions/create-free-help-session`
  - **Description:** Public-facing (but rate-limited) endpoint for a student to create a session. Bypasses all payment logic.

#### 4.3 Modified Files & Systems

- `apps/web/src/app/(authenticated)/account/settings/page.tsx`
  - **Change:** Add the new `<ToggleSwitch>` for **"Offer Free Help"** and wire it to the `/api/presence/free-help/` endpoints.
- `apps/web/src/app/providers.tsx`
  - **Change:** Add logic to the global "Heartbeat" provider to manage the `free_help` state.
- `apps/web/src/app/components/public-profile/ProfileHeroSection.tsx`
  - **Change:** Add conditional logic to display the "Free Help Now" status and the "Get Free Help Now" button if `available_free_help` is true.
- `apps/web/src/app/components/marketplace/ListingCard.tsx`
  - **Change:** Add conditional logic to display the "Free Help Now" badge.
- `apps/web/src/app/components/public-profile/AboutCard.tsx`
  - **Change:** Add logic to display a new "Community Tutor" badge and "Free Sessions Given" stat if the tutor participates.
- `docs/features/caas/caas-solution-design-v5.5.md` (Logic)
  - **Change:** The `TutorCaaSStrategy` must be updated. The calculation logic will now query the `bookings` table for `type = 'free_help'` and award significant points to the tutor's "Community & Platform Trust" bucket.
- `apps/api/migrations/0XX_update_booking_triggers.sql` (New Migration)
  - **Change:** A new or modified DB trigger is required to ensure that when a `bookings` record of `type = 'free_help'` is marked `completed`, the tutor's `profile_id` is inserted into the `caas_recalculation_queue`.

* * *

### 5.0 Business Impact & Marketing

- **Democratizes Education:** Directly achieves the mission of reaching the underserved market by removing all financial barriers.
- **"Target Practice" for Tutors:** Provides a "sandbox" for new tutors to gain experience, practice, and build their reputation.
- **Increases Tutor Utility:** Converts tutor "idle time" into a productive asset that generates CaaS points and high-intent leads.
- **Powerful Marketing Asset:** Becomes a cornerstone of our marketing to schools, libraries, and charities ("Free Help for Public Good").
- **Drives Viral Growth:** The feature can be paired with the v4.3 referral system, encouraging students to share the free tool with peers, driving zero-cost user acquisition.