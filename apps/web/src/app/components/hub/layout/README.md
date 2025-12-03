# Hub Layout Components

**Purpose**: Reusable shell components implementing the "Gold Standard" Hub Architecture with "Inverted U" 3-column layout.

## Components

### HubPageLayout
The main responsive grid wrapper that handles desktop (3-column) and mobile (stacked) layouts.

**Props**:
- `header`: ReactNode - The fixed top area (typically HubHeader)
- `tabs?`: ReactNode - Optional sticky navigation below header
- `children`: ReactNode - Scrollable list content (HubRowCard components)
- `sidebar?`: ReactNode - Optional right contextual column (stats widgets, filters, etc.)

### HubHeader
Ultra-dense single-row header (64px fixed height) with 3-slot layout.

**Props**:
- `title`: string - Page title (left slot)
- `children?`: ReactNode - Center slot for search/filters
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

## Layout Behavior

### Desktop (≥1024px)
- **3-Column Grid**: App Sidebar (240px) + Center Content (flex-1) + Right Sidebar (320px)
- **Sticky Header**: Fixed at top (z-20)
- **Sticky Tabs**: Fixed below header at 64px (z-10)
- **Scrollable Content**: Center column scrolls independently
- **Fixed Sidebar**: Right column visible at all times

### Tablet (768px - 1023px)
- **2-Column Layout**: App Sidebar + Center Content
- **Sidebar Stacked**: Right sidebar appears below content
- **Sticky behavior maintained** for header and tabs

### Mobile (<768px)
- **Single Column**: Fully stacked layout
- **Header → Tabs → Content → Sidebar** (top to bottom)
- **Sticky behavior maintained** for header and tabs

## Design Specifications

- **Header Height**: 64px (h-16) - matches App Header
- **Sidebar Width**: 320px (w-80) on desktop
- **Breakpoint**: lg (1024px) for 3-column layout
- **Background**: Gray-50 for content area, White for header/sidebar
- **Borders**: Gray-200 for separation
- **Z-Index**: Header (20), Tabs (10), Content (0)

## Accessibility

- Uses semantic HTML tags: `<header>`, `<main>`, `<aside>`, `<nav>`
- Tabs navigation includes `aria-label="Hub navigation"`
- Proper heading hierarchy (h1 in header)
- Focus management for keyboard navigation

## Future Enhancements

- Add `hideSidebarOnMobile` prop for optional sidebar visibility control
- Add `sidebarWidth` prop for configurable sidebar width
- Add `headerClassName` prop for custom header styling
- Add loading states for async content
