/**
 * Filename: apps/web/src/app/components/feature/account/AccountTabs.tsx
 * Purpose: Tabbed navigation for Account Hub (v4.8 - aligned with design system)
 * Created: 2025-11-09
 * Updated: 2025-11-09 - Removed icons, updated to teal color scheme
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
  { href: '/account/personal-info', label: 'Personal Info' },
  { href: '/account/professional', label: 'Professional Info' },
  { href: '/account/settings', label: 'Settings' },
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
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
