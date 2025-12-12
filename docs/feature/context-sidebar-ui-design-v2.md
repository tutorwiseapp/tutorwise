# context-sidebar-ui-design-v2

Here is the fully updated **Contextual Sidebar UI Design (v2)**.

This version consolidates all recent decisions:

1. **No Icons:** All illustrative icons have been removed for a professional look.
2. **Network Hub Refactor:** The "Grow Your Network" and "Organise Your Connections" widgets are updated with the specific button hierarchies you requested.
3. **Organisation Hub:** Added as a standard feature.
4. **Complex Widgets:** Formally defined to support interactive cards like Referrals and Agency Invites.

### **UI Design: Contextual Sidebar Standardization (v2)**

- **Document Name:** `context-sidebar-ui-design-v2.md` (Updated)
- **Version:** 2.6 (Professional/No-Icon Mode + Network Refactor)
- **Status:** **LOCKED 🔒**
- **Owner:** Senior Architect
- **Prerequisites:** `DESIGN_SYSTEM.md`, `globals.css`

* * *

### 1.0 Executive Summary

This document outlines the UI architecture for the **Contextual Sidebar** (the right-hand column in the 3-column layout).

To resolve current fragmentation, we are enforcing a strict **Card System** for all sidebar content. This ensures a consistent "Dashboard" aesthetic across all 11 hubs (`/bookings`, `/organisation`, `/network`, etc.) and optimizes readability within the fixed 300px width.

Global Design Change (v2):

To maintain a clean, professional aesthetic, NO illustrative icons are to be used in the sidebar widgets. Visual hierarchy is established solely through:

- **Typography:** (H3 Headers vs Body text).
- **Spacing:** (Standard 16px/24px gaps).
- **Controls:** (Buttons, Inputs, Toggles).

**The Core Patterns:**

1. **Stats Card:** A data-dense, vertical list for high-level summaries.
2. **Action Card:** A clear CTA block for primary tasks.
3. **Complex Widget:** A container for internal interactivity (Tabs, Inputs, Lists).

* * *

### 2.0 Visual Specifications (ASCII)

All widgets must be wrapped in the standard `<SidebarWidget>` container (white background, shadow, rounded corners).

#### 2.1 The Master Patterns

**A. Stats Card Pattern (**`SidebarStatsWidget`**)**

- **Layout:** Vertical stack of rows.
- **Typography:** High contrast between Label (Grey) and Value (Black).

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

- **Use Case:** Simple "Instruction + Button" flows.
- **Layout:** Title -> Description -> Button stack.

```
+-------------------------------+
|  [Title: H3 18px]             |
+-------------------------------+
|                               | <-- Padding: 16px
|  [Description Text: 14px,     |
|   Grey-600, Multi-line]       |
|                               | <-- Vertical Gap: 24px
|  [ Primary Button (Block)   ] |
+-------------------------------+

```

**C. Complex Widget Pattern (Exception)**

- **Use Case:** Widgets requiring internal state (Tabs, Lists, Inputs).
- **Rule:** Bypasses strict vertical padding to allow edge-to-edge elements (like Tabs).

```
+-------------------------------+
|  [Custom Header / Tabs     ]  |
+-------------------------------+
|  [ Content Area (List/Form)]  |
|                               |
|  [ Footer Actions          ]  |
+-------------------------------+

```

* * *

#### 2.2 Listings Hub (`/listings`)

**Stats Card:** `ListingStatsWidget`

```
+-------------------------------+
|  Listing Stats                |
+-------------------------------+
|  Total Listings             5 |
|  Published                  3 |
|  Drafts                     2 |
+-------------------------------+

```

**Action Card:** `CreateListingWidget`

```
+-------------------------------+
|  New Service                  |
+-------------------------------+
|  Create a new One-to-One,     |
|  Group Session, or other   |
|  listing.                     |
|                               |
|  [ Create Listing           ] |<-- Primary (Full Width)
+-------------------------------+

```

* * *

#### 2.3 Bookings Hub (`/bookings`)

**Stats Card:** `BookingStatsWidget`

```
+-------------------------------+
|  Booking Stats                |
+-------------------------------+
|  Pending Confirmation       1 |
|  Upcoming Sessions          4 |
|  Completed Sessions        12 |
+-------------------------------+

```

* * *

#### 2.4 Network Hub (`/network`)

**Stats Card:** `NetworkStatsWidget`

```
+-------------------------------+
|  Network Stats                |
+-------------------------------+
|  Total Connections         42 |
|  Pending Requests           3 |
|  New This Month             5 |
+-------------------------------+

```

**Complex Action Card:** `NetworkConnectionWidget`

- **Layout:** Split Hierarchy (Primary vs Secondary).
- **Content:** 4 Distinct buttons.

```
+-------------------------------+
|  Grow Your Network            |
+-------------------------------+
|                               |
|  Manage your professional     |
|  circle on Tutorwise.         |
|                               |
|  [ Add Connection           ] | <-- Primary Button (Full Width)
|                               |
|  [ Find People ] [ Invite by Email ] | <-- Secondary Buttons
|                               |
|  [ Create Group             ] | <-- Secondary Button (Full Width)
+-------------------------------+

```

* * *

#### 2.5 Referrals Hub (`/referrals`)

**Stats Card:** `ReferralStatsWidget`

```
+-------------------------------+
|  Referral Stats               |
+-------------------------------+
|  Referred                  15 |
|  Signed Up                  8 |
|  Converted                  3 |
|  Total Earned           £0.00 | <-- Black Semi-Bold
+-------------------------------+

```

**Complex Action Card:** `ReferralAssetWidget`

NOTE: Keep the UI and functionalities of the complex referral asset card / widget but align its style (colour, padding, spacing, etc) to the rest of the hub design.

```
+-------------------------------+
|  Your Referral Assets         |
+-------------------------------+
| Share your unique code and    |
| earn 10% commission on first  |
| bookings.                     |
|                               |
| YOUR REFERRAL CODE            |
| [ Short Code               ]  |
|                               |
+-------------------------------+
|  [Link]  [QR Code]  [Embed]   | <-- Tabbed Interface
+-------------------------------+
|  [ QR Code                  ] |
|  [ Copy Link                ] |
|  [ Quick Share              ] |
|  [ icon ] [ icon ] [ icon ]   | <-- WhatsApp, Facebook, LinkEdIn
+-------------------------------+

```

* * *

#### 2.6 Financials Hub (`/financials`)

**Stats Card:** `WalletBalanceWidget`

```
+-------------------------------+
|  Balance Summary              |
+-------------------------------+
|  Available           £450.00  | <-- Green
|  Clearing             £80.00  | <-- Orange
|  Total Earned      £2,450.00  | <-- Black Semi-Bold
+-------------------------------+

```

**Action Card:** `PayoutActionWidget`

```
+-------------------------------+
|  Withdraw Funds               |
+-------------------------------+
|  Funds are sent to your       |
|  connected bank account       |
|  within 5-10 business days.   |
|                               |
|  [ Withdraw Balance         ] |
+-------------------------------+

```

* * *

#### 2.7 Wiselists Hub (`/wiselists`)

**Stats Card:** `WiselistStatsWidget`

```
+-------------------------------+
|  Global Stats                 |
+-------------------------------+
|  Total Lists                5 |
|  Items Saved               23 |
|  Collaborators              8 |
+-------------------------------+

```

**Action Card:** `CreateWiselistWidget`

```
+-------------------------------+
|  New Wiselist                 |
+-------------------------------+
|  Create a new collection of   |
|  profiles or listings:        |
|  save, share & earn.          |
|                               |
|  [ Create Wiselist          ] |
+-------------------------------+

```

* * *

#### 2.8 Free Help Hub (Dashboard)

**Stats Card:** `FinancialStatsWidget`

```
+-------------------------------+
|  Financial Stats              |
+-------------------------------+
|  Total Earned        £1000.00 | <-- Green Text
|  Total Spent          £700.00 | <-- Orange Text
|  Balance              £300.00 | <-- Black Semi-Bold
+-------------------------------+

```

**Stats Card:** `FreeHelpStatsWidget`

```
+-------------------------------+
|  Impact Stats                 |
+-------------------------------+
|  Free Sessions Given       12 |
|  Students Helped           10 |
|  CaaS Score Boost        +600 |
+-------------------------------+

```

**Complex Action Card:** `FreeHelpToggleWidget`

```
+-------------------------------+
|  Offer Free Help    [Toggle]  |
+-------------------------------+
|  Boost your ranking by        |
|  offering 30-min free         |
|  sessions to new students.    |
+-------------------------------+

```

* * *

#### 2.9 My Students Hub (`/my-students`)

**Stats Card:** `StudentStatsWidget`

```
+-------------------------------+
|  Student Stats                |
+-------------------------------+
|  Total Students            12 |
|  Active Students            8 |
|  Pending Invites            2 |
+-------------------------------+

```

**Action Card:** `ClientStudentWidget`

```
+-------------------------------+
|  Manage Students              |
+-------------------------------+
|                               |
|  Add 13+ years old students   |
|  to Tutorwise learning.       |
|                               |
|  [ Invite by Email          ] | <-- Primary Button (Full Width)
|                               |
|  [ Import Student ] [ Add ]   | <-- Secondary Buttons (Coming soon)
|                               |
|  [ Create Group             ] | <-- Secondary Button (Full Width)
+-------------------------------+

```

* * *

#### **2.10 Reviews Hub (**`/reviews`**)**

**Stats Card:** `ReputationWidget`

```
+-------------------------------+
|  Performance Stats            |
+-------------------------------+
|                               |
|  Overall Rating           4.9 |
|                               |
|  Total Reviews             42 |
|                               |
|  Response Rate            98% |
+-------------------------------+

```

**Action Card:** `ReputationReviewWidget`

```
+-------------------------------+
|  Get More Reviews             |
+-------------------------------+
|                               |
|  Request a review from past   |
|  clients or tutors.           |
|                               |
|  [ Request a Review         ] |
+-------------------------------+

```

* * *

#### **2.11 Payments Hub (**`/payments`**)**

**Stats Card:** `PaymentHelpWidget`

```
+-------------------------------+
|  Payment Help                 |
+-------------------------------+
|                               |
|  All payments are processed   |
|  securely through Stripe.     |  
|                               |
|  For payment issues, contact  |
|  our support team.            |
+-------------------------------+

```

* * *

#### 2.12 Organisation Hub (`/organisation`)

**Stats Card:** `AgencyStatsWidget`

```
+-------------------------------+
|  Agency Performance           |
+-------------------------------+
|  Active Tutors             12 |
|  Total Students            45 |
|  Monthly Revenue    £3,450.00 | <-- Black Semi-Bold
+-------------------------------+

```

**Complex Action Card:** `AgencyTutorWidget`

```
+-------------------------------+
|  Grow Your Business           |
+-------------------------------+
|                               |
|  Mange your agency on         |
|  Tutorwise.                   |
|                               |
|  [ Add Connection           ] | <-- Primary Button (Full Width)
|                               |
|  [ Find Tutor ] [ Invite by Email ] | <-- Secondary Buttons
|                               |
|  [ Create Group             ] | <-- Secondary Button (Full Width)
+-------------------------------+

```

* * *

### 3.0 Design Tokens & CSS Logic

Implementation must strictly use `globals.css`.

|     |     |     |     |
| --- | --- | --- | --- |
| **Property** | **Value** | **Token** | **Rationale** |
| **Sidebar Width** | `300px` | Fixed | Standard layout. |
| **Card Padding** | `16px` | `var(--space-2)` | Dense readability. |
| **Vertical Gap** | `16px` | `var(--space-2)` | Stats row rhythm. |
| **Action Gap** | `24px` | `var(--space-3)` | Separate Text/Button. |
| **Title Font** | `18px` | `text-lg`, `semibold` | Hierarchy. |
| **Icons** | **NONE** | N/A | **Professional look.** |

* * *

### 4.0 Implementation File List

#### 4.1 New Core Components

- `apps/web/src/app/components/layout/sidebars/components/SidebarStatsWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarStatsWidget.module.css`
- `apps/web/src/app/components/layout/sidebars/components/SidebarActionWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarActionWidget.module.css`
- `apps/web/src/app/components/layout/sidebars/components/SidebarComplexWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarQuickActionsWidget.tsx`
- `apps/web/src/app/components/layout/sidebars/components/SidebarQuickActionsWidget.module.css`

#### 4.2 Feature Widgets (Updated)

- **Network:**
  - `apps/web/src/app/components/network/NetworkStatsWidget.tsx`
  - `apps/web/src/app/components/network/NetworkConnectionWidget.tsx`
- **Organisation:**
  - `apps/web/src/app/components/agency/AgencyStatsWidget.tsx`
  - `apps/web/src/app/components/network/AgencyTutorWidget.tsx`
- **Reviews:**
  - `apps/web/src/app/components/reviews/ReputationStatsWidget.tsx`
  - `apps/web/src/app/components/reviews/ReputationReviewWidget.tsx`
- **Account:**
  - `apps/web/src/app/components/account/ProfileCompletenessWidget.tsx`
  - `apps/web/src/app/components/account/AccountQuickActionsWidget.tsx`
- **Payments:**
  - `apps/web/src/app/components/payments/PaymentHelpWidget.tsx`
- **My Students:**
  - `apps/web/src/app/components/students/StudentStatsWidget.tsx`
  - `apps/web/src/app/components/students/ClientStudentWidget.tsx`