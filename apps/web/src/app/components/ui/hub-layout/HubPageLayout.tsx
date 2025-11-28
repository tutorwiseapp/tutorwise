/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubPageLayout.tsx
 * Purpose: Standard Hub Page Layout matching Bookings page structure
 * Created: 2025-11-28
 * Updated: 2025-11-28 - Aligned with Bookings layout pattern
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

      {/* Tabs (full-width with negative margins to escape padding) */}
      {tabs && (
        <div className="bg-gray-50 border-b-2 border-gray-200">
          {tabs}
        </div>
      )}

      {/* Main Layout: Content + Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row bg-gray-50">
        {/* Content Column */}
        <main className="flex-1 min-w-0 px-8 py-8 lg:px-8">
          <div className="max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>

        {/* Right Sidebar */}
        {sidebar}
      </div>
    </>
  );
}
