/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubPageLayout.tsx
 * Purpose: Standard Hub Page Layout matching Bookings page structure
 * Created: 2025-11-28
 * Updated: 2025-11-28 - Converted to CSS Modules for consistency
 * Pattern: Header + Tabs (full-width) + Content (container) + Sidebar
 *
 * Layout Structure:
 * - Header: Title + optional filters + Actions (from HubHeader)
 * - Tabs: Full-width underline tabs (Bookings style)
 * - Content: Max-width container (1200px) with listings
 * - Sidebar: Fixed-width right column (320px) with widgets
 *
 * Usage:
 * <HubPageLayout
 *   header={<HubHeader title="Listings" filters={...} actions={...} />}
 *   tabs={<div>Tab buttons</div>}
 *   sidebar={<>Stats + Widgets</>}
 * >
 *   <div>Content cards</div>
 * </HubPageLayout>
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubPageLayout.module.css';

interface HubPageLayoutProps {
  header: ReactNode; // HubHeader component
  tabs?: ReactNode; // Optional tab navigation
  children: ReactNode; // Content area (cards, lists, etc.)
  sidebar?: ReactNode; // Optional right contextual column
}

export default function HubPageLayout({
  header,
  tabs,
  children,
  sidebar,
}: HubPageLayoutProps) {
  return (
    <>
      {/* Header (full-width) */}
      {header}

      {/* Tabs (full-width) */}
      {tabs}

      {/* Main Layout: Content + Sidebar */}
      <div className={styles.mainLayout}>
        {/* Content Column */}
        <main className={styles.contentColumn}>
          {children}
        </main>

        {/* Right Sidebar */}
        {sidebar}
      </div>
    </>
  );
}
