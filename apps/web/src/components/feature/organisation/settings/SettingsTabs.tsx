/**
 * Filename: SettingsTabs.tsx
 * Purpose: Tab navigation for Organisation Settings pages
 * Created: 2026-01-07
 * Design: Matches referrals tab pattern
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SettingsTabs.module.css';

export interface SettingsTab {
  id: string;
  label: string;
  href: string;
}

interface SettingsTabsProps {
  tabs: SettingsTab[];
}

export default function SettingsTabs({ tabs }: SettingsTabsProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${styles.tab} ${isActive(tab.href) ? styles.tabActive : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
