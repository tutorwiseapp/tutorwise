/**
 * Filename: HubKPIGrid.tsx
 * Purpose: Responsive 3-column grid container for KPI cards
 * Created: 2025-12-17
 * Pattern: Flexible grid shell for HubKPICard children
 */

'use client';

import React from 'react';
import styles from './HubKPIGrid.module.css';

interface HubKPIGridProps {
  children: React.ReactNode;
  className?: string;
}

export default function HubKPIGrid({ children, className = '' }: HubKPIGridProps) {
  return (
    <div className={`${styles.grid} ${className}`}>
      {children}
    </div>
  );
}
