# wisespace-solution-design-v5.8

Here is the enhanced `wisespace-solution-design-v5.8`.

This design formalizes your "Hybrid" model and has been updated with the architectural diagrams and detailed explanations you requested.

This solution is a strategic pivot away from the high-cost, high-maintenance integrations of Lessonspace (v5.2) and Pencil Spaces (v5.3). It focuses on delivering the 80% of value (a shared workspace) for 0% of the marginal cost, while critically retaining the "proof-of-work" data stream needed to power our **CaaS (v5.5) engine**.

*(Formerly "*whiteboard-solution-design-v5.8*", now "*wisespace-solution-design-v5.8*")*

*(Formerly "Session Room", now "WiseSpace")*

### **Solution Design Document: WiseSpace (v5.8)**

- **Version:** 5.8.2 (Branding Update - Verified)
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites:**
  - `api-solution-design-v5.1`
  - `caas-solution-design-v5.5`
  - `caas-video-solution-design-v5.6`
- **Supersedes:** `lessonspace-solution-design-v5.2`, `pencilspaces-solution-design-v5.3`

* * *

### 1.0 Executive Summary

This document outlines the architecture for the **"WiseSpace,"** our cost-effective, hybrid virtual classroom.

The solution is a **"hybrid" model**:

1. **Whiteboard (Embedded):** Provides an embedded `tldraw` whiteboard, synced in real-time using our existing Ably infrastructure.
2. **Video (External):** Provides a simple link to launch **Google Meet** in a separate tab.
3. **CaaS Data (Manual):** Captures "Proof of Work" for the **CaaS Engine (v5.5)** via a "Manual Session Logging" feature and a "Save Snapshot" button.

This architecture provides a high-value tool at **zero marginal cost** and requires no new server maintenance.

* * *

### 2.0 Architectural & Data Flow Diagrams

#### 2.1 User Experience (UX) Flow

The user manages two browser tabs: one for video (Google Meet) and one for our shared **WiseSpace**.

```
Code snippet
```

```
     +---------------------------------------+      +---------------------------------------+
     |         USER 1 (Tutor)                |      |         USER 2 (Client/Student)       |
     |   (Manages two separate tabs)         |      |   (Manages two separate tabs)         |
     +-----------------+---------------------+      +-----------------+---------------------+
                       |                                              |
           +-----------+-----------+                      +-----------+-----------+
           |                       |                      |                       |
           v                       v                      v                       v

+-------------------------+   +-------------------------+  +-------------------------+   +-------------------------+
| TAB 1: Tutorwise        |   | TAB 2: Google Meet      |  | TAB 1: Tutorwise        |   | TAB 2: Google Meet      |
| (wisespace/[bookingId]) |   | (meet.google.com)       |  | (wisespace/[bookingId]) |   | (meet.google.com)       |
|-------------------------|   |-------------------------|  |-------------------------|   |-------------------------|
| [ Start Google Meet ]   |   |                         |  | [ Start Google Meet ]   |   |                         |
| [ Save Snapshot ]       |   |   [ User 2 Video ]      |  | [ Save Snapshot ]       |   |   [ User 1 Video ]      |
| [ Mark as Complete ]    |   |                         |  | [ Mark as Complete ]    |   |                         |
|=========================|   |   [ User 1 Video ]      |  |=========================|   |   [ User 2 Video ]      |
|                         |   |                         |  |                         |   |                         |
| << Embedded tldraw     >>   | [Mute] [End Call] [Cam] |  | << Embedded tldraw     >>   | [Mute] [End Call] [Cam] |
| << Whiteboard          >>   |                         |  | << Whiteboard          >>   |                         |
|                         |   |                         |  |                         |   |                         |
+-------------------------+   +-------------------------+  +-------------------------+   +-------------------------+

```

#### 2.2 Ably Real-time Sync Architecture

Ably is the "glue" that powers the real-time whiteboard. It uses a **Publish/Subscribe (Pub/Sub)** model.

1. **Subscribe:** When the Tutor and Student load the **WiseSpace page**, they both connect to Ably and "subscribe" to a unique channel named after the booking (e.g., `wisespace:booking-abc-123`).
2. **Publish:** When the Tutor draws a line, their browser "publishes" that event (the line's coordinates, color, etc.) to the Ably channel.
3. **Receive:** Ably instantly relays that event to all other subscribers (the Student), whose whiteboard receives the data and draws the exact same line.

```
Code snippet
```

```
+---------------------------------------------------+
|                  TUTOR'S BROWSER                  |
| +------------------+   +------------------------+ |
| | TAB 1: WiseSpace |   | TAB 2: Google Meet     | |
| | (Our App)        |   | (External Service)     | |
| | +--------------+ |   |                        | |
| | | tldraw       | |   |  (Video/Audio Stream)  | |
| | | Component    | |   |                        | |
| | +--------------+ |   |                        | |
| +------------------+   +------------------------+ |
+----------+-------------------+---------^----------+
           | (Publishes draw events) |         | (Google's Infrastructure)
           |                   |         |
           v                   |         |
+----------+-------------------+         |
| ABLY REALTIME NETWORK         |         |
| (Channel: "wisespace:[bookingId]")      |
+----------+-------------------+         |
           |                   |         |
(Receives   | draw events)      |         |
           |                   v         |
           v                   v         |
+----------+-------------------+---------+----------+
|                 STUDENT'S BROWSER                 |
| +------------------+   +------------------------+ |
| | TAB 1: WiseSpace |   | TAB 2: Google Meet     | |
| | (Our App)        |   | (External Service)     | |
| | +--------------+ |   |                        | |
| | | tldraw       | |   |  (Video/Audio Stream)  | |
| | | Component    | |   |                        | |
| | +--------------+ |   |                        | |
| +------------------+   +------------------------+ |
+---------------------------------------------------+

```

* * *

### 3.0 Database Implementation

**No new tables are required.** This feature will leverage existing columns in the `bookings` table.

- `bookings.session_artifacts` **(JSONB):** This column (originally for v5.2) will be re-purposed. We will use it to store the URL of the saved whiteboard snapshot.
  - \*Example: `{ "whiteboard_snapshot_url": "https://[bucket].supabase.co/booking-artifacts/..." }`

* * *

### 4.0 API Design (Pattern 1)

This feature requires new "Pattern 1" API endpoints.

#### 4.1 `POST /api/wisespace/[bookingId]/complete`

- **Purpose:** The endpoint for the `[ Mark as Complete ]` button. This is our manual "proof-of-work" signal.
- **Security:** Supabase Auth. User must be the `tutor_id` or `client_id` for the booking.
- **Logic:**
  1. Validate user is a participant in the booking.
  2. `UPDATE bookings SET status = 'completed' WHERE id = [bookingId]`.
  3. **Trigger CaaS (v5.5):** Insert the `tutor_id` into the `caas_recalculation_queue`.

#### 4.2 `POST /api/wisespace/[bookingId]/snapshot`

- **Purpose:** The endpoint for the `[ Save Snapshot ]` button. This provides a "Proof of Value" artifact.
- **Security:** Supabase Auth. User must be a participant.
- **Body:** `{ snapshotData: "..." }` (The `tldraw` canvas data as SVG or JSON).
- **Logic:**
  1. Validate user access.
  2. Upload the `snapshotData` to Supabase Storage (e.g., `booking-artifacts/[bookingId].svg`).
  3. Get the public URL for the uploaded file.
  4. `UPDATE bookings SET session_artifacts = '{ "whiteboard_snapshot_url": "[URL]" }' WHERE id = [bookingId]`.
  5. **Trigger CaaS (v5.5):** Insert the `tutor_id` into the `caas_recalculation_queue`.

* * *

### 5.0 Frontend Implementation

#### 5.1 Entry Point: The Dashboard

- **File:** `apps/web/src/app/components/bookings/BookingCard.tsx`
- **Logic:** The "Join Session" button on an upcoming booking card will be an `<a>` tag with `target="_blank"`.
- **Action:**
```
TypeScript
```
```
<Link href={`/wisespace/${booking.id}`} target="_blank">
  <Button variant="primary">Join WiseSpace</Button>
</Link>
```
- **Result:** This opens the "WiseSpace" in a **new, full-screen browser tab**, breaking it out of the main dashboard layout.

#### 5.2 New Layout: Minimal Session Layout

- **New File:** `apps/web/src/app/(authenticated)/wisespace/layout.tsx`
- **Logic:** This layout will be a minimal wrapper. It will **NOT** render the `AppSidebar` or `ContextualSidebar`. It will just render its children.

#### 5.3 New Page: The "WiseSpace" Room

- **Page:** `apps/web/src/app/(authenticated)/wisespace/[bookingId]/page.tsx`
- **Security:** Server component that validates the user is a participant in the booking.

#### 5.4 Key Components

**A.** `WiseSpaceHeader.tsx` **(New Component)**

- **Location:** A persistent sticky header at the top of the page.
- **UI & Actions:**
  - **\[ Return to Dashboard \]**: An `<a>` tag that links back to `/dashboard`.
  - **\[ Start Google Meet \]**: Primary button. Opens `https://meet.new` in a new tab.
  - **\[ Save Snapshot \]**: Secondary button. Calls `POST /api/wisespace/[bookingId]/snapshot`.
  - **\[ Mark as Complete \]**: Secondary button. Calls `POST /api/wisespace/[bookingId]/complete`, then runs `window.close()` to close the tab.

**B.** `EmbeddedWhiteboard.tsx` **(New Component)**

- **Location:** The main body of the page, filling the viewport (`height: 'calc(100vh - 60px)'`).
- **File Path:** `apps/web/src/app/components/wisespace/EmbeddedWhiteboard.tsx`
- **Implementation:**
```
TypeScript
```
```
// apps/web/src/app/components/wisespace/EmbeddedWhiteboard.tsx
'use client'
import { Tldraw } from 'tldraw'
import { useAbly } from 'ably/react' // Or our custom hook
export default function EmbeddedWhiteboard({ bookingId }) {
  const ably = useAbly(); 
  const channel = ably.channels.get(`wisespace:${bookingId}`);
  // TODO: Add logic to:
  // 1. Sync tldraw state using the Ably channel.
  // 2. Load initial state from Supabase Storage snapshot.
  return (
    <div style={{ position: 'fixed', inset: 0, top: '60px' }}>
      <Tldraw persistenceKey={`tldraw_${bookingId}`} />
    </div>
  )
}
```

* * *

### 6.0 CaaS Engine & Dashboard Integration

#### 6.1 CaaS Strategy Update (v5.5 + v5.6 + v5.8)

- **Target File:** `apps/web/src/lib/services/caas/strategies/tutor.ts`
- **Action:** The "Digital Professionalism" (10 pts) bucket is updated to a flexible "Proof of Work" model.
- **New Logic:**
  - **Bucket 5.1: Integrated Tools (5 pts):**
    - `google_calendar_synced` OR `google_classroom_synced` (from v5.0)
  - **Bucket 5.2: Proof of Work (5 pts):**
    - Tutor receives 5 points for doing **ANY ONE** of the following:
    - **Path A (Logging):** `manual_session_log_rate > 0.8` (from v5.8 `PendingLogsWidget.tsx`)
    - **Path B (Artifacts):** `whiteboard_snapshot_saved_rate > 0.8` (from v5.8 `[ Save Snapshot ]` button)
    - **Path C (Profile):** `bio_video_url IS NOT NULL` (from v5.6)

#### 6.2 Dashboard Integration (The "Nudge")

- **New Component:** `apps/web/src/app/components/dashboard/PendingLogsWidget.tsx`
- **Location:** `apps/web/src/app/(authenticated)/dashboard/page.tsx`
- **Data:** Fetches `bookings` where `status = 'confirmed'` and `end_time < NOW()`.
- **UI:** A `<Card>` titled **"Pending Actions"**.
- **Action:** Clicking `[ ✅ Confirm Completion ]` calls `POST /api/wisespace/[bookingId]/complete`, triggering the CaaS recalculation.