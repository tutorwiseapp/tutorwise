# Feature Page Implementation Template

**Document Version:** 1.0
**Created:** 2025-12-27
**Last Updated:** 2025-12-27
**Status:** Step-by-Step Blueprint for All New Admin Features

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
4. [Code Templates](#code-templates)
5. [Validation Checklist](#validation-checklist)
6. [Common Pitfalls](#common-pitfalls)

---

## Introduction

### Purpose

This document provides a **complete, copy-paste template** for implementing any new admin feature page (Reviews, Organizations, Referrals, etc.). Follow this guide step-by-step to ensure 100% alignment with the Hub Architecture Standards.

### What You'll Build

By following this template, you'll create:
- ✅ A complete admin feature page with Overview + All Items tabs
- ✅ 8 KPI cards with trend indicators
- ✅ 3 charts (trend chart, breakdown chart, trend chart)
- ✅ A data table with 10+ columns, 8 toolbar actions, Phase 1 & 2 features
- ✅ A detail modal with 6 sections and admin actions
- ✅ An advanced filters drawer with 9+ filter types
- ✅ Complete responsive design (desktop, tablet, mobile)
- ✅ Full TypeScript type safety
- ✅ All CSS modules following naming conventions

### Estimated Time

- **First feature (learning)**: 8-12 hours
- **Subsequent features (experienced)**: 4-6 hours

---

## Prerequisites

### Required Knowledge

- React 18 (hooks, state, effects)
- TypeScript (generics, interfaces, type inference)
- Next.js 14 (App Router, server components)
- React Query (useQuery, queryKey, refetch)
- Supabase (select, filters, joins, range)
- CSS Modules (scoped styling)

### Required Tools

- Node.js 18+
- npm/yarn/pnpm
- VSCode (or equivalent IDE)
- Supabase CLI (for database schema)

### Required Files

Before starting, ensure these files exist:
- [ ] `apps/web/src/types/index.ts` - Your feature type defined
- [ ] Database table created in Supabase with UUID primary key
- [ ] `platform_statistics_daily` table has metrics for your feature
- [ ] `apps/web/src/lib/utils/formatId.ts` - ID formatting utility (already created)

### Required Standards

**MUST READ**:
- [ ] [Identifier Standard](./identifier-standard.md) - Universal UUID formatting rules
- [ ] [Hub Architecture Standards](./hub-architecture-standards.md) - Component patterns
- [ ] [Bookings Implementation](./bookings-implementation.md) - Reference implementation

---

## Step-by-Step Implementation Guide

### Phase 1: Planning (30 minutes)

#### 1.1 Define Your Domain Model

**Template**: Copy this checklist and fill it out for your feature.

```
Feature Name: _______________
Table Name: _______________
Primary Key: _______________

Required Fields:
- [ ] id: string
- [ ] created_at: string
- [ ] updated_at?: string
- [ ] status: string (possible values: _________)
- [ ] ... (list all fields)

Foreign Keys:
- [ ] profile_id → profiles (if needed)
- [ ] ... (list all foreign keys)

Metrics Required (8 total):
Row 1 (Counts):
1. {feature}_total
2. {feature}_active
3. {feature}_inactive
4. {feature}_rate (%)

Row 2 (Performance):
5. {feature}_metric_1
6. {feature}_metric_2
7. {feature}_metric_3
8. {feature}_metric_4

Charts Required (3 total):
1. {Feature} Trends (last 7 days)
2. Status Breakdown (pie/donut chart)
3. {Custom} Trends (last 7 days)
```

#### 1.2 Define Table Columns

**Template**: Fill out this table with your 10-12 columns.

**⚠️ CRITICAL - UNIVERSAL COLUMN ORDER STANDARD**: ALL admin tables MUST follow this exact column order:

1. **Column 1: ID** (100px) - 8-char truncated UUID with # prefix
2. **Column 2: Date** (140px) - Primary date field (created_at, session_start_time, etc.)
3. **Column 3: Service** (200px) - Primary subject/identifier (varies by feature)
4. **Columns 4-N: Domain Data** - Feature-specific columns
5. **Last Column: Actions** (100px) - Three-dot menu with row actions

**This order is MANDATORY** for all admin features to ensure:
- Immediate context (ID + Date + Service always first three columns)
- Consistent mental model across all admin tables
- Faster scanning and task completion
- Better mobile UX (most important info first)
- Support-friendly (ID + Date + Service = complete reference)

```
| # | Column Name    | Width | Sortable | Description |
|---|----------------|-------|----------|-------------|
| 1 | id             | 100px | ✅       | 8-char truncated UUID with # prefix (e.g., #a1b2c3d4) |
| 2 | {date_field}   | 140px | ✅       | Primary date (created_at, session_start_time, reviewed_at, etc.) |
| 3 | {service}      | 200px | ✅       | Primary subject (title, service_name, listing_title, etc.) |
| 4 | {domain_col_1} | 150px | ...      | Feature-specific column |
| 5 | {domain_col_2} | 120px | ...      | Feature-specific column |
| ...| ...           | ...   | ...      | ... |
| N | actions        | 100px | —        | Three-dot menu with row actions |
```

**Column 1 (ID) Standard**:
- **Format**: Use `formatIdForDisplay(record.id)` from `@/lib/utils/formatId`
- **Display**: `#a1b2c3d4` (8 characters with # prefix)
- **Width**: `100px` (fixed across all admin tables)
- **Font**: Monospace (`SF Mono`, `Monaco`, `Consolas`)
- **Tooltip**: Full UUID shown on hover
- **Reference**: See [docs/admin/identifier-standard.md](./identifier-standard.md)

**Column 2 (Date) Standard**:
- **Field**: Primary date for the feature (created_at, session_start_time, reviewed_at, etc.)
- **Width**: `140px` (fixed across all admin tables)
- **Format**: `dd/mm/yyyy` or `dd MMM yyyy` for better readability
- **Sortable**: Yes (default sort: descending)

**Column 3 (Service) Standard**:
- **Field**: Primary subject/identifier (varies by feature)
  - Bookings: `service_name` (e.g., "Math Tutoring")
  - Listings: `title` (e.g., "Expert Math Tutor")
  - Reviews: `listing_title` or `service_name` (reviewed service)
  - Referrals: `referred_service` or `referred_user`
  - Organizations: `organization_name`
- **Width**: `200px` (fixed across all admin tables)
- **Format**: With image thumbnail (48x48px) if applicable
- **Sortable**: Yes

#### 1.3 Define Filters

**Toolbar Filters (4 total)**:
```
1. Status: All Statuses / {value1} / {value2} / {value3}
2. Category: All Categories / {value1} / {value2} / {value3}
3. {Filter3}: All {Filter3} / {value1} / {value2}
4. {Filter4}: All {Filter4} / {value1} / {value2}
```

**Advanced Filters (9+ total)**:
```
1. {Metric1} Range: Min/Max
2. {Metric2} Range: Min/Max
3. {Metric3} Range: Min/Max
4. {Metric4} Range: Min/Max
5. {Boolean1}: Checkbox
6. {Boolean2}: Checkbox
7. {Boolean3}: Checkbox
8. Created After: Date picker
9. Created Before: Date picker
```

#### 1.4 Define Bulk Actions

**Template**:
```
1. {Action1} - {SQL UPDATE operation}
2. {Action2} - {SQL UPDATE operation}
3. {Action3} - {SQL UPDATE operation}
4. Delete - {SQL DELETE operation}
```

#### 1.5 Define Modal Actions

**Template**:
```
1. {Primary Action} - {Conditional based on status}
2. {Secondary Action} - {Conditional based on flag}
3. Edit {Feature} - Navigate to edit page
4. Contact {User} - Navigate to messages
5. Change Status - Radix UI dropdown
6. Delete - Hard delete with confirmation
```

### Phase 2: File Structure (10 minutes)

#### 2.1 Create Directory Structure

```bash
mkdir -p apps/web/src/app/\(admin\)/admin/{feature}/components
touch apps/web/src/app/\(admin\)/admin/{feature}/page.tsx
touch apps/web/src/app/\(admin\)/admin/{feature}/page.module.css
touch apps/web/src/app/\(admin\)/admin/{feature}/components/{Feature}Table.tsx
touch apps/web/src/app/\(admin\)/admin/{feature}/components/{Feature}Table.module.css
touch apps/web/src/app/\(admin\)/admin/{feature}/components/Admin{Feature}DetailModal.tsx
touch apps/web/src/app/\(admin\)/admin/{feature}/components/Admin{Feature}DetailModal.module.css
touch apps/web/src/app/\(admin\)/admin/{feature}/components/AdvancedFiltersDrawer.tsx
touch apps/web/src/app/\(admin\)/admin/{feature}/components/AdvancedFiltersDrawer.module.css
```

Replace `{feature}` with your feature name (lowercase), `{Feature}` with PascalCase.

**Example**:
```bash
mkdir -p apps/web/src/app/\(admin\)/admin/reviews/components
touch apps/web/src/app/\(admin\)/admin/reviews/page.tsx
touch apps/web/src/app/\(admin\)/admin/reviews/page.module.css
touch apps/web/src/app/\(admin\)/admin/reviews/components/ReviewsTable.tsx
# ... etc
```

### Phase 3: Page Implementation (45 minutes)

#### 3.1 Copy Bookings Page Template

```bash
cp apps/web/src/app/\(admin\)/admin/bookings/page.tsx apps/web/src/app/\(admin\)/admin/{feature}/page.tsx
cp apps/web/src/app/\(admin\)/admin/bookings/page.module.css apps/web/src/app/\(admin\)/admin/{feature}/page.module.css
```

#### 3.2 Find & Replace

In `page.tsx`:
- `bookings` → `{feature}` (all lowercase)
- `Bookings` → `{Feature}` (PascalCase)
- `BOOKINGS` → `{FEATURE}` (UPPERCASE)

In `page.module.css`:
- `.bookingsHeader` → `.{feature}Header`
- `.bookingsTabs` → `.{feature}Tabs`

#### 3.3 Update Metrics (8 Total)

**Template**:

```typescript
// Row 1: {Feature} Counts
const total{Feature}Metric = useAdminMetric({ metric: '{feature}_total', compareWith: 'last_month' });
const active{Feature}Metric = useAdminMetric({ metric: '{feature}_active', compareWith: 'last_month' });
const inactive{Feature}Metric = useAdminMetric({ metric: '{feature}_inactive', compareWith: 'last_month' });
const {metric4}Metric = useAdminMetric({ metric: '{feature}_{metric4}', compareWith: 'last_month' });

// Row 2: {Feature} Performance
const {metric5}Metric = useAdminMetric({ metric: '{feature}_{metric5}', compareWith: 'last_month' });
const {metric6}Metric = useAdminMetric({ metric: '{feature}_{metric6}', compareWith: 'last_month' });
const {metric7}Metric = useAdminMetric({ metric: '{feature}_{metric7}', compareWith: 'last_month' });
const {metric8}Metric = useAdminMetric({ metric: '{feature}_{metric8}', compareWith: 'last_month' });
```

#### 3.4 Update KPI Cards

**Template**:

```typescript
<HubKPIGrid>
  <HubKPICard
    title="Total {Feature}"
    value={total{Feature}Metric.value}
    trend={total{Feature}Metric.trend}
    trendValue={total{Feature}Metric.trendValue}
    trendText={total{Feature}Metric.trendText}
    loading={total{Feature}Metric.loading}
    error={total{Feature}Metric.error}
  />
  {/* 7 more cards... */}
</HubKPIGrid>
```

#### 3.5 Update Charts

**Template**:

```typescript
<div className={styles.chartsSection}>
  <ErrorBoundary fallback={<ChartError />}>
    <HubTrendChart
      title="{Feature} Trends"
      data={{feature}TrendsData}
      loading={{feature}TrendsLoading}
      emptyMessage="No {feature} data available"
    />
  </ErrorBoundary>

  <ErrorBoundary fallback={<ChartError />}>
    <HubCategoryBreakdownChart
      title="Status Breakdown"
      data={{feature}StatusData}
      loading={{feature}StatusLoading}
    />
  </ErrorBoundary>

  <ErrorBoundary fallback={<ChartError />}>
    <HubTrendChart
      title="{Custom Metric} Trends"
      data={{custom}TrendsData}
      loading={{custom}TrendsLoading}
      valueFormatter={(value) => `{format}`}
    />
  </ErrorBoundary>
</div>
```

#### 3.6 Update Tab Configuration

**Template**:

```typescript
<HubTabs
  tabs={[
    {
      id: 'overview',
      label: 'Overview',
      active: activeTab === 'overview',
    },
    {
      id: 'all-{feature}',
      label: 'All {Feature}',
      count: total{Feature}Metric.value,
      active: activeTab === 'all-{feature}',
    },
  ]}
  onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-{feature}')}
/>
```

#### 3.7 Update Content Rendering

**Template**:

```typescript
{activeTab === 'overview' ? (
  <>
    {/* KPI Cards */}
    <HubKPIGrid>
      {/* 8 cards */}
    </HubKPIGrid>

    {/* Charts */}
    <div className={styles.chartsSection}>
      {/* 3 charts */}
    </div>
  </>
) : (
  <{Feature}Table />
)}
```

### Phase 4: Table Implementation (2-3 hours)

#### 4.1 Copy Bookings Table Template

```bash
cp apps/web/src/app/\(admin\)/admin/bookings/components/BookingsTable.tsx apps/web/src/app/\(admin\)/admin/{feature}/components/{Feature}Table.tsx
```

#### 4.2 Find & Replace

- `Booking` → `{Feature}` (PascalCase)
- `booking` → `{feature}` (lowercase)
- `bookings` → `{feature}s` (plural)

#### 4.3 Update Imports

```typescript
import { {Feature} } from '@/types';
import Admin{Feature}DetailModal from './Admin{Feature}DetailModal';
import AdvancedFiltersDrawer, { AdvancedFilters } from './AdvancedFiltersDrawer';
```

#### 4.4 Update State

**Template**:

```typescript
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(20);
const [sortKey, setSortKey] = useState<string>('created_at');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [{filter2}Filter, set{Filter2}Filter] = useState('');
const [{filter3}Filter, set{Filter3}Filter] = useState('');
const [{filter4}Filter, set{Filter4}Filter] = useState('');
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
  // ... (see AdvancedFilters interface)
});

const [selected{Feature}, setSelected{Feature}] = useState<{Feature} | null>(null);
const [isModalOpen, setIsModalOpen] = useState(false);
```

#### 4.5 Update Query

**Template**:

```typescript
const { data: {feature}Data, isLoading, error, refetch } = useQuery({
  queryKey: [
    'admin-{feature}',
    page,
    limit,
    sortKey,
    sortDirection,
    searchQuery,
    statusFilter,
    {filter2}Filter,
    {filter3}Filter,
    {filter4}Filter,
    advancedFilters,
  ],
  queryFn: async () => {
    let query = supabase
      .from('{feature}')
      .select(`
        *,
        {foreign_key}:{foreign_table}!{foreign_key}_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `, { count: 'exact' });

    // Apply search filter
    if (searchQuery) {
      query = query.or(`{field1}.ilike.%${searchQuery}%,{field2}.ilike.%${searchQuery}%`);
    }

    // Apply toolbar filters
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if ({filter2}Filter) {
      query = query.eq('{filter2_column}', {filter2}Filter);
    }
    if ({filter3}Filter) {
      query = query.eq('{filter3_column}', {filter3}Filter);
    }
    if ({filter4}Filter) {
      query = query.eq('{filter4_column}', {filter4}Filter);
    }

    // Apply advanced filters
    // ... (see AdvancedFilters implementation)

    // Apply sorting
    query = query.order(sortKey, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data (flatten foreign key arrays)
    const {feature} = (data || []).map((item: any) => ({
      ...item,
      {foreign_key}: Array.isArray(item.{foreign_key}) ? item.{foreign_key}[0] : item.{foreign_key},
    })) as {Feature}[];

    return {
      {feature}: {feature},
      total: count || 0,
    };
  },
  staleTime: 60 * 1000,
  retry: 2,
});
```

#### 4.6 Define Columns

**Template**: Use this structure for each column.

**⚠️ CRITICAL - UNIVERSAL COLUMN ORDER**: Follow the mandatory order: ID → Date → Service → Domain → Actions

**⚠️ CRITICAL**: Import `formatIdForDisplay` at the top of your file:
```typescript
import { formatIdForDisplay } from '@/lib/utils/formatId';
```

```typescript
const columns: Column<{Feature}>[] = [
  // Column 1: ID (MUST be first column, 100px width, monospace font)
  {
    key: 'id',
    label: 'ID',
    width: '100px',
    sortable: true,
    render: ({feature}) => (
      <div className={styles.idCell}>
        <span
          className={styles.idText}
          title={{feature}.id}
        >
          {formatIdForDisplay({feature}.id)}
        </span>
      </div>
    ),
  },

  // Column 2: Date (MUST be second column, 140px width)
  {
    key: '{date_field}',  // e.g., 'created_at', 'session_start_time', 'reviewed_at'
    label: '{Date Label}',  // e.g., 'Created', 'Session Date', 'Reviewed'
    width: '140px',
    sortable: true,
    render: ({feature}) => (
      <span className={styles.dateCell}>
        {new Date({feature}.{date_field}).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },

  // Column 3: Service (MUST be third column, 200px width, with image if applicable)
  {
    key: '{service_field}',  // e.g., 'title', 'service_name', 'listing_title'
    label: '{Service Label}',  // e.g., 'Service', 'Title', 'Listing'
    width: '200px',
    sortable: true,
    render: ({feature}) => (
      <div className={styles.serviceCell}>
        {{feature}.{image_field} && (
          <img
            src={{feature}.{image_field}}
            alt={{feature}.{service_field}}
            className={styles.serviceImage}
          />
        )}
        <div className={styles.serviceInfo}>
          <div className={styles.serviceTitle}>{feature}.{service_field}</div>
          {{feature}.{subtitle_field} && (
            <div className={styles.serviceSubtitle}>{feature}.{subtitle_field}</div>
          )}
        </div>
      </div>
    ),
  },

  // Columns 4-N: Domain-specific columns (customize for your feature)
  {
    key: '{domain_field_1}',
    label: '{Label 1}',
    width: '150px',
    sortable: true,
    render: ({feature}) => (
      // Custom rendering for domain field
    ),
  },
  {
    key: '{domain_field_2}',
    label: '{Label 2}',
    width: '120px',
    render: ({feature}) => (
      // Custom rendering for domain field
    ),
  },
  // ... more domain columns (typically 5-8 total)

  // Last Column: Actions (MUST be last column, 100px width, three-dot menu)
  {
    key: 'actions',
    label: 'Actions',
    width: '100px',
    render: ({feature}) => (
      <div className={styles.actionsCell}>
        <button className={styles.actionsButton} onClick={(e) => { /* ... */ }}>
          <MoreVertical size={16} />
        </button>
        {/* Dropdown menu */}
      </div>
    ),
  },
];
```

**Column Order Examples by Feature**:

**Bookings** (12 columns):
1. ID → 2. Date (session_start_time) → 3. Service (service_name) → 4. Client → 5. Agent → 6. Tutor → 7. Amount → 8. Duration → 9. Status → 10. Payment → 11. Type → 12. Actions

**Listings** (10 columns):
1. ID → 2. Created → 3. Title → 4. Tutor → 5. Subjects → 6. Status → 7. Views → 8. Bookings → 9. Price → 10. Actions

**Reviews** (example - 11 columns):
1. ID → 2. Reviewed (reviewed_at) → 3. Service (listing_title) → 4. Reviewer → 5. Tutor → 6. Rating → 7. Sentiment → 8. Status → 9. Helpful → 10. Verified → 11. Actions

**Organizations** (example - 10 columns):
1. ID → 2. Created → 3. Organization Name → 4. Admin → 5. Members → 6. Listings → 7. Status → 8. Plan → 9. Verified → 10. Actions

#### 4.7 Define Filters

**Template**:

```typescript
const filters: Filter[] = [
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { label: '{Status1}', value: '{status1}' },
      { label: '{Status2}', value: '{status2}' },
      { label: '{Status3}', value: '{status3}' },
    ],
  },
  {
    key: '{filter2}',
    label: 'All {Filter2}',
    options: [
      { label: '{Value1}', value: '{value1}' },
      { label: '{Value2}', value: '{value2}' },
      { label: '{Value3}', value: '{value3}' },
    ],
  },
  {
    key: '{filter3}',
    label: 'All {Filter3}',
    options: [
      { label: '{Value1}', value: '{value1}' },
      { label: '{Value2}', value: '{value2}' },
    ],
  },
  {
    key: '{filter4}',
    label: 'All {Filter4}',
    options: [
      { label: '{Value1}', value: '{value1}' },
      { label: '{Value2}', value: '{value2}' },
    ],
  },
];
```

#### 4.8 Define Bulk Actions

**Template**:

```typescript
const bulkActions: BulkAction[] = [
  {
    label: '{Action1}',
    value: '{action1}',
    onClick: async (selectedIds) => {
      if (!confirm(`{Action1} ${selectedIds.length} {feature}?`)) return;
      await supabase.from('{feature}').update({ {field}: {value} }).in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'primary',
  },
  {
    label: '{Action2}',
    value: '{action2}',
    onClick: async (selectedIds) => {
      if (!confirm(`{Action2} ${selectedIds.length} {feature}?`)) return;
      await supabase.from('{feature}').update({ {field}: {value} }).in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'secondary',
  },
  {
    label: 'Delete',
    value: 'delete',
    onClick: async (selectedIds) => {
      if (!confirm(`DELETE ${selectedIds.length} {feature}? This cannot be undone.`)) return;
      await supabase.from('{feature}').delete().in('id', selectedIds);
      setSelectedRows(new Set());
      refetch();
    },
    variant: 'danger',
  },
];
```

#### 4.9 Integrate HubDataTable

**Template**:

```typescript
<HubDataTable
  columns={columns}
  data={{feature}Data?.{feature} || []}
  loading={isLoading}
  error={error ? 'Failed to load {feature}. Please try again.' : undefined}
  selectable={true}
  selectedRows={selectedRows}
  onSelectionChange={setSelectedRows}
  getRowId={({feature}) => {feature}.id}
  onRowClick={handleRowClick}
  onSort={handleSort}
  onSearch={handleSearch}
  onFilterChange={handleFilterChange}
  onExport={handleExport}
  onRefresh={() => refetch()}
  pagination={pagination}
  filters={filters}
  bulkActions={bulkActions}
  autoRefreshInterval={30000}
  enableSavedViews={true}
  savedViewsKey="admin_{feature}_savedViews"
  searchPlaceholder="Search by {field1}, {field2}..."
  emptyMessage="No {feature} found"
  mobileCard={renderMobileCard}
  toolbarActions={
    <button
      className={`${styles.filtersButton} ${hasActiveFilters ? styles.active : ''}`}
      onClick={() => setIsDrawerOpen(true)}
      title={hasActiveFilters ? `${activeFilterCount} filter(s) active` : 'Filters'}
    >
      <FilterIcon size={16} />
      {hasActiveFilters && (
        <span className={styles.filtersBadge}>{activeFilterCount}</span>
      )}
    </button>
  }
  className={styles.{feature}Table}
/>
```

### Phase 5: Detail Modal Implementation (1 hour)

#### 5.1 Copy Bookings Modal Template

```bash
cp apps/web/src/app/\(admin\)/admin/bookings/components/AdminBookingDetailModal.tsx apps/web/src/app/\(admin\)/admin/{feature}/components/Admin{Feature}DetailModal.tsx
cp apps/web/src/app/\(admin\)/admin/bookings/components/AdminBookingDetailModal.module.css apps/web/src/app/\(admin\)/admin/{feature}/components/Admin{Feature}DetailModal.module.css
```

#### 5.2 Find & Replace

- `Booking` → `{Feature}`
- `booking` → `{feature}`

#### 5.3 Update Props

```typescript
interface Admin{Feature}DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  {feature}: {Feature} | null;
  on{Feature}Updated?: () => void;
}
```

#### 5.4 Define Sections (6 Total)

**Template**:

```typescript
const sections: DetailSection[] = [
  {
    title: '{Section1 Title}',
    fields: [
      { label: '{Field1}', value: {feature}.{field1} },
      { label: '{Field2}', value: {feature}.{field2} },
      // ... (5-10 fields per section)
    ],
  },
  {
    title: '{Section2 Title}',
    fields: [
      { label: '{Field1}', value: {feature}.{field1} },
      // ...
    ],
  },
  // ... (6 sections total)
  {
    title: 'System Information',
    fields: [
      { label: '{Feature} ID', value: {feature}.id },
      { label: 'Created At', value: formatDateTime({feature}.created_at) },
      { label: 'Updated At', value: {feature}.updated_at ? formatDateTime({feature}.updated_at) : 'N/A' },
    ],
  },
];
```

#### 5.5 Define Actions (7 Total)

**Template**:

```typescript
actions={
  <div className={styles.actionsWrapper}>
    {/* 1. Primary Action (conditional) */}
    {{feature}.status === '{status1}' ? (
      <Button variant="primary" onClick={handle{Action1}} disabled={isProcessing}>
        <{Icon1} className={styles.buttonIcon} />
        {Action1}
      </Button>
    ) : (
      <Button variant="secondary" onClick={handle{Action2}} disabled={isProcessing}>
        <{Icon2} className={styles.buttonIcon} />
        {Action2}
      </Button>
    )}

    {/* 2. Secondary Action (conditional) */}
    {{feature}.{flag} ? (
      <Button variant="secondary" onClick={handle{Action3}} disabled={isProcessing}>
        <{Icon3} className={styles.buttonIcon} />
        {Action3}
      </Button>
    ) : (
      <Button variant="secondary" onClick={handle{Action4}} disabled={isProcessing}>
        <{Icon4} className={styles.buttonIcon} />
        {Action4}
      </Button>
    )}

    {/* 3. Edit Action */}
    <Button variant="secondary" onClick={handleEdit{Feature}}>
      <Edit className={styles.buttonIcon} />
      Edit {Feature}
    </Button>

    {/* 4. Contact Action */}
    <Button variant="secondary" onClick={handleContact{User}}>
      <MessageSquare className={styles.buttonIcon} />
      Contact {User}
    </Button>

    {/* 5. Change Status Dropdown (Radix UI) */}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" disabled={isProcessing}>
          <Settings className={styles.buttonIcon} />
          Change Status
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.statusDropdownContent} sideOffset={5} align="start">
          {['{status1}', '{status2}', '{status3}'].map((status) => (
            <DropdownMenu.Item
              key={status}
              className={styles.statusDropdownItem}
              disabled={{feature}.status === status || isProcessing}
              onSelect={() => handleChangeStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {{feature}.status === status && (
                <span className={styles.currentStatusBadge}>(Current)</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    {/* 6. Delete Action */}
    <Button variant="danger" onClick={handleDelete} disabled={isProcessing}>
      <Trash2 className={styles.buttonIcon} />
      Delete
    </Button>
  </div>
}
```

#### 5.6 Implement Action Handlers - CRITICAL ROUTE VERIFICATION

**BEFORE implementing ANY navigation action, you MUST verify the route exists in the codebase.**

**Template for Edit Action Handler**:

```typescript
// ⚠️ STEP 1: Search for the actual edit route FIRST
// Use Glob: **/edit-{feature}/[id]/page.tsx
// OR: **/{feature}/[id]/edit/page.tsx

// ⚠️ STEP 2: Read the route file to confirm it exists
// Read: /path/to/app/edit-{feature}/[id]/page.tsx

// ⚠️ STEP 3: Implement handler with VERIFIED route
const handleEdit{Feature} = () => {
  if (!{feature}) return;
  // ✅ Use the VERIFIED route from Step 1 & 2
  window.location.href = `/edit-{feature}/${{feature}.id}`;
  // ❌ DO NOT assume: `/tutor/{feature}/${{feature}.id}/edit`
  // ❌ DO NOT assume: `/{feature}/${{feature}.id}/edit`
};
```

**Template for Contact Action Handler**:

```typescript
// ⚠️ STEP 1: Search for messaging/contact routes
// Use Grep: "messages.*page.tsx" or "chat.*page.tsx"

// ⚠️ STEP 2: Verify query parameter format
// Read the route file to check if it uses userId, to, recipientId, etc.

// ⚠️ STEP 3: Implement with verified route
const handleContact{User} = () => {
  if (!{feature} || !{feature}.{user_id}) return;
  // ✅ Verified route pattern for this codebase
  window.location.href = `/messages?userId=${{feature}.{user_id}}`;
  // ❌ DO NOT assume: `/chat/${{feature}.{user_id}}`
  // ❌ DO NOT assume: `/inbox?to=${{feature}.{user_id}}`
};
```

**Template for View Details/Profile Action**:

```typescript
// ⚠️ STEP 1: Search for profile/user detail routes
// Use Glob: **/tutors/[id]/page.tsx or **/profile/[id]/page.tsx

// ⚠️ STEP 2: Verify route structure and parameter (id vs slug)

// ⚠️ STEP 3: Implement with verified route
const handleView{User}Profile = () => {
  if (!{feature} || !{feature}.{user_id}) return;
  // ✅ Verified route
  window.location.href = `/tutors/${{feature}.{user_id}}`;
  // Check if using slug instead: `/tutors/${{feature}.{user_slug}}`
};
```

**Template for Other Action Handlers**:

```typescript
const handle{Action1} = async () => {
  if (!{feature} || isProcessing) return;
  setIsProcessing(true);

  try {
    const { error } = await supabase
      .from('{features}')
      .update({ {field}: {value} })
      .eq('id', {feature}.id);

    if (error) throw error;

    toast.success('{Feature} {action1} successfully');
    on{Feature}Updated?.();
    onClose();
  } catch (error) {
    console.error('Failed to {action1} {feature}:', error);
    toast.error('Failed to {action1} {feature}');
  } finally {
    setIsProcessing(false);
  }
};

const handleDelete = async () => {
  if (!{feature} || isProcessing) return;

  if (!confirm('Delete this {feature}? This action cannot be undone.')) {
    return;
  }

  setIsProcessing(true);

  try {
    const { error } = await supabase
      .from('{features}')
      .delete()
      .eq('id', {feature}.id);

    if (error) throw error;

    toast.success('{Feature} deleted successfully');
    on{Feature}Updated?.();
    onClose();
  } catch (error) {
    console.error('Failed to delete {feature}:', error);
    toast.error('Failed to delete {feature}');
  } finally {
    setIsProcessing(false);
  }
};

const handleChangeStatus = async (newStatus: string) => {
  if (!{feature} || isProcessing) return;
  setIsProcessing(true);

  try {
    const { error } = await supabase
      .from('{features}')
      .update({ status: newStatus })
      .eq('id', {feature}.id);

    if (error) throw error;

    toast.success(`Status changed to ${newStatus}`);
    on{Feature}Updated?.();
  } catch (error) {
    console.error('Failed to change status:', error);
    toast.error('Failed to change status');
  } finally {
    setIsProcessing(false);
  }
};
```

**CRITICAL CHECKLIST for Action Handlers**:

Before implementing handlers:
- [ ] Search codebase for edit route using Glob/Grep
- [ ] Read route file to confirm structure
- [ ] Verify parameter format (id vs slug, uuid vs string)
- [ ] Search for messages/contact routes
- [ ] Verify query parameter names (userId, to, etc.)
- [ ] Test all navigation in development

**Never assume route patterns - ALWAYS verify first!**

### Phase 6: Advanced Filters Drawer (1 hour)

#### 6.1 Copy Bookings Drawer Template

```bash
cp apps/web/src/app/\(admin\)/admin/bookings/components/AdvancedFiltersDrawer.tsx apps/web/src/app/\(admin\)/admin/{feature}/components/AdvancedFiltersDrawer.tsx
cp apps/web/src/app/\(admin\)/admin/bookings/components/AdvancedFiltersDrawer.module.css apps/web/src/app/\(admin\)/admin/{feature}/components/AdvancedFiltersDrawer.module.css
```

#### 6.2 Update Interface

**Template**:

```typescript
export interface AdvancedFilters {
  // Numeric ranges
  min{Metric1}?: number;
  max{Metric1}?: number;
  min{Metric2}?: number;
  max{Metric2}?: number;
  min{Metric3}?: number;
  max{Metric3}?: number;
  min{Metric4}?: number;
  max{Metric4}?: number;

  // Boolean flags
  {flag1}: boolean;
  {flag2}: boolean;
  {flag3}: boolean;

  // Date ranges
  createdAfter: string;
  createdBefore: string;
}
```

#### 6.3 Update Drawer Sections

**Template**:

```typescript
<div className={styles.content}>
  {/* Section 1: Metrics */}
  <div className={styles.filterSection}>
    <h3 className={styles.sectionTitle}>{Section1 Title}</h3>

    {/* Metric1 Range */}
    <div className={styles.filterRow}>
      <label className={styles.filterLabel}>{Metric1}</label>
      <div className={styles.rangeInputs}>
        <input type="number" placeholder="Min" value={localFilters.min{Metric1} || ''} onChange={...} className={styles.filterInput} />
        <span className={styles.rangeSeparator}>to</span>
        <input type="number" placeholder="Max" value={localFilters.max{Metric1} || ''} onChange={...} className={styles.filterInput} />
      </div>
    </div>

    {/* Metric2-4 Ranges (same pattern) */}
  </div>

  {/* Section 2: Boolean Flags */}
  <div className={styles.filterSection}>
    <h3 className={styles.sectionTitle}>{Section2 Title}</h3>

    <div className={styles.checkboxRow}>
      <input type="checkbox" id="{flag1}" checked={localFilters.{flag1}} onChange={...} className={styles.checkbox} />
      <label htmlFor="{flag1}" className={styles.checkboxLabel}>{Flag1 Label}</label>
    </div>

    {/* Flag2-3 (same pattern) */}
  </div>

  {/* Section 3: Date Range */}
  <div className={styles.filterSection}>
    <h3 className={styles.sectionTitle}>Date Range</h3>

    <div className={styles.filterRow}>
      <label className={styles.filterLabel}>Created After</label>
      <input type="date" value={localFilters.createdAfter} onChange={...} className={styles.filterInput} />
    </div>

    <div className={styles.filterRow}>
      <label className={styles.filterLabel}>Created Before</label>
      <input type="date" value={localFilters.createdBefore} onChange={...} className={styles.filterInput} />
    </div>
  </div>
</div>
```

### Phase 7: CSS Modules (1-2 hours)

#### 7.1 Table Styles

Create `{Feature}Table.module.css` with these sections:

**Template**:

```css
/* ID Cell - Universal Standard (DO NOT MODIFY) */
.idCell {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.idText {
  cursor: default;
  user-select: text;
}

/* Title Cell */
.titleCell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.{feature}Image {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
  object-fit: cover;
}

/* Status Badge - RECTANGULAR (8px border-radius) */
.statusBadge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;  /* ✅ 8px, NOT 9999px */
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status{Status1} {
  background: #{color1};
  color: #{color2};
}

.status{Status2} {
  background: #{color3};
  color: #{color4};
}

/* Numeric Cells */
.numericCell {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  color: #1f2937;
}

/* Advanced Filters Button */
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

/* Mobile Cards */
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
```

#### 7.2 Modal Styles

Copy exactly from [apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.module.css:82](apps/web/src/app/(admin)/admin/bookings/components/AdminBookingDetailModal.module.css#L1-L82)

**No changes needed** - this CSS is domain-agnostic.

#### 7.3 Drawer Styles

Copy from bookings AdvancedFiltersDrawer.module.css

**No changes needed** - this CSS is domain-agnostic.

### Phase 8: Testing (1-2 hours)

Use the complete testing checklist from [Bookings Implementation Reference](./bookings-implementation.md#testing-and-validation).

---

## Code Templates

### Complete Page Template

```typescript
'use client';

import React, { useState } from 'react';
import { HubPageLayout } from '@/app/components/hub/layout';
import { HubHeader, HubTabs, HubSidebar, HubKPIGrid, HubKPICard } from '@/app/components/hub';
import { HubTrendChart, HubCategoryBreakdownChart } from '@/app/components/hub/charts';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin';
import { useAdminMetric } from '@/hooks/useAdminMetric';
import {Feature}Table from './components/{Feature}Table';
import styles from './page.module.css';

export default function {Feature}Page() {
  const [activeTab, setActiveTab] = useState<'overview' | 'all-{feature}'>('overview');

  // Row 1: {Feature} Counts
  const total{Feature}Metric = useAdminMetric({ metric: '{feature}_total', compareWith: 'last_month' });
  const active{Feature}Metric = useAdminMetric({ metric: '{feature}_active', compareWith: 'last_month' });
  const inactive{Feature}Metric = useAdminMetric({ metric: '{feature}_inactive', compareWith: 'last_month' });
  const {metric4}Metric = useAdminMetric({ metric: '{feature}_{metric4}', compareWith: 'last_month' });

  // Row 2: {Feature} Performance
  const {metric5}Metric = useAdminMetric({ metric: '{feature}_{metric5}', compareWith: 'last_month' });
  const {metric6}Metric = useAdminMetric({ metric: '{feature}_{metric6}', compareWith: 'last_month' });
  const {metric7}Metric = useAdminMetric({ metric: '{feature}_{metric7}', compareWith: 'last_month' });
  const {metric8}Metric = useAdminMetric({ metric: '{feature}_{metric8}', compareWith: 'last_month' });

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="{Feature}"
          subtitle="Manage all platform {feature}"
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
            { id: 'all-{feature}', label: 'All {Feature}', count: total{Feature}Metric.value, active: activeTab === 'all-{feature}' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'all-{feature}')}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget />
          <AdminHelpWidget />
          <AdminTipWidget />
        </HubSidebar>
      }
    >
      {activeTab === 'overview' ? (
        <>
          {/* KPI Cards Row 1 */}
          <HubKPIGrid>
            <HubKPICard title="Total {Feature}" {...total{Feature}Metric} />
            <HubKPICard title="Active {Feature}" {...active{Feature}Metric} />
            <HubKPICard title="Inactive {Feature}" {...inactive{Feature}Metric} />
            <HubKPICard title="{Metric4}" {...{metric4}Metric} />
          </HubKPIGrid>

          {/* KPI Cards Row 2 */}
          <HubKPIGrid>
            <HubKPICard title="{Metric5}" {...{metric5}Metric} />
            <HubKPICard title="{Metric6}" {...{metric6}Metric} />
            <HubKPICard title="{Metric7}" {...{metric7}Metric} />
            <HubKPICard title="{Metric8}" {...{metric8}Metric} />
          </HubKPIGrid>

          {/* Charts */}
          <div className={styles.chartsSection}>
            <ErrorBoundary fallback={<div>Chart error</div>}>
              <HubTrendChart title="{Feature} Trends" data={{feature}TrendsData} loading={false} />
            </ErrorBoundary>
            <ErrorBoundary fallback={<div>Chart error</div>}>
              <HubCategoryBreakdownChart title="Status Breakdown" data={{feature}StatusData} loading={false} />
            </ErrorBoundary>
            <ErrorBoundary fallback={<div>Chart error</div>}>
              <HubTrendChart title="{Custom} Trends" data={{custom}TrendsData} loading={false} />
            </ErrorBoundary>
          </div>
        </>
      ) : (
        <{Feature}Table />
      )}
    </HubPageLayout>
  );
}
```

---

## Validation Checklist

Before considering your implementation complete, verify:

### Architecture Alignment

- [ ] File structure matches bookings exactly (8 files)
- [ ] Component hierarchy: HubPageLayout → HubDataTable → HubDetailModal
- [ ] Page has 2 tabs (Overview, All {Feature})
- [ ] Overview tab has 8 KPI cards + 3 charts
- [ ] All {Feature} tab has table component

### Table Implementation

- [ ] Table has 10+ columns
- [ ] Search bar functional (filters by relevant text fields)
- [ ] 4 toolbar filters (all default to "All")
- [ ] Advanced Filters button is icon-only with badge count
- [ ] Bulk actions (3-4 actions) functional with confirmation dialogs
- [ ] Auto-refresh toggle works (30s interval)
- [ ] Saved views save/load/delete correctly
- [ ] CSV export downloads correct data
- [ ] Manual refresh button shows spinning animation
- [ ] Row click opens detail modal
- [ ] Keyboard shortcuts work (⌘K search, ⌘R refresh, Esc clear)

### Detail Modal

- [ ] Modal has 6 sections
- [ ] All fields display correctly
- [ ] 5-7 action buttons functional
- [ ] Change Status uses Radix UI dropdown
- [ ] Actions show confirmation dialogs for destructive operations
- [ ] Modal closes on Escape key
- [ ] Actions call on{Feature}Updated callback after success

### Advanced Filters

- [ ] Drawer slides in from right
- [ ] 9+ filter types implemented
- [ ] Apply Filters button applies all filters
- [ ] Reset Filters button clears all filters
- [ ] Filter count badge shows on toolbar button
- [ ] Drawer closes on overlay click

### Responsive Design

- [ ] Desktop (1024px+): Full table, 1-column charts
- [ ] Tablet (768-1023px): Full table, 2-column charts
- [ ] Mobile (<768px): Card layout, 1-column charts, 2-column modal actions

### CSS Compliance

- [ ] Status badges rectangular (8px border-radius), NOT pill-shaped
- [ ] Advanced Filters button icon-only with badge
- [ ] Mobile cards clickable with hover effect
- [ ] Modal actions 2 per row on mobile
- [ ] All class names follow naming conventions

### TypeScript

- [ ] All types imported from `@/types`
- [ ] No `any` types used
- [ ] Column definitions use `Column<{Feature}>` type
- [ ] Query response typed correctly

### Performance

- [ ] Initial page load <2s
- [ ] Table fetch <1s
- [ ] React Query caching working (60s staleTime)
- [ ] Auto-refresh no UI jank

---

## Common Pitfalls

### Pitfall 1: Forgetting to Flatten Foreign Key Arrays

**Problem**: Supabase foreign key joins return arrays even for single relationships.

**Solution**:
```typescript
const {feature} = (data || []).map((item: any) => ({
  ...item,
  {foreign_key}: Array.isArray(item.{foreign_key}) ? item.{foreign_key}[0] : item.{foreign_key},
}));
```

### Pitfall 2: Incorrect queryKey Dependencies

**Problem**: React Query doesn't re-fetch when filters change.

**Solution**: Include ALL state variables that affect the query in `queryKey`:
```typescript
queryKey: [
  'admin-{feature}',
  page,
  limit,
  sortKey,
  sortDirection,
  searchQuery,
  statusFilter,
  // ... ALL filter state variables
  advancedFilters,  // ✅ Include advanced filters object
]
```

### Pitfall 3: Status Badge Pill-Shaped

**Problem**: Using `border-radius: 9999px` instead of `0.5rem`.

**Solution**:
```css
.statusBadge {
  border-radius: 0.5rem;  /* ✅ 8px rectangular, NOT 9999px */
}
```

### Pitfall 4: Advanced Filters Button Shows Text

**Problem**: Button shows "Advanced Filters" text instead of icon-only.

**Solution**:
```typescript
<button className={styles.filtersButton}>
  <FilterIcon size={16} />  {/* ✅ Icon only, no text */}
</button>
```

### Pitfall 5: Default Filter Values Not "All"

**Problem**: Filter labels show placeholder text like "Select status".

**Solution**:
```typescript
{ key: 'status', label: 'All Statuses', options: [...] }  // ✅ "All Statuses"
```

### Pitfall 6: Missing Actions Column

**Problem**: Forgetting to add three-dot menu Actions column.

**Solution**: Add Actions column as last column:
```typescript
{
  key: 'actions',
  label: 'Actions',
  width: '100px',
  render: ({feature}) => (/* three-dot menu */)
}
```

### Pitfall 7: Modal Actions Single Column on Mobile

**Problem**: Modal actions stack vertically on mobile.

**Solution**: Use `actionsWrapper` CSS:
```css
@media (max-width: 767px) {
  .actionsWrapper > * {
    flex: 1 1 calc(50% - 0.5rem);  /* ✅ 2 per row */
  }
}
```

### Pitfall 8: Hardcoded Pagination Limit

**Problem**: Not allowing user to change page size.

**Solution**:
```typescript
pagination={{
  page,
  limit,
  total: {feature}Data?.total || 0,
  onPageChange: setPage,
  onLimitChange: (newLimit) => {  // ✅ Provide onLimitChange
    setLimit(newLimit);
    setPage(1);
  },
  pageSizeOptions: [10, 20, 50, 100],
}}
```

### Pitfall 9: Using Incorrect Routes Without Verification

**Problem**: Implementing navigation routes based on assumptions instead of verifying the actual route structure in the codebase.

**Example of WRONG approach**:
```typescript
// ❌ BAD: Assuming route structure without checking
window.location.href = `/tutor/listings/${listing.id}/edit`;  // Results in 404 error
```

**Solution - ALWAYS verify routes before implementation**:

**Step 1: Search for existing edit pages**:
```bash
# Use Glob to find the actual route structure
glob pattern: **/edit-{feature}/[id]/page.tsx
# OR
glob pattern: **/{feature}/[id]/edit/page.tsx
```

**Step 2: Read the actual route file**:
```bash
# Use Read to verify the route exists
read: /Users/.../app/edit-{feature}/[id]/page.tsx
```

**Step 3: Use the correct verified route**:
```typescript
// ✅ GOOD: Use the verified route structure
window.location.href = `/edit-listing/${listing.id}`;  // Verified to exist
```

**CRITICAL VERIFICATION CHECKLIST** for all navigation actions:

Before implementing ANY navigation (Edit, View, Contact, etc.):
- [ ] **Search codebase** for existing route using Glob/Grep
- [ ] **Read the route file** to confirm it exists and matches expected structure
- [ ] **Verify route parameters** match the data you have (e.g., `listing.id` vs `listing.slug`)
- [ ] **Test the navigation** in development before committing

**Common route patterns to check**:
```typescript
// Edit routes - CHECK WHICH ONE EXISTS:
/edit-{feature}/{id}           // ✅ Most common in this codebase
/{feature}/{id}/edit           // ❌ Less common
/admin/{feature}/{id}/edit     // ❌ Rare
/tutor/{feature}/{id}/edit     // ❌ Assumed (wrong)

// View routes - CHECK WHICH ONE EXISTS:
/{feature}/{id}                // ✅ Most common
/{feature}/view/{id}           // ❌ Less common
/{feature}/details/{id}        // ❌ Rare

// Contact/Message routes - CHECK WHICH ONE EXISTS:
/messages?userId={id}          // ✅ Common pattern
/chat/{id}                     // ❌ Alternative
/inbox?to={id}                 // ❌ Alternative
```

**Grep command to find all edit routes**:
```bash
grep -r "edit.*{feature}" apps/web/src/app --include="page.tsx"
```

**Never assume route structures - always verify first!**

---

## Summary

This template provides **everything you need** to implement a new admin feature page that is 100% aligned with the Hub Architecture Standards.

**Follow these steps religiously**:
1. Complete planning phase (define domain model, columns, filters, actions)
2. Copy file structure from bookings
3. Find & replace (bookings → {feature})
4. Update domain-specific content (metrics, columns, filters, actions, sections)
5. **⚠️ CRITICAL: Verify ALL route paths before implementation** (see Pitfall 9)
6. Implement action handlers with verified routes
7. Copy CSS modules (minimal changes needed)
8. Test against validation checklist

**CRITICAL REQUIREMENTS**:
- ❌ **NEVER assume route structures** - Always search and verify first
- ✅ **Use Glob/Grep** to find actual route files before implementing navigation
- ✅ **Read route files** to confirm structure and parameters
- ✅ **Test all navigation** in development before committing

**Time estimate**: 4-6 hours for experienced developers who follow this template.

**Result**: A production-ready admin feature page with Phase 1 & 2 features, complete responsive design, full alignment with the Hub Architecture Standards, and **verified navigation routes**.

---

**End of Feature Page Implementation Template Document**

**Related Documents**:
- [Hub Architecture Standards](./hub-architecture-standards.md) - Foundation
- [Bookings Implementation Reference](./bookings-implementation.md) - Gold Standard
- [Listings Implementation Guide](./listings-implementation.md) - Application Example
