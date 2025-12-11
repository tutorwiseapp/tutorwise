/*
 * Filename: src/app/components/hub/sidebar/HubSidebar.tsx
 * Purpose: Hub-specific hub sidebar (right column in 3-column layout)
 * Created: 2025-11-02
 * Updated: 2025-12-04 - Priority 2: Removed feature-specific widgets (moved to feature folders)
 * Specification: SDD v3.6, Section 5.2 - HubSidebar (hub-specific cards)
 * Architecture: Tier 2 (Hub System) - Pure layout component, no business logic
 *
 * IMPORTANT: This component should NOT contain feature-specific widgets.
 * Feature widgets belong in their respective feature folders:
 * - UpcomingSessionWidget → components/feature/bookings/
 * - BalanceSummaryWidget → components/feature/financials/
 * - ReferralLinkWidget → components/feature/referrals/
 *
 * NOTE: Floating button for mobile is now handled by HubPageLayout component
 */
'use client';

import React from 'react';
import styles from './HubSidebar.module.css';

interface HubSidebarProps {
  children: React.ReactNode;
}

/**
 * HubSidebar - Generic sidebar container for hub pages
 *
 * This is a pure layout component (Tier 2) that provides the right column
 * in the 3-column hub layout. It should never contain feature-specific logic.
 *
 * Usage:
 * <HubSidebar>
 *   <BookingStatsWidget {...} />
 *   <UpcomingSessionWidget {...} />
 * </HubSidebar>
 */
export default function HubSidebar({ children }: HubSidebarProps) {
  return (
    <aside className={styles.hubSidebar}>
      <div className={styles.sidebarContent}>{children}</div>
    </aside>
  );
}

// Generic widget wrapper (optional utility)

interface WidgetProps {
  title: string;
  children: React.ReactNode;
}

/**
 * SidebarWidget - Generic wrapper for sidebar widgets
 *
 * This is a presentational component that provides consistent styling
 * for sidebar widgets. It has no business logic and can be used by
 * any feature-specific widget.
 */
export function SidebarWidget({ title, children }: WidgetProps) {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>{title}</h3>
      <div className={styles.widgetContent}>{children}</div>
    </div>
  );
}
