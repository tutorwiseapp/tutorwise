# Hub Layout Migration Guide

## Overview
This guide helps migrate hub pages (like Bookings, Financials, Referrals) from the legacy structure to the standardized **Hub Layout Architecture** using `HubPageLayout`, `HubHeader`, and `HubTabs`.

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
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/ui/hub-layout';
import type { HubTab } from '@/app/components/ui/hub-layout';
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

### 5. Remove Obsolete CSS

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
```

**Keep these CSS classes:**
```css
/* ✅ KEEP - Page-specific content styles */
.bookingsList { display: flex; flex-direction: column; gap: 1rem; }
.emptyState { text-align: center; padding: 4rem 2rem; }
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
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/ui/hub-layout';
import type { HubTab } from '@/app/components/ui/hub-layout';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
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
        <ContextualSidebar>
          <BookingStatsWidget
            pending={bookings.filter((b) => b.status === 'Pending').length}
            upcoming={tabCounts.upcoming}
            completed={bookings.filter((b) => b.status === 'Completed').length}
          />
        </ContextualSidebar>
      }
    >
      <div className={styles.container}>
        {/* Empty State */}
        {paginatedBookings.length === 0 && (
          <div className={styles.emptyState}>
            <h3>No bookings found</h3>
            <p>You have no {filter === 'all' ? '' : filter} bookings yet.</p>
          </div>
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
      </div>
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
  sidebar?: ReactNode;    // ContextualSidebar (optional)
}
```

**Features:**
- Automatic padding inheritance from `layout.module.css` (2rem desktop, 1rem mobile)
- Responsive sidebar (hidden on mobile, visible on desktop)
- Flexbox layout for content + sidebar

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
- Shows "X-Y of Z results" summary (always visible)
- Previous/Next buttons (hidden when ≤1 page)
- Disabled state for first/last page
- Consistent styling with hub components

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

During migration:
- [ ] Import Hub components
- [ ] Replace header with `<HubHeader>`
- [ ] Replace tabs with `<HubTabs>`
- [ ] Wrap content in `<HubPageLayout>`
- [ ] Remove container divs
- [ ] Add sidebar (optional)

After migration:
- [ ] Delete obsolete CSS classes
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Verify tab functionality
- [ ] Check sidebar visibility on different screen sizes
- [ ] Commit changes with descriptive message

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

**Last Updated:** 2025-11-28
**Version:** 1.1
**Components:** HubPageLayout v1.0, HubHeader v1.0, HubTabs v1.0, HubPagination v1.0
