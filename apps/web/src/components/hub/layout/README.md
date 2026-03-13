# Hub Layout Components

**Purpose**: Reusable shell components implementing the "Gold Standard" Hub Architecture with "Inverted U" 3-column layout.

**Last Updated**: 2025-12-03
**Status**: Phase 1 Complete (36% adoption), Phase 2 in progress

---

## Migration Status

**Phase 1: Structural Reorganization** - ✅ **COMPLETE**
**Phase 2: Component Adoption** - ⚠️ **SPLIT BRAIN STATE (36%)**
**Phase 3: Legacy Cleanup** - ❌ **NOT STARTED**

### Current Adoption
- **5/14 hub pages migrated** (36%): Bookings, Listings, Network, Reviews, Wiselists
- **9 pages pending**: Dashboard, Messages, Financials (3 pages), My Students, Organisation, Payments, Referrals
- **HubEmptyState**: Centralized empty state component eliminating 744 lines of duplication

### Recent Changes (2025-12-03)
1. ✅ **HubEmptyState component fixed** - Now uses CSS modules, production-ready
2. ✅ **All 5 migrated pages refactored** - Using centralized HubEmptyState
3. ✅ **200+ lines CSS removed** - Eliminated duplicate empty state styles
4. ✅ **Barrel export created** - `hub/content/index.ts` for clean imports

For detailed migration status, see: [docs/refactoring/hub-architecture-migration-status-2025-12-03.md](../../../../docs/refactoring/hub-architecture-migration-status-2025-12-03.md)

---

## Components

### HubPageLayout
The main responsive grid wrapper that handles desktop (3-column) and mobile (stacked) layouts.

**Props**:
- `header`: ReactNode - The fixed top area (typically HubHeader)
- `tabs?`: ReactNode - Optional sticky navigation below header
- `children`: ReactNode - Scrollable list content (HubRowCard components)
- `sidebar?`: ReactNode - Optional right contextual column (stats widgets, filters, etc.)

### HubHeader
Two-row header with title/actions (row 1) and filters (row 2).

**Props**:
- `title`: string - Page title (left slot)
- `filters?`: ReactNode - Center slot for search/filters (row 2)
- `actions?`: ReactNode - Right slot for primary action buttons

## Usage Example

```tsx
import { HubPageLayout, HubHeader } from '@/app/components/ui/hub-layout';
import Button from '@/app/components/ui/Button';
import HubRowCard from '@/app/components/ui/hub-row-card/HubRowCard';

export default function ListingsPage() {
  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Listings"
          actions={
            <Button variant="primary" size="sm">
              + Create Listing
            </Button>
          }
        >
          {/* Center Slot: Search/Filters */}
          <div className="flex gap-2 w-full max-w-md">
            <input
              type="search"
              placeholder="Search listings..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-md">
              <option>All Subjects</option>
              <option>Maths</option>
              <option>English</option>
            </select>
          </div>
        </HubHeader>
      }
      tabs={
        <div className="flex gap-4 px-6 py-3">
          <button className="font-medium text-blue-600 border-b-2 border-blue-600">
            Active (12)
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            Draft (3)
          </button>
          <button className="text-gray-600 hover:text-gray-900">
            Archived (5)
          </button>
        </div>
      }
      sidebar={
        <div className="p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Views</span>
              <span className="font-bold">1,234</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Inquiries</span>
              <span className="font-bold">56</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bookings</span>
              <span className="font-bold">23</span>
            </div>
          </div>
        </div>
      }
    >
      {/* Scrollable Content */}
      <div className="p-6 space-y-4">
        <HubRowCard {...listing1Props} />
        <HubRowCard {...listing2Props} />
        <HubRowCard {...listing3Props} />
      </div>
    </HubPageLayout>
  );
}
```

## File System Structure

```
apps/web/src/app/components/
├── hub/                    # Hub Primitives (Layout Shells)
│   ├── layout/            # HubPageLayout, HubHeader, HubTabs, HubPagination
│   ├── sidebar/           # HubSidebar, SidebarWidget components
│   ├── content/           # HubRowCard, HubEmptyState
│   │   ├── HubEmptyState.tsx          # Centralized empty state
│   │   ├── HubEmptyState.module.css
│   │   ├── HubRowCard/
│   │   │   ├── HubRowCard.tsx
│   │   │   └── StatsRow.tsx
│   │   └── index.ts       # Barrel export
│   ├── form/              # HubForm (centralized form handling)
│   └── styles/            # hub-filters.module.css, hub-actions.module.css
│
├── feature/               # Domain-Specific Components
│   ├── bookings/          # BookingCard, BookingStatsWidget
│   ├── listings/          # ListingCard, ListingStatsWidget
│   ├── network/           # ConnectionCard, NetworkStatsWidget
│   ├── reviews/           # PendingReviewCard, ReviewStatsWidget
│   ├── wiselists/         # WiselistCard, WiselistStatsWidget
│   └── ...
│
└── ui/                    # Design System Primitives
    ├── actions/           # Button.tsx
    ├── data-display/      # Card, StatusBadge, Chip
    ├── forms/             # Input, Select, Dropdown, Checkbox
    └── navigation/        # Tabs, NavLink, Breadcrumb
```

## Layout Behavior

### Desktop (≥1024px)
- **3-Column Grid**: App Sidebar (240px) + Center Content (flex-1) + Right Sidebar (320px)
- **Header**: Two-row layout (title/actions + filters)
- **Tabs**: Full-width with negative margins, overflow scroll
- **Scrollable Content**: Center column scrolls independently
- **Fixed Sidebar**: Right column (320px) visible at all times

### Tablet (768px - 1023px)
- **App Sidebar**: Narrower (200px)
- **Right Sidebar**: Narrower (280px)
- **Header/Tabs**: Maintained, filters may wrap

### Mobile (<768px)
- **Single Column**: Fully stacked layout
- **App Sidebar**: Hidden (hamburger menu)
- **Right Sidebar**: Hidden
- **Filters**: Stack vertically, full width

## Design Specifications

- **Left Sidebar (AppSidebar)**: 240px desktop, 200px tablet, hidden mobile
- **Right Sidebar (HubSidebar)**: 320px desktop, 280px tablet, hidden mobile
- **Header**: Two-row layout, inherits padding from authenticated layout
- **Tabs**: Full-width with negative margins (escapes padding)
- **Breakpoints**: Mobile (<768px), Tablet (768-1023px), Desktop (≥1024px)
- **Background**: White for header/sidebar, inherits from parent for content
- **Borders**: #e5e7eb (gray-200) for separation

## Accessibility

- Uses semantic HTML tags: `<header>`, `<main>`, `<aside>`, `<nav>`
- Tabs navigation includes proper ARIA labels
- Proper heading hierarchy (h1 in header)
- Focus management for keyboard navigation

## HubEmptyState Component

**Purpose**: Centralized empty state UI for all hub pages, eliminating 744 lines of duplicated code.

**Import**:
```tsx
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
// OR
import { HubEmptyState } from '@/app/components/hub/content';
```

**Props**:
```tsx
interface HubEmptyStateProps {
  title: string;              // Empty state title
  description: string;        // Descriptive text
  actionLabel?: string;       // Optional CTA button label
  onAction?: () => void;      // Optional CTA click handler
  icon?: React.ReactNode;     // Optional icon element
}
```

**Usage Example**:
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

**Impact**: Eliminates 40 lines of CSS + 15-35 lines of JSX per page (71-88% reduction)

---

## Phase 2 Migration Roadmap

### High Priority (User-Facing, High Traffic)
1. **Dashboard** (`/dashboard/page.tsx`) - Landing page after login
   - Estimated effort: 4-6 hours

### Medium Priority (Domain-Specific)
2. **Messages** (`/messages/page.tsx`) - May need custom layout variant
   - Estimated effort: 6-8 hours
3. **My Students** (`/my-students/page.tsx`) - Similar to Network page
   - Estimated effort: 3-4 hours
4. **Referrals** (`/referrals/page.tsx`) - Similar to Bookings pattern
   - Estimated effort: 3-4 hours

### Low Priority (Less Frequently Used)
5-9. **Financials Bundle** (5 pages total)
   - `/financials/page.tsx`
   - `/financials/disputes/page.tsx`
   - `/financials/payouts/page.tsx`
   - `/organisation/page.tsx`
   - `/payments/page.tsx`
   - Estimated effort: 10-12 hours (batch migration)

**Total Estimated Effort**: 28-36 hours (3.5-4.5 developer days)

### Migration Checklist (Per Page)
- [ ] Import hub components: `HubPageLayout`, `HubHeader`, `HubTabs`, `HubPagination`, `HubEmptyState`
- [ ] Replace header section with `<HubHeader>`
- [ ] Replace filter tabs with `<HubTabs>`
- [ ] Wrap content in `<HubPageLayout>`
- [ ] Replace empty states with `<HubEmptyState>`
- [ ] Add sidebar widgets (if applicable)
- [ ] Remove obsolete CSS (header, tabs, empty state styles)
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors

---

## Reference Documentation

- **UI Standards**: [HUB-UI-STANDARDS.md](../HUB-UI-STANDARDS.md) - **⭐ START HERE** - Canonical reference for all UI dimensions, spacing, and styling
- **Migration Guide**: [HUB-MIGRATION-GUIDE.md](./HUB-MIGRATION-GUIDE.md)
- **Architecture Status**: [hub-architecture-migration-status-2025-12-03.md](../../../../docs/refactoring/hub-architecture-migration-status-2025-12-03.md)
- **HubEmptyState Assessment**: [hub-empty-state-assessment-2025-12-03.md](../../../../docs/refactoring/hub-empty-state-assessment-2025-12-03.md)

---

**Last Updated**: 2025-12-03
**Version**: 2.1
**Components**: HubPageLayout, HubHeader, HubTabs, HubPagination, HubEmptyState, HubRowCard
