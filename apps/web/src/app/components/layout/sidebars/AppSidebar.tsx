/*
 * Filename: src/app/components/layout/sidebars/AppSidebar.tsx
 * Purpose: Main navigation sidebar (left column in 3-column layout)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.1 - AppSidebar (persistent navigation)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './AppSidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  roles?: ('client' | 'tutor' | 'agent')[];
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { activeRole } = useUserProfile();

  // Universal navigation menu - SAME for all roles (do not reorder or rename)
  // Client note: Clients can list lesson requests under Listings
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/listings', label: 'Listings' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/referrals', label: 'Referrals' },
    { href: '/financials', label: 'Financials' },
    { href: '/messages', label: 'Messages' },
    { href: '/network', label: 'Network' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/account', label: 'Account' },
    { href: '/payments', label: 'Payments' },
    { href: '/settings', label: 'Settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className={styles.appSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${
                  isActive(item.href) ? styles.navItemActive : ''
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Role indicator at bottom */}
      {activeRole && (
        <div className={styles.roleIndicator}>
          <div className={styles.roleLabel}>
            Current Role:{' '}
            <span className={styles.roleBadge}>
              {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
