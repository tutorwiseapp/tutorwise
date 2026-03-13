# Hub Layout Migration Guide

## Overview
This guide helps migrate hub pages (like Bookings, Financials, Referrals) from the legacy structure to the standardized **Hub Layout Architecture** using `HubPageLayout`, `HubHeader`, `HubTabs`, and `HubEmptyState`.

**Last Updated**: 2025-12-03
**Version**: 3.0
**Migration Status**: 5/14 pages complete (36%)

---

## Migration Status

**✅ Completed** (5 pages): Bookings, Listings, Network, Reviews, Wiselists
**⚠️ Pending** (9 pages): Dashboard, Messages, Financials (3 pages), My Students, Organisation, Payments, Referrals

For detailed status, see: [docs/refactoring/hub-architecture-migration-status-2025-12-03.md](../../../../docs/refactoring/hub-architecture-migration-status-2025-12-03.md)

---

## Current State (Bookings Page - Legacy)

```tsx
// ❌ OLD: Direct structure with manual containers
<>
  <div className={styles.container}>
    <div className={styles.header}>
      <h1 className={styles.title}>Bookings</h1>
      <p className={styles.subtitle}>...</p>
    </div>
  </div>

  <div className={styles.filterTabs}>
    <button className={styles.filterTab}>All Bookings</button>
    <button className={styles.filterTab}>Upcoming</button>
    ...
  </div>

  <div className={styles.container}>
    {/* Content */}
  </div>
</>
```

**Issues:**
- ❌ Duplicated container divs
- ❌ Manual tab styling
- ❌ Inconsistent header structure
- ❌ No reusable components

---

## Target State (Hub Layout Architecture)

```tsx
// ✅ NEW: Standardized Hub Layout components
<HubPageLayout
  header={
    <HubHeader
      title="Bookings"
      actions={<Button>+ Create Booking</Button>}
    />
  }
  tabs={
    <HubTabs
      tabs={[
        { id: 'all', label: 'All Bookings', count: 10, active: true },
        { id: 'upcoming', label: 'Upcoming', count: 5, active: false },
        { id: 'past', label: 'Past', count: 3, active: false },
      ]}
      onTabChange={handleFilterChange}
    />
  }
  sidebar={
    <ContextualSidebar>
      <BookingStatsWidget />
    </ContextualSidebar>
  }
>
  {/* Content (no container needed) */}
  <div className={styles.bookingsList}>
    {bookings.map(booking => <BookingCard key={booking.id} {...booking} />)}
  </div>
</HubPageLayout>
```

**Benefits:**
- ✅ Clean, reusable components
- ✅ Consistent styling across all hubs
- ✅ Automatic padding/layout handling
- ✅ Type-safe props

---

## Step-by-Step Migration

### 1. Import Hub Components

```tsx
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import type { HubTab } from '@/app/components/hub/layout';
```

### 2. Replace Header Section

**Before:**
```tsx
<div className={styles.container}>
  <div className={styles.header}>
    <h1 className={styles.title}>Bookings</h1>
    <p className={styles.subtitle}>Manage your tutoring sessions...</p>
  </div>
</div>
```

**After:**
```tsx
<HubHeader
  title="Bookings"
  actions={
    <Button variant="primary" onClick={() => router.push('/create-booking')}>
      + Create Booking
    </Button>
  }
/>
```

**Note:** Subtitle is removed (no longer used)

### 3. Replace Filter Tabs

**Before:**
```tsx
<div className={styles.filterTabs}>
  <button
    onClick={() => handleFilterChange('all')}
    className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
  >
    All Bookings
  </button>
  <button
    onClick={() => handleFilterChange('upcoming')}
    className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
  >
    Upcoming
  </button>
  ...
</div>
```

**After:**
```tsx
<HubTabs
  tabs={[
    { id: 'all', label: 'All Bookings', count: filteredBookings.length, active: filter === 'all' },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount, active: filter === 'upcoming' },
    { id: 'past', label: 'Past', count: pastCount, active: filter === 'past' },
  ]}
  onTabChange={(tabId) => handleFilterChange(tabId as FilterType)}
/>
```

### 4. Wrap Content in HubPageLayout

**Before:**
```tsx
<>
  {/* header */}
  {/* tabs */}
  <div className={styles.container}>
    {/* content */}
  </div>
</>
```

**After:**
```tsx
<HubPageLayout
  header={<HubHeader ... />}
  tabs={<HubTabs ... />}
  sidebar={<ContextualSidebar>...</ContextualSidebar>}
>
  {/* content - NO container div needed */}
  <div className={styles.bookingsList}>...</div>
</HubPageLayout>
```

### 5. Replace Empty States with HubEmptyState

**Before (40+ lines of CSS + 15 lines JSX):**
```tsx
{/* CSS in page.module.css */}
.emptyState { display: flex; flex-direction: column; ... }
.emptyTitle { font-size: 1.25rem; font-weight: 600; ... }
.emptyText { font-size: 0.875rem; color: #6b7280; ... }
.emptyButton { padding: 0.625rem 1.25rem; ... }

{/* JSX in page.tsx */}
{filteredData.length === 0 && (
  <div className={styles.emptyState}>
    <h3 className={styles.emptyTitle}>No bookings found</h3>
    <p className={styles.emptyText}>
      You have no upcoming sessions scheduled.
    </p>
    <button onClick={() => router.push('/marketplace')} className={styles.emptyButton}>
      Browse Marketplace
    </button>
  </div>
)}
```

**After (0 lines CSS + 8 lines JSX):**
```tsx
{filteredData.length === 0 && (
  <HubEmptyState
    title="No bookings found"
    description="You have no upcoming sessions scheduled."
    actionLabel="Browse Marketplace"
    onAction={() => router.push('/marketplace')}
  />
)}
```

**Savings**: 40 lines CSS + 7 lines JSX = **47 lines eliminated (71% reduction)**

### 6. Remove Obsolete CSS

Delete these CSS classes from `page.module.css`:

```css
/* ❌ DELETE - Now handled by HubHeader */
.header { margin-bottom: 2rem; }
.title { font-size: 2rem; font-weight: 700; ... }
.subtitle { font-size: 1rem; color: #6b7280; ... }

/* ❌ DELETE - Now handled by HubTabs */
.filterTabs { display: flex; gap: 0.5rem; ... }
.filterTab { padding: 0.75rem 1.5rem; ... }
.filterTabActive { color: var(--color-primary-default); ... }

/* ❌ DELETE - Now handled by HubPageLayout */
.container { max-width: 1200px; margin: 0 auto; }

/* ❌ DELETE - Now handled by HubEmptyState */
.emptyState { display: flex; flex-direction: column; ... }
.emptyTitle { font-size: 1.25rem; font-weight: 600; ... }
.emptyText { font-size: 0.875rem; color: #6b7280; ... }
.emptyButton { padding: 0.625rem 1.25rem; ... }
```

**Keep these CSS classes:**
```css
/* ✅ KEEP - Page-specific content styles */
.bookingsList { display: flex; flex-direction: column; gap: 1rem; }
.loading { text-align: center; padding: 3rem; }
```

---

## Complete Example: Bookings Page Migration

### Before (Legacy Structure)

```tsx
'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

type FilterType = 'all' | 'upcoming' | 'past';

export default function BookingsPage() {
  const [filter, setFilter] = useState<FilterType>('all');

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bookings</h1>
          <p className={styles.subtitle}>
            Manage your tutoring sessions and upcoming appointments
          </p>
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          onClick={() => handleFilterChange('all')}
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
        >
          All Bookings
        </button>
        <button
          onClick={() => handleFilterChange('upcoming')}
          className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => handleFilterChange('past')}
          className={`${styles.filterTab} ${filter === 'past' ? styles.filterTabActive : ''}`}
        >
          Past
        </button>
      </div>

      <div className={styles.container}>
        <div className={styles.bookingsList}>
          {/* Booking cards */}
        </div>
      </div>
    </>
  );
}
```

### After (Hub Layout Architecture)

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/layout/sidebar/HubSidebar';
import BookingStatsWidget from '@/app/components/bookings/BookingStatsWidget';
import BookingCard from '@/app/components/bookings/BookingCard';
import styles from './page.module.css';

type FilterType = 'all' | 'upcoming' | 'past';

const ITEMS_PER_PAGE = 5;

export default function BookingsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [bookings, setBookings] = useState([]); // Your data here

  // Filter bookings based on tab
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const sessionDate = new Date(booking.session_start_time);
      const now = new Date();

      if (filter === 'upcoming') {
        return sessionDate >= now && booking.status !== 'Cancelled';
      } else if (filter === 'past') {
        return sessionDate < now || booking.status === 'Completed';
      }
      return true; // 'all'
    });
  }, [bookings, filter]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      all: bookings.length,
      upcoming: bookings.filter((b) => new Date(b.session_start_time) >= now && b.status !== 'Cancelled').length,
      past: bookings.filter((b) => new Date(b.session_start_time) < now || b.status === 'Completed').length,
    };
  }, [bookings]);

  // Pagination logic
  const totalItems = filteredBookings.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleFilterChange = (tabId: string) => {
    setFilter(tabId as FilterType);
  };

  return (
    <HubPageLayout
      header={<HubHeader title="Bookings" />}
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Bookings', count: tabCounts.all, active: filter === 'all' },
            { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming, active: filter === 'upcoming' },
            { id: 'past', label: 'Past', count: tabCounts.past, active: filter === 'past' },
          ]}
          onTabChange={handleFilterChange}
        />
      }
      sidebar={
        <HubSidebar>
          <BookingStatsWidget
            pending={bookings.filter((b) => b.status === 'Pending').length}
            upcoming={tabCounts.upcoming}
            completed={bookings.filter((b) => b.status === 'Completed').length}
          />
        </HubSidebar>
      }
    >
      {/* Empty State - Now using HubEmptyState component */}
      {paginatedBookings.length === 0 && (
        <HubEmptyState
          title="No bookings found"
          description={
            filter === 'upcoming'
              ? 'You have no upcoming sessions scheduled.'
              : filter === 'past'
              ? 'You have no past sessions.'
              : 'You have no bookings yet.'
          }
          actionLabel={activeRole === 'client' ? 'Browse Marketplace' : undefined}
          onAction={activeRole === 'client' ? () => router.push('/marketplace') : undefined}
        />
      )}

      {/* Bookings List */}
      {paginatedBookings.length > 0 && (
        <div className={styles.bookingsList}>
          {paginatedBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <HubPagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </HubPageLayout>
  );
}
```

---

## Component API Reference

### HubPageLayout

```tsx
interface HubPageLayoutProps {
  header: ReactNode;      // HubHeader component
  tabs?: ReactNode;       // HubTabs component (optional)
  children: ReactNode;    // Page content
  sidebar?: ReactNode;    // HubSidebar (optional)
}
```

**Features:**
- Automatic padding inheritance from `layout.module.css` (2rem desktop, 1rem mobile)
- Responsive sidebar (320px desktop, 280px tablet, hidden mobile)
- Flexbox layout for content + sidebar

### HubEmptyState

```tsx
interface HubEmptyStateProps {
  title: string;              // Empty state title
  description: string;        // Descriptive text
  actionLabel?: string;       // Optional CTA button label
  onAction?: () => void;      // Optional CTA click handler
  icon?: React.ReactNode;     // Optional icon element
}
```

**Features:**
- Centralized empty state UI
- Consistent styling via CSS modules
- Eliminates 40 lines CSS + 15-35 lines JSX per page
- Total savings: 744 lines across 14 hub pages (88% reduction)

### HubHeader

```tsx
interface HubHeaderProps {
  title: string;          // Page title
  filters?: ReactNode;    // Optional search/sort inputs (centered)
  actions?: ReactNode;    // Optional action buttons (right-aligned)
}
```

**Features:**
- Two-row layout: Title/Actions row + Filters row
- Title: 2rem desktop, 1.5rem mobile
- Filters centered horizontally
- No padding (inherits from layout)

### HubTabs

```tsx
interface HubTab {
  id: string;             // Unique tab identifier
  label: string;          // Tab label text
  count?: number;         // Optional badge count
  active: boolean;        // Active state
}

interface HubTabsProps {
  tabs: HubTab[];         // Array of tabs
  onTabChange: (tabId: string) => void;  // Click handler
}
```

**Features:**
- Underline style with teal active state
- Full-width with negative margins (escapes padding)
- Overflow scroll on mobile
- Optional count badges

### HubPagination

```tsx
interface HubPaginationProps {
  currentPage: number;       // Current page number (1-indexed)
  totalItems: number;        // Total number of items
  itemsPerPage: number;      // Items per page (typically 5)
  onPageChange: (page: number) => void;  // Page change handler
}
```

**Features:**
- Page number buttons (1, 2, 3, ..., 12) with teal highlighting for current page
- Previous/Next arrow buttons (◁ ▷)
- Ellipsis (...) for skipped pages when many pages exist
- Smart pagination: shows 1, 2, 3, 4, ..., last when near start
- Always visible (even with 1 page), hidden only when 0 items
- Auto-adjusts to content position (no fixed height)
- Disabled arrows at first/last page
- No summary text ("Showing X-Y of Z") - just page navigation

**Usage:**
```tsx
const ITEMS_PER_PAGE = 5;
const [currentPage, setCurrentPage] = useState(1);

// Pagination logic
const totalItems = filteredData.length;
const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
const endIndex = startIndex + ITEMS_PER_PAGE;
const paginatedData = filteredData.slice(startIndex, endIndex);

// Reset to page 1 when filters change
useEffect(() => {
  setCurrentPage(1);
}, [filter, searchQuery]);

// Render - Always include pagination (no conditional check needed)
<HubPagination
  currentPage={currentPage}
  totalItems={totalItems}
  itemsPerPage={ITEMS_PER_PAGE}
  onPageChange={setCurrentPage}
/>
```

---

## Padding Structure

**Layout Hierarchy:**
```
Authenticated Layout (layout.module.css)
  ↓ padding: 2rem (desktop), 1rem (mobile)

HubPageLayout
  ↓ padding: 0 (inherits from parent)

  HubHeader
    ↓ padding: 0 (inherits from parent)

  HubTabs
    ↓ padding: 0 + negative margins (full-width)

  Content Column
    ↓ padding: 0 (inherits from parent)

    Page Content (your cards/lists)
      ↓ No container needed
```

**Key Principle:** ALL horizontal padding comes from the authenticated layout. Components do NOT add their own padding.

---

## Checklist

Before migration:
- [ ] Review current page structure
- [ ] Identify header, tabs, and content sections
- [ ] Plan sidebar widgets (if any)
- [ ] Review empty state implementations

During migration:
- [ ] Import Hub components: `HubPageLayout`, `HubHeader`, `HubTabs`, `HubPagination`, `HubEmptyState`, `HubSidebar`
- [ ] Replace header with `<HubHeader>`
- [ ] Replace tabs with `<HubTabs>`
- [ ] Replace empty states with `<HubEmptyState>`
- [ ] Wrap content in `<HubPageLayout>`
- [ ] Remove container divs
- [ ] Add sidebar (optional)

After migration:
- [ ] Delete obsolete CSS classes (header, tabs, empty state, container)
- [ ] Test empty state UI (no data scenarios)
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Verify tab functionality
- [ ] Check sidebar visibility on different screen sizes
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors
- [ ] Commit changes with descriptive message

### Code Reduction Metrics
After each migration, verify:
- [ ] Header CSS removed (~30 lines)
- [ ] Tabs CSS removed (~40 lines)
- [ ] Empty state CSS removed (~40 lines)
- [ ] Empty state JSX simplified (15-35 lines → 3-8 lines)
- [ ] **Total reduction**: ~120-150 lines per page

---

## Common Pitfalls

### ❌ Don't add extra containers
```tsx
// ❌ BAD
<HubPageLayout>
  <div className={styles.container}>  {/* Unnecessary */}
    {children}
  </div>
</HubPageLayout>

// ✅ GOOD
<HubPageLayout>
  {children}
</HubPageLayout>
```

### ❌ Don't use subtitle
```tsx
// ❌ BAD - subtitle is removed
<HubHeader
  title="Bookings"
  subtitle="Manage sessions"  // No longer supported
/>

// ✅ GOOD
<HubHeader
  title="Bookings"
/>
```

### ❌ Don't manually style tabs
```tsx
// ❌ BAD - Use HubTabs instead
<div className="flex gap-4">
  <button className="text-blue-600">All</button>
</div>

// ✅ GOOD
<HubTabs
  tabs={[{ id: 'all', label: 'All', active: true }]}
  onTabChange={handleChange}
/>
```

---

## Testing After Migration

1. **Visual Inspection:**
   - Header title size matches Listings (2rem)
   - Tabs align with content edges
   - No excessive padding
   - Sidebar visible on desktop, hidden on mobile

2. **Functionality:**
   - Tab switching works correctly
   - Filter state updates
   - Action buttons functional
   - Responsive breakpoints work

3. **Responsive Testing:**
   - Mobile (< 768px): Single column, tabs scroll
   - Tablet (769-1024px): Two columns
   - Desktop (> 1024px): Full three columns

---

## Support

If you encounter issues during migration:
1. Check the Listings page implementation as reference
2. Review component documentation in each file's header
3. Verify CSS variable usage in `globals.css`
4. Ensure no Tailwind classes are mixed with CSS Modules

---

## Adding Filters and Actions

### Hub Header Complete Pattern

The complete Hub Header pattern includes:
1. **Title** (left)
2. **Filters** (center) - Search input + dropdown filters
3. **Actions** (right) - Primary button + secondary dropdown menu

```tsx
import filterStyles from '@/app/components/ui/hub-layout/hub-filters.module.css';
import actionStyles from '@/app/components/ui/hub-layout/hub-actions.module.css';
import Button from '@/app/components/ui/Button';

<HubHeader
  title="Network"
  filters={
    <div className={filterStyles.filtersContainer}>
      {/* Search Input - 320px wide */}
      <input
        type="search"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={filterStyles.searchInput}
      />

      {/* Filter Dropdowns - 180px wide each */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
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
      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
      >
        Add Connection
      </Button>

      {/* Secondary Actions: Dropdown Menu */}
      <div className={actionStyles.dropdownContainer}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowActionsMenu(!showActionsMenu)}
        >
          ⋮
        </Button>

        {showActionsMenu && (
          <>
            {/* Backdrop to close menu */}
            <div
              className={actionStyles.backdrop}
              onClick={() => setShowActionsMenu(false)}
            />

            {/* Dropdown Menu */}
            <div className={actionStyles.dropdownMenu}>
              <button
                onClick={handleViewPublicProfile}
                className={actionStyles.menuButton}
              >
                View Public Profile
              </button>
              <button
                onClick={handleExportCSV}
                className={actionStyles.menuButton}
              >
                Export CSV
              </button>
            </div>
          </>
        )}
      </div>
    </>
  }
/>
```

### Shared Filter Styles

Use `hub-filters.module.css` for consistent filter styling:

```tsx
import filterStyles from '@/app/components/ui/hub-layout/hub-filters.module.css';

// filtersContainer - Flex container with 0.75rem gap
// searchInput - 320px wide, 42px height, flat design
// filterSelect - 180px wide, 42px height, no dropdown arrow
```

**Features:**
- Flat design with consistent 8px border radius
- Focus state: teal border (#4CAEAD)
- Mobile responsive: stacks vertically, full width
- No dropdown arrows on selects (clean appearance)

### Shared Action Styles

Use `hub-actions.module.css` for consistent dropdown menus:

```tsx
import actionStyles from '@/app/components/ui/hub-layout/hub-actions.module.css';

// dropdownContainer - Relative positioning for dropdown
// backdrop - Fixed overlay to close menu
// dropdownMenu - Absolute positioned menu (14rem wide)
// menuButton - Menu item button with hover effect
```

**Features:**
- 14rem (224px) wide dropdown
- Box shadow for depth
- Hover effect on menu items (#f9fafb background)
- Auto-close on backdrop click
- Border between menu items

### Complete Examples by Page Type

#### Network Page Pattern
- **Filters:** Search (by name/email/org) + Sort (newest/oldest/name)
- **Actions:** Add Connection + Dropdown (Invite/Find/Create/Profile/Export)

#### Reviews Page Pattern
- **Filters:** Search (by reviewer/text) + Rating (all/5/4/3/2/1) + Date (7d/30d/3m/6m/1y)
- **Actions:** Request Review + Dropdown (View Profile/Export CSV)

#### Listings Page Pattern
- **Filters:** Search (by title) + Sort (newest/oldest/price/views)
- **Actions:** Create Listing + Dropdown (View Profile/Export CSV)

### CSV Export Pattern

```tsx
const handleExportCSV = () => {
  // Create CSV content
  const headers = ['Column1', 'Column2', 'Column3'];
  const rows = filteredData.map(item => [
    item.field1 || '',
    item.field2 || '',
    new Date(item.created_at).toLocaleDateString('en-GB'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success('Data exported successfully');
  setShowActionsMenu(false);
};
```

### Search and Filter Logic Pattern

```tsx
// State
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState('newest');

// Filter logic
const filteredItems = useMemo(() => {
  let filtered = [...items];

  // Search filtering
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }

  // Sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
      default:
        return 0;
    }
  });

  return filtered;
}, [items, searchQuery, sortBy]);

// Reset page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, sortBy]);
```

---

## Quick Start Template

Use `HubPageTemplate.tsx.example` as a starting point for new hub pages. It includes:
- Complete imports
- State management
- Filter and search logic
- Pagination
- CSV export
- All Hub components properly configured

**Location:** `/apps/web/src/app/components/ui/hub-layout/HubPageTemplate.tsx.example`

---

## Phase 2 Migration Roadmap

### Current Status: 5/14 pages complete (36%)

### High Priority (4-6 hours each)
1. **Dashboard** - Landing page after login
2. **My Students** - Similar to Network page
3. **Referrals** - Similar to Bookings pattern

### Medium Priority (6-8 hours)
4. **Messages** - May need custom layout variant for chat UI

### Low Priority (Batch Migration: 10-12 hours total)
5. **Financials** - Transaction list hub
6. **Financials/Disputes** - Dispute management
7. **Financials/Payouts** - Payout requests
8. **Organisation** - Organisation management
9. **Payments** - Payment methods

**Total Estimated Effort**: 28-36 hours (3.5-4.5 developer days)

### Key Benefits After Phase 2 Complete
- ✅ Consistent UX across all 14 hub pages
- ✅ Single source of truth for layout logic
- ✅ 1,680-2,100 lines of code eliminated (14 pages × ~120-150 lines)
- ✅ Faster feature development (copy-paste pattern)
- ✅ Easier onboarding (one pattern to learn)
- ✅ Reduced maintenance burden

---

## Reference Documentation

- **UI Standards**: [HUB-UI-STANDARDS.md](../HUB-UI-STANDARDS.md) - **⭐ REQUIRED READING** - All UI dimensions, spacing, and styling standards
- **Architecture Status**: [hub-architecture-migration-status-2025-12-03.md](../../../../docs/refactoring/hub-architecture-migration-status-2025-12-03.md)
- **HubEmptyState Assessment**: [hub-empty-state-assessment-2025-12-03.md](../../../../docs/refactoring/hub-empty-state-assessment-2025-12-03.md)
- **Component README**: [README.md](./README.md)

---

**Last Updated:** 2025-12-03
**Version:** 3.0
**Components:** HubPageLayout v1.0, HubHeader v1.1, HubTabs v1.0, HubPagination v1.0, HubEmptyState v1.0
**Migration Progress:** 5/14 pages (36%)
