/**
 * Filename: apps/web/src/app/components/account/AccountTabs.tsx
 * Purpose: Tabbed navigation for Account Hub (v4.7)
 * Created: 2025-11-09
 *
 * Renders tab navigation for:
 * - Personal Info
 * - Professional Info
 * - Settings
 */
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './AccountTabs.module.css';

const tabs = [
  { href: '/account/personal-info', label: 'Personal Info', icon: '👤' },
  { href: '/account/professional', label: 'Professional Info', icon: '💼' },
  { href: '/account/settings', label: 'Settings', icon: '⚙️' },
];

export function AccountTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabsNav} aria-label="Account sections">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
