# booking-hub-enhancement

**booking-hub-enhancement**

The Bookings Hub should also have its 3rd column visible by default at the tablet and desktop breakpoints, just like the Financials and Referrals hubs.

My previous analysis of it being hidden on tablets was based on a different responsive breakpoint, but your screenshots and this clarification confirm the new requirement.

Here is the plan to implement this change, including the new "Booking Stats" card you requested for the contextual sidebar.

### 1\. Update the 3-Column Layout CSS

First, we must ensure the 3rd column is visible at the tablet breakpoint.

- **File to Modify:** `apps/web/src/app/(authenticated)/layout.module.css`
- **Action:** We will adjust the media query to show all three columns starting from the tablet breakpoint (`769px`) instead of waiting for the desktop breakpoint (`1025px+`).

```
CSS
```

```
/* apps/web/src/app/(authenticated)/layout.module.css */

.appLayout {
  display: grid;
  /* Mobile-first: 1-column (content only) */
  grid-template-columns: 1fr; 
}

/* Tablet: 2-column layout (Sidebar + Content) */
@media (min-width: 769px) {
  .appLayout {
    /* MODIFICATION: Change to 3 columns */
    grid-template-columns: 240px 1fr 300px; /* AppSidebar | Content | ContextualSidebar */
  }
}

/* Desktop: 3-column layout (wider) */
@media (min-width: 1280px) {
  .appLayout {
    /* Adjust widths as needed */
    grid-template-columns: 240px 1fr 300px;
  }
}

/* Hide sidebars on mobile */
.appSidebar,
.contextualSidebar {
  display: none;
}

/* Show sidebars on tablet+ */
@media (min-width: 769px) {
  .appSidebar,
  .contextualSidebar {
    display: block;
  }
}

```

* * *

### 2\. Design the New `BookingStatsWidget`

Here is the code for the new default summary stats card for the Bookings Hub, which mirrors the style of the widgets in your screenshots.

- **File to Create:** `apps/web/src/app/components/bookings/BookingStatsWidget.tsx`

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/bookings/BookingStatsWidget.tsx
 * Purpose: A widget for the ContextualSidebar showing booking stats.
 * Specification: SDD v3.6 - Per user request
 */
'use client';

import { Card } from '@/app/components/ui/Card';
import styles from './BookingStatsWidget.module.css';
// Note: This data would come from a 'useBookingStats' hook
// that fetches from a new API endpoint (e.g., GET /api/bookings/stats)

export const BookingStatsWidget = () => {
  // Placeholder data
  const stats = {
    pending: 2,
    upcoming: 5,
    completed: 28,
  };

  return (
    <Card className={styles.statsWidget}>
      <h4 className={styles.title}>Booking Stats (All-Time)</h4>
      <ul className={styles.statList}>
        <li className={styles.statItem}>
          <span>Pending Confirmation</span>
          <strong>{stats.pending}</strong>
        </li>
        <li className={styles.statItem}>
          <span>Upcoming Sessions</span>
          <strong>{stats.upcoming}</strong>
        </li>
        <li className={styles.statItem}>
          <span>Completed Sessions</span>
          <strong>{stats.completed}</strong>
        </li>
      </ul>
    </Card>
  );
};

export default BookingStatsWidget;

```

- **File to Create:** `apps/web/src/app/components/bookings/BookingStatsWidget.module.css`

```
CSS
```

```
/*
 * Filename: apps/web/src/app/components/bookings/BookingStatsWidget.module.css
 */
.statsWidget {
  width: 100%;
}

.title {
  font-size: 0.875rem; /* 14px */
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.statList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.statItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem; /* 14px */
}

.statItem span {
  color: var(--color-text-primary);
}

.statItem strong {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 1rem; /* 16px */
}

```

* * *

### 3\. Update the Contextual Sidebar

Finally, we update the main contextual sidebar to display this new widget when the user is on the `/bookings` page.

- **File to Modify:** `apps/web/src/app/components/layout/sidebars/ContextualSidebar.tsx`

```
TypeScript
```

```
/*
 * Filename: apps/web/src/app/components/layout/sidebars/ContextualSidebar.tsx
 * (MODIFIED to add the new BookingStatsWidget)
 */
'use client';

import { usePathname } from 'next/navigation';
import styles from './ContextualSidebar.module.css';

// Import all widgets
import { UpcomingSessionWidget } from '@/app/components/bookings/UpcomingSessionWidget';
import { BookingStatsWidget } from '@/app/components/bookings/BookingStatsWidget'; // <-- NEW IMPORT
import { BalanceSummaryWidget } from '@/app/components/financials/BalanceSummaryWidget';
import { ReferralLinkWidget } from '@/app/components/referrals/ReferralLinkWidget';
import { ReferralStatsWidget } from '@/app/components/referrals/ReferralStatsWidget';

const ContextualSidebar = () => {
  const pathname = usePathname();

  const renderContextualContent = () => {
    if (pathname.startsWith('/bookings')) {
      return (
        <>
          {/* This was the original widget from the SDD */}
          <UpcomingSessionWidget />
          {/* This is the new stats card you requested */}
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
    
    return null; // Render nothing by default on other pages
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