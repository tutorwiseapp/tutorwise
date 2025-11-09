/**
 * Filename: apps/web/src/app/(authenticated)/account/layout.tsx
 * Purpose: 3-column Account Hub layout (v4.7)
 * Created: 2025-11-09
 * Specification: account-solution-design-v4.7.md
 *
 * This layout creates a 3-column structure within the authenticated layout:
 * - Column 1 (Left): Inherited from authenticated layout (AppSidebar)
 * - Column 2 (Center 70%): Tabbed content area (Personal Info, Professional, Settings)
 * - Column 3 (Right 30%): Hero sidebar (Avatar, Stats, Quick Actions)
 *
 * The layout uses a 70:30 split on desktop, collapsing to single column on mobile.
 */
'use client';

import React from 'react';
import { AccountTabs } from '@/app/components/account/AccountTabs';
import { HeroProfileCard } from '@/app/components/account/HeroProfileCard';
import { RoleStatsCard } from '@/app/components/account/RoleStatsCard';
import { ProfileCompletenessWidget } from '@/app/components/account/ProfileCompletenessWidget';
import { QuickActionsWidget } from '@/app/components/account/QuickActionsWidget';
import { MessagesWidget } from '@/app/components/account/MessagesWidget';
import styles from './layout.module.css';

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className={styles.accountWrapper}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Account Settings</h1>
        <p className={styles.pageSubtitle}>
          Manage your personal information, professional details, and account settings
        </p>
      </div>

      {/* 2-Column Grid (70:30 split) */}
      <div className={styles.accountGrid}>
        {/* Column 2 (Center 70%): Tabbed Content Area */}
        <main className={styles.mainColumn}>
          <AccountTabs />
          <div className={styles.contentArea}>
            {children}
          </div>
        </main>

        {/* Column 3 (Right 30%): Hero Sidebar */}
        <aside className={styles.sidebarColumn}>
          <HeroProfileCard />
          <ProfileCompletenessWidget />
          <RoleStatsCard />
          <MessagesWidget />
          <QuickActionsWidget />
        </aside>
      </div>
    </div>
  );
}
