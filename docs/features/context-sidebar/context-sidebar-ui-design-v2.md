# context-sidebar-ui-design-v2

Here is the updated **Contextual Sidebar UI Design (v2.2)**.

I have expanded **Section 2.0 (Visual Specifications)** to include specific ASCII diagrams for every single hub widget defined in the catalog. This ensures the developer has an exact visual reference for how the "Stats" and "Action" patterns apply to each feature.

* * *

### **UI Design: Contextual Sidebar Standardization (v2.2)**

- **Document Name:** `contextsidebar-ui-design-v2.2.md`
- **Version:** 2.2 (Complete Visualizations)
- **Status:** For Implementation
- **Owner:** Senior Architect
- **Prerequisites:** `DESIGN_SYSTEM.md`, `globals.css`

* * *

### 1.0 Executive Summary

This document outlines the UI architecture for the **Contextual Sidebar** (the right-hand column in the 3-column layout).

To resolve current fragmentation, we are enforcing a strict **Two-Card System** for all sidebar content. This ensures a consistent "Dashboard" aesthetic across all hubs (`/bookings`, `/financials`, `/network`, etc.) and optimizes readability within the fixed 300px width.

**The Two Core Patterns:**

1. **Stats Card:** A data-dense, vertical list for high-level summaries.
2. **Action Card:** A clear, single-purpose CTA separating instruction from action.

* * *

### 2.0 Visual Specifications (ASCII)

All widgets must be wrapped in the standard `<SidebarWidget>` container.

#### 2.1 The Master Patterns

**A. Stats Card Pattern (**`SidebarStatsWidget`**)**

- **Layout:** Vertical stack of rows.
- **Typography:** High contrast between Label (Grey) and Value (Black).

```
Plaintext
```

```
+-------------------------------+
|  [Title: H3 18px]             |
+-------------------------------+
|                               | <-- Padding: 16px
|  [Label 1]          [Value 1] | <-- Row: Flex Space-Between
|                               |
|  [Label 2]          [Value 2] | <-- Vertical Gap: 16px
|                               |
|  [Label 3]          [Value 3] |
+-------------------------------+

```

**B. Action Card Pattern (**`SidebarActionWidget`**)**

- **Layout:** Title -> Description -> Button.
- **Spacing:** Generous vertical gap (24px) to separate reading from clicking.

```
Plaintext
```

```
+-------------------------------+
|  [Title: H3 18px]             |
+-------------------------------+
|                               | <-- Padding: 16px
|  [Description Text: 14px,     |
|   Grey-600, Multi-line]       |
|                               | <-- Vertical Gap: 24px
|  [ Full Width Button        ] |
+-------------------------------+

```

* * *

#### 2.2 Listings Hub (`/listings`)

**Stats Card:** `ListingStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Listing Stats                |
+-------------------------------+
|                               |
|  Total Listings             5 |
|                               |
|  Published                  3 |
|                               |
|  Drafts                     2 |
+-------------------------------+

```

**Action Card:** `CreateListingWidget`

```
Plaintext
```

```
+-------------------------------+
|  New Service                  |
+-------------------------------+
|                               |
|  Create a new One-to-One,     |
|  Group Session, or Workshop   |
|  listing.                     |
|                               |
|  [ Create Listing           ] |
+-------------------------------+

```

* * *

#### 2.3 Bookings Hub (`/bookings`)

**Stats Card:** `BookingStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Booking Stats                |
+-------------------------------+
|                               |
|  Pending Confirmation       1 |
|                               |
|  Upcoming Sessions          4 |
|                               |
|  Completed Sessions        12 |
+-------------------------------+

```

*(Note: Bookings Hub typically has no generic "Action Card" as actions are row-specific, but may show an "Upcoming Session" summary).*

* * *

#### 2.4 Network Hub (`/network`)

**Stats Card:** `NetworkStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Network Stats                |
+-------------------------------+
|                               |
|  Total Connections         42 |
|                               |
|  Pending Requests           3 |
|                               |
|  New This Month             5 |
+-------------------------------+

```

**Action Card:** `InviteNetworkWidget`

```
Plaintext
```

```
+-------------------------------+
|  Grow Your Network            |
+-------------------------------+
|                               |
|  Invite colleagues or         |
|  students to connect with     |
|  you on Tutorwise.            |
|                               |
|  [ Invite by Email          ] |
+-------------------------------+

```

* * *

#### 2.5 Referrals Hub (`/referrals`)

**Stats Card:** `ReferralStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Referral Pipeline            |
+-------------------------------+
|                               |
|  Total Referred            15 |
|                               |
|  Signed Up                  8 |
|                               |
|  Converted                  3 |
+-------------------------------+

```

**Action Card:** `ReferralLinkWidget`

```
Plaintext
```

```
+-------------------------------+
|  Share Your Link              |
+-------------------------------+
|                               |
|  Earn 10% lifetime            |
|  commission on every booking  |
|  from users you refer.        |
|                               |
|  [ Copy Referral Link       ] |
+-------------------------------+

```

* * *

#### 2.6 Financials Hub (`/financials`)

**Stats Card:** `WalletBalanceWidget` (Uses Semantic Colors)

```
Plaintext
```

```
+-------------------------------+
|  Balance Summary              |
+-------------------------------+
|                               |
|  Available           £450.00  | <-- Green Text
|                               |
|  Pending              £80.00  | <-- Grey Text
|                               |
|  Total Earned      £2,450.00  | <-- Black Bold
+-------------------------------+

```

**Action Card:** `PayoutActionWidget`

```
Plaintext
```

```
+-------------------------------+
|  Withdraw Funds               |
+-------------------------------+
|                               |
|  Funds are sent to your       |
|  connected bank account       |
|  within 2-3 business days.    |
|                               |
|  [ Withdraw Balance         ] |
+-------------------------------+

```

* * *

#### 2.7 Wiselists Hub (`/wiselists`)

**Stats Card:** `WiselistStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Global Stats                 |
+-------------------------------+
|                               |
|  Total Lists                5 |
|                               |
|  Items Saved               23 |
|                               |
|  Collaborators              8 |
+-------------------------------+

```

**Action Card:** `CreateWiselistWidget`

```
Plaintext
```

```
+-------------------------------+
|  New Wiselist                 |
+-------------------------------+
|                               |
|  Create a new collection to   |
|  save and share profiles.     |
|                               |
|  [ Create Wiselist          ] |
+-------------------------------+

```

* * *

#### 2.8 Free Help Hub (Dashboard/Profile)

**Stats Card:** `ProBonoStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Impact Stats                 |
+-------------------------------+
|                               |
|  Free Sessions Given       12 |
|                               |
|  Students Helped           10 |
|                               |
|  CaaS Score Boost        +600 |
+-------------------------------+

```

**Action Card:** `ProBonoToggleWidget`

```
Plaintext
```

```
+-------------------------------+
|  Offer Free Help              |
+-------------------------------+
|                               |
|  Boost your ranking by        |
|  offering 30-min free         |
|  sessions to new students.    |
|                               |
|  [ Toggle Availability      ] |
+-------------------------------+

```

* * *

#### 2.9 My Students Hub (`/my-students`)

**Stats Card:** `StudentStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Student Roster               |
+-------------------------------+
|                               |
|  Total Students            12 |
|                               |
|  Active Learners            8 |
|                               |
|  Pending Invites            2 |
+-------------------------------+

```

**Action Card:** `InviteStudentWidget`

```
Plaintext
```

```
+-------------------------------+
|  Add Student                  |
+-------------------------------+
|                               |
|  Invite a student to manage   |
|  their learning and track     |
|  their progress.              |
|                               |
|  [ Invite Student           ] |
+-------------------------------+

```

* * *

#### 2.10 Reviews Hub (`/reviews`)

**Stats Card:** `ReviewStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Reputation                   |
+-------------------------------+
|                               |
|  Average Rating     4.9 / 5.0 |
|                               |
|  Total Reviews             42 |
|                               |
|  Pending Response           1 |
+-------------------------------+

```

**Action Card:** `ShareProfileWidget`

```
Plaintext
```

```
+-------------------------------+
|  Get More Reviews             |
+-------------------------------+
|                               |
|  Share your public profile    |
|  link with past students to   |
|  collect more reviews.        |
|                               |
|  [ Share Profile            ] |
+-------------------------------+

```

* * *

#### 2.11 Messages Hub (`/messages`)

**Stats Card:** `InboxStatsWidget`

```
Plaintext
```

```
+-------------------------------+
|  Inbox Status                 |
+-------------------------------+
|                               |
|  Unread Messages            3 |
|                               |
|  Active Chats               8 |
|                               |
|  Archived                 124 |
+-------------------------------+

```

**Action Card:** `AvailabilityWidget`

```
Plaintext
```

```
+-------------------------------+
|  Chat Availability            |
+-------------------------------+
|                               |
|  Manage your availability     |
|  status for instant messaging |
|  responses.                   |
|                               |
|  [ Set Away Status          ] |
+-------------------------------+

```

* * *

### 3.0 Design Tokens & CSS Logic

Implementation must strictly use the `globals.css` variables.

|     |     |     |     |
| --- | --- | --- | --- |
| **Property** | **Value** | **Token** | **Rationale** |
| **Sidebar Width** | `300px` | Fixed | Standard layouts. |
| **Card Padding** | `16px` | `var(--space-2)` | Maximizes horizontal space for text. |
| **Card Gap** | `16px` | `var(--space-2)` | Keeps sidebar dense and related. |
| **Stats Row Gap** | `16px` | `var(--space-2)` | Distinct readable lines. |
| **Action Gap** | `24px` | `var(--space-3)` | Visual break between text and button. |
| **Title Font** | `18px` | `text-lg`, `semibold` | Clear hierarchy. |
| **Label Color** | `#5f6368` | `text-secondary` | Reduces visual noise. |

* * *

### 4.0 Implementation File List

#### 4.1 New Core Components

- `apps/web/src/app/components/layout/sidebars/components/SidebarStatsWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarStatsWidget.module.css`
- `apps/web/src/app/components/layout/sidebars/components/SidebarActionWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarActionWidget.module.css`

#### 4.2 Refactored Widgets (Must use new components)

- `apps/web/src/app/components/bookings/BookingStatsWidget.tsx`
- `apps/web/src/app/components/financials/WalletBalanceWidget.tsx`
- `apps/web/src/app/components/financials/PayoutActionsWidget.tsx`
- `apps/web/src/app/components/referrals/ReferralStatsWidget.tsx`
- `apps/web/src/app/components/referrals/ReferralLinkWidget.tsx`
- `apps/web/src/app/components/network/NetworkStatsWidget.tsx`
- `apps/web/src/app/components/listings/ListingStatsWidget.tsx`
- `apps/web/src/app/components/listings/CreateListingWidget.tsx`

* * *

### 5.0 Feature Coverage

This table tracks the implementation status of the standardized sidebar pattern across all feature hubs.

|     |     |     |     |
| --- | --- | --- | --- |
| **Hub Feature** | **Stats Widget** | **Action Widget** | **Status** |
| **Bookings** | `BookingStatsWidget` | *(None/Custom)* | ✅ Covered |
| **Listings** | `ListingStatsWidget` | `CreateListingWidget` | ✅ Covered |
| **Network** | `NetworkStatsWidget` | `InviteNetworkWidget` | ✅ Covered |
| **Referrals** | `ReferralStatsWidget` | `ReferralLinkWidget` | ✅ Covered |
| **Financials** | `WalletBalanceWidget` | `PayoutActionWidget` | ✅ Covered |
| **My Students** | `StudentStatsWidget` | `InviteStudentWidget` | ✅ Covered |
| **Reviews** | `ReviewStatsWidget` | `ShareProfileWidget` | ✅ Covered |
| **Messages** | `InboxStatsWidget` | `AvailabilityWidget` | ✅ Covered |
| **Wiselists** | `WiselistStatsWidget` | `CreateWiselistWidget` | ✅ Covered |
| **Free Help** | `ProBonoStatsWidget` | `ProBonoToggleWidget` | ✅ Covered |