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
  subItems?: NavItem[];
  indent?: boolean;
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
    {
      href: '/financials',
      label: 'Financials',
      subItems: [
        { href: '/financials', label: 'Transactions', indent: true },
        { href: '/financials/payouts', label: 'Payouts', indent: true },
        { href: '/financials/disputes', label: 'Disputes', indent: true },
      ],
    },
    { href: '/messages', label: 'Messages' },
    { href: '/network', label: 'Network' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/account', label: 'Account' },
    { href: '/payments', label: 'Payments' },
    { href: '/settings', label: 'Settings' },
  ];

  const isActive = (href: string, hasSubItems?: boolean) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    // For parent items with sub-items, never highlight (sub-items will be highlighted instead)
    if (hasSubItems) {
      return false;
    }
    return pathname?.startsWith(href);
  };

  const isParentActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <aside className={styles.appSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <React.Fragment key={item.href}>
              <li>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive(item.href, !!item.subItems) ? styles.navItemActive : ''
                  } ${item.indent ? styles.navItemIndent : ''}`}
                >
                  {item.label}
                </Link>
              </li>
              {/* Render sub-items if they exist and parent section is active */}
              {item.subItems && isParentActive(item.href) && (
                <>
                  {item.subItems.map((subItem) => (
                    <li key={subItem.href}>
                      <Link
                        href={subItem.href}
                        className={`${styles.navItem} ${
                          pathname === subItem.href ? styles.navItemActive : ''
                        } ${subItem.indent ? styles.navItemIndent : ''}`}
                      >
                        {subItem.label}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </React.Fragment>
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
