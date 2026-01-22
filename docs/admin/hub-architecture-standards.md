# Hub Architecture Standards

**Document Version:** 1.0
**Created:** 2025-12-27
**Last Updated:** 2025-12-27
**Status:** Official Standard for All Admin Features

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Principles](#core-principles)
3. [HubDataTable Component](#hubdatatable-component)
4. [HubDetailModal Component](#hubdetailmodal-component)
5. [HubPageLayout Component](#hubpagelayout-component)
6. [Standard Toolbar Pattern](#standard-toolbar-pattern)
7. [Universal Column Order Standard](#universal-column-order-standard)
8. [Responsive Design Standards](#responsive-design-standards)
9. [Data Fetching Standards](#data-fetching-standards)
10. [CSS Module Standards](#css-module-standards)
11. [TypeScript Type Standards](#typescript-type-standards)

---

## Introduction

The Hub Architecture is a **standardized component system** for building admin feature pages in the TutorWise platform. It provides reusable, battle-tested components that ensure consistency, performance, and maintainability across all admin features.

### Purpose

- **Consistency**: All admin feature pages (Bookings, Listings, Reviews, Organizations, Referrals) share identical UI/UX patterns
- **Efficiency**: Developers can implement new features 10x faster by leveraging pre-built components
- **Maintainability**: Bug fixes and improvements to hub components automatically benefit all features
- **Quality**: Hub components include built-in loading states, error handling, accessibility, and responsive design

### Scope

This document defines the **complete standard** that MUST be followed when implementing any admin feature page. Deviations from this standard require explicit architectural approval.

---

## Core Principles

### 1. Component-First Architecture

All admin pages are built using **three core hub components**:

- **HubDataTable**: Generic data table with Phase 1 & 2 features (search, filters, sorting, pagination, bulk actions, auto-refresh, saved views, CSV export)
- **HubDetailModal**: Generic modal for displaying detailed entity information with admin actions
- **HubPageLayout**: Standardized page layout (header, tabs, content, sidebar)

### 2. Generic with Type Safety

Hub components use **TypeScript generics** to remain reusable while maintaining complete type safety:

```typescript
// HubDataTable is generic over T (the row data type)
interface HubDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  // ... more props
}

// Column definition is also generic
interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}
```

### 3. Server-Side Everything

- **Server-side pagination**: Database queries use `.range(start, end)` and return `{ count: 'exact' }`
- **Server-side filtering**: All filters build Supabase query conditions
- **Server-side sorting**: Sorting uses `.order(key, { ascending })`
- **Server-side search**: Search uses `.ilike` or `.or` queries

### 4. React Query for State Management

All data fetching uses **React Query** (`@tanstack/react-query`) with these standards:

- `staleTime: 60 * 1000` (1 minute) for data queries
- `retry: 2` (retry failed requests twice)
- `refetch()` function exposed for manual refresh
- `queryKey` includes all filter/sort/pagination state

### 5. Progressive Enhancement

Features are implemented in phases:

**Phase 1 (Minimum Viable)**:
- Table with columns
- Search bar
- Basic filters (2-4 dropdowns)
- Pagination
- CSV export
- Row click for details

**Phase 2 (Enhanced)**:
- Auto-refresh (30s interval with toggle)
- Saved filter views (localStorage)
- Bulk actions (multi-select + dropdown)
- Keyboard shortcuts (⌘K search, ⌘R refresh, Esc clear)
- Advanced filters drawer (9+ filter types)

---

## HubDataTable Component

**Location**: `apps/web/src/app/components/hub/data/HubDataTable.tsx`

### Complete API Reference

#### Required Props

```typescript
interface HubDataTableProps<T> {
  // Data (REQUIRED)
  columns: Column<T>[];           // Column definitions
  data: T[];                      // Row data

  // State (OPTIONAL)
  loading?: boolean;              // Show skeleton rows
  error?: string;                 // Show error state

  // Selection (OPTIONAL)
  selectable?: boolean;           // Enable multi-row selection
  selectedRows?: Set<string>;     // Currently selected row IDs
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: T) => string;  // Default: row.id

  // Interaction (OPTIONAL)
  onRowClick?: (row: T) => void;  // Row click handler (opens detail modal)
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSearch?: (query: string) => void;
  onFilterChange?: (filterKey: string, value: string | string[]) => void;
  onExport?: () => void;          // CSV export handler
  onRefresh?: () => void;         // Manual refresh handler

  // Configuration (OPTIONAL)
  pagination?: PaginationConfig;  // Pagination settings
  filters?: Filter[];             // Toolbar filter dropdowns (2-4)
  bulkActions?: BulkAction[];     // Phase 2: Bulk action dropdown
  autoRefreshInterval?: number;   // Phase 2: Auto-refresh in ms (e.g., 30000)
  enableSavedViews?: boolean;     // Phase 2: Enable saved filter views
  savedViewsKey?: string;         // Phase 2: LocalStorage key
  searchPlaceholder?: string;     // Default: "Search..."
  emptyMessage?: string;          // Default: "No data found"
  emptyState?: React.ReactNode;   // Custom empty state UI
  mobileCard?: (row: T) => React.ReactNode;  // Mobile card renderer
  toolbarActions?: React.ReactNode;  // Custom toolbar buttons (e.g., Advanced Filters)

  // Styling (OPTIONAL)
  className?: string;
}
```

#### Column Definition

```typescript
interface Column<T> {
  key: string;                    // Column ID (must match sort key)
  label: string;                  // Column header text
  width?: string;                 // CSS width (e.g., '120px', '20%')
  sortable?: boolean;             // Enable column sorting
  render?: (row: T) => React.ReactNode;  // Custom cell renderer
  hideOnMobile?: boolean;         // Hide column on mobile (<768px)
  hideOnTablet?: boolean;         // Hide column on tablet (768-1023px)
}
```

**Example Column with Custom Renderer**:

```typescript
{
  key: 'status',
  label: 'Status',
  width: '120px',
  sortable: true,
  render: (booking) => (
    <span className={`statusBadge ${styles[booking.status.toLowerCase()]}`}>
      {booking.status}
    </span>
  )
}
```

#### Filter Definition

```typescript
interface Filter {
  key: string;                    // Filter ID
  label: string;                  // Filter dropdown label (e.g., "All Statuses")
  options: FilterOption[];        // Dropdown options
  multiSelect?: boolean;          // Phase 2: Allow multiple selections
}

interface FilterOption {
  label: string;                  // Display text
  value: string;                  // Value passed to onFilterChange
}
```

**Example Filter**:

```typescript
{
  key: 'status',
  label: 'All Statuses',
  options: [
    { label: 'Pending', value: 'Pending' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ]
}
```

#### Pagination Configuration

```typescript
interface PaginationConfig {
  page: number;                   // Current page (1-indexed)
  limit: number;                  // Items per page
  total: number;                  // Total item count from database
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;  // Optional: Page size selector
  pageSizeOptions?: number[];     // Default: [10, 20, 50, 100]
}
```

#### Bulk Actions (Phase 2)

```typescript
interface BulkAction {
  label: string;                  // Action text (e.g., "Approve Selected")
  value: string;                  // Action ID
  onClick: (selectedIds: string[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';  // Button style
}
```

**Example Bulk Actions**:

```typescript
const bulkActions: BulkAction[] = [
  {
    label: 'Activate',
    value: 'activate',
    onClick: async (ids) => {
      await supabase.from('listings').update({ status: 'published' }).in('id', ids);
      refetch();
    },
    variant: 'primary',
  },
  {
    label: 'Delete',
    value: 'delete',
    onClick: async (ids) => {
      if (confirm(`Delete ${ids.length} items?`)) {
        await supabase.from('listings').delete().in('id', ids);
        refetch();
      }
    },
    variant: 'danger',
  },
];
```

### Phase 2 Features

#### Auto-Refresh

- Set `autoRefreshInterval={30000}` (30 seconds)
- Provide `onRefresh` callback
- User can toggle auto-refresh on/off via checkbox
- Manual refresh button shows spinning animation

#### Saved Views

- Set `enableSavedViews={true}` and `savedViewsKey="admin_bookings_savedViews"`
- User can save current filter + sort + column state as a named view
- Views saved to localStorage
- Dropdown to load/delete saved views

#### Keyboard Shortcuts

- `⌘K` / `Ctrl+K`: Focus search input
- `⌘R` / `Ctrl+R`: Manual refresh
- `Esc`: Clear search and blur input

### Responsive Behavior

| Breakpoint | Layout | Visible Columns |
|------------|--------|-----------------|
| Desktop (1024px+) | Full table | All columns |
| Tablet (768-1023px) | Full table | Hide columns with `hideOnTablet: true` |
| Mobile (<768px) | Card layout | Use `mobileCard` prop renderer |

### Mobile Card Pattern

The `mobileCard` prop should render a **custom card component** for mobile layouts:

```typescript
const renderMobileCard = (listing: Listing) => (
  <div className={styles.mobileCard}>
    <div className={styles.mobileCardHeader}>
      <img src={listing.hero_image_url} className={styles.mobileCardImage} />
      <div className={styles.mobileCardTitle}>{listing.title}</div>
    </div>
    <div className={styles.mobileCardBody}>
      <div className={styles.mobileCardRow}>
        <span className={styles.label}>Status:</span>
        <StatusBadge status={listing.status} />
      </div>
      {/* More rows... */}
    </div>
  </div>
);

<HubDataTable
  mobileCard={renderMobileCard}
  // ... other props
/>
```

---

## HubDetailModal Component

**Location**: `apps/web/src/app/components/hub/modal/HubDetailModal/HubDetailModal.tsx`

### Complete API Reference

```typescript
interface HubDetailModalProps {
  isOpen: boolean;                // Modal open state
  onClose: () => void;            // Close handler (Escape key supported)
  title: string;                  // Modal title
  subtitle?: string;              // Optional subtitle
  sections: DetailSection[];      // Information sections (1-6 typical)
  actions?: React.ReactNode;      // Custom action buttons
  size?: 'sm' | 'md' | 'lg' | 'xl';  // Modal width (default: 'lg')
}
```

#### Section Definition

```typescript
interface DetailSection {
  title: string;                  // Section heading
  fields: DetailField[];          // Field list
}

interface DetailField {
  label: string;                  // Field label (left column)
  value: string | React.ReactNode;  // Field value (right column, can be JSX)
}
```

### Size Variants

| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 480px | Simple details (3-4 fields) |
| `md` | 640px | Standard details (10-15 fields) |
| `lg` | 800px | **Default**, most admin modals |
| `xl` | 1000px | Complex details with images/charts |

### Modal Actions Pattern

Actions are provided as a **custom React node** rendered in the modal footer. Use the **actionsWrapper pattern** for responsive 2-column layout on mobile:

```typescript
<HubDetailModal
  isOpen={isOpen}
  onClose={onClose}
  title={listing.title}
  sections={sections}
  actions={
    <div className={styles.actionsWrapper}>
      <Button variant="primary" onClick={handleActivate}>
        Activate
      </Button>
      <Button variant="secondary" onClick={handleEdit}>
        Edit
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  }
/>
```

**CSS for actionsWrapper** (copy this exactly):

```css
.actionsWrapper {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 1rem !important;
  width: 100% !important;
  align-items: flex-start !important;
  row-gap: 1rem !important;
  column-gap: 1rem !important;
}

.actionsWrapper > * {
  flex-shrink: 0;
}

/* Mobile: 2 buttons per row, full width */
@media (max-width: 767px) {
  .actionsWrapper > * {
    flex: 1 1 calc(50% - 0.5rem); /* 2 buttons per row with gap */
    min-width: calc(50% - 0.5rem);
  }
}
```

### Radix UI Dropdown Pattern

For actions with **multiple options** (e.g., "Change Status"), use **Radix UI DropdownMenu** with portal rendering:

```typescript
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <Button variant="secondary" disabled={isProcessing}>
      <Settings className={styles.buttonIcon} />
      Change Status
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      className={styles.statusDropdownContent}
      sideOffset={5}
      align="start"
    >
      {['draft', 'published', 'archived'].map((status) => (
        <DropdownMenu.Item
          key={status}
          className={styles.statusDropdownItem}
          disabled={listing.status === status || isProcessing}
          onSelect={() => handleChangeStatus(status)}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
          {listing.status === status && (
            <span className={styles.currentStatusBadge}>(Current)</span>
          )}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

**Required CSS** (copy from bookings):

```css
.statusDropdownContent {
  min-width: 160px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slideDownAndFade 0.2s ease;
}

@keyframes slideDownAndFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.statusDropdownItem {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #374151;
  cursor: pointer;
  outline: none;
  border: none;
  background: transparent;
  transition: background-color 0.15s ease;
}

.statusDropdownItem:hover {
  background-color: #f9fafb;
}

.statusDropdownItem:focus {
  background-color: #f3f4f6;
}

.statusDropdownItem[data-disabled] {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: default;
  pointer-events: none;
}

.currentStatusBadge {
  color: #9ca3af;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}
```

### Keyboard Support

- **Escape key**: Closes modal (built-in)
- **Radix UI dropdown**: Arrow keys, Enter, Escape supported automatically

---

## HubPageLayout Component

**Location**: `apps/web/src/app/components/hub/layout/HubPageLayout.tsx`

### Complete API Reference

```typescript
interface HubPageLayoutProps {
  header: React.ReactNode;        // HubHeader component
  tabs?: React.ReactNode;         // Optional HubTabs component
  children: React.ReactNode;      // Main content area
  sidebar?: React.ReactNode;      // Optional right sidebar (320px)
}
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (HubHeader - full width)                                 │
├─────────────────────────────────────────────────────────────────┤
│ TABS (HubTabs - full width, optional)                           │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┬──────────────────────┐ │
│ │ CONTENT (max-width: 1200px)         │ SIDEBAR (320px)      │ │
│ │ - KPI cards                         │ - AdminStatsWidget   │ │
│ │ - Charts                            │ - AdminHelpWidget    │ │
│ │ - HubDataTable                      │ - AdminTipWidget     │ │
│ └─────────────────────────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Breakpoint | Layout | Sidebar |
|------------|--------|---------|
| Desktop (1024px+) | Two-column | Visible on right |
| Tablet (768-1023px) | Two-column | Visible on right |
| Mobile (<768px) | Single column | Floating button + slide-in drawer |

### Usage Example

```typescript
<HubPageLayout
  header={
    <HubHeader
      title="Bookings"
      subtitle="Manage all platform bookings"
      filters={/* Search + dropdowns */}
      actions={/* Primary action buttons */}
    />
  }
  tabs={
    <HubTabs
      tabs={[
        { id: 'overview', label: 'Overview', active: true },
        { id: 'all-bookings', label: 'All Bookings', count: 1247, active: false }
      ]}
      onTabChange={setActiveTab}
    />
  }
  sidebar={
    <HubSidebar>
      <AdminStatsWidget />
      <AdminHelpWidget />
    </HubSidebar>
  }
>
  {/* Main content: KPI cards, charts, table */}
</HubPageLayout>
```

---

## Standard Toolbar Pattern

The **admin table toolbar** is the **STANDARD PATTERN** that MUST be applied to all admin feature pages (Bookings, Listings, Reviews, Organizations, Referrals).

### Required Toolbar Actions (8 Total)

These actions appear in the HubDataTable toolbar:

1. **Search bar** - Filters by relevant text fields (ID, name, description, etc.)
2. **Filter dropdowns** - 2-4 common filters (status, date, category, etc.)
3. **Advanced Filters button** - Icon-only button (FilterIcon) that opens drawer
4. **Bulk action dropdown** - Appears when rows selected, shows 3-5 actions
5. **Auto-refresh toggle** - Checkbox to enable 30s auto-refresh
6. **Saved views dropdown** - Load/save custom filter views
7. **CSV export button** - Download current page as CSV
8. **Refresh button** - Manual refresh with spinning animation

### Toolbar Layout

```
┌───────────────────────────────────────────────────────────────────┐
│ [Search Input......] [Status ▼] [Date ▼] [🔍] [Auto-refresh ☑]  │
│ [Saved Views ▼] [💾] [🔄] [📥 Export CSV] [⋮ Actions (3)]        │
└───────────────────────────────────────────────────────────────────┘
```

**On mobile (<768px)**: Toolbar actions wrap to multiple rows automatically.

### Advanced Filters Button

The Advanced Filters button should be **icon-only** (no text label):

```typescript
toolbarActions={
  <button
    className={`${styles.filtersButton} ${hasActiveFilters ? styles.active : ''}`}
    onClick={() => setIsDrawerOpen(true)}
    title={hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'Filters'}
  >
    <FilterIcon size={16} />
    {hasActiveFilters && (
      <span className={styles.filtersBadge}>
        {activeFilterCount}
      </span>
    )}
  </button>
}
```

**CSS**:

```css
.filtersButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filtersButton:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.filtersButton.active {
  background: #006c67;
  border-color: #006c67;
  color: #ffffff;
}

.filtersBadge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 2px solid #ffffff;
}
```

### Default Filter Values

All toolbar filter dropdowns should **default to "all"** (no filter applied):

```typescript
const filters: Filter[] = [
  {
    key: 'status',
    label: 'All Statuses',  // ✅ Default label shows "All"
    options: [
      { label: 'Pending', value: 'Pending' },
      { label: 'Confirmed', value: 'Confirmed' },
      // ...
    ]
  },
  {
    key: 'category',
    label: 'All Categories',  // ✅ Default label shows "All"
    options: [
      { label: 'Academic', value: 'academic' },
      { label: 'Language', value: 'language' },
      // ...
    ]
  }
];
```

### Bulk Actions Pattern

Bulk actions only appear when **rows are selected**:

```typescript
const bulkActions: BulkAction[] = [
  {
    label: 'Activate',
    value: 'activate',
    onClick: async (selectedIds) => {
      if (!confirm(`Activate ${selectedIds.length} items?`)) return;
      await supabase.from('listings').update({ status: 'published' }).in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'primary',
  },
  {
    label: 'Feature',
    value: 'feature',
    onClick: async (selectedIds) => {
      await supabase.from('listings').update({ is_featured: true }).in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'secondary',
  },
  {
    label: 'Delete',
    value: 'delete',
    onClick: async (selectedIds) => {
      if (!confirm(`DELETE ${selectedIds.length} items? This cannot be undone.`)) return;
      await supabase.from('listings').delete().in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'danger',
  },
];
```

**Best Practices**:
- Always show confirmation dialog for destructive actions
- Clear selection after successful action
- Call `refetch()` to update table data
- Use appropriate variant (primary, secondary, danger)

---

## Universal Column Order Standard

**Status:** MANDATORY for all admin feature tables

### Overview

ALL admin tables MUST follow this exact column order to ensure consistency, predictability, and optimal user experience across the entire admin platform.

### The Standard Order

```
1. ID (100px)
2. Date (140px)
3. Service (200px)
4. Domain Data (varies)
...
N. Actions (100px)
```

### Column Definitions

#### Column 1: ID (MANDATORY)
- **Width**: `100px` (fixed)
- **Label**: "ID"
- **Format**: 8-character truncated UUID with `#` prefix (e.g., `#a1b2c3d4`)
- **Font**: Monospace (`SF Mono`, `Monaco`, `Consolas`)
- **Sortable**: Yes
- **Tooltip**: Full UUID shown on hover
- **Implementation**: Use `formatIdForDisplay(record.id)` from `@/lib/utils/formatId`
- **Reference**: See [Identifier Standard](./identifier-standard.md) for complete details

**Code Template**:
```typescript
{
  key: 'id',
  label: 'ID',
  width: '100px',
  sortable: true,
  render: (record) => (
    <div className={styles.idCell}>
      <span className={styles.idText} title={record.id}>
        {formatIdForDisplay(record.id)}
      </span>
    </div>
  ),
}
```

**CSS**:
```css
.idCell {
  font-family: 'SF Mono', 'Monaco', 'Consolas', standard font;
  font-size: 0.875rem;
  color: #6b7280;
}

.idText {
  cursor: default;
  user-select: text;
}
```

#### Column 2: Date (MANDATORY)
- **Width**: `140px` (fixed)
- **Label**: Varies by feature (e.g., "Created", "Session Date", "Reviewed")
- **Field**: Primary date for the feature
  - Bookings: `session_start_time`
  - Listings: `created_at`
  - Reviews: `reviewed_at`
  - Referrals: `created_at`
  - Organizations: `created_at`
- **Format**: `dd MMM yyyy` (e.g., "27 Dec 2025")
- **Sortable**: Yes (default sort: descending for newest first)

**Code Template**:
```typescript
{
  key: 'created_at',  // or session_start_time, reviewed_at, etc.
  label: 'Created',   // or 'Session Date', 'Reviewed', etc.
  width: '140px',
  sortable: true,
  render: (record) => (
    <span className={styles.dateCell}>
      {new Date(record.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}
    </span>
  ),
}
```

#### Column 3: Service (MANDATORY)
- **Width**: `200px` (fixed)
- **Label**: Varies by feature (e.g., "Service", "Title", "Listing")
- **Field**: Primary subject/identifier for the record
  - Bookings: `service_name` (e.g., "Math Tutoring")
  - Listings: `title` (e.g., "Expert Math Tutor")
  - Reviews: `listing_title` or `service_name` (reviewed service)
  - Referrals: `referred_service` or `referred_user`
  - Organizations: `organization_name`
- **Format**: With image thumbnail (48x48px) if applicable
- **Sortable**: Yes

**Code Template**:
```typescript
{
  key: 'title',  // or service_name, listing_title, organization_name, etc.
  label: 'Service',  // or 'Title', 'Listing', 'Organization', etc.
  width: '200px',
  sortable: true,
  render: (record) => (
    <div className={styles.serviceCell}>
      {record.image_url && (
        <img
          src={record.image_url}
          alt={record.title}
          className={styles.serviceImage}
        />
      )}
      <div className={styles.serviceInfo}>
        <div className={styles.serviceTitle}>{record.title}</div>
        {record.subtitle && (
          <div className={styles.serviceSubtitle}>{record.subtitle}</div>
        )}
      </div>
    </div>
  ),
}
```

**CSS**:
```css
.serviceCell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.serviceImage {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  object-fit: cover;
}

.serviceInfo {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.serviceTitle {
  font-weight: 500;
  color: #1f2937;
}

.serviceSubtitle {
  font-size: 0.875rem;
  color: #6b7280;
}
```

#### Columns 4-N: Domain Data (FLEXIBLE)
- **Count**: Typically 5-8 columns
- **Range**: Total columns should be 10-12 for optimal UX
- **Content**: Feature-specific data (status, user, metrics, etc.)
- **Width**: Varies (typically 120-200px each)
- **Sortable**: As appropriate for each column

#### Last Column: Actions (MANDATORY)
- **Width**: `100px` (fixed)
- **Label**: "Actions"
- **Format**: Three-dot menu (`MoreVertical` icon)
- **Sortable**: No
- **Dropdown**: View Details, Edit, Delete, etc.

### Rationale for This Standard

**Why ID → Date → Service?**

1. **Immediate Context**: First three columns provide complete reference for any record
   - Support teams can quickly identify issues: "Check #a1b2c3d4 from 15 Dec"
   - Users build mental model: "ID = unique reference, Date = when, Service = what"

2. **Consistent Mental Model**: All admin features work the same way
   - Reduces cognitive load when switching between Bookings, Listings, Reviews, etc.
   - New team members learn pattern once, apply everywhere

3. **Mobile-First Benefits**: Most important info appears first
   - On narrow screens, ID + Date + Service are visible before scrolling
   - Critical reference data always accessible

4. **Faster Task Completion**: Common workflows optimized
   - Finding specific record by ID: Column 1
   - Finding recent items: Column 2 (sort descending)
   - Finding by service/subject: Column 3 (search/filter)

5. **Support-Friendly**: Customer support uses all three fields
   - "Find the Math Tutoring booking (#a1b2c3d4) from December 15th"
   - Three columns = complete reference with zero ambiguity

### Column Order by Feature

**Bookings** (12 columns):
```
1. ID
2. Date (session_start_time)
3. Service (service_name)
4. Client
5. Agent
6. Tutor
7. Amount
8. Duration
9. Status
10. Payment
11. Type
12. Actions
```

**Listings** (10 columns):
```
1. ID
2. Created
3. Title
4. Tutor
5. Subjects
6. Status
7. Views
8. Bookings
9. Price
10. Actions
```

**Reviews** (11 columns - example):
```
1. ID
2. Reviewed (reviewed_at)
3. Service (listing_title)
4. Reviewer
5. Tutor
6. Rating
7. Sentiment
8. Status
9. Helpful
10. Verified
11. Actions
```

**Organizations** (10 columns - example):
```
1. ID
2. Created
3. Organization Name
4. Admin
5. Members
6. Listings
7. Status
8. Plan
9. Verified
10. Actions
```

**Referrals** (10 columns - example):
```
1. ID
2. Created
3. Referred User
4. Referrer
5. Type
6. Status
7. Reward
8. Conversions
9. Revenue
10. Actions
```

### Validation Checklist

Before considering a table implementation complete, verify:

- [ ] Column 1 is ID (100px, standard font, `formatIdForDisplay()`)
- [ ] Column 2 is primary Date (140px, `dd MMM yyyy` format)
- [ ] Column 3 is Service/primary identifier (200px, with image if applicable)
- [ ] Columns 4-N are domain-specific (5-8 columns)
- [ ] Last column is Actions (100px, three-dot menu)
- [ ] Total column count is 10-12
- [ ] All widths match standard (ID: 100px, Date: 140px, Service: 200px, Actions: 100px)
- [ ] Default sort is Date descending (newest first)

### Migration Guide

If you have an existing table that doesn't follow this standard:

**Step 1**: Identify current column positions
```typescript
// Current (WRONG)
1. Title
2. Status
3. User
...
9. Created
10. ID  // ID should be first!
```

**Step 2**: Reorder to match standard
```typescript
// Corrected (RIGHT)
1. ID         // Moved from position 10 → 1
2. Created    // Moved from position 9 → 2
3. Title      // Moved from position 1 → 3 (this is "Service")
4. Status
5. User
...
```

**Step 3**: Update widths
```typescript
// Ensure fixed widths
{ key: 'id', width: '100px' },          // FIXED
{ key: 'created_at', width: '140px' },  // FIXED
{ key: 'title', width: '200px' },       // FIXED
{ key: 'actions', width: '100px' },     // FIXED
```

**Step 4**: Update CSS class names
- Rename `.titleCell` → `.serviceCell` (if title is the "Service")
- Rename `.titleImage` → `.serviceImage`
- Keep `.idCell` and `.dateCell` as-is

**Step 5**: Test sorting
- Default sort should be Date (descending)
- ID should be sortable (ascending/descending)
- Service should be sortable (ascending/descending)

---

## Responsive Design Standards

### Breakpoints

```css
/* Mobile (portrait phones) */
@media (max-width: 767px) { }

/* Tablet (landscape phones, portrait tablets) */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop (landscape tablets, laptops, desktops) */
@media (min-width: 1024px) { }
```

### Table Responsive Pattern

| Breakpoint | Behavior |
|------------|----------|
| Desktop (1024px+) | Full table with all columns |
| Tablet (768-1023px) | Full table, hide non-essential columns |
| Mobile (<768px) | Switch to card layout using `mobileCard` prop |

### Charts Grid Responsive Pattern

Charts section should use a **responsive grid** with these breakpoints:

```css
.chartsSection {
  display: grid;
  grid-template-columns: 1fr;  /* 1 column on mobile */
  gap: 2rem;
  margin-top: 2rem;
}

@media (min-width: 768px) {
  .chartsSection {
    grid-template-columns: repeat(2, 1fr);  /* 2 columns on tablet */
  }
}

@media (min-width: 1024px) {
  .chartsSection {
    grid-template-columns: 1fr;  /* 1 column on desktop */
  }
}
```

### Modal Actions Responsive Pattern

Modal action buttons should display **2 per row on mobile** (<768px):

```css
.actionsWrapper {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 1rem !important;
  width: 100% !important;
}

@media (max-width: 767px) {
  .actionsWrapper > * {
    flex: 1 1 calc(50% - 0.5rem);  /* 2 buttons per row */
    min-width: calc(50% - 0.5rem);
  }
}
```

---

## Data Fetching Standards

### React Query Configuration

All data fetching uses **@tanstack/react-query** with these settings:

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['admin-listings', page, limit, sortKey, sortDirection, searchQuery, filters],
  queryFn: async () => {
    // Supabase query logic
  },
  staleTime: 60 * 1000,  // 1 minute
  retry: 2,              // Retry failed requests twice
});
```

**Critical**: The `queryKey` array MUST include **all state variables** that affect the query (page, limit, sort, search, filters). This ensures proper caching and re-fetching.

### Supabase Query Pattern

```typescript
queryFn: async () => {
  // 1. Base query with joins
  let query = supabase
    .from('listings')
    .select(`
      *,
      profile:profiles!profile_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `, { count: 'exact' });  // ✅ count: 'exact' required for pagination

  // 2. Apply search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  // 3. Apply toolbar filters
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  // 4. Apply advanced filters
  if (advancedFilters.minViews) {
    query = query.gte('view_count', advancedFilters.minViews);
  }

  // 5. Apply sorting
  query = query.order(sortKey, { ascending: sortDirection === 'asc' });

  // 6. Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  query = query.range(start, end);

  // 7. Execute query
  const { data, error, count } = await query;

  if (error) throw error;

  return {
    listings: data || [],
    total: count || 0,
  };
}
```

### Foreign Key Array Flattening

Supabase foreign key joins return **arrays** even for single relationships. Flatten them:

```typescript
const listings = (data || []).map((item: any) => ({
  ...item,
  profile: Array.isArray(item.profile) ? item.profile[0] : item.profile,
})) as Listing[];
```

### Auto-Refresh Pattern

Pass `refetch` to HubDataTable:

```typescript
<HubDataTable
  onRefresh={() => refetch()}
  autoRefreshInterval={30000}  // 30 seconds
  // ... other props
/>
```

---

## CSS Module Standards

### File Naming Convention

- **Page styles**: `page.module.css` (e.g., `admin/listings/page.module.css`)
- **Component styles**: `ComponentName.module.css` (e.g., `ListingsTable.module.css`)
- **Modal styles**: `ComponentNameModal.module.css` (e.g., `AdminListingDetailModal.module.css`)

### Status Badge Pattern

Status badges should have **rectangular shape** with **8px border-radius** (NOT pill-shaped):

```css
.statusBadge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;  /* ✅ 8px (0.5rem), NOT 9999px */
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.statusDraft {
  background: #fef3c7;
  color: #92400e;
}

.statusPublished {
  background: #d1fae5;
  color: #065f46;
}

.statusArchived {
  background: #f3f4f6;
  color: #374151;
}
```

### Table Cell Styling

```css
/* ID Cell - Monospace font, gray text */
.idCell {
  font-family: 'Monaco', 'Courier New', standard font;
  font-size: 0.8125rem;
  color: #6b7280;
}

/* Title Cell - Flex layout with image */
.titleCell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.listingImage {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  object-fit: cover;
}

/* Tutor Cell - Flex layout with avatar */
.tutorCell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tutorAvatar {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  object-fit: cover;
}

/* Subjects Cell - Show first subject + count */
.subjectsCell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subjectBadge {
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Numeric cells - Right-aligned */
.numericCell {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

### Mobile Card Styling

```css
.mobileCard {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobileCard:hover {
  border-color: #006c67;
  box-shadow: 0 2px 8px rgba(0, 108, 103, 0.1);
}

.mobileCardHeader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.mobileCardImage {
  width: 64px;
  height: 64px;
  border-radius: 0.375rem;
  object-fit: cover;
}

.mobileCardTitle {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.mobileCardBody {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobileCardRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.mobileCardMetrics {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}
```

---

## TypeScript Type Standards

### Import Shared Types

```typescript
import { Booking, Listing, Review, Profile } from '@/types';
```

### Column Type Safety

```typescript
import { Column } from '@/app/components/hub/data';

const columns: Column<Listing>[] = [
  {
    key: 'id',
    label: 'ID',
    width: '80px',
    sortable: true,
    render: (listing) => listing.id.slice(0, 8),  // ✅ Type-safe access
  },
  // ... more columns
];
```

### Filter State Type

```typescript
interface AdvancedFilters {
  minViews?: number;
  maxViews?: number;
  minBookings?: number;
  maxBookings?: number;
  minRating?: number;
  maxRating?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured: boolean;
  hasVideo: boolean;
  hasGallery: boolean;
  createdAfter: string;
  createdBefore: string;
}
```

### Query Response Type

```typescript
interface QueryResponse {
  listings: Listing[];
  total: number;
}

const { data, isLoading } = useQuery<QueryResponse>({
  queryKey: ['admin-listings'],
  queryFn: async () => {
    // ... query logic
    return {
      listings: transformedData,
      total: count || 0,
    };
  },
});
```

---

## Summary Checklist

When implementing a new admin feature page, verify:

- [ ] Uses HubDataTable with all 8 toolbar actions
- [ ] Uses HubDetailModal with Radix UI dropdowns for multi-option actions
- [ ] Uses HubPageLayout with header, tabs, sidebar
- [ ] Implements server-side pagination, filtering, sorting
- [ ] Uses React Query with correct `queryKey` and `staleTime`
- [ ] Status badges are rectangular (8px border-radius), not pill-shaped
- [ ] Advanced Filters button is icon-only with badge count
- [ ] Default filter values set to "all" (no filter applied)
- [ ] Mobile responsive: table → cards, actions 2 per row
- [ ] Charts grid: 1 col mobile, 2 col tablet, 1 col desktop
- [ ] Bulk actions show confirmation dialogs
- [ ] Auto-refresh enabled with 30s interval
- [ ] Saved views enabled with unique localStorage key
- [ ] CSV export implemented
- [ ] Keyboard shortcuts work (⌘K, ⌘R, Esc)
- [ ] TypeScript types imported from `@/types`
- [ ] CSS modules use standard naming conventions

---

**End of Hub Architecture Standards Document**

For implementation examples, see:
- [Bookings Implementation Reference](./bookings-implementation.md)
- [Listings Implementation Guide](./listings-implementation.md)
- [Feature Page Implementation Template](./feature-page-template.md)
