# account-solution-design-v4.7

**account-solution-design-v4.7**

**Prompt:**

**Analyse my proposed solution in \`account-solution-design-v4.7.md\`.**

- **Create an enhanced proposed solution that is functional, reliable, with great UI/UX.**
- **Implement an advanced review & rating system integrated with the overral application; profile, bookings, referral system, payements for viral growth.**
- **The next features after this are the Messages/Chat using Tawk and Analytics & Reporting.**
- **Ask me any questions.**

* * *

This version incorporates your proposal for a **3-column layout**, which is a superior design. It elevates the `/account` page to a true "Identity Hub" by separating navigation (Column 1), editable content (Column 2), and static identity/stats (Column 3).

This design re-uses all existing form components and business logic, making it a pure **layout refactor and consolidation** task.

* * *

### **Solution Design: Account Hub & Profile Migration (v4.7)**

- **Version:** 4.7
- **Date:** 2025-11-08
- **Status:** For Implementation
- **Owner:** AI Analysis
- **Prerequisite:** v4.4 (Network Hub), v4.5 (Reviews Hub)

### 1.0 Executive Summary

This document details a critical frontend refactor to **deprecate the legacy** `/profile` **page** and consolidate all user profile editing into a unified **Account Hub** at `/account`.

**The Problem:** Currently, the application's user-facing "self-service" logic is fragmented, creating a confusing user experience:

1. **Unified Hub (**`/dashboard`**,** `/listings`**):** The new, modern layout (`apps/web/src/app/(authenticated)/layout.tsx`) handles all core app features.
2. **Legacy Editor (**`/profile`**):** A standalone page (`apps/web/src/app/profile/page.tsx`) for editing one's *own* profile, which uses an old layout.
3. **Redundant Viewer (**`/profile/[id]`**):** A duplicate public profile viewer.
4. **Standalone Settings:** Pages like `/settings` and `/delete-account` are disconnected from the main user hub.

**The Solution:** This refactor will create a single, logical location for all user settings by migrating all functionality into the `/account` route, which already uses the correct unified hub layout.

1. **New 3-Column Layout:** The `/account` hub will adopt a 3-column layout:
  - **Column 1:** The main `AppSidebar` (no change).
  - **Column 2 (70%):** A "Content Area" with tabs for editing: **"Personal Info," "Professional Info,"** and **"Settings."**
  - **Column 3 (30%):** A new "Hero Sidebar" displaying the user's avatar, name, role, and role-specific stats.
2. **Consolidate:** All "edit" components (forms and modals) will be moved from `/profile` and placed inside the tabs in Column 2.
3. **Deprecate:** The legacy routes `/profile`, `/profile/[id]`, `/settings`, and `/delete-account` will be deleted.
4. **Retain:** The external-facing `apps/web/src/app/public-profile/[id]/page.tsx` will be retained as the single source of truth for viewing public profiles.
5. **Redirect:** `middleware.ts` will be updated to redirect all legacy URLs to their new locations, ensuring no broken links.

This migration is a **frontend-only refactor**. It requires **no database schema changes**, as all integrations are already decoupled and interact with the central `profiles` table (our Single Source of Truth).

* * *

### 2.0 Architectural Migration Plan

This plan outlines the "before" and "after" state of the application routing and file structure.

#### 2.1 "Before" Architecture (Current State)

```
/app
├── (authenticated)           <-- NEW UNIFIED HUB
│   ├── layout.tsx            <-- Main layout (2-col)
│   ├── dashboard/page.tsx
│   ├── listings/page.tsx
│   ├── network/page.tsx
│   └── reviews/page.tsx
│
├── account/                  <-- (Basic 2-col)
│   ├── personal-info/page.tsx
│   └── settings/page.tsx
│
├── profile/                  <-- LEGACY (To be DELETED)
│   ├── page.tsx              <-- (Private Editor)
│   └── [id]/page.tsx         <-- (Public Viewer - Redundant)
│
├── public-profile/
│   └── [id]/page.tsx         <-- (Public Viewer - This STAYS)
│
├── settings/                 <-- LEGACY (To be DELETED)
│   └── change-password/page.tsx
│
└── delete-account/           <-- LEGACY (To be DELETED)
    └── page.tsx

```

#### 2.2 "After" Architecture (v4.7 Goal)

This is the new, clean, and consolidated architecture.

```
/app
├── (authenticated)
│   ├── layout.tsx            <-- UNIFIED HUB (Provides Global 2-Col Layout)
│   │   ├── AppSidebar.tsx (Navlinks: /dashboard, ... /account)
│   │   └── [children] (This is the main content area)
│   │
│   ├── dashboard/page.tsx
│   ├── listings/page.tsx
│   ├── network/page.tsx
│   ├── reviews/page.tsx
│   │
│   └── account/              <-- NEW CONSOLIDATED ACCOUNT HUB
│       ├── layout.tsx        <-- (Provides new 3-Col Layout *within* the [children] area)
│       │
│       ├── personal-info/
│       │   └── page.tsx      <-- (Renders in Column 2)
│       │
│       ├── professional/
│       │   └── page.tsx      <-- (Renders in Column 2)
│       │
│       └── settings/
│           └── page.tsx      <-- (Renders in Column 2)
│
└── public-profile/
    └── [id]/page.tsx         <-- (UNCHANGED: Our single public-facing viewer)


(DELETED FOLDERS: /app/profile/, /app/settings/, /app/delete-account/)
(REDIRECTS in middleware.ts: /profile -> /account/personal-info, /profile/[id] -> /public-profile/[id])

```

* * *

### 3.0 The "Single Source of Truth" (SSOT)

This migration is safe because all platform features are decoupled and interact with one central data store: the `profiles` **table in Supabase**. We are only changing the UI where the user *edits* this data.

```
+--------------------------+
|  OnboardingWizard.tsx    | -- (Writes data ONCE) -->
| (at /onboarding)         |
+--------------------------+


+--------------------------+
|  Account Hub (New)       | -- (Reads/Writes data) --> .-------------------.
| (at /account/...)        |                             |  profiles TABLE   |
| (This is the "Edit UI")  |                             | (Single Source of |
+--------------------------+                             |       Truth)      |
                                                         '-------------------'
+--------------------------+                                     |
|  Legacy Profile Page     | -- (This is DELETED) --/              | (All features Read data)
| (at /profile)            |                                     |
+--------------------------+                                     v
                                                     .-------------------+
                                                     |
+--------------------------+                         +--------------------------+
|  Public Profile Page     | <-- (Reads data from) -- |  Listings Hub            |
| (at /public-profile/[id])|                          | (at /listings)           |
+--------------------------+                          +--------------------------+

```

* * *

### 4.0 Phase 1: Implement the New 3-Column Account Hub

This phase establishes the `/account` route group as the new, tabbed container for all settings.

- **File:** `apps/web/src/app/(authenticated)/layout.tsx`
- **Action:** In the child component `apps/web/src/app/components/layout/sidebars/AppSidebar.tsx`, find the `NavLink` that points to `/profile` and update it:
  - **From:** `href: "/profile"`, `label: "Profile"`
  - **To:** `href: "/account/personal-info"`, `label: "Account"`
  - **Also update** `apps/web/src/app/components/layout/NavMenu.tsx` **(for the header dropdown) with the same change.**
- **File:** `apps/web/src/app/account/layout.tsx`
- **Action:** This existing layout file will be updated to create the new 70:30, 2-column grid (which lives inside the main layout's content area).
```
TypeScript
```
```
// apps/web/src/app/account/layout.tsx
import { PageHeader } from '@/app/components/ui/PageHeader';
import { AccountTabs } from '@/app/components/account/AccountTabs';
import { HeroProfileCard } from '@/app/components/account/HeroProfileCard';
import { RoleStatsCard } from '@/app/components/account/RoleStatsCard';
import styles from './account.module.css'; // This CSS file already exists
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.accountWrapper}>
      <PageHeader title="Account Settings" />
      <div className={styles.accountGrid}>
        {/* Column 2 (Middle) */}
        <main className={styles.mainColumn}>
          <AccountTabs />
          <div className={styles.accountContent}>
            {children}
          </div>
        </main>
        {/* Column 3 (Right) */}
        <aside className={styles.sidebarColumn}>
          <HeroProfileCard />
          <RoleStatsCard />
        </aside>
      </div>
    </div>
  );
}
```
- **File:** `apps/web/src/app/account/account.module.css`
- **Action:** Update this CSS module to define the 70:30 grid.
```
CSS
```
```
/* apps/web/src/app/account/account.module.css */
.accountWrapper {
  padding: 0; /* PageHeader will have its own padding */
}
.accountGrid {
  display: grid;
  grid-template-columns: 1fr; /* Mobile-first (single column) */
  gap: var(--space-4); /* 32px */
  padding: var(--space-3) 0;
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
/* Standard 70:30 split on desktop */
@media (min-width: 1024px) {
  .accountGrid {
    grid-template-columns: 2.5fr 1fr; /* 70% / 30% split */
  }
}
```
- **File (New):** `apps/web/src/app/components/account/AccountTabs.tsx`
- **Action:** Create this new client component to render the tabbed navigation for Column 2.
```
TypeScript
```
```
// apps/web/src/app/components/account/AccountTabs.tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AccountTabs.module.css'; // New CSS Module
const tabs = [
  { href: '/account/personal-info', label: 'Personal Info' },
  { href: '/account/professional', label: 'Professional Info' },
  { href: '/account/settings', label: 'Settings' },
];
export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabsNav}>
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href} legacyBehavior>
          <a className={pathname.startsWith(tab.href) ? styles.active : ''}>
            {tab.label}
          </a>
        </Link>
      ))}
    </nav>
  );
}
```
- **File (New):** `apps/web/src/app/components/account/AccountTabs.module.css`
- **Action:** Create a CSS module for the tabs, inheriting styles from `apps/web/src/app/components/ui/Tabs.module.css` (v4.5) for consistency.

* * *

### 5.0 Phase 2: Create Column 3 (Hero & Stats)

This phase builds the new components for the right-hand sidebar.

- **File (New):** `apps/web/src/app/components/account/HeroProfileCard.tsx`
- **Action:** Create a new client component to display the user's core identity.
```
TypeScript
```
```
// apps/web/src/app/components/account/HeroProfileCard.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useImageUpload } from '@/hooks/useImageUpload'; // Moved from profile
import { Card } from '@/app/components/ui/Card';
import styles from './HeroProfileCard.module.css'; // New CSS Module
import { Camera } from 'lucide-react';
export function HeroProfileCard() {
  const { profile } = useUserProfile();
  const { handleImageUpload, isUploading } = useImageUpload(); // Existing hook
  if (!profile) return null;
  return (
    <Card className={styles.heroCard}>
      <label className={styles.avatarWrapper} htmlFor="avatar-upload">
        <Image
          src={profile.avatar_url || '/default-avatar.png'}
          alt="User Avatar"
          width={192}
          height={192}
          className={styles.avatar}
        />
        <div className={styles.avatarOverlay}>
          <Camera size={24} />
          <span>{isUploading ? 'Uploading...' : 'Change'}</span>
        </div>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isUploading}
          className={styles.fileInput}
        />
      </label>
      <h2 className={styles.fullName}>{profile.full_name}</h2>
      <p className={styles.roleLine}>
        <span className={styles.role}>{profile.primary_role}</span>
        <Link href={`/public-profile/${profile.id}`} className={styles.publicLink}>
          View Public Profile
        </Link>
      </p>
      <p className={styles.location}>{profile.country || 'No location set'}</p>
    </Card>
  );
}
```
- **File (New):** `apps/web/src/app/components/account/RoleStatsCard.tsx`
- **Action:** Create a new client component to display role-specific stats.
```
TypeScript
```
```
// apps/web/src/app/components/account/RoleStatsCard.tsx
'use client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { Card } from '@/app/components/ui/Card';
import { StatCard, StatGrid } from '@/app/components/ui/reports'; // Re-use v4.4 components
export function RoleStatsCard() {
  const { profile } = useUserProfile();
  // ... logic to fetch stats based on profile.primary_role
  // e.g., fetch from new API routes: /api/account-stats/tutor, /api/account-stats/agent, etc.
  const renderStats = () => {
    switch (profile?.primary_role) {
      case 'tutor':
        return (
          <>
            <StatCard title="Credibility" value={profile.average_rating || 'N/A'} />
            <StatCard title="1-on-1 Rate" value={'£--'} /> {/* TODO: Fetch from listings */}
            <StatCard title="Group Rate" value={'£--'} />
          </>
        );
      case 'agent':
        return (
          <>
            <StatCard title="Credibility" value={profile.average_rating || 'N/A'} />
            <StatCard title="Active Referrals" value={'--'} /> {/* TODO: Fetch from referrals */}
            <StatCard title="Network Size" value={'--'} />
          </>
        );
      case 'client':
         return (
          <>
            <StatCard title="Active Requests" value={'--'} /> {/* TODO: Fetch from bookings */}
            <StatCard title="Completed" value={'--'} />
            <StatCard title="Total Spent" value={'£--'} />
          </>
        );
      default:
        return <p>No stats available for your role.</p>;
    }
  };
  return (
    <Card>
      <h3 className="card-title">Your Stats</h3>
      <StatGrid>{renderStats()}</StatGrid>
    </Card>
  );
}
```

* * *

### 6.0 Phase 3: Migrate Column 2 (Editor Content)

This phase moves the existing forms and modals into the new tabbed layout.

- **File:** `apps/web/src/app/account/personal-info/page.tsx`
- **Action:** This page (from Phase 1) is simplified. It **no longer** contains the Avatar Uploader.
- **UI:** It will render a single `Card` containing the `PersonalInfoForm.tsx` (for Full Name, Email, Phone).
- **Component** `PersonalInfoForm.tsx`**:**
  - **Auto-Save:** No. It will **retain its existing explicit "Save Changes" button.**
  - **Layout:** It will **retain its existing 2-column internal grid** for fields, as you specified.
- **File (New):** `apps/web/src/app/account/professional/page.tsx`
- **Action:** Create this new page. It will render the `<ProfessionalInfoEditor />` client component.
- **Component** `<ProfessionalInfoEditor />`**:**
  - **Logic:** This client component will `useUserProfile()` to get the user's role.
  - **UI:** It will render the correct component: `<TutorNarrative />`, `<ClientProfessionalInfo />`, or `<AgentProfessionalInfo />`.
  - **Auto-Save:** No. These components **will retain their "read-only with \[Edit\] modal" pattern.** The "Save Changes" button exists *inside* the modal, which is correct.
  - **Layout:** These components **will retain their 1-column layout** for text areas, as you specified.
- **File:** `apps/web/src/app/account/settings/page.tsx`
- **Action:** This page will be updated to contain the "Change Password" and "Delete Account" logic.
- **UI:** It will render two `Card` components, stacked vertically (1-column layout).
  1. `<ChangePasswordForm />` (Refactored from `/settings/change-password/page.tsx`)
  2. `<DeleteAccountSection />` (Refactored from `/delete-account/page.tsx`)

* * *

### 7.0 Phase 4: Cleanup & Redirects

This final phase removes all legacy code and prevents broken links.

- **Files/Folders to DELETE:**
  - `apps/web/src/app/profile/` (entire folder, including `page.tsx`, `[id]/page.tsx`, and `*.module.css`)
  - `apps/web/src/app/settings/` (entire folder)
  - `apps/web/src/app/delete-account/` (entire folder)
  - All legacy components from `apps/web/src/app/components/profile/` that are now moved to `apps/web/src/app/components/account/` (e.g., `HybridHeader.tsx`, `ProfileTabs.tsx`, `TutorNarrative.tsx`, `EditNarrativeModal.tsx`, etc.)
- **File to Update:** `apps/web/src/middleware.ts`
- **Action:** Add/update redirect rules to route all legacy traffic.
```
TypeScript
```
```
// apps/web/src/middleware.ts
// Redirect legacy /profile editor to new /account hub
if (request.nextUrl.pathname === '/profile') {
  return NextResponse.redirect(new URL('/account/personal-info', request.url));
}
// Redirect legacy /profile/[id] viewer to /public-profile/[id]
if (request.nextUrl.pathname.startsWith('/profile/')) {
  const id = request.nextUrl.pathname.split('/')[2];
  if (id) {
    return NextResponse.redirect(new URL(`/public-profile/${id}`, request.url));
  }
  return NextResponse.redirect(new URL('/account/personal-info', request.url));
}
// Redirect legacy /settings pages to new /account/settings
if (request.nextUrl.pathname.startsWith('/settings') || 
    request.nextUrl.pathname === '/delete-account') {
  return NextResponse.redirect(new URL('/account/settings', request.url));
}
// ... rest of middleware logic
```

###   
  
**ASCII Diagram**

For example, the tab (`apps/web/src/app/account/professional/page.tsx`) will render the `ProfessionalInfoEditor` component. This component will then render the existing, read-only components (like `TutorNarrative.tsx`) that already contain their own "Edit" buttons, which in turn open their own modals (like `EditNarrativeModal.tsx`).

Each diagram shows the full 3-column layout, with the "active" tab and its specific content rendered in **Column 2**.

### 1\. "Personal Info" Tab (Active)

This tab's content (`personal-info/page.tsx`) renders the `PersonalInfoForm.tsx` within a `Card`. This form retains its internal 2-column grid for short fields.

```
+--------------+------------------------------------------------+----------------------------------+
|              | [Column 2: Main Content (70%)]                 | [Column 3: Hero Sidebar (30%)]   |
| [AppSidebar] |                                                |                                  |
| ...          |  [Personal Info]  [Professional Info]  [Settings]  | +-[HeroProfileCard]------------+ |
| [Account]    |  ^^^^^^^^^^^^^^^                                   | | (Avatar: 192x192)            | |
| (Active)     |  (Active Tab)                                      | | Michael Quan                 | |
| ...          | +------------------------------------------------+ | | Tutor [View Public Profile]  | |
|              | |                                                | | | United Kingdom               | |
|              | | <--- Renders content for /account/personal-info/page.tsx --->                     | |
|              | |                                                | | +------------------------------+ |
|              | | +-[Card]-------------------------------------+ | | +-[RoleStatsCard]--------------+ |
|              | | | Personal Information                       | | | | [Credibility] [1-on-1 Rate]  | |
|              | | | <...description...>                        | | | +------------------------------+ |
|              | | |                                            | | |                                  |
|              | | | +-[Form Grid: 2 Columns]-----------------+ | | |                                  |
|              | | | | [Full Name]                  [Phone]   | | | |                                  |
|              | | | | [ John Doe... ]              [ +44...  ] | | | |                                  |
|              | | | | [Email Address]              [Country] | | | |                                  |
|              | | | | [ john.doe@... (read-only) ] [ UK (v)  ] | | | |                                  |
|              | | +----------------------------------------+ | | |                                  |
|              | |                                            | | |                                  |
|              | | [ Save Changes ] (Button, full-width)      | | |                                  |
|              | +--------------------------------------------+ | |                                  |
|              |                                                | |                                  |
+--------------+------------------------------------------------+----------------------------------+

```

* * *

### 2\. "Professional Info" Tab (Active)

This tab (`professional/page.tsx`) renders the existing **read-only** components (e.g., `TutorNarrative.tsx`). These components contain their own `[ Edit ]` buttons that open the appropriate modals, preserving the "no change" migration.

```
+--------------+------------------------------------------------+----------------------------------+
|              | [Column 2: Main Content (70%)]                 | [Column 3: Hero Sidebar (30%)]   |
| [AppSidebar] |                                                |                                  |
| ...          |  [Personal Info]  [Professional Info]  [Settings]  | +-[HeroProfileCard]------------+ |
| [Account]    |                   ^^^^^^^^^^^^^^^^^^^            | | (Avatar: 192x192)            | |
| (Active)     |                   (Active Tab)                   | | Michael Quan                 | |
| ...          | +------------------------------------------------+ | | Tutor [View Public Profile]  | |
|              | |                                                | | | United Kingdom               | |
|              | | <--- Renders content for /account/professional/page.tsx --->                     | |
|              | |                                                | | +------------------------------+ |
|              | | (IF USER ROLE IS 'tutor')                      | | +-[RoleStatsCard]--------------+ |
|              | | +-[Card]-------------------------------------+ | | | [Credibility] [1-on-1 Rate]  | |
|              | | | Your Tutor Profile         [ Edit ] <---(1) | | | +------------------------------+ |
|              | | +--------------------------------------------+ | |                                  |
|              | | | About Me                                     | |                                  |
|              | | | (Read-only 'About Me' text from profile...)  | |                                  |
|              | | +--------------------------------------------+ | |                                  |
|              | | | Qualifications                             | | |                                  |
|              | | | (Read-only 'Qualifications' text...)         | |                                  |
|              | | +--------------------------------------------+ | |                                  |
|              | | | Experience                                 | | |                                  |
|              | | | (Read-only 'Experience' text...)           | | |                                  |
|              | +--------------------------------------------+ | |                                  |
|              |                                                | |                                  |
+--------------+------------------------------------------------+----------------------------------+

```

**(1)** `[ Edit ]` button is inside the reused `TutorNarrative.tsx` component and opens `EditNarrativeModal.tsx`.

* * *

### 3\. "Settings" Tab (Active)

This tab (`settings/page.tsx`) renders vertically stacked `Card` components for password management and account deletion.

```
+--------------+------------------------------------------------+----------------------------------+
|              | [Column 2: Main Content (70%)]                 | [Column 3: Hero Sidebar (30%)]   |
| [AppSidebar] |                                                |                                  |
| ...          |  [Personal Info]  [Professional Info]  [Settings]  | +-[HeroProfileCard]------------+ |
| [Account]    |                                       ^^^^^^^^^^   | | (Avatar: 192x192)            | |
| (Active)     |                                       (Active Tab) | | Michael Quan                 | |
| ...          | +------------------------------------------------+ | | Tutor [View Public Profile]  | |
|              | |                                                | | | United Kingdom               | |
|              | | <--- Renders content for /account/settings/page.tsx --->                         | |
|              | |                                                | | +------------------------------+ |
|              | | +-[Card]-------------------------------------+ | | +-[RoleStatsCard]--------------+ |
|              | | | Change Password                            | | | | [Credibility] [1-on-1 Rate]  | |
|              | | | <...description...>                        | | | +------------------------------+ |
|              | | |                                            | | |                                  |
|              | | | [Current Password]                         | | |                                  |
|              | | | [ ************ ] (Input)                   | | |                                  |
|              | | | [New Password]                             | | |                                  |
|              | | | [ ************ ] (Input)                   | | |                                  |
|              | | |                                            | | |                                  |
|              | | | [ Update Password ] (Button)               | | |                                  |
|              | +--------------------------------------------+ | |                                  |
|              | |                                                | |                                  |
|              | | +-[Card] (Danger Zone)-----------------------+ | |                                  |
|              | | | Delete Account                             | | |                                  |
|              | | | <...warning text...>                      | | |                                  |
|              | | | [ Delete My Account ] (Button, danger)     | | |                                  |
|              | +--------------------------------------------+ | |                                  |
|              |                                                | |                                  |
+--------------+------------------------------------------------+----------------------------------+

```