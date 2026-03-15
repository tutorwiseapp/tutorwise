/**
 * Filename: apps/web/src/components/hub/layout/HubPanelLayout.tsx
 * Purpose: Panel-level layout with content/sidebar split (62/38)
 * Created: 2026-03-14
 * Pattern: For use inside panels/tabs within a page (e.g. IntelligencePanel in Conductor).
 *          For full-page layouts, use HubPageLayout instead.
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './HubPanelLayout.module.css';

interface HubPanelLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export default function HubPanelLayout({ children, sidebar }: HubPanelLayoutProps) {
  if (!sidebar) {
    return <>{children}</>;
  }

  return (
    <div className={styles.panelWrapper}>
      <div className={styles.mainArea}>{children}</div>
      <aside className={styles.sidebarPanel}>{sidebar}</aside>
    </div>
  );
}
