/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubHeader.tsx
 * Purpose: Ultra-Dense Header for Hub Pages with Title, Filters, and Actions
 * Created: 2025-11-28
 * Updated: 2025-11-28 - Added filters row support
 * Pattern: Two-row layout - Row 1: Title + Actions | Row 2: Filters (centered)
 *
 * Usage:
 * <HubHeader
 *   title="Listings"
 *   subtitle="Manage your service offerings"
 *   filters={<>Search + Sort</>}
 *   actions={<Button>+ Create</Button>}
 * />
 */

'use client';

import React, { ReactNode } from 'react';

interface HubHeaderProps {
  title: string;
  subtitle?: string;
  filters?: ReactNode; // Optional centered filters row (search/sort)
  actions?: ReactNode; // Right slot (buttons/menu)
}

export default function HubHeader({ title, subtitle, filters, actions }: HubHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      {/* Row 1: Title + Actions */}
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Left: Title + Subtitle */}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Actions (optional) */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {actions}
          </div>
        )}
      </div>

      {/* Row 2: Filters (centered, optional) */}
      {filters && (
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-center">
          <div className="w-full max-w-2xl">
            {filters}
          </div>
        </div>
      )}
    </header>
  );
}
