/*
 * Filename: src/app/components/layout/AppSidebar.tsx
 * Purpose: Main navigation sidebar (left column in 3-column layout)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.1 - AppSidebar (persistent navigation)
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useIsAdmin } from '@/lib/rbac/hooks';
import styles from './AppSidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  roles?: ('client' | 'tutor' | 'agent' | 'student' | 'admin')[];
  subItems?: NavItem[];
  indent?: boolean;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeRole } = useUserProfile();
  const { isAdmin: isAdminUser } = useIsAdmin();

  // Track which sections are expanded (use Set for efficient lookups)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Universal navigation menu - SAME for all roles (do not reorder or rename)
  // Client note: Clients can list lesson requests under Listings
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    {
      href: '/organisations?tab=team',
      label: 'Organisations',
      subItems: [
        { href: '/organisations?tab=team', label: 'Team', indent: true },
        { href: '/organisations/tasks', label: 'Tasks', indent: true },
        { href: '/organisations/referrals', label: 'Referrals', indent: true },
        { href: '/organisations/settings', label: 'Settings', indent: true },
      ],
    },
    {
      href: '/listings',
      label: 'Listings',
      subItems: [
        { href: '/listings', label: 'My Listings', indent: true },
        { href: '/listings/create', label: 'Create Listing', indent: true },
      ],
    },
    { href: '/bookings', label: 'Bookings' },
    {
      href: '/virtualspace',
      label: 'VirtualSpace',
      subItems: [
        { href: '/virtualspace', label: 'My Sessions', indent: true },
      ],
    },
    { href: '/sage', label: 'AI Tutor', roles: ['student', 'client', 'tutor', 'agent'] },
    {
      href: '/ai-agents',
      label: 'AI Studio',
      roles: ['tutor', 'agent'],
      subItems: [
        { href: '/ai-agents', label: 'My AI Agents', indent: true },
        { href: '/ai-agents/create', label: 'Create AI Agent', indent: true },
      ],
    },
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
    {
      href: '/edupay',
      label: 'EduPay',
      subItems: [
        { href: '/edupay', label: 'Wallet', indent: true },
        { href: '/edupay/cashback', label: 'Cashback', indent: true },
        { href: '/edupay/savings', label: 'Savings', indent: true },
      ],
    },
    { href: '/messages', label: 'Messages' },
    { href: '/network', label: 'Network' },
    { href: '/reviews', label: 'Reviews' },
    { href: '/wiselists', label: 'Wiselists' }, // v5.7: Pinterest-style Collections
    {
      href: '/account/personal-info', // Matches first subitem for consistent highlighting
      label: 'Account',
      subItems: [
        {
          href: '/account/personal-info',
          label: activeRole ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1) : 'Personal Info',
          indent: true
        },
        {
          href: '/account/students/my-students',
          label: 'My Students',
          indent: true,
          roles: ['client', 'tutor'] // v5.0: Guardian Links (client/tutor only)
        },
      ],
    },
    { href: '/payments', label: 'Payments' },
    { href: '/help-centre', label: 'Help Centre' },
    { href: '/developer/api-keys', label: 'Developer' },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'] }, // Admin-only link
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
      if (path === '/organisations' && expectedParams.has('tab')) {
        return currentParams.get('tab') === expectedParams.get('tab');
      }

      // For all other links, check if all expected params match current params
      for (const [key, value] of expectedParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }

      return true;
    }

    // Special case: /organisations/referrals should match /organisations/[id]/referrals
    if (href === '/organisations/referrals') {
      return pathname === '/organisations/referrals' || pathname?.match(/^\/organisations\/[^/]+\/referrals/);
    }

    // Special case: /organisations/tasks should match /organisations/[id]/tasks
    if (href === '/organisations/tasks') {
      return pathname === '/organisations/tasks' || pathname?.match(/^\/organisations\/[^/]+\/tasks/);
    }

    // Special case: /organisations/settings should match /organisations/settings/*
    if (href === '/organisations/settings') {
      return pathname?.startsWith('/organisations/settings');
    }

    // Special case: /listings/create should match /listings/create/*
    if (href === '/listings/create') {
      return pathname?.startsWith('/listings/create');
    }

    // Special case: /virtualspace should highlight "My Sessions"
    if (href === '/virtualspace') {
      return pathname === '/virtualspace';
    }

    // For non-query param links, use exact match
    return pathname === href;
  };

  // Auto-expand section when navigating to its routes
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems && isParentActive(item.href)) {
        setExpandedSections((prev) => new Set(prev).add(item.href));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <aside className={styles.appSidebar}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            // Role-based filtering: only show item if no roles specified or current role matches
            // Special handling for admin role - check isAdminUser instead of activeRole
            if (item.roles) {
              if (item.roles.includes('admin')) {
                // Admin-only items use isAdminUser check
                if (!isAdminUser) return null;
              } else if (activeRole && !item.roles.includes(activeRole)) {
                return null;
              }
            }

            return (
            <React.Fragment key={item.href}>
              <li>
                {item.subItems ? (
                  // Parent item with submenu - link that navigates and toggles (not highlighted, only children are)
                  <div className={styles.navItemWithSubmenu}>
                    <Link
                      href={item.href}
                      onClick={() => toggleSection(item.href, !!item.subItems)}
                      className={styles.navItem}
                    >
                      <span className={styles.navItemLabel}>{item.label}</span>
                      <span className={`${styles.chevron} ${isSectionExpanded(item.href) ? styles.chevronExpanded : ''}`}>
                        ▼
                      </span>
                    </Link>
                  </div>
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
