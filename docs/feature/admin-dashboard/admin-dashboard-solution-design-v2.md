# Tutorwise Admin Dashboard - Solution Design v2

**Document Status**: v2.0 (Corrected based on existing Listings/Financials patterns)
**Created**: 2025-12-23
**Last Updated**: 2025-12-23
**Owner**: Engineering Team
**Stakeholders**: Product, Engineering, Business Operations

**CHANGES FROM v1**:
- ✅ Removed AdminTopBar (use existing global header)
- ✅ AdminSidebar matches AppSidebar pattern (text-only navigation, no icons)
- ✅ HubTabs are COMPULSORY on all pages (following Listings/Financials pattern)
- ✅ Right sidebar uses 4-card widget pattern (Stats, Help, Tips, Video)
- ✅ Removed all charts from right sidebar
- ✅ Navigation follows Financials pattern (parent with expandable sub-items)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Specifications](#3-component-specifications)
4. [Admin Navigation Structure](#4-admin-navigation-structure)
5. [Page Specifications](#5-page-specifications)
6. [Database Schema](#6-database-schema)
7. [Implementation Plan](#7-implementation-plan)
8. [Success Metrics](#8-success-metrics)

---

## 1. Executive Summary

### 1.1 Purpose

Build Tutorwise's first comprehensive admin dashboard following the **EXACT same patterns** as existing user-facing Hub pages (Listings, Financials, Network).

### 1.2 Key Design Decisions

1. **Reuse Existing Global Header**: No new AdminTopBar needed
2. **AdminSidebar Pattern**: Copy AppSidebar.tsx pattern exactly (text navigation, no icons, expandable sections)
3. **HubTabs Compulsory**: Every page must have tabs (status filtering, sections, or views)
4. **4-Card Right Sidebar**: Stats, Help, Tips, Video (following Financials pattern)
5. **100% Hub Component Reuse**: HubPageLayout, HubHeader, HubTabs, HubPagination, HubSidebar

### 1.3 Cost & Timeline

- **Development**: 160-200 hours ($12,800-$16,000)
- **Timeline**: 4-5 weeks (1 developer) or 2-3 weeks (2 developers)
- **ROI**: 3-month payback through 20 hours/week engineering time savings

---

## 2. Architecture Overview

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Global Header (EXISTING - NO CHANGES)                               │
│ [Logo] [Nav Menu] ──────────────── [Notifications] [User Menu]      │
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                           │               │
│  Admin   │  HubPageLayout (100% REUSE)              │  HubSidebar   │
│  Sidebar │  ┌─────────────────────────────────────┐ │  (4 cards)    │
│          │  │ HubHeader                            │ │               │
│  Over-   │  │ [Title] [Search+Filters] [Actions]   │ │  📊 Stats    │
│   view   │  ├─────────────────────────────────────┤ │               │
│          │  │ HubTabs (COMPULSORY)                 │ │  ❓ Help     │
│  SEO     │  ├─────────────────────────────────────┤ │               │
│   Hubs   │  │ Content Area                         │ │  💡 Tips     │
│   Spokes │  │ - Lists                              │ │               │
│   Citati │  │ - Pagination                         │ │  🎥 Video    │
│   Config │  │ - Empty States                       │ │               │
│          │  └─────────────────────────────────────┘ │               │
│  Users   │                                           │               │
│  Listing │                                           │               │
│  Booking │                                           │               │
│  Reviews │                                           │               │
│  Reports │                                           │               │
│  Settings│                                           │               │
└──────────┴───────────────────────────────────────────┴───────────────┘
     ↑                        ↑                              ↑
AdminSidebar         Hub Components                  4-Card Pattern
 (new, copy           (existing, 100% reuse)        (existing widgets)
 AppSidebar)
```

### 2.2 Pattern Matching

**Listings Page Pattern** → **Admin SEO Hubs Page**:
- HubHeader with title, search, sort, actions ✅
- HubTabs: All | Published | Unpublished | Draft | Archived ✅
- HubSidebar: ListingStatsWidget, HelpWidget, TipWidget, VideoWidget ✅
- Pagination with ITEMS_PER_PAGE ✅

**Financials Page Pattern** → **Admin Financials Page**:
- HubHeader with title, filters (search, date, type), actions ✅
- HubTabs: All Status | Clearing | Available | Paid Out | Disputed ✅
- HubSidebar: WalletBalanceWidget, TransactionHelpWidget, TipWidget, VideoWidget ✅
- Pagination ✅

---

## 3. Component Specifications

### 3.1 AdminSidebar (NEW - Copy AppSidebar Pattern)

**File**: `/apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx`

**Pattern**: Exact copy of AppSidebar.tsx structure with admin navigation items.

```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css'; // Copy AppSidebar.module.css styles

interface NavItem {
  href: string;
  label: string;
  subItems?: NavItem[];
  indent?: boolean;
}

export default function AdminSidebar() {
  const pathname = usePathname();

  // Admin navigation menu (NO ICONS - text only)
  const navItems: NavItem[] = [
    { href: '/admin', label: 'Overview' },
    {
      href: '/admin/seo',
      label: 'SEO',
      subItems: [
        { href: '/admin/seo/hubs', label: 'Hubs', indent: true },
        { href: '/admin/seo/spokes', label: 'Spokes', indent: true },
        { href: '/admin/seo/citations', label: 'Citations', indent: true },
        { href: '/admin/seo/config', label: 'Configuration', indent: true },
      ],
    },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/bookings', label: 'Bookings' },
    { href: '/admin/reviews', label: 'Reviews' },
    {
      href: '/admin/financials',
      label: 'Financials',
      subItems: [
        { href: '/admin/financials', label: 'Transactions', indent: true },
        { href: '/admin/financials/payouts', label: 'Payouts', indent: true },
        { href: '/admin/financials/disputes', label: 'Disputes', indent: true },
      ],
    },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  const isActive = (href: string, hasSubItems?: boolean) => {
    if (href === '/admin') {
      return pathname === href;
    }
    if (hasSubItems) {
      return false; // Never highlight parent with sub-items
    }
    return pathname?.startsWith(href);
  };

  const isParentActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <aside className={styles.adminSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <React.Fragment key={item.href}>
              <li>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive(item.href, !!item.subItems) ? styles.navItemActive : ''
                  } ${item.indent ? styles.navItemIndent : ''}`}
                >
                  <span className={styles.navItemLabel}>{item.label}</span>
                  {item.subItems && (
                    <span className={`${styles.chevron} ${isParentActive(item.href) ? styles.chevronExpanded : ''}`}>
                      ▼
                    </span>
                  )}
                </Link>
              </li>
              {/* Render sub-items if they exist and parent section is active */}
              {item.subItems && isParentActive(item.href) && (
                <>
                  {item.subItems.map((subItem) => (
                    <li key={subItem.href}>
                      <Link
                        href={subItem.href}
                        className={`${styles.navItem} ${
                          pathname === subItem.href ? styles.navItemActive : ''
                        } ${subItem.indent ? styles.navItemIndent : ''}`}
                      >
                        {subItem.label}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

**CSS**: Copy `/app/components/layout/AppSidebar.module.css` to `AdminSidebar.module.css` with renamed classes.

### 3.2 AdminLayout (NEW - Simple Wrapper)

**File**: `/apps/web/src/app/components/admin/layout/AdminLayout.tsx`

```typescript
'use client';

import React, { ReactNode } from 'react';
import AdminSidebar from '../sidebar/AdminSidebar';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={styles.adminContainer}>
      <AdminSidebar />
      <div className={styles.adminContent}>
        {children}
      </div>
    </div>
  );
}
```

**CSS**:
```css
/* AdminLayout.module.css */
.adminContainer {
  display: flex;
  min-height: calc(100vh - 64px); /* Subtract global header height */
}

.adminContent {
  flex: 1;
  overflow-x: hidden;
}
```

### 3.3 4-Card Sidebar Widget Pattern

**Example**: Admin SEO Hubs page sidebar

```typescript
<HubSidebar>
  {/* Card 1: Stats */}
  <HubStatsWidget
    title="Hub Statistics"
    stats={[
      { label: 'Total Hubs', value: stats.total },
      { label: 'Published', value: stats.published },
      { label: 'Draft', value: stats.draft },
    ]}
  />

  {/* Card 2: Help */}
  <HubHelpWidget
    title="What are SEO Hubs?"
    content="Hub pages are topical authority pages that target broad keywords. Each hub should have 6-8 related spoke pages."
  />

  {/* Card 3: Tips */}
  <HubTipWidget
    title="Best Practices"
    tips={[
      'Create 6-8 spokes per hub for optimal authority',
      'Include FAQ sections with answer capsules',
      'Target 120-150 character answer capsules for AI citations',
    ]}
  />

  {/* Card 4: Video */}
  <HubVideoWidget
    title="Tutorial"
    videoTitle="How to create an SEO Hub"
    videoDuration="3:45"
    videoUrl="/tutorials/create-seo-hub"
  />
</HubSidebar>
```

**Widget Components** (Create generic versions, reusable across admin):

- `HubStatsWidget` - Display key metrics
- `HubHelpWidget` - Contextual help text
- `HubTipWidget` - Best practices tips
- `HubVideoWidget` - Tutorial video link

---

## 4. Admin Navigation Structure

### 4.1 Complete Navigation Hierarchy

```
AdminSidebar Navigation
├─ Overview                      → /admin
├─ SEO ▼
│  ├─ Hubs                        → /admin/seo/hubs
│  ├─ Spokes                      → /admin/seo/spokes
│  ├─ Citations                   → /admin/seo/citations
│  └─ Configuration               → /admin/seo/config
├─ Users                          → /admin/users
├─ Listings                       → /admin/listings
├─ Bookings                       → /admin/bookings
├─ Reviews                        → /admin/reviews
├─ Financials ▼
│  ├─ Transactions                → /admin/financials
│  ├─ Payouts                     → /admin/financials/payouts
│  └─ Disputes                    → /admin/financials/disputes
├─ Reports                        → /admin/reports
└─ Settings                       → /admin/settings
```

### 4.2 Sidebar Behavior

- **Expandable sections** (SEO, Financials) show chevron ▼
- **Chevron rotates** when section is active/expanded
- **Sub-items are indented** when parent section is active
- **No icons** - text-only navigation (matching AppSidebar)
- **Active state** highlights current page (blue background)

---

## 5. Page Specifications

### 5.1 SEO Hubs Page (Example - All pages follow this pattern)

**Route**: `/admin/seo/hubs`

**File**: `/apps/web/src/app/(admin)/admin/seo/hubs/page.tsx`

```typescript
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type StatusFilter = 'all' | 'published' | 'draft';
type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 10;

export default function AdminSEOHubsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams?.get('status') as StatusFilter) || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch hubs
  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['admin-hubs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/hubs');
      return res.json();
    },
  });

  // Filter by status tab
  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return hubs;
    return hubs.filter(hub => hub.status === statusFilter);
  }, [hubs, statusFilter]);

  // Search filter
  const searchedHubs = useMemo(() => {
    if (!searchQuery.trim()) return filteredByStatus;
    const query = searchQuery.toLowerCase();
    return filteredByStatus.filter(hub =>
      hub.title?.toLowerCase().includes(query) ||
      hub.keywords?.join(' ').toLowerCase().includes(query)
    );
  }, [filteredByStatus, searchQuery]);

  // Sort
  const sortedHubs = useMemo(() => {
    const sorted = [...searchedHubs];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'name-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'name-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  }, [searchedHubs, sortBy]);

  // Pagination
  const totalItems = sortedHubs.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedHubs = sortedHubs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, sortBy]);

  // Tab change handler
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('status');
    } else {
      params.set('status', tabId);
    }
    router.push(`/admin/seo/hubs${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Stats for tabs
  const stats = useMemo(() => ({
    all: hubs.length,
    published: hubs.filter(h => h.status === 'published').length,
    draft: hubs.filter(h => h.status === 'draft').length,
  }), [hubs]);

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Hubs"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search hubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className={filterStyles.filterSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => router.push('/admin/seo/hubs/create')}>
                Create Hub
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button variant="secondary" size="sm" square onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  ⋮
                </Button>
                {showActionsMenu && (
                  <>
                    <div className={actionStyles.backdrop} onClick={() => setShowActionsMenu(false)} />
                    <div className={actionStyles.dropdownMenu}>
                      <button className={actionStyles.menuButton}>Bulk Publish</button>
                      <button className={actionStyles.menuButton}>Export CSV</button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Hubs', count: stats.all, active: statusFilter === 'all' },
            { id: 'published', label: 'Published', count: stats.published, active: statusFilter === 'published' },
            { id: 'draft', label: 'Draft', count: stats.draft, active: statusFilter === 'draft' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <HubStatsWidget title="Hub Statistics" stats={[
            { label: 'Total Hubs', value: stats.all },
            { label: 'Published', value: stats.published },
            { label: 'Draft', value: stats.draft },
          ]} />
          <HubHelpWidget title="What are SEO Hubs?" content="Hub pages target broad keywords and serve as topical authority pages." />
          <HubTipWidget title="Best Practices" tips={[
            'Create 6-8 spokes per hub',
            'Include FAQ sections',
            'Use answer capsules (120-150 chars)',
          ]} />
          <HubVideoWidget title="Tutorial" videoTitle="How to create an SEO Hub" videoDuration="3:45" />
        </HubSidebar>
      }
    >
      {paginatedHubs.length === 0 ? (
        <HubEmptyState
          title={searchQuery ? 'No results found' : 'No hubs yet'}
          description={searchQuery ? `No hubs match "${searchQuery}"` : 'Create your first SEO hub to get started.'}
          actionLabel={!searchQuery ? 'Create First Hub' : undefined}
          onAction={!searchQuery ? () => router.push('/admin/seo/hubs/create') : undefined}
        />
      ) : (
        <>
          <div className={styles.hubsList}>
            {paginatedHubs.map((hub) => (
              <HubCard key={hub.id} hub={hub} />
            ))}
          </div>
          <HubPagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </HubPageLayout>
  );
}
```

### 5.2 All Admin Pages with Tabs

**Every page MUST have HubTabs** - following the pattern from Listings and Financials.

| Page | Route | Tabs |
|------|-------|------|
| **Overview** | `/admin` | Overview \| Activity \| Alerts |
| **SEO Hubs** | `/admin/seo/hubs` | All \| Published \| Draft |
| **SEO Spokes** | `/admin/seo/spokes` | All \| Published \| Draft |
| **SEO Citations** | `/admin/seo/citations` | All Sources \| ChatGPT \| Perplexity \| Google AI |
| **SEO Config** | `/admin/seo/config` | Organization \| SEO Settings \| AI Optimization \| Alerts |
| **Users** | `/admin/users` | All \| Tutors \| Students \| Parents |
| **Listings** | `/admin/listings` | All \| Published \| Pending \| Flagged \| Archived |
| **Bookings** | `/admin/bookings` | All \| Upcoming \| Completed \| Cancelled |
| **Reviews** | `/admin/reviews` | All \| Published \| Flagged |
| **Financials - Transactions** | `/admin/financials` | All Status \| Clearing \| Available \| Paid Out \| Disputed |
| **Financials - Payouts** | `/admin/financials/payouts` | All \| Pending \| Completed |
| **Financials - Disputes** | `/admin/financials/disputes` | All \| Open \| Resolved |
| **Reports** | `/admin/reports` | Growth \| Bookings \| Tutors \| Subjects \| SEO |
| **Settings** | `/admin/settings` | General \| Payments \| Email \| Notifications \| Integrations |

### 5.3 Right Sidebar 4-Card Pattern (All Pages)

**Card 1: Stats** - Key metrics for the current page
**Card 2: Help** - What is this page about?
**Card 3: Tips** - Best practices, quick tips
**Card 4: Video** - Tutorial video link

**Example for each major section:**

**SEO Hubs**:
1. Stats: Total hubs, Published, Draft, Avg Google rank
2. Help: "What are SEO Hubs? Hub pages target broad keywords..."
3. Tips: "Create 6-8 spokes, Include FAQs, Use answer capsules"
4. Video: "How to create an SEO Hub (3:45)"

**Users**:
1. Stats: Total users, Tutors, Students, Active (30d)
2. Help: "Manage all platform users. You can search, filter, and moderate user accounts."
3. Tips: "Verify new tutors within 24h, Monitor for duplicate accounts, Check profile completion"
4. Video: "User moderation guide (2:30)"

**Listings**:
1. Stats: Total listings, Published, Pending moderation, Avg quality score
2. Help: "Moderate tutor listings. Approve, flag, or reject based on quality guidelines."
3. Tips: "Check photo quality, Verify credentials, Ensure complete descriptions"
4. Video: "Listing moderation workflow (4:15)"

**Bookings**:
1. Stats: Total bookings, Completed rate, Cancellation rate
2. Help: "Manage all bookings. Issue refunds, resolve disputes, contact users."
3. Tips: "Respond to disputes within 24h, Review cancellation reasons, Monitor completion rates"
4. Video: "Handling booking disputes (3:00)"

**Reviews**:
1. Stats: Total reviews, Avg rating, Flagged reviews
2. Help: "Moderate user reviews. Remove spam, profanity, or fake reviews."
3. Tips: "Check for profanity patterns, Verify genuine experiences, Keep edit history"
4. Video: "Review moderation guide (2:45)"

**Financials**:
1. Stats: Total revenue, Platform fees, Pending payouts
2. Help: "View all financial transactions. Track revenue, process payouts, manage disputes."
3. Tips: "Process payouts weekly, Monitor dispute rate, Review high-value transactions"
4. Video: "Financial management (5:00)"

**Reports**:
1. Stats: Total reports generated, Most viewed report type
2. Help: "Generate and schedule reports. Export to CSV or PDF."
3. Tips: "Schedule weekly growth reports, Export for stakeholder meetings, Compare month-over-month"
4. Video: "Creating custom reports (3:30)"

**Settings**:
1. Stats: Configuration completion (%), Missing required fields
2. Help: "Configure platform settings. Update payment info, email templates, integrations."
3. Tips: "Complete organization details, Configure email notifications, Test integrations"
4. Video: "Platform configuration (4:00)"

---

## 6. Database Schema

### 6.1 Admin-Specific Tables

```sql
-- Admin users (extend profiles table)
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN admin_role TEXT; -- 'super_admin', 'seo_manager', 'support', 'analyst'
ALTER TABLE profiles ADD COLUMN admin_permissions JSONB;
ALTER TABLE profiles ADD COLUMN last_admin_access TIMESTAMPTZ;

CREATE INDEX idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;

-- Admin audit logs
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'publish', 'moderate'
  resource_type TEXT NOT NULL, -- 'hub', 'user', 'listing', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_logs(resource_type, resource_id);

-- Platform statistics (daily snapshots)
CREATE TABLE platform_statistics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  active_tutors INTEGER,
  active_students INTEGER,
  published_listings INTEGER,
  total_bookings INTEGER,
  completed_bookings INTEGER,
  total_revenue NUMERIC(10,2),
  new_signups INTEGER,
  avg_listing_quality_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_stats_date ON platform_statistics_daily(date DESC);
```

### 6.2 Extend SEO Tables for Admin

```sql
-- SEO hubs admin fields
ALTER TABLE seo_hubs ADD COLUMN created_by UUID REFERENCES profiles(id);
ALTER TABLE seo_hubs ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
ALTER TABLE seo_hubs ADD COLUMN last_edited_at TIMESTAMPTZ;
ALTER TABLE seo_hubs ADD COLUMN published_by UUID REFERENCES profiles(id);

-- SEO spokes admin fields
ALTER TABLE seo_spokes ADD COLUMN created_by UUID REFERENCES profiles(id);
ALTER TABLE seo_spokes ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
ALTER TABLE seo_spokes ADD COLUMN last_edited_at TIMESTAMPTZ;
```

### 6.3 Extend Listings for Admin Moderation

```sql
ALTER TABLE listings_v4_1 ADD COLUMN moderation_status TEXT DEFAULT 'pending';
ALTER TABLE listings_v4_1 ADD COLUMN moderation_notes TEXT;
ALTER TABLE listings_v4_1 ADD COLUMN moderated_by UUID REFERENCES profiles(id);
ALTER TABLE listings_v4_1 ADD COLUMN moderated_at TIMESTAMPTZ;
ALTER TABLE listings_v4_1 ADD COLUMN quality_score NUMERIC(3,2);

CREATE INDEX idx_listings_moderation ON listings_v4_1(moderation_status);
```

---

## 7. Implementation Plan

### 7.1 Phase 0: Foundation (Week 1) - 40 hours

**Tasks**:
1. Create AdminSidebar component (copy AppSidebar pattern) - 8 hours
2. Create AdminLayout wrapper component - 4 hours
3. Create 4-card sidebar widgets (HubStatsWidget, HubHelpWidget, HubTipWidget, HubVideoWidget) - 12 hours
4. Database schema updates (admin fields, audit logs) - 8 hours
5. Middleware for `/admin` route protection - 4 hours
6. Create first super admin user (manual SQL) - 2 hours
7. Test admin access control - 2 hours

**Deliverable**: Admin shell with sidebar, layout, and access control working.

### 7.2 Phase 1: SEO Management (Week 2-3) - 60 hours

**Tasks**:
1. SEO Hubs page - 16 hours
   - List page with tabs, search, sort, pagination
   - Create/edit hub form
   - Hub detail view
   - 4-card sidebar

2. SEO Spokes page - 12 hours
   - List page with tabs
   - Create/edit spoke form
   - 4-card sidebar

3. SEO Citations page - 12 hours
   - List page with source tabs
   - Citation detail view
   - 4-card sidebar

4. SEO Configuration page - 12 hours
   - Multi-tab form (Organization, SEO, AI, Alerts)
   - 4-card sidebar with validation status

5. API routes for SEO admin - 8 hours

**Deliverable**: Complete SEO management section.

### 7.3 Phase 2: Platform Management (Week 3-4) - 60 hours

**Tasks**:
1. Users page - 16 hours
   - List with tabs (All, Tutors, Students, Parents)
   - Search, filters, bulk actions
   - User detail view with tabs (Profile, Activity, Financial, Notes, Audit)
   - 4-card sidebar

2. Listings page - 16 hours
   - List with tabs (All, Published, Pending, Flagged, Archived)
   - Moderation workflow
   - Quality scoring
   - 4-card sidebar

3. Bookings page - 14 hours
   - List with tabs (All, Upcoming, Completed, Cancelled)
   - Support actions (refund, cancel, dispute resolution)
   - 4-card sidebar

4. Reviews page - 14 hours
   - List with tabs (All, Published, Flagged)
   - Moderation actions
   - 4-card sidebar

**Deliverable**: Complete platform management section.

### 7.4 Phase 3: Business & System (Week 5) - 40 hours

**Tasks**:
1. Financials pages - 16 hours
   - Transactions (with tabs: All, Clearing, Available, Paid Out, Disputed)
   - Payouts (with tabs: All, Pending, Completed)
   - Disputes (with tabs: All, Open, Resolved)
   - 4-card sidebar for each

2. Reports page - 12 hours
   - Report type tabs (Growth, Bookings, Tutors, Subjects, SEO)
   - Generate and export
   - 4-card sidebar

3. Settings page - 8 hours
   - Multi-tab form (General, Payments, Email, Notifications, Integrations)
   - 4-card sidebar

4. Overview dashboard - 4 hours
   - Dashboard with tabs (Overview, Activity, Alerts)
   - Key metrics cards
   - 4-card sidebar

**Deliverable**: Complete admin dashboard ready for production.

### 7.5 Total Effort

| Phase | Hours | Cost ($80/hr) |
|-------|-------|---------------|
| Phase 0: Foundation | 40 | $3,200 |
| Phase 1: SEO Management | 60 | $4,800 |
| Phase 2: Platform Management | 60 | $4,800 |
| Phase 3: Business & System | 40 | $3,200 |
| **TOTAL** | **200** | **$16,000** |

**Timeline**:
- 1 developer full-time: 5 weeks
- 2 developers parallel: 2.5-3 weeks

---

## 8. Success Metrics

### 8.1 Launch Metrics (First 30 Days)

- 100% admin users access dashboard (5+ admin users)
- Average 5+ logins per admin per week
- SEO Manager creates/edits 10+ hubs
- Zero critical bugs
- Page load time <2s for all admin pages

### 8.2 3-Month Metrics

- SEO content publishing time reduced by 75% (2 hours → 30 min)
- Listing moderation time reduced by 80% (10 min → 2 min per listing)
- 50+ Hub pages published
- 300+ Spoke pages published
- 10+ ChatGPT citations detected

### 8.3 6-Month Metrics

- Engineering time savings: 20 hours/week = $6,400/month
- ROI payback period: 2.5 months
- SEO traffic up 200%
- 5+ Page 1 Google rankings
- Admin team scaled to 10+ users

---

## Appendix A: Component Reuse Checklist

**100% Reused from Existing Hub System**:
- ✅ HubPageLayout
- ✅ HubHeader
- ✅ HubTabs
- ✅ HubPagination
- ✅ HubSidebar
- ✅ HubEmptyState
- ✅ Button
- ✅ Filter styles (hub-filters.module.css)
- ✅ Action styles (hub-actions.module.css)

**Copy from Existing Components**:
- ✅ AdminSidebar (copy AppSidebar.tsx)
- ✅ AdminSidebar.module.css (copy AppSidebar.module.css)

**New Components to Create**:
- AdminLayout (simple wrapper)
- HubStatsWidget (generic stats card)
- HubHelpWidget (generic help card)
- HubTipWidget (generic tips card)
- HubVideoWidget (generic video card)

**Total Code Reuse: 85%+**

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2025-12-23 | Initial draft with Shadcn patterns |
| v2.0 | 2025-12-23 | **Corrected to match Listings/Financials patterns**: Removed AdminTopBar, text-only sidebar, compulsory tabs, 4-card sidebar |
