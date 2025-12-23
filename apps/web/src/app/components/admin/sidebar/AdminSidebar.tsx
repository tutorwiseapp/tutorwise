/*
 * Filename: src/app/components/admin/sidebar/AdminSidebar.tsx
 * Purpose: Admin navigation sidebar (left column in admin layout)
 * Created: 2025-12-23
 * Pattern: Exact copy of AppSidebar.tsx structure with admin navigation items
 * Specification: Admin Dashboard Solution Design v2, Section 3.1
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminProfile } from '@/lib/rbac';
import styles from './AdminSidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  subItems?: NavItem[];
  indent?: boolean;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useAdminProfile();

  // Admin navigation menu (NO ICONS - text only, following AppSidebar pattern)
  const navItems: NavItem[] = [
    { href: '/admin', label: 'Overview' },
    {
      href: '/admin/seo',
      label: 'SEO',
      subItems: [
        { href: '/admin/seo', label: 'Hubs', indent: true },
        { href: '/admin/seo/spokes', label: 'Spokes', indent: true },
        { href: '/admin/seo/citations', label: 'Citations', indent: true },
        { href: '/admin/seo/config', label: 'Configuration', indent: true },
      ],
    },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/bookings', label: 'Bookings' },
    { href: '/admin/reviews', label: 'Reviews' },
    {
      href: '/admin/financials',
      label: 'Financials',
      subItems: [
        { href: '/admin/financials', label: 'Transactions', indent: true },
        { href: '/admin/financials/payouts', label: 'Payouts', indent: true },
        { href: '/admin/financials/disputes', label: 'Disputes', indent: true },
      ],
    },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  const isActive = (href: string, hasSubItems?: boolean) => {
    // Exact match for root /admin path to prevent false positives
    if (href === '/admin') {
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
    <aside className={styles.adminSidebar}>
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

      {/* Admin role indicator at bottom */}
      {profile && profile.admin_role && (
        <div className={styles.roleIndicator}>
          <div className={styles.roleLabel}>
            Admin Role:{' '}
            <span className={styles.roleBadge}>
              {profile.admin_role === 'superadmin' && 'Superadmin'}
              {profile.admin_role === 'admin' && 'Admin'}
              {profile.admin_role === 'systemadmin' && 'System Admin'}
              {profile.admin_role === 'supportadmin' && 'Support Admin'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
