/*
 * Filename: src/app/components/layout/AppSidebar.tsx
 * Purpose: Main navigation sidebar (left column in 3-column layout)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.1 - AppSidebar (persistent navigation)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './AppSidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  roles?: ('client' | 'tutor' | 'agent' | 'student')[];
  subItems?: NavItem[];
  indent?: boolean;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeRole } = useUserProfile();

  // Universal navigation menu - SAME for all roles (do not reorder or rename)
  // Client note: Clients can list lesson requests under Listings
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    {
      href: '/organisation',
      label: 'Organisation',
      subItems: [
        { href: '/organisation/tasks', label: 'Tasks', indent: true },
        { href: '/organisation/referrals', label: 'Referrals', indent: true },
      ],
    },
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
    { href: '/my-students', label: 'My Students', roles: ['client', 'tutor'] }, // v5.0: Guardian Links (client/tutor only)
    { href: '/reviews', label: 'Reviews' },
    { href: '/wiselists', label: 'Wiselists' }, // v5.7: Pinterest-style Collections
    { href: '/account', label: 'Account' },
    { href: '/payments', label: 'Payments' },
    { href: '/help-centre', label: 'Help Centre' },
    { href: '/developer/api-keys', label: 'Developer' },
  ];

  const isActive = (href: string, hasSubItems?: boolean) => {
    // Exact match for root path and dashboard to prevent false positives
    if (href === '/' || href === '/dashboard') {
      return pathname === href;
    }
    // For parent items with sub-items, never highlight (sub-items will be highlighted instead)
    if (hasSubItems) {
      return false;
    }
    return pathname?.startsWith(href);
  };

  const isParentActive = (href: string) => {
    // Extract path without query params for parent link checking
    const path = href.split('?')[0];
    return pathname?.startsWith(path);
  };

  const isSubItemActive = (href: string) => {
    // Check if href contains query params
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      const currentPath = pathname;
      const currentQuery = searchParams?.toString();

      // Parse expected query params from href
      const expectedParams = new URLSearchParams(query);
      const currentParams = new URLSearchParams(currentQuery);

      // Check if path matches
      if (currentPath !== path) return false;

      // For organisation links, only check if the 'tab' param matches
      // This keeps the link highlighted when on that tab, regardless of other params (like subtab)
      // This matches how Financials works - /financials stays highlighted on /financials/payouts
      if (path === '/organisation' && expectedParams.has('tab')) {
        return currentParams.get('tab') === expectedParams.get('tab');
      }

      // For all other links, check if all expected params match current params
      for (const [key, value] of expectedParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }

      return true;
    }

    // Special case: /organisation/referrals should match /organisation/[id]/referrals
    if (href === '/organisation/referrals') {
      return pathname === '/organisation/referrals' || pathname?.match(/^\/organisation\/[^/]+\/referrals/);
    }

    // Special case: /organisation/tasks should match /organisation/[id]/tasks
    if (href === '/organisation/tasks') {
      return pathname === '/organisation/tasks' || pathname?.match(/^\/organisation\/[^/]+\/tasks/);
    }

    // For non-query param links, use exact match
    return pathname === href;
  };

  return (
    <aside className={styles.appSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            // Role-based filtering: only show item if no roles specified or current role matches
            if (item.roles && activeRole && !item.roles.includes(activeRole)) {
              return null;
            }

            return (
            <React.Fragment key={item.href}>
              <li>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive(item.href, !!item.subItems) ? styles.navItemActive : ''
                  } ${item.indent ? styles.navItemIndent : ''}`}
                >
                  <span className={styles.navItemLabel}>{item.label}</span>
                  {item.subItems && (
                    <span className={`${styles.chevron} ${isParentActive(item.href) ? styles.chevronExpanded : ''}`}>
                      ▼
                    </span>
                  )}
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
                          isSubItemActive(subItem.href) ? styles.navItemActive : ''
                        } ${subItem.indent ? styles.navItemIndent : ''}`}
                      >
                        {subItem.label}
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </React.Fragment>
            );
          })}
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
