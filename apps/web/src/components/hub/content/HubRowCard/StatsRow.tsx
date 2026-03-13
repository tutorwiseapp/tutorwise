/**
 * Filename: StatsRow.tsx
 * Purpose: Reusable bullet-separated stats row for HubRowCard Line 4
 * Created: 2025-11-27
 * Pattern: Consistent 24px visual spacing with 8px gap + 2px bullet margins
 *
 * Usage:
 * const stats = <StatsRow stats={[
 *   { label: 'Active Students', value: 5 },
 *   { label: 'Revenue', value: '£100', color: '#137333' },
 *   { label: 'Last Session', value: 'No activity' },
 * ]} />;
 */

import React from 'react';

export interface StatItem {
  label?: string; // Optional label (e.g., "Active Students:")
  value: string | number | React.ReactNode; // Value (text, number, or custom component)
  color?: string; // Optional color override (default: #111827)
  hideLabel?: boolean; // If true, only show value (useful for first stat)
}

interface StatsRowProps {
  stats: StatItem[];
}

export default function StatsRow({ stats }: StatsRowProps) {
  // Filter out any null/undefined stats
  const validStats = stats.filter(Boolean);

  if (validStats.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#6b7280',
      }}
    >
      {validStats.map((stat, index) => (
        <React.Fragment key={index}>
          <span style={{ fontWeight: '500', color: stat.color || '#111827' }}>
            {/* Show label if provided and not hidden */}
            {stat.label && !stat.hideLabel && `${stat.label}: `}
            {/* Show value (can be string, number, or ReactNode) */}
            {stat.value}
          </span>
          {/* Add bullet separator between items (not after last item) */}
          {index < validStats.length - 1 && (
            <span style={{ color: '#d1d5db', margin: '0 2px' }}>•</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
