/*
 * Filename: src/app/components/admin/sidebar/AdminSidebar.tsx
 * Purpose: Admin navigation sidebar (left column in admin layout)
 * Created: 2025-12-23
 * Pattern: Exact copy of AppSidebar.tsx structure with admin navigation items
 * Specification: Admin Dashboard Solution Design v2, Section 3.1
 */
'use client';

import React, { useState, useEffect } from 'react';
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

  // Track which sections are expanded (use Set for efficient lookups)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Admin navigation menu (NO ICONS - text only, following AppSidebar pattern)
  const navItems: NavItem[] = [
    { href: '/admin', label: 'Dashboard' },
    {
      href: '/admin/signal',
      label: 'Signal',
      subItems: [
        { href: '/admin/signal', label: 'Analytics', indent: true },
        // Future phases:
        // { href: '/admin/signal/distribution', label: 'Distribution', indent: true },
        // { href: '/admin/signal/experiments', label: 'Experiments', indent: true },
      ],
    },
    {
      href: '/admin/resources',
      label: 'Resources',
      subItems: [
        { href: '/admin/resources', label: 'All Articles', indent: true },
        { href: '/admin/resources/create', label: 'Create Article', indent: true },
        { href: '/admin/resources/seo', label: 'SEO Performance', indent: true },
        { href: '/admin/resources/categories', label: 'Categories', indent: true },
        { href: '/admin/resources/settings', label: 'Settings', indent: true },
      ],
    },
    {
      href: '/admin/seo',
      label: 'SEO',
      subItems: [
        { href: '/admin/seo', label: 'Overview', indent: true },
        { href: '/admin/seo/hubs', label: 'Hubs', indent: true },
        { href: '/admin/seo/spokes', label: 'Spokes', indent: true },
        { href: '/admin/seo/keywords', label: 'Keywords', indent: true },
        { href: '/admin/seo/backlinks', label: 'Backlinks', indent: true },
        { href: '/admin/seo/citations', label: 'Citations', indent: true },
        { href: '/admin/seo/templates', label: 'Templates', indent: true },
        { href: '/admin/seo/config', label: 'Configuration', indent: true },
        { href: '/admin/seo/settings', label: 'Settings', indent: true },
      ],
    },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/bookings', label: 'Bookings' },
    { href: '/admin/referrals', label: 'Referrals' },
    {
      href: '/admin/accounts',
      label: 'Accounts',
      subItems: [
        { href: '/admin/accounts/users', label: 'Users', indent: true },
        { href: '/admin/accounts/admins', label: 'Admins', indent: true },
      ],
    },
    { href: '/admin/organisations', label: 'Organisations' },
    {
      href: '/admin/financials',
      label: 'Financials',
      subItems: [
        { href: '/admin/financials', label: 'Transactions', indent: true },
        { href: '/admin/financials/payouts', label: 'Payouts', indent: true },
        { href: '/admin/financials/disputes', label: 'Disputes', indent: true },
      ],
    },
    { href: '/admin/reviews', label: 'Reviews' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/configurations', label: 'Configurations' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/dashboard', label: 'Exit Admin Dashboard' },
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

  // Auto-expand section when navigating to its routes
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems && isParentActive(item.href)) {
        setExpandedSections((prev) => new Set(prev).add(item.href));
      }
    });
  }, [pathname]);

  // Toggle section expansion
  const toggleSection = (href: string, hasSubItems: boolean) => {
    if (!hasSubItems) return; // Only toggle items with submenus

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  // Check if section is expanded (either manually or by route)
  const isSectionExpanded = (href: string) => {
    return expandedSections.has(href);
  };

  return (
    <aside className={styles.adminSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <React.Fragment key={item.href}>
              <li>
                {item.subItems ? (
                  // Parent item with submenu - clickable to toggle
                  <button
                    onClick={() => toggleSection(item.href, !!item.subItems)}
                    className={`${styles.navItem} ${styles.navItemButton} ${
                      isParentActive(item.href) ? styles.navItemActive : ''
                    }`}
                  >
                    <span className={styles.navItemLabel}>{item.label}</span>
                    <span className={`${styles.chevron} ${isSectionExpanded(item.href) ? styles.chevronExpanded : ''}`}>
                      ▼
                    </span>
                  </button>
                ) : (
                  // Regular link item without submenu
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${
                      isActive(item.href, false) ? styles.navItemActive : ''
                    } ${item.indent ? styles.navItemIndent : ''}`}
                  >
                    <span className={styles.navItemLabel}>{item.label}</span>
                  </Link>
                )}
              </li>
              {/* Render sub-items if section is expanded */}
              {item.subItems && isSectionExpanded(item.href) && (
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
