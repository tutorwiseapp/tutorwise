/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubPageLayout.tsx
 * Purpose: Responsive 3-Column "Inverted U" Grid for Hub Pages
 * Created: 2025-11-28
 * Pattern: Desktop (3-col), Tablet (2-col), Mobile (stacked)
 *
 * Layout Structure:
 * - Header: Sticky top (z-20)
 * - Tabs: Sticky below header (z-10)
 * - Content: Scrollable center column
 * - Sidebar: Fixed 320px right column (desktop), stacked below content (mobile)
 *
 * Usage:
 * <HubPageLayout
 *   header={<HubHeader title="Listings" />}
 *   tabs={<HubTabs items={['Active', 'Draft']} />}
 *   sidebar={<ListingStatsWidget />}
 * >
 *   <HubRowCard ... />
 *   <HubRowCard ... />
 * </HubPageLayout>
 */

'use client';

import React, { ReactNode } from 'react';

interface HubPageLayoutProps {
  header: ReactNode; // Fixed top area
  filters?: ReactNode; // Optional filters/search row between header and tabs
  tabs?: ReactNode; // Optional sticky navigation below header
  children: ReactNode; // Scrollable list content
  sidebar?: ReactNode; // Optional right contextual column
}

export default function HubPageLayout({
  header,
  filters,
  tabs,
  children,
  sidebar,
}: HubPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Desktop Layout: 3-Column Grid (Center + Right Sidebar) */}
      {/* Mobile/Tablet: Stacked Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Center Column: Header + Filters + Tabs + Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Sticky Header (z-20) */}
          <div className="sticky top-0 z-20">
            {header}
          </div>

          {/* Filters Row (between header and tabs) - Optional */}
          {filters && (
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-center">
              {filters}
            </div>
          )}

          {/* Sticky Tabs (z-10) - Optional */}
          {tabs && (
            <nav
              className="sticky top-16 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200"
              aria-label="Hub navigation"
            >
              {tabs}
            </nav>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* Right Sidebar: Desktop (320px fixed), Mobile (stacked below content) */}
        {sidebar && (
          <aside className="w-full lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-gray-200 bg-white">
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
