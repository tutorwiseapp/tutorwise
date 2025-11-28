/**
 * Filename: apps/web/src/app/components/ui/hub-layout/HubHeader.tsx
 * Purpose: Ultra-Dense Single-Row Header for Hub Pages
 * Created: 2025-11-28
 * Pattern: Fixed 64px height with 3-column layout (Title | Center Slot | Actions)
 *
 * Usage:
 * <HubHeader
 *   title="Listings"
 *   actions={<Button>+ Create</Button>}
 * >
 *   <SearchInput />
 * </HubHeader>
 */

'use client';

import React, { ReactNode } from 'react';

interface HubHeaderProps {
  title: string;
  children?: ReactNode; // Center slot (search/filters)
  actions?: ReactNode; // Right slot (buttons/menu)
}

export default function HubHeader({ title, children, actions }: HubHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between gap-4">
      {/* Left: Title */}
      <h1 className="text-lg font-semibold text-gray-900 truncate shrink-0">
        {title}
      </h1>

      {/* Center: Search/Filters (optional) */}
      {children && (
        <div className="flex-1 flex justify-center max-w-2xl mx-auto">
          {children}
        </div>
      )}

      {/* Right: Actions (optional) */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
