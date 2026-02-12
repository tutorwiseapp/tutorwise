# Tutorwise Design System

**Document Status**: v1.0
**Created**: 2026-02-12
**Last Updated**: 2026-02-12
**Owner**: Engineering Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [File System & Naming Conventions](#2-file-system--naming-conventions)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Shared Components](#6-shared-components)
7. [User Dashboard Standards](#7-user-dashboard-standards)
8. [Admin Dashboard Standards](#8-admin-dashboard-standards)
9. [Data Tables](#9-data-tables)
10. [Forms](#10-forms)
11. [Modals & Dialogs](#11-modals--dialogs)
12. [Empty States](#12-empty-states)
13. [Buttons & CTAs](#13-buttons--ctas)
14. [Toolbars & Filters](#14-toolbars--filters)
15. [Status Badges](#15-status-badges)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. Overview

### 1.1 Design Principles

1. **Consistency**: All pages follow the same Hub architecture pattern
2. **Reusability**: 85%+ component reuse across user and admin dashboards
3. **Accessibility**: WCAG 2.1 AA compliant
4. **Responsive**: Mobile-first with tablet and desktop breakpoints
5. **Performance**: Lazy loading, virtualization for large lists

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Global Header (Shared)                                               │
├──────────┬──────────────────────────────────────────┬───────────────┤
│          │                                           │               │
│ Sidebar  │  HubPageLayout                           │  HubSidebar   │
│ (App or  │  ┌─────────────────────────────────────┐ │  (4 cards)    │
│  Admin)  │  │ HubHeader                            │ │               │
│          │  │ [Title] [Subtitle] [Actions]         │ │  📊 Stats    │
│          │  ├─────────────────────────────────────┤ │               │
│          │  │ HubTabs (REQUIRED)                   │ │  ❓ Help     │
│          │  ├─────────────────────────────────────┤ │               │
│          │  │ Content Area                         │ │  💡 Tips     │
│          │  │ - KPI Cards (Overview tabs)          │ │               │
│          │  │ - Charts (Overview tabs)             │ │  🎥 Video    │
│          │  │ - Data Tables (List tabs)            │ │               │
│          │  │ - Empty States                       │ │               │
│          │  │ - HubPagination                      │ │               │
│          │  └─────────────────────────────────────┘ │               │
└──────────┴───────────────────────────────────────────┴───────────────┘
```

---

## 2. File System & Naming Conventions

### 2.1 Directory Structure

```
apps/web/src/app/
├── (authenticated)/           # User-facing authenticated routes
│   └── {feature}/             # e.g., financials, listings, bookings
│       ├── page.tsx           # Main feature page
│       ├── page.module.css    # Page-specific styles
│       ├── {subpage}/         # Sub-routes
│       │   ├── page.tsx
│       │   └── page.module.css
│       ├── components/        # Feature-specific components
│       │   ├── {Component}.tsx
│       │   └── {Component}.module.css
│       └── hooks/             # Feature-specific hooks
│           └── use{Feature}{Action}.ts
│
├── (admin)/                   # Admin-only routes
│   └── admin/
│       └── {feature}/         # e.g., edupay, accounts, seo
│           ├── page.tsx       # Main admin feature page
│           ├── page.module.css
│           ├── {subpage}/     # Sub-routes (rules, providers, etc.)
│           ├── components/    # Admin feature-specific components
│           └── hooks/         # Admin feature-specific hooks
│
├── components/
│   ├── hub/                   # Hub architecture components (SHARED)
│   │   ├── layout/            # HubPageLayout, HubHeader, HubTabs, HubPagination
│   │   ├── sidebar/           # HubSidebar, sidebar cards
│   │   ├── content/           # HubEmptyState, HubRowCard, HubDetailCard
│   │   ├── data/              # HubDataTable
│   │   ├── charts/            # HubKPICard, HubKPIGrid, HubTrendChart, etc.
│   │   ├── form/              # HubForm, HubToggle
│   │   ├── modal/             # HubDetailModal, HubComplexModal
│   │   └── toolbar/           # HubToolbar
│   │
│   ├── ui/                    # Base UI components
│   │   ├── actions/           # Button, VerticalDotsMenu
│   │   ├── forms/             # Input, Select, Checkbox, etc.
│   │   ├── feedback/          # Modal, Message, LoadingSkeleton
│   │   ├── data-display/      # StatusBadge, Card, StatCard
│   │   └── navigation/        # Tabs, Breadcrumb, NavLink
│   │
│   ├── admin/                 # Admin-specific shared components
│   │   ├── layout/            # AdminLayout
│   │   ├── sidebar/           # AdminSidebar
│   │   └── widgets/           # AdminStatsWidget, AdminHelpWidget, AdminTipWidget
│   │
│   └── feature/               # Feature-specific shared components
│       └── {feature}/         # e.g., edupay, bookings, listings
│           ├── {Component}.tsx
│           └── {Component}.module.css
```

### 2.2 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Pages** | `page.tsx` (Next.js App Router) | `admin/edupay/rules/page.tsx` |
| **Page Styles** | `page.module.css` | `admin/edupay/rules/page.module.css` |
| **Components** | PascalCase | `WalletsTable.tsx` |
| **Component Styles** | PascalCase + `.module.css` | `WalletsTable.module.css` |
| **Hooks** | camelCase with `use` prefix | `useAdminEduPayMetrics.ts` |
| **Utilities** | camelCase | `formatCurrency.ts` |
| **Types** | PascalCase with `types.ts` or inline | `types.ts` or in component |
| **Constants** | UPPER_SNAKE_CASE | `ITEMS_PER_PAGE = 20` |

### 2.3 Component File Structure

```typescript
/**
 * Filename: {ComponentName}.tsx
 * Purpose: {Brief description}
 * Created: YYYY-MM-DD
 * Updated: YYYY-MM-DD - {Change description}
 * Pattern: {Pattern followed, e.g., "Follows UsersTable pattern"}
 */

'use client';

import React, { useState } from 'react';
// External imports
import { useQuery } from '@tanstack/react-query';
// Internal imports - absolute paths
import { HubDataTable } from '@/app/components/hub/data';
import Button from '@/app/components/ui/actions/Button';
// Local imports
import styles from './ComponentName.module.css';

// Types/Interfaces
interface ComponentNameProps {
  // ...
}

// Sub-components (if small, otherwise separate file)
function SubComponent({ prop }: { prop: string }) {
  return <div>{prop}</div>;
}

// Main component
export default function ComponentName({ prop }: ComponentNameProps) {
  // State
  const [state, setState] = useState();

  // Queries/Mutations
  const { data } = useQuery({ /* ... */ });

  // Handlers
  const handleAction = () => { /* ... */ };

  // Render
  return (
    <div className={styles.container}>
      {/* ... */}
    </div>
  );
}
```

---

## 3. Color System

### 3.1 Brand Colors

```css
:root {
  /* Primary - Tutorwise Teal */
  --color-primary: #006c67;
  --color-primary-light: #4CAEAD;
  --color-primary-dark: #004d49;
  --color-primary-bg: #e6f3f2;

  /* Secondary */
  --color-secondary: #3B82F6;
  --color-secondary-light: #60A5FA;
  --color-secondary-dark: #2563EB;
}
```

### 3.2 Semantic Colors

```css
:root {
  /* Success */
  --color-success: #10B981;
  --color-success-light: #d1fae5;
  --color-success-dark: #065f46;

  /* Warning */
  --color-warning: #F59E0B;
  --color-warning-light: #fef3c7;
  --color-warning-dark: #92400e;

  /* Error/Danger */
  --color-error: #EF4444;
  --color-error-light: #fee2e2;
  --color-error-dark: #991b1b;

  /* Info */
  --color-info: #3B82F6;
  --color-info-light: #dbeafe;
  --color-info-dark: #1e40af;
}
```

### 3.3 Neutral Colors

```css
:root {
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-text-disabled: #d1d5db;

  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-bg-hover: #f3f4f6;

  /* Borders */
  --color-border: #e5e7eb;
  --color-border-dark: #d1d5db;
}
```

### 3.4 Status Badge Colors

| Status | Background | Text |
|--------|------------|------|
| Active/Success/Completed | `#d1fae5` | `#065f46` |
| Pending/Warning | `#fef3c7` | `#92400e` |
| Failed/Error/Danger | `#fee2e2` | `#991b1b` |
| Inactive/Default | `#f3f4f6` | `#6b7280` |
| Info/Processing | `#dbeafe` | `#1e40af` |

---

## 4. Typography

### 4.1 Font Family

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}
```

### 4.2 Font Sizes

| Name | Size | Line Height | Use Case |
|------|------|-------------|----------|
| xs | 0.75rem (12px) | 1rem | Badges, helper text |
| sm | 0.8125rem (13px) | 1.25rem | Secondary text, table cells |
| base | 0.875rem (14px) | 1.5rem | Body text, inputs |
| md | 1rem (16px) | 1.5rem | Emphasized body |
| lg | 1.125rem (18px) | 1.75rem | Section headers |
| xl | 1.25rem (20px) | 1.75rem | Page subtitles |
| 2xl | 1.5rem (24px) | 2rem | Page titles |
| 3xl | 1.875rem (30px) | 2.25rem | Hero titles |

### 4.3 Font Weights

| Name | Weight | Use Case |
|------|--------|----------|
| normal | 400 | Body text |
| medium | 500 | Labels, emphasized text |
| semibold | 600 | Headings, important values |
| bold | 700 | Page titles |

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

```css
:root {
  --spacing-0: 0;
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
}
```

### 5.2 Breakpoints

```css
/* Mobile first */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small desktops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### 5.3 Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

---

## 6. Shared Components

### 6.1 Hub Layout Components

| Component | Path | Purpose |
|-----------|------|---------|
| `HubPageLayout` | `components/hub/layout/` | Main page wrapper with header, tabs, sidebar slots |
| `HubHeader` | `components/hub/layout/` | Page title, subtitle, and action buttons |
| `HubTabs` | `components/hub/layout/` | Tab navigation (REQUIRED on all pages) |
| `HubPagination` | `components/hub/layout/` | Pagination controls |
| `HubSidebar` | `components/hub/sidebar/` | Right sidebar container for widgets |

### 6.2 Hub Content Components

| Component | Path | Purpose |
|-----------|------|---------|
| `HubDataTable` | `components/hub/data/` | Data table with toolbar, filters, pagination |
| `HubEmptyState` | `components/hub/content/` | Empty state with icon, title, description, CTA |
| `HubRowCard` | `components/hub/content/` | Card for list views |
| `HubDetailCard` | `components/hub/content/` | Card for detail views |
| `HubToolbar` | `components/hub/toolbar/` | Search, filters, actions toolbar |

### 6.3 Hub Chart Components

| Component | Path | Purpose |
|-----------|------|---------|
| `HubKPIGrid` | `components/hub/charts/` | Grid container for KPI cards |
| `HubKPICard` | `components/hub/charts/` | Single KPI metric card |
| `HubTrendChart` | `components/hub/charts/` | Line chart for trends |
| `HubCategoryBreakdownChart` | `components/hub/charts/` | Pie/donut chart for breakdowns |

### 6.4 UI Base Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Button` | `components/ui/actions/` | All buttons (primary, secondary, danger, ghost) |
| `VerticalDotsMenu` | `components/ui/actions/` | 3-dot action menu for tables |
| `Modal` | `components/ui/feedback/` | Base modal component |
| `StatusBadge` | `components/ui/data-display/` | Status indicator badges |
| `Input` | `components/ui/forms/` | Text input |
| `UnifiedSelect` | `components/ui/forms/` | Dropdown select |
| `Checkbox` | `components/ui/forms/` | Checkbox input |

### 6.5 Admin-Specific Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AdminSidebar` | `components/admin/sidebar/` | Admin navigation sidebar |
| `AdminLayout` | `components/admin/layout/` | Admin page wrapper |
| `AdminStatsWidget` | `components/admin/widgets/` | Stats card for sidebar |
| `AdminHelpWidget` | `components/admin/widgets/` | Help FAQ card for sidebar |
| `AdminTipWidget` | `components/admin/widgets/` | Tips card for sidebar |

---

## 7. User Dashboard Standards

### 7.1 Key Principle: Card Lists, Not Tables

**CRITICAL**: User dashboards use **card-based list views**, NOT data tables. Tables are for admin dashboards only.

| Dashboard Type | List Component | Example |
|---------------|----------------|---------|
| User Dashboard | Card-based list (BookingCard, EduPayLedgerCard, etc.) | `/bookings`, `/edupay` |
| Admin Dashboard | HubDataTable with VerticalDotsMenu | `/admin/accounts/users` |

### 7.2 Page Structure with URL-Based Tab Filtering

User dashboards use URL parameters (`?tab=`, `?filter=`) for tab state:

```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

// Wrap page content in Suspense for searchParams
function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL-based tab filtering
  const currentTab = searchParams.get('tab') || 'all';
  // Or for filter-based: searchParams.get('filter') || 'all'

  const handleTabChange = (tabId: string) => {
    router.push(`/feature?tab=${tabId}`);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Page Title"
          subtitle="Page description"
          className={styles.pageHeader}
          filters={/* Optional: Filter chips */}
          actions={/* Optional: Action buttons */}
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All', count: totalCount, active: currentTab === 'all' },
            { id: 'pending', label: 'Pending', count: pendingCount, active: currentTab === 'pending' },
          ]}
          onTabChange={handleTabChange}
          className={styles.pageTabs}
        />
      }
      sidebar={<HubSidebar>{/* 4-card pattern */}</HubSidebar>}
    >
      {/* Card-based list content */}
    </HubPageLayout>
  );
}

export default function FeaturePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
```

### 7.3 Card-Based List Pattern

User dashboards render items as cards, not table rows:

```tsx
// Filter items based on URL tab parameter
const filteredItems = items.filter(item => {
  if (currentTab === 'all') return true;
  if (currentTab === 'pending') return item.status === 'pending';
  return true;
});

// Render as card list
<div className={styles.itemsList}>
  {filteredItems.length === 0 ? (
    <HubEmptyState
      icon={<FileText size={48} />}
      title="No items found"
      description="No items match your current filter."
    />
  ) : (
    filteredItems.map((item) => (
      <ItemCard
        key={item.id}
        item={item}
        onClick={() => handleItemClick(item)}
      />
    ))
  )}
</div>
```

### 7.4 Feature Card Component Pattern

Cards should be placed in `/components/feature/{feature}/`:

```tsx
// src/app/components/feature/bookings/BookingCard.tsx
interface BookingCardProps {
  booking: Booking;
  onClick?: () => void;
}

export default function BookingCard({ booking, onClick }: BookingCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{booking.title}</span>
        <StatusBadge status={booking.status} />
      </div>
      <div className={styles.cardContent}>
        {/* Card details */}
      </div>
      <div className={styles.cardFooter}>
        {/* Actions or metadata */}
      </div>
    </div>
  );
}
```

### 7.5 Shared Filter Styles Pattern

Import shared filter styles for consistent filter/action styling:

```tsx
import filterStyles from '@/app/components/hub/content/HubFilters.module.css';
import actionStyles from '@/app/components/hub/content/HubActions.module.css';

// Use in HubHeader filters prop
<HubHeader
  filters={
    <div className={filterStyles.filterGroup}>
      <button className={filterStyles.filterChip}>Filter 1</button>
      <button className={filterStyles.filterChip}>Filter 2</button>
    </div>
  }
  actions={
    <div className={actionStyles.actionGroup}>
      <Button variant="primary" size="sm">Action</Button>
    </div>
  }
/>
```

### 7.6 React Query Gold Standard Configuration

All data fetching MUST use this configuration pattern:

```tsx
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['feature-items', userId, currentTab],
  queryFn: async () => {
    const response = await fetch('/api/feature/items');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  // Gold Standard Configuration
  placeholderData: keepPreviousData,  // Show previous data while fetching
  staleTime: 60_000,                  // 1 minute before considered stale
  gcTime: 5 * 60_000,                 // 5 minutes garbage collection
  refetchOnMount: true,               // Always refetch on mount
  refetchOnWindowFocus: false,        // Don't refetch on window focus
  retry: 2,                           // Retry failed requests twice
});
```

### 7.3 Sidebar 4-Card Pattern

```tsx
<HubSidebar>
  {/* Card 1: Stats */}
  <AdminStatsWidget
    title="Feature Stats"
    stats={[
      { label: 'Total', value: 100 },
      { label: 'Active', value: 85 },
    ]}
  />

  {/* Card 2: Help */}
  <AdminHelpWidget
    title="Help"
    items={[
      { question: 'What is X?', answer: 'X is...' },
    ]}
  />

  {/* Card 3: Tips */}
  <AdminTipWidget
    title="Tips"
    tips={['Tip 1', 'Tip 2']}
  />

  {/* Card 4: Video (optional) */}
  <AdminVideoWidget title="Tutorial" videoUrl="/videos/..." />
</HubSidebar>
```

### 7.4 CSS Custom Properties for Layout

```css
/* Header styling */
.pageHeader {
  --hub-header-margin-top: 1.5rem;
  --hub-header-margin-bottom: 0;
  --hub-header-height: 3rem;
  --hub-header-padding-x: 1rem;
  --hub-header-actions-gap: 0.5rem;
  --hub-header-actions-margin-left: 1rem;
}

/* Tabs styling */
.pageTabs {
  --hub-tabs-margin-top: 3rem;
  --hub-tabs-margin-bottom: 1rem;
}

/* Mobile adjustments */
@media (max-width: 767px) {
  .pageHeader {
    --hub-header-margin-top: 0rem;
  }
  .pageTabs {
    --hub-tabs-margin-top: 0rem;
  }
}
```

---

## 8. Admin Dashboard Standards

### 8.1 Admin vs User Dashboard Differences

| Aspect | User Dashboard | Admin Dashboard |
|--------|---------------|-----------------|
| **List Display** | Card-based lists | HubDataTable with VerticalDotsMenu |
| **Sidebar** | `AppSidebar` | `AdminSidebar` |
| **Route prefix** | `/(authenticated)/{feature}` | `/(admin)/admin/{feature}` |
| **Tab behavior** | URL-based filtering (`?tab=`) | State-based OR navigation between pages |
| **Actions** | User-level actions | Admin actions (view, edit, delete, bulk) |
| **Data access** | User's own data | All platform data |
| **Components location** | `(authenticated)/{feature}/components/` | `(admin)/admin/{feature}/components/` |

### 8.2 Admin Page Types

**Type 1: Overview Page with Tabs (Content Switching)**
- Used when tabs filter/switch content within the same page
- Example: `/admin/edupay` with Overview, Wallets, Conversions tabs

```tsx
const [activeTab, setActiveTab] = useState('overview');

<HubTabs
  tabs={[
    { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
    { id: 'wallets', label: 'Wallets', count: 100, active: activeTab === 'wallets' },
  ]}
  onTabChange={(tabId) => setActiveTab(tabId)}
/>

{activeTab === 'overview' && <OverviewContent />}
{activeTab === 'wallets' && <WalletsTable />}
```

**Type 2: Feature Page with Navigation Tabs**
- Used when tabs navigate to different sub-pages
- Example: `/admin/edupay/rules` with tabs navigating to /rules, /providers, etc.

```tsx
const router = useRouter();

<HubTabs
  tabs={[
    { id: 'overview', label: 'Overview', active: false },
    { id: 'rules', label: 'Rules', active: true },
    { id: 'providers', label: 'Providers', active: false },
  ]}
  onTabChange={(tabId) => {
    if (tabId === 'overview') router.push('/admin/edupay');
    else if (tabId === 'rules') router.push('/admin/edupay/rules');
    else if (tabId === 'providers') router.push('/admin/edupay/providers');
  }}
/>
```

### 8.3 Admin Table Actions

Always use `VerticalDotsMenu` for row actions:

```tsx
<VerticalDotsMenu
  actions={[
    { label: 'View Details', onClick: () => handleView(row) },
    { label: 'Edit', onClick: () => handleEdit(row) },
    { label: 'Delete', onClick: () => handleDelete(row), variant: 'danger' },
  ]}
/>
```

### 8.4 Admin Modal Pattern (Multiple Modals)

Admin tables typically have multiple modals (View Details, Edit, Delete). Follow this pattern:

```tsx
// State for each modal type
const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
const [itemToView, setItemToView] = useState<Item | null>(null);

const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [itemToEdit, setItemToEdit] = useState<Item | null>(null);

const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

// Handlers
const handleViewDetails = (item: Item) => {
  setItemToView(item);
  setIsDetailModalOpen(true);
};

const handleEdit = (item: Item) => {
  setItemToEdit(item);
  setIsEditModalOpen(true);
};

const handleDelete = (item: Item) => {
  setItemToDelete(item);
  setIsDeleteModalOpen(true);
};

// In VerticalDotsMenu
<VerticalDotsMenu
  actions={[
    { label: 'View Details', onClick: () => handleViewDetails(row) },
    { label: 'Edit', onClick: () => handleEdit(row) },
    { label: 'Delete', onClick: () => handleDelete(row), variant: 'danger' },
  ]}
/>

// Render all modals at component bottom
return (
  <>
    <ItemDetailModal
      isOpen={isDetailModalOpen}
      onClose={() => setIsDetailModalOpen(false)}
      item={itemToView}
      onEdit={(item) => {
        setIsDetailModalOpen(false);
        handleEdit(item);
      }}
      onDelete={(item) => {
        setIsDetailModalOpen(false);
        handleDelete(item);
      }}
    />

    <EditItemModal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      item={itemToEdit}
      onSuccess={() => {
        setIsEditModalOpen(false);
        refetch();
      }}
    />

    <DeleteItemModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      item={itemToDelete}
      onDeleteComplete={() => refetch()}
    />

    <HubDataTable ... />
  </>
);
```

### 8.5 Admin Table Component File Structure

Admin tables should be placed in the feature's `components/` folder:

```
apps/web/src/app/(admin)/admin/{feature}/
├── page.tsx                           # Main page with tabs
├── page.module.css
├── components/
│   ├── {Feature}Table.tsx             # Main data table (e.g., WalletsTable.tsx)
│   ├── {Feature}Table.module.css
│   ├── {Feature}DetailModal.tsx       # View details modal
│   ├── {Feature}DetailModal.module.css
│   ├── Edit{Feature}Modal.tsx         # Edit modal
│   ├── Edit{Feature}Modal.module.css
│   ├── Delete{Feature}Modal.tsx       # Delete confirmation modal
│   └── AdvancedFiltersDrawer.tsx      # Optional: advanced filters
└── hooks/
    └── useAdmin{Feature}Metrics.ts    # Admin-specific data hooks
```

---

## 9. Data Tables

### 9.1 HubDataTable Usage

```tsx
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';

// Column definitions
const columns: Column<DataType>[] = [
  {
    key: 'id',
    label: 'ID',
    width: '100px',
    render: (row) => <span className={styles.idCell}>{formatId(row.id)}</span>,
  },
  {
    key: 'created_at',
    label: 'Created',
    width: '120px',
    sortable: true,
    hideOnMobile: true,
    render: (row) => formatDate(row.created_at),
  },
  {
    key: 'name',
    label: 'Name',
    width: '200px',
    sortable: true,
  },
  // ... domain-specific columns
  {
    key: 'actions',
    label: 'Actions',
    width: '100px',
    render: (row) => (
      <VerticalDotsMenu
        actions={[
          { label: 'View', onClick: () => handleView(row) },
          { label: 'Edit', onClick: () => handleEdit(row) },
          { label: 'Delete', onClick: () => handleDelete(row), variant: 'danger' },
        ]}
      />
    ),
  },
];

// Filters
const filters: Filter[] = [
  {
    key: 'status',
    label: 'All Status',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
];

// Pagination
const paginationConfig: PaginationConfig = {
  page,
  limit,
  total: data?.total || 0,
  onPageChange: setPage,
  onLimitChange: (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  },
  pageSizeOptions: [10, 20, 50, 100],
};

// Render
<HubDataTable
  columns={columns}
  data={items}
  loading={isLoading}
  onRowClick={handleRowClick}
  onRefresh={() => refetch()}
  onExport={handleExport}
  filters={filters}
  pagination={paginationConfig}
  emptyMessage="No items found."
  searchPlaceholder="Search..."
  autoRefreshInterval={30000}
  enableSavedViews={true}
  savedViewsKey="feature_savedViews"
  toolbarActions={/* Optional custom toolbar actions */}
/>
```

### 9.2 Universal Column Order

Tables MUST follow this column order:

1. **ID** (if shown) - Truncated UUID or sequential ID
2. **Created** - Date created
3. **Primary Identifier** - Name, title, user, etc.
4. **Domain-Specific Fields** - EP amount, status, type, etc.
5. **Dates** - Updated, completed, etc.
6. **Status** - Status badge
7. **Actions** - VerticalDotsMenu (always last)

### 9.3 Responsive Column Hiding

```tsx
{
  key: 'description',
  label: 'Description',
  hideOnMobile: true,    // Hidden below 768px
  hideOnTablet: true,    // Hidden below 1024px
}
```

### 9.4 Cell Styling Classes

```css
/* ID cells - monospace */
.idCell {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

/* Date cells */
.dateCell {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* User cells */
.userInfo {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.userName {
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.userEmail {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* Numeric values */
.numericValue {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Currency values - green */
.currencyValue {
  font-weight: 500;
  color: #059669;
  font-variant-numeric: tabular-nums;
}
```

---

## 10. Forms

### 10.1 Form Modal Structure

```tsx
export default function EditItemModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}: EditItemModalProps) {
  const [formData, setFormData] = useState<FormData>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        field1: item.field1,
        field2: item.field2,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await updateItem(item.id, formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Item">
      <form onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label htmlFor="field1">Field 1</label>
          <Input
            id="field1"
            value={formData.field1}
            onChange={(e) => setFormData(prev => ({ ...prev, field1: e.target.value }))}
            required
          />
        </div>

        <div className={styles.formActions}>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### 10.2 Form Field Spacing

```css
.formGroup {
  margin-bottom: 1.5rem;
}

.formGroup label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}
```

---

## 11. Modals & Dialogs

### 11.1 Modal Types

| Type | Use Case | Example |
|------|----------|---------|
| **Detail Modal** | View-only information | View conversion details |
| **Edit Modal** | Edit existing item | Edit earning rule |
| **Create Modal** | Create new item | Add new rule |
| **Confirm Modal** | Confirm destructive action | Delete confirmation |
| **Complex Modal** | Multi-step process | EP conversion flow |

### 11.2 Modal Sizes

```css
/* Small - confirmations, simple forms */
.modalSmall { max-width: 400px; }

/* Medium - standard forms */
.modalMedium { max-width: 500px; }

/* Large - complex forms, details */
.modalLarge { max-width: 640px; }

/* XL - multi-column, wizards */
.modalXL { max-width: 800px; }
```

### 11.3 Detail Modal Pattern

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Item Details" size="large">
  <div className={styles.detailGrid}>
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>ID</span>
      <span className={styles.detailValue}>{item.id}</span>
    </div>
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>Status</span>
      <StatusBadge status={item.status} />
    </div>
    {/* ... */}
  </div>

  <div className={styles.modalActions}>
    <Button variant="secondary" onClick={onClose}>Close</Button>
    <Button variant="primary" onClick={handleEdit}>Edit</Button>
  </div>
</Modal>
```

---

## 12. Empty States

### 12.1 HubEmptyState Usage

```tsx
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { FileText } from 'lucide-react';

<HubEmptyState
  icon={<FileText size={48} />}
  title="No items found"
  description="Get started by creating your first item."
  actionLabel="Create Item"
  onAction={() => setShowCreateModal(true)}
/>
```

### 12.2 Empty State Variants

**No Data (Initial State)**:
- Title: "No {items} yet"
- Description: "Get started by creating your first {item}."
- CTA: "Create {Item}"

**No Search Results**:
- Title: "No results found"
- Description: "No {items} match your search. Try different keywords."
- No CTA (or "Clear Filters")

**Error State**:
- Title: "Something went wrong"
- Description: Error message
- CTA: "Try Again"

### 12.3 Empty State Styling

```css
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.emptyStateIcon {
  color: var(--color-text-tertiary);
  margin-bottom: 1rem;
}

.emptyStateTitle {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.emptyStateDescription {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  max-width: 400px;
  margin-bottom: 1.5rem;
}
```

---

## 13. Buttons & CTAs

### 13.1 Button Component

```tsx
import Button from '@/app/components/ui/actions/Button';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Loading</Button>
<Button disabled>Disabled</Button>

// Full width
<Button fullWidth>Full Width</Button>

// Square (icon only)
<Button square><Icon size={16} /></Button>
```

### 13.2 Button Usage Guidelines

| Variant | Use Case | Example |
|---------|----------|---------|
| `primary` | Primary actions, CTAs | "Save", "Create", "Submit" |
| `secondary` | Secondary actions | "Cancel", "Back", "Export" |
| `danger` | Destructive actions | "Delete", "Remove" |
| `ghost` | Tertiary actions, links | "Learn more", inline actions |

### 13.3 Header Actions Pattern

```tsx
<HubHeader
  title="Page Title"
  actions={
    <>
      <Button variant="secondary" size="sm" onClick={handleExport}>
        Export
      </Button>
      <Button variant="primary" size="sm" onClick={handleCreate}>
        Create New
      </Button>
    </>
  }
/>
```

**Note**: Do NOT include icons inside HubHeader action buttons. Keep buttons text-only.

---

## 14. Toolbars & Filters

### 14.1 HubToolbar Features

The HubToolbar (integrated into HubDataTable) provides:

- Search input
- Filter dropdowns
- Auto-refresh toggle
- Manual refresh button
- Saved views
- Bulk actions (when items selected)
- Export button
- Custom toolbar actions

### 14.2 Filter Definitions

```tsx
const filters: Filter[] = [
  {
    key: 'status',
    label: 'All Status',      // Shown when no filter selected
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
  },
  {
    key: 'type',
    label: 'All Types',
    options: [
      { label: 'Type A', value: 'type_a' },
      { label: 'Type B', value: 'type_b' },
    ],
    multiSelect: true,        // Allow multiple selections
  },
];
```

### 14.3 Advanced Filters (Drawer Pattern)

For complex filtering, use a filters drawer:

```tsx
// State
const [isFiltersOpen, setIsFiltersOpen] = useState(false);
const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});

// Toolbar action
<HubDataTable
  toolbarActions={
    <button onClick={() => setIsFiltersOpen(true)}>
      <FilterIcon size={16} />
      {filterCount > 0 && <span className={styles.badge}>{filterCount}</span>}
    </button>
  }
/>

// Drawer
<AdvancedFiltersDrawer
  isOpen={isFiltersOpen}
  onClose={() => setIsFiltersOpen(false)}
  filters={advancedFilters}
  onFiltersChange={setAdvancedFilters}
/>
```

---

## 15. Status Badges

### 15.1 StatusBadge Component

```tsx
// Basic usage
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="failed" />

// Custom label
<StatusBadge status="active" label="Published" />
```

### 15.2 Badge CSS Pattern

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.badgeActive,
.badgeSuccess,
.badgeCompleted {
  background: #d1fae5;
  color: #065f46;
}

.badgePending,
.badgeWarning,
.badgeProcessing {
  background: #fef3c7;
  color: #92400e;
}

.badgeFailed,
.badgeError,
.badgeDanger {
  background: #fee2e2;
  color: #991b1b;
}

.badgeInactive,
.badgeDefault {
  background: #f3f4f6;
  color: #6b7280;
}

.badgeInfo {
  background: #dbeafe;
  color: #1e40af;
}
```

### 15.3 Inline Badge Component

```tsx
function StatusBadge({ status }: { status: string }) {
  const getStatusClass = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return styles.badgeActive;
      case 'pending':
      case 'processing':
        return styles.badgePending;
      case 'failed':
      case 'error':
        return styles.badgeFailed;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <span className={`${styles.badge} ${getStatusClass()}`}>
      {status}
    </span>
  );
}
```

---

## 16. Implementation Checklist

### 16.1 New Page Checklist

- [ ] Create `page.tsx` following component file structure
- [ ] Create `page.module.css` with header/tabs CSS variables
- [ ] Use `HubPageLayout` with header, tabs, and sidebar
- [ ] Implement HubTabs (REQUIRED - every page must have tabs)
- [ ] Add 4-card sidebar pattern (Stats, Help, Tips, Video)
- [ ] Handle loading, error, and empty states
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Add to navigation (AppSidebar or AdminSidebar)

### 16.2 New Data Table Checklist

- [ ] Define columns following universal column order
- [ ] Implement `VerticalDotsMenu` for actions column
- [ ] Add appropriate filters
- [ ] Configure pagination
- [ ] Implement CSV export
- [ ] Add loading skeleton
- [ ] Add empty state message
- [ ] Configure auto-refresh if real-time data needed
- [ ] Enable saved views if useful
- [ ] Test column hiding on mobile/tablet

### 16.3 New Modal Checklist

- [ ] Choose appropriate modal size
- [ ] Implement form with proper validation
- [ ] Handle loading state during submission
- [ ] Show error messages appropriately
- [ ] Call onSuccess callback after successful action
- [ ] Reset form state when modal closes
- [ ] Handle keyboard (Escape to close)
- [ ] Test accessibility (focus management)

### 16.4 New Feature Checklist

- [ ] Create feature folder structure
- [ ] Create main page with Overview and List tabs
- [ ] Create data table component
- [ ] Create CRUD modals (View, Edit, Create)
- [ ] Create feature-specific hooks
- [ ] Add to sidebar navigation
- [ ] Document any new patterns
- [ ] Write tests

---

## Appendix A: Quick Reference

### Component Imports

```tsx
// Hub Layout
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';

// Hub Content
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';

// Hub Charts
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/app/components/hub/charts';

// UI Components
import Button from '@/app/components/ui/actions/Button';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import Modal from '@/app/components/ui/feedback/Modal';

// Admin Widgets
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
```

### CSS Variable Reference

```css
/* Header */
--hub-header-margin-top: 1.5rem;
--hub-header-margin-bottom: 0;
--hub-header-height: 3rem;
--hub-header-padding-x: 1rem;
--hub-header-actions-gap: 0.5rem;
--hub-header-actions-margin-left: 1rem;

/* Tabs */
--hub-tabs-margin-top: 3rem;
--hub-tabs-margin-bottom: 1rem;
```

---

**End of Design System Documentation**
