# listings-solution-design-v3.8

### **listings-solution-design-v3.8**

**Version: 3.8 (Updated)**

**Date: November 3, 2025**

**Status: For Implementation**

**Owner: Senior Architect**

### 1.0 Executive Summary

This document outlines the plan to migrate the existing "My Listings" feature into the new 3-column application layout. This migration will unify the user experience, making "My Listings" a first-class hub consistent with the v3.7 architecture (Bookings, Financials, Referrals).

This migration will achieve four key goals:

1. **Adopt the 3-Column Layout:** The page will be moved into the `(authenticated)` route group, providing the standard `AppSidebar` and `ContextualSidebar`.
2. **Standardize UI Layout:** As per your request, the `<StatGrid>` will be **moved** from the main content (Column 2) to the `ContextualSidebar` (Column 3). This creates a consistent layout where Column 2 contains only the `<PageHeader>` and the main content `<Card>`.
3. **Refactor to "List View":** The `ListingCard.tsx` will be refactored to a horizontal "list view" (192x192 image) that stacks vertically, as this is a more scannable and appropriate pattern for a management dashboard.
4. **Implement Hybrid Data-Loading:** The page will be refactored to use the v3.7 "Hybrid" (Parent/Child) pattern to ensure flicker-free tab switching and scalable, server-side data fetching.

### 2.0 Architectural & Migration Plan

This is a 4-phase plan to execute the migration.

#### 2.1 Phase 1: API

- **Database (Verified):** No database changes are required. The `listings` table and its `status` column (from migration `025_add_listing_mvp_fields.sql`) already exist.
- **API (New Endpoint):** A new API route will be created:
  - **Route:** `apps/web/src/app/api/listings/route.ts`
  - **Logic:** A `GET` function, auth-protected (checks `user.id`).
  - **Query:** Fetches listings where `tutor_id === user.id`.
  - **Filtering:** Accepts a `status` query parameter (e.g., `?status=published`) to filter by the existing `status` column.

#### 2.2 Phase 2: Route & Layout Migration

1. **Move Route:** The existing `apps/web/src/app/my-listings/` directory will be moved to `apps/web/src/app/(authenticated)/my-listings/`.
2. **Refactor Layout:** The (now moved) `page.tsx` file will be modified to remove the old, standalone layout components (`<Header>`, `<Footer>`, `<Container>`).

#### 2.3 Phase 3: UI & Data-Loading Refactor (Hybrid Pattern)

This is the core architectural change to ensure a flicker-free, scalable experience.

1. **Refactor** `page.tsx` **(Parent):** The main `(authenticated)/my-listings/page.tsx` will be a Client Component (`'use client'`). It will render the `<PageHeader>` and a single `<Card>` containing the standard `<Tabs>` component. The `<StatGrid>` will be **removed** from this file.
2. **Create** `ListingList.tsx` **(Child):** A new component, `apps/web/src/app/(authenticated)/my-listings/components/ListingList.tsx`, will be created. This component will receive the `status` as a prop, contain the `useEffect` hook to fetch data from our new `/api/listings` endpoint, and manage its own `isLoading` state.
3. **Refactor** `ListingCard.tsx`**:** The `apps/web/src/app/my-listings/ListingCard.tsx` will be refactored to the new horizontal "list view" design (192x192 image).

#### 2.4 Phase 4: Sidebar & Wizard Route Migration

1. **Define Contextual Sidebar:** We will update `apps/web/src/app/components/layout/sidebars/ContextualSidebar.tsx` to show two new widgets when the path is `/my-listings`:
  - `CreateListingWidget.tsx`: A call-to-action widget.
  - `ListingStatsWidget.tsx`: This new widget will contain the `<StatGrid>` that was removed from Column 2.
2. **Move Wizard Routes:** The "Create" and "Edit"/edit/page.tsx`] pages must be moved *out* of the` (authenticated)\` route group to avoid being nested in the 3-column layout.
  - **New Route (Create):** `apps/web/src/app/create-listing/`
  - **New Route (Edit):** `apps/web/src/app/edit-listing/[id]/`

* * *

### 3.0 UI Layout Design (ASCII Diagram)

This diagram shows the final "My Listings" hub. Note that Column 2 is now cleaner, and the `StatGrid` (inside the new `ListingStatsWidget`) has been moved to Column 3.

```
Code snippet
```

```
+--------------------------------------------------------------------------------------------------------------+
|                                         Tutorwise Application Window                                         |
+--------------------------+-----------------------------------------------------+-----------------------------+
|      <AppSidebar>        |                   <PageContent>                     |     <ContextualSidebar>     |
|  [Col 1: Main Nav]       |         [Col 2: Main Hub Page (/my-listings)]       |    [Col 3: Context-Aware]   |
|--------------------------|-----------------------------------------------------|-----------------------------|
|                          |                                                     |                             |
|  Tutorwise Logo          |  <PageHeader title="My Listings">       |  +-----------------------+  |
|                          |                                                     |  |  <CreateListingWidget>  |  |
|  - Home                  |  <Card> (Main Content)                  |  |  <h4>Manage Listings</h4>  |  |
|  - My Bookings           |   <Tabs>                                |  |  <p>Create, edit, and</p> |  |
|  - ...                   |   [ All Listings ] [ Published ] [ Drafts ] [ Archived ] |  |  <p>manage your services</p> |  |
|  - My Listings (Active)  |  -------------------------------------------------- |  |  [ Create New Listing ] |  |
|                          |                                                     |  +-----------------------+  |
|                          |   <div class="vertical-list-view">      |                             |
|                          |    (Loading state shown here...)            |  +-----------------------+  |
|                          |                                                     |  |  <ListingStatsWidget>   |  |
|                          |    +----------------------------------------------+ |  |  <StatGrid>             |  |
|                          |    | <ListingCard (Horizontal)>                   | |  |  +------------+         |  |
|                          |    | +-----------+  <h3>GCSE Maths</h3>             | |  |  | <StatCard> |         |  |
|                          |    | | 192x192   |  <p>£45.00 / session</p>    | |  |  | "Total"    |         |  |
|                          |    | | Image     |  <StatusBadge>Published</StatusBadge> | |  |  +------------+ ...     |  |
|                          |    | +-----------+  [ Edit ] [ Analytics ]      | |  |  </StatGrid>            |  |
|                          |    +----------------------------------------------+ |  +-----------------------+  |
|                          |    +----------------------------------------------+ |                             |
|                          |    | <ListingCard (Horizontal)>                   | |                             |
|                          |    | +-----------+  <h3>A-Level Physics</h3>        | |                             |
|                          |    | | 192x192   |  <p>£55.00 / session</p>    | |                             |
|                          |    | | Image     |  <StatusBadge>Draft</StatusBadge>      | |                             |
|                          |    | +-----------+  [ Edit ] [ Analytics ]      | |                             |
|                          |    +----------------------------------------------+ |                             |
|                          |                                                     |                             |
+--------------------------+-----------------------------------------------------+-----------------------------+

```

* * *

### 4.0 Appendix: Key Code Files

Here are the code skeletons required to implement this migration.

#### 4.1 `apps/web/src/app/(authenticated)/my-listings/page.tsx` (Parent Page)

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/(authenticated)/my-listings/page.tsx
 * (REFACTORED to v3.8 Hybrid Pattern - StatGrid removed)
 */
'use client';

import { useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Tabs } from '@/app/components/ui/Tabs';
import PageHeader from '@/app/components/ui/PageHeader';
import { ListingList } from './components/ListingList';
import styles from './page.module.css';
import { ListingStatus } from '@/types'; // Assuming 'draft', 'published', 'archived' are in this type

const tabOptions = [
  { id: 'all', label: 'All Listings' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
];

const MyListingsPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialStatus = (searchParams.get('status') as ListingStatus | 'all') || 'all';
  const [activeTab, setActiveTab] = useState(initialStatus);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams);
    params.set('status', tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={styles.pageContainer}>
      <PageHeader title="My Listings" />
      
      {/* StatGrid is now in Column 3 */}
      
      <Card>
        <Tabs
          tabs={tabOptions}
          activeTab={activeTab}
          onTabChange={handleTabChange} 
        />
        
        {/* Delegate data fetching to the child component */}
        <ListingList status={activeTab} />
      </Card>
    </div>
  );
};

export default MyListingsPage;

```

#### 4.2 `apps/web/src/app/(authenticated)/my-listings/components/ListingList.tsx` (New Child Component)

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/(authenticated)/my-listings/components/ListingList.tsx
 * (NEW FILE for v3.8 Hybrid Pattern)
 */
'use client';

import { useState, useEffect } from 'react';
import { Listing } from '@/types';
import ListingCard from '@/app/my-listings/ListingCard'; // Import the refactored card
import styles from '../page.module.css';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

interface ListingListProps {
  status: string;
}

export const ListingList = ({ status }: ListingListProps) => {
  const { profile } = useUserProfile();
  const [data, setData] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return; 

    setIsLoading(true);
    
    const params = new URLSearchParams();
    // Use 'draft' as default, but map 'all' to no parameter
    const apiStatus = status === 'all' ? '' : status;
    if (apiStatus) params.set('status', apiStatus);

    // Fetch *only* the filtered data from the new API endpoint
    fetch(`/api/listings?${params.toString()}`)
      .then(res => res.json())
      .then(listings => {
        setData(listings);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listings", err);
        setIsLoading(false);
        setData([]);
      });
  }, [status, profile]);

  if (isLoading) {
    return <div className={styles.emptyState}>Loading listings...</div>;
  }

  return (
    <div className={styles.listView}> {/* This class will stack the cards vertically */}
      {data.length > 0 ? (
        data.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))
      ) : (
        <div className={styles.emptyState}>No listings found for this filter.</div>
      )}
    </div>
  );
};

```

#### 4.3 `apps/web/src/app/my-listings/ListingCard.tsx` (Refactored)

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/my-listings/ListingCard.tsx
 * (MODIFIED to a horizontal "list view" layout per v3.8)
 */
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { Listing } from '@/types'; 
import styles from './ListingCard.module.css'; // This CSS file will be modified

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { id, service_name, amount, status } = listing;
  const imageUrl = listing.hero_image_url || '/placeholder-image.jpg'; 
  
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount || 0);

  return (
    <Card padding="md" className={styles.card}>
      {/* Column 1: Image (192x192) */}
      <div className={styles.imageWrapper}>
        <Image
          src={imageUrl}
          alt={service_name || 'Listing image'}
          width={192}
          height={192}
          className={styles.image}
        />
      </div>

      {/* Column 2: Details */}
      <div className={styles.detailsWrapper}>
        <div className={styles.detailsTop}>
          <h3 className={styles.title}>{service_name}</h3>
          <p className={styles.price}>{formattedPrice} / session</p>
          <div className={styles.status}>
            {/* Use the status from the DB, default to 'draft' */}
            <StatusBadge status={status || 'draft'}>{status || 'draft'}</StatusBadge>
          </div>
        </div>

        <div className={styles.detailsBottom}>
          <Button
            as={Link}
            href={`/edit-listing/${id}`} {/* Use new, decoupled route */}
            variant="secondary"
            size="sm"
          >
            Edit
          </Button>
          <Button variant="primary" size="sm">
            View Analytics
          </Button>
        </div>
      </div>
    </Card>
  );
}

```

#### 4.4 `apps/web/src/app/my-listings/ListingCard.module.css` (Refactored)

```
CSS
```

```
/*
 * Filename: apps/web/src/app/my-listings/ListingCard.module.css
 * (MODIFIED for horizontal "list view" layout per v3.8)
 */

.card {
  display: flex;
  flex-direction: row; /* Horizontal layout */
  gap: var(--space-4); /* 16px */
  width: 100%;
}

.imageWrapper {
  flex-shrink: 0; 
  width: 192px;
  height: 192px;
  position: relative;
}

.image {
  border-radius: var(--border-radius-md); /* 8px */
  object-fit: cover;
  width: 100%;
  height: 100%;
}

.detailsWrapper {
  flex-grow: 1; 
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.detailsTop {
  display: flex;
  flex-direction: column;
  gap: var(--space-1); /* 4px */
}

.title {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.price {
  font-size: 1rem; /* 16px */
  font-weight: 500;
  color: var(--color-primary-default);
}

.status {
  margin-top: var(--space-2); /* 8px */
}

.detailsBottom {
  display: flex;
  gap: var(--space-2); /* 8px */
  margin-top: var(--space-4); /* 16px */
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .card {
    flex-direction: column; /* Stack vertically on mobile */
  }

  .imageWrapper {
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 aspect ratio */
    height: 0;
  }

  .image {
    position: absolute;
    top: 0;
    left: 0;
  }
}

```

#### 4.5 `apps/web/src/app/components/layout/sidebars/ContextualSidebar.tsx` (Updated)

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/layout/sidebars/ContextualSidebar.tsx
 * (MODIFIED to add /my-listings widgets)
 */
'use client';

import { usePathname } from 'next/navigation';
import styles from './ContextualSidebar.module.css';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import Link from 'next/link';

// --- Import all widgets ---
import { UpcomingSessionWidget } from '@/app/components/bookings/UpcomingSessionWidget';
import { BookingStatsWidget } from '@/app/components/bookings/BookingStatsWidget';
import { BalanceSummaryWidget } from '@/app/components/financials/BalanceSummaryWidget';
import { ReferralLinkWidget } from '@/app/components/referrals/ReferralLinkWidget';
import { ReferralStatsWidget } from '@/app/components/referrals/ReferralStatsWidget';
// --- (NEW) Import Listing Widgets ---
import { ListingStatsWidget } from '@/app/components/listings/ListingStatsWidget'; 

// (NEW) Simple CreateListingWidget
const CreateListingWidget = () => (
  <SidebarWidget title="Manage Your Services">
    <p className={styles.widgetDescription}>
      Create, edit, and manage all your services from one place.
    </p>
    <Button as={Link} href="/create-listing" variant="primary" fullWidth>
      Create New Listing
    </Button>
  </SidebarWidget>
);

// Helper to wrap widgets in a consistent Card style
export const SidebarWidget = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <Card>
    <h4 className={styles.widgetTitle}>{title}</h4>
    {children}
  </Card>
);

const ContextualSidebar = () => {
  const pathname = usePathname();

  const renderContextualContent = () => {
    if (pathname.startsWith('/bookings')) {
      return (
        <>
          <UpcomingSessionWidget />
          <BookingStatsWidget /> 
        </>
      );
    }
    
    if (pathname.startsWith('/referrals')) {
      return (
        <>
          <ReferralLinkWidget />
          <ReferralStatsWidget />
        </>
      );
    }
    
    if (pathname.startsWith('/financials')) {
      return (
        <>
          <BalanceSummaryWidget />
        </>
      );
    }

    // --- (NEW) /my-listings context ---
    if (pathname.startsWith('/my-listings')) {
      return (
        <>
          <CreateListingWidget />
          <ListingStatsWidget />
        </>
      );
    }
    
    return null;
  };

  return (
    <aside className={styles.contextualSidebar}>
      <div className={styles.widgetStack}>
        {renderContextualContent()}
      </div>
    </aside>
  );
};

export default ContextualSidebar;

```

#### 4.6 `apps/web/src/app/components/listings/ListingStatsWidget.tsx` (New Widget)

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/listings/ListingStatsWidget.tsx
 * (NEW FILE for v3.8 Contextual Sidebar)
 */
'use client';

import React from 'react';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { StatGrid } from '@/app/components/ui/reports/StatGrid';
import { StatCard } from '@/app/components/ui/reports/StatCard';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

// This widget now contains the StatGrid
export const ListingStatsWidget: React.FC = () => {
  
  // This data would come from a 'useListingStats' hook
  const stats = {
    published: 3,
    drafts: 1,
    archived: 0,
    total: 4,
  };

  return (
    <SidebarWidget title="Listing Stats">
      <StatGrid>
        <StatCard title="Total" value={stats.total} />
        <StatCard title="Published" value={stats.published} />
        <StatCard title="Drafts" value={stats.drafts} />
        <StatCard title="Archived" value={stats.archived} />
      </StatGrid>
    </SidebarWidget>
  );
};

export default ListingStatsWidget;
```