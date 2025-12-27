# Hub Architecture UI Standards

**Purpose**: Canonical reference for all UI dimensions, spacing, and styling standards in the Hub architecture to ensure consistency across admin and user-facing pages.

**Last Updated**: 2025-12-27
**Version**: 1.0
**Status**: Official Standard

---

## Table of Contents

1. [Toolbar Standards](#toolbar-standards)
2. [Icon Button Dimensions](#icon-button-dimensions)
3. [Filter Patterns](#filter-patterns)
4. [Badge Standards](#badge-standards)
5. [Data Table Standards](#data-table-standards)
6. [Chart Standards](#chart-standards)
7. [Modal Standards](#modal-standards)
8. [Responsive Breakpoints](#responsive-breakpoints)

---

## Toolbar Standards

### Canonical Source of Truth

**File**: `apps/web/src/app/components/hub/data/HubDataTable.module.css`

All toolbar UI elements must follow the `.iconButton` standard defined in this file.

### Toolbar Icon Button Standard

```css
/* Source: HubDataTable.module.css lines 144-165 */
.iconButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;        /* ← CANONICAL DIMENSION */
  height: 36px;       /* ← CANONICAL DIMENSION */
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.buttonIcon {
  width: 1rem;        /* 16px icon size */
  height: 1rem;
  color: #6b7280;
}
```

**CRITICAL RULES**:

1. **Button dimensions**: MUST be exactly `36px × 36px` (NOT 2.5rem, NOT 40px, NOT any other value)
2. **Icon size**: MUST be exactly `16px` (1rem)
3. **Icon color**: MUST be `#6b7280` (gray-500) - DO NOT specify explicit colors
4. **Border**: `1px solid #d1d5db` (gray-300)
5. **Border radius**: `0.375rem` (6px)
6. **Background**: `#ffffff` (white)

### When to Use Icon-Only Buttons

Icon-only toolbar buttons (36px × 36px) are used for:

- **Advanced Filters button** - FilterIcon
- **Refresh button** - RefreshCwIcon
- **Saved Views dropdown** - BookmarkIcon
- **Export CSV button** (optional: can also be icon+text)
- **Bulk Actions dropdown** (special case: shows count of selected items)

### When to Use Icon+Text Buttons

Icon+text buttons (variable width, 36px height) are used for:

- **Export CSV** - DownloadIcon + "Export CSV" text
- **Primary actions** - PlusIcon + "Create Listing"

### Common Toolbar Layout Pattern

```tsx
{/* Left Section: Search + Filters */}
<div className={styles.searchWrapper}>
  <Search className={styles.searchIcon} size={16} />
  <input className={styles.searchInput} ... />
</div>

<div className={styles.filters}>
  <select className={styles.filterSelect}>...</select>
  <select className={styles.filterSelect}>...</select>
</div>

{/* Right Section: Actions */}
<div className={styles.toolbarActions}>
  {/* Icon-only buttons */}
  <button className={styles.filtersButton}>
    <Filter size={16} />
    {hasActiveFilters && <span className={styles.filtersBadge}>{activeFilterCount}</span>}
  </button>

  <button className={styles.iconButton}>
    <RefreshCw size={16} />
  </button>

  <button className={styles.iconButton}>
    <Bookmark size={16} />
  </button>

  {/* Icon+text button */}
  <button className={styles.exportButton}>
    <Download size={16} />
    <span className={styles.exportText}>Export CSV</span>
  </button>
</div>
```

---

## Icon Button Dimensions

### Standard Icon Sizes by Context

| Context | Button Size | Icon Size | Use Case |
|---------|-------------|-----------|----------|
| Toolbar | 36px × 36px | 16px | Filters, Refresh, Saved Views, Export |
| Table Actions | 32px × 32px | 16px | Row-level three-dot menu |
| Modal Header | 32px × 32px | 16px | Close button (X) |
| Pagination | 36px × 36px | 16px | Previous/Next arrows |
| Bulk Actions | 36px height | 16px | Dropdown with selected count |

### CSS Implementation Pattern

**Correct** (matches HubDataTable standard):

```css
.filtersButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;    /* ✅ Correct */
  height: 36px;   /* ✅ Correct */
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  padding: 0;
}
```

**Incorrect** (common mistakes):

```css
/* ❌ WRONG: Using rem units */
.filtersButton {
  width: 2.5rem;   /* ❌ 40px - too big */
  height: 2.5rem;
}

/* ❌ WRONG: Using 40px */
.filtersButton {
  width: 40px;     /* ❌ Doesn't match standard */
  height: 40px;
}

/* ❌ WRONG: Explicit color on icon */
.filtersButton svg {
  color: #374151; /* ❌ Should inherit from .buttonIcon */
}
```

### TSX Implementation Pattern

**Correct**:

```tsx
<button onClick={handleOpenFilters} className={styles.filtersButton}>
  <Filter size={16} />
  {hasActiveFilters && (
    <span className={styles.filtersBadge}>{activeFilterCount}</span>
  )}
</button>
```

**Incorrect**:

```tsx
{/* ❌ WRONG: Explicit color prop */}
<button onClick={handleOpenFilters} className={styles.filtersButton}>
  <Filter size={16} color="#374151" />
</button>

{/* ❌ WRONG: Wrong icon size */}
<button onClick={handleOpenFilters} className={styles.filtersButton}>
  <Filter size={20} />
</button>
```

---

## Filter Patterns

### Advanced Filters Button

The Advanced Filters button is always **icon-only** (36px × 36px) with an optional red circular badge showing the count of active filters.

**Standard Implementation**:

```css
/* Button */
.filtersButton {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.filtersButton:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

/* Badge */
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
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  border: 2px solid #ffffff;
}
```

**TSX**:

```tsx
const hasActiveFilters = useMemo(() => {
  return (
    advancedFilters.minRating !== undefined ||
    advancedFilters.maxRating !== undefined ||
    // ... other filters
  );
}, [advancedFilters]);

const activeFilterCount = useMemo(() => {
  let count = 0;
  if (advancedFilters.minRating !== undefined) count++;
  if (advancedFilters.maxRating !== undefined) count++;
  // ... count other filters
  return count;
}, [advancedFilters]);

// Render
<button onClick={() => setIsFiltersDrawerOpen(true)} className={styles.filtersButton}>
  <Filter size={16} />
  {hasActiveFilters && <span className={styles.filtersBadge}>{activeFilterCount}</span>}
</button>
```

### Filter Dropdown Standard

```css
.filterSelect {
  height: 36px;
  padding: 0 2rem 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1f2937;
  background-color: #ffffff;
  cursor: pointer;
  appearance: none;
  transition: border-color 0.15s ease;
}
```

**Dimensions**:
- Height: `36px` (matches toolbar buttons)
- Padding: `0 2rem 0 0.75rem` (space for dropdown arrow)
- Font size: `0.875rem` (14px)

---

## Badge Standards

### Status Badges

Used for: Booking status, Review status, Listing status, etc.

```css
.statusPending {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #fef3c7;
  color: #92400e;
}

.statusPublished {
  background-color: #d1fae5;
  color: #065f46;
}

.statusExpired {
  background-color: #fee2e2;
  color: #991b1b;
}
```

**Dimensions**:
- Padding: `0.25rem 0.625rem` (4px 10px)
- Border radius: `9999px` (fully rounded)
- Font size: `0.75rem` (12px)
- Font weight: `600` (semibold)

### Count Badges (Tab Counts)

```css
.tabCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #e5e7eb;
  color: #374151;
}
```

**Dimensions**:
- Min width: `1.25rem` (20px)
- Height: `1.25rem` (20px)
- Font size: `0.75rem` (12px)

### Filter Count Badge (Red Circular)

```css
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
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  border: 2px solid #ffffff;
}
```

**Dimensions**:
- Size: `18px × 18px`
- Position: `-6px` top and right
- Font size: `11px`
- Border: `2px solid #ffffff` (white outline)

---

## Data Table Standards

### Universal Column Order Standard

**ALL admin data tables MUST follow this column order**:

```
ID → Date → Service/Title → Domain Data → Actions
```

**Examples**:

**Bookings**: ID → Booked → Service → Client → Tutor → Session Date → Status → Payment → Actions
**Listings**: ID → Created → Title → Tutor → Subjects → Status → Visibility → Price → Actions
**Reviews**: ID → Reviewed → Service → Reviewer → Reviewee → Rating → Sentiment → Status → Actions

**Rules**:
1. **Column 1 (ID)**: Always shows truncated UUID with # prefix (e.g., #a1b2c3d4)
2. **Column 2 (Date)**: Always shows primary date (created_at, booked_at, reviewed_at)
3. **Column 3 (Service/Title)**: Always shows the main subject/title
4. **Columns 4-N**: Domain-specific data
5. **Last Column (Actions)**: Always the three-dot menu

### Table Cell Dimensions

```css
/* Header Row */
.headerRow {
  height: 40px;
}

.headerCell {
  padding: 0 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Data Row */
.dataRow {
  height: 48px;        /* Desktop */
  border-bottom: 1px solid #f3f4f6;
}

@media (max-width: 1023px) {
  .dataRow {
    height: 56px;      /* Tablet */
  }
}

.dataCell {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: #1f2937;
}
```

**Dimensions**:
- Header height: `40px`
- Row height: `48px` (desktop), `56px` (tablet)
- Cell padding: `0 1rem` (horizontal only)
- Header font: `0.75rem` (12px), uppercase, `600` weight
- Data font: `0.875rem` (14px)

### Column Width Standards

| Column Type | Width | Example |
|-------------|-------|---------|
| ID | 100px | #a1b2c3d4 |
| Date | 120-140px | 24 Dec 2025 |
| Service/Title | 200-250px | Math Tutoring |
| Name | 150-180px | John Smith |
| Status Badge | 100-120px | Published |
| Rating | 100px | ⭐ 4.5 |
| Actions | 80-100px | ⋮ menu |

---

## Chart Standards

### Chart Data Types

**CRITICAL**: Chart data types have specific field names that MUST be used:

```typescript
// Trend Chart Data (Line Chart)
interface TrendDataPoint {
  label: string;    // ✅ NOT 'date' - use 'label'
  value: number;
}

// Category Chart Data (Bar/Pie Chart)
interface CategoryData {
  label: string;    // ✅ NOT 'category' - use 'label'
  value: number;
  color?: string;   // Optional custom color
}
```

### Chart Props Standard

```tsx
// HubTrendChart (Line Chart)
<HubTrendChart
  data={trendData}           // TrendDataPoint[]
  title="Review Trends"
  subtitle="Last 7 days"     // Optional
  valueName="Reviews"        // ✅ NOT 'valueLabel'
  lineColor="#fbbf24"        // ✅ NOT 'color'
/>

// HubCategoryBreakdownChart (Bar Chart)
<HubCategoryBreakdownChart
  data={categoryData}        // CategoryData[]
  title="Status Breakdown"
  subtitle="Current distribution"  // Optional
/>
```

### Empty State Pattern for Charts

**ALWAYS show charts** even when data is empty. Use React Query to return empty arrays:

```tsx
const { data: reviewTrendsData = [], isLoading: isLoadingTrends } = useQuery<TrendDataPoint[]>({
  queryKey: ['admin-reviews-trends'],
  queryFn: async () => {
    // TODO: Replace with actual API endpoint
    return [];  // ✅ Return empty array, NOT null
  },
  staleTime: 60 * 1000,
  retry: 2,
});

// Always render chart - it will show "No data available yet"
<HubTrendChart
  data={reviewTrendsData}
  title="Review Trends"
  subtitle="Last 7 days"
  valueName="Reviews"
  lineColor="#fbbf24"
/>
```

**DO NOT** use conditional rendering like:

```tsx
{/* ❌ WRONG - Don't hide charts when empty */}
{reviewTrendsData.length > 0 && (
  <HubTrendChart ... />
)}
```

### Chart Grid Layout

```css
.chartsSection {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .chartsSection {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Third chart spans full width */
  .chartsSection > :nth-child(3) {
    grid-column: 1 / -1;
  }
}

/* Desktop: 1 column (stacked) */
@media (min-width: 1024px) {
  .chartsSection {
    grid-template-columns: 1fr;
  }
}
```

**Pattern**: 1 column mobile/desktop, 2 columns tablet (with 3rd chart spanning full width)

---

## Modal Standards

### Modal Action Button Dimensions

```css
.primaryButton {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  background-color: #006c67;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondaryButton {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #ffffff;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dangerButton {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  background-color: #dc2626;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
```

**Dimensions**:
- Padding: `0.625rem 1.25rem` (10px 20px)
- Font size: `0.875rem` (14px)
- Font weight: `600` (semibold)
- Border radius: `0.375rem` (6px)
- Icon gap: `0.5rem` (8px)

### Modal Action Layout (Mobile)

```css
.actionsWrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.actionsWrapper > button {
  flex: 1 1 calc(50% - 0.375rem);  /* 2 buttons per row */
  min-width: 140px;
}

@media (max-width: 767px) {
  .actionsWrapper {
    padding: 1rem;
  }

  .actionsWrapper > button {
    flex: 1 1 calc(50% - 0.375rem);  /* Still 2 per row on mobile */
  }
}
```

**Pattern**: 2 buttons per row on all screen sizes (mobile, tablet, desktop)

---

## Responsive Breakpoints

### Standard Breakpoints

```css
/* Mobile */
@media (max-width: 767px) {
  /* Single column layout */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Two-column layout */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Full three-column layout */
}
```

### Toolbar Responsive Behavior

```css
/* Desktop: All elements in single row */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

/* Tablet: Search wraps to own row */
@media (max-width: 1023px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .searchWrapper {
    flex: 1 1 100%;
    max-width: none;
    order: -1;
  }

  .exportText {
    display: none;  /* Hide "Export CSV" text, show icon only */
  }
}

/* Mobile: Reduce padding */
@media (max-width: 767px) {
  .toolbar {
    padding: 0.875rem;
    gap: 0.625rem;
  }

  .searchInput,
  .filterSelect {
    height: 34px;    /* Reduce from 36px */
    font-size: 0.8125rem;  /* 13px */
  }
}
```

---

## CSS Variable Standards

### Color Palette

```css
/* Primary */
--color-primary-default: #006c67;
--color-primary-hover: #005a56;

/* Grays */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-900: #111827;

/* Status Colors */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #dc2626;
--color-info: #3b82f6;
```

### Typography Scale

```css
/* Font Sizes */
--text-xs: 0.75rem;      /* 12px - Table headers */
--text-sm: 0.875rem;     /* 14px - Body text */
--text-base: 1rem;       /* 16px - Default */
--text-lg: 1.125rem;     /* 18px - Modal titles */
--text-xl: 1.25rem;      /* 20px - Page subtitles */
--text-2xl: 1.5rem;      /* 24px - Section headers */
--text-3xl: 2rem;        /* 32px - Page titles */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing Scale

```css
/* Spacing (rem units) */
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
```

---

## Verification Checklist

Before committing any Hub component changes, verify:

### Icon Buttons
- [ ] Toolbar icon buttons are exactly `36px × 36px`
- [ ] Icons inside buttons are `16px` (size={16})
- [ ] Icon color is inherited (no explicit color prop)
- [ ] Border is `1px solid #d1d5db`
- [ ] Border radius is `0.375rem`

### Filters
- [ ] Advanced filters button is icon-only with optional badge
- [ ] Badge is `18px × 18px`, positioned `-6px` top/right
- [ ] Badge background is `#ef4444` (red)
- [ ] Filter dropdowns are `36px` height

### Data Tables
- [ ] Columns follow Universal Column Order (ID → Date → Service → Domain → Actions)
- [ ] Header row is `40px` height
- [ ] Data rows are `48px` (desktop), `56px` (tablet)
- [ ] Cell padding is `0 1rem`

### Charts
- [ ] Data types use `label` field (not `date` or `category`)
- [ ] Props use `valueName` (not `valueLabel`), `lineColor` (not `color`)
- [ ] Charts always render (even when data is empty)
- [ ] Wrapped in ErrorBoundary

### Modals
- [ ] Action buttons are 2 per row on all screen sizes
- [ ] Primary button is `#006c67` background
- [ ] Danger button is `#dc2626` background
- [ ] Button padding is `0.625rem 1.25rem`

---

## Common Mistakes and Fixes

### Mistake 1: Using rem instead of px for icon buttons

**❌ Wrong**:
```css
.filtersButton {
  width: 2.5rem;   /* 40px when base is 16px */
  height: 2.5rem;
}
```

**✅ Correct**:
```css
.filtersButton {
  width: 36px;
  height: 36px;
}
```

**Why**: The `36px` dimension is a specific design standard. Using rem can lead to inconsistencies if base font size changes.

### Mistake 2: Explicit icon colors

**❌ Wrong**:
```tsx
<Filter size={16} color="#374151" />
```

**✅ Correct**:
```tsx
<Filter size={16} />
```

**Why**: Icon color should inherit from `.buttonIcon` CSS class to maintain consistency and theming support.

### Mistake 3: Wrong chart data field names

**❌ Wrong**:
```typescript
interface TrendDataPoint {
  date: string;    // ❌ Should be 'label'
  value: number;
}
```

**✅ Correct**:
```typescript
interface TrendDataPoint {
  label: string;   // ✅ Correct
  value: number;
}
```

### Mistake 4: Conditional chart rendering

**❌ Wrong**:
```tsx
{data.length > 0 && <HubTrendChart data={data} ... />}
```

**✅ Correct**:
```tsx
<HubTrendChart data={data} ... />  {/* Always render */}
```

**Why**: Charts have built-in empty states. Conditional rendering creates layout shifts.

### Mistake 5: Copying from inconsistent implementations

**❌ Wrong Process**:
1. Copy filter button from ListingsTable (which was using 40px)
2. Paste into new component
3. Result: Inconsistent dimensions

**✅ Correct Process**:
1. Check this HUB-UI-STANDARDS.md document
2. Reference HubDataTable.module.css for `.iconButton` standard
3. Verify dimensions match `36px × 36px`
4. Test against existing implementations (Bookings, Reviews)

---

## Reference Files

**Canonical Sources** (in order of authority):

1. **This document** - `HUB-UI-STANDARDS.md` - Single source of truth for all UI standards
2. **HubDataTable.module.css** - Lines 144-165 define `.iconButton` standard
3. **HubDataTable.tsx** - Reference implementation of toolbar patterns
4. **ReviewsTable.tsx** - Latest implementation following all standards
5. **BookingsTable.tsx** - Reference for admin table patterns

**DO NOT** copy from:
- ListingsTable (had incorrect 40px dimensions before 2025-12-27)
- Any legacy implementations before 2025-12-27
- User-facing hub pages (different patterns from admin)

---

## Enforcement

### Pre-Commit Checklist

Before committing any Hub component:

1. **Visual Inspection**: Does filter button match saved views button size?
2. **Code Review**: Check CSS for `36px × 36px` dimensions
3. **Cross-Reference**: Compare against HubDataTable.module.css `.iconButton`
4. **Test**: Open Reviews, Bookings, Listings pages side-by-side - icons must be identical size

### Review Process

When reviewing PRs that modify Hub components:

1. Check for `width:` and `height:` in CSS - must be `36px` for toolbar icons
2. Check for explicit `color` props on icons - should be removed
3. Check chart data types - must use `label` field
4. Check column order - must follow Universal Column Order Standard
5. Check modal actions - must be 2 per row on mobile

---

## Version History

**v1.0** (2025-12-27):
- Initial documentation
- Established 36px × 36px icon button standard
- Documented Universal Column Order Standard
- Added chart data type standards
- Created verification checklist

---

**Last Updated**: 2025-12-27
**Maintained By**: Development Team
**Questions**: Reference this doc first, then check HubDataTable.module.css
