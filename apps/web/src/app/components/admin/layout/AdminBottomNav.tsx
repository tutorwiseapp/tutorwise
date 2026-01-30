/*
 * Filename: src/app/components/admin/layout/AdminBottomNav.tsx
 * Purpose: Mobile bottom navigation bar for admin pages
 * Created: 2026-01-30
 *
 * Features:
 * - Fixed bottom navigation bar for mobile devices
 * - 5 primary admin navigation items (Home, Dashboard, Accounts, SEO, Menu)
 * - Active state highlighting
 * - Only visible on mobile (hidden on desktop)
 * - Menu tab opens AdminMobileMenu slide-in panel
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminMobileMenu from './AdminMobileMenu';
import styles from './AdminBottomNav.module.css';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  isMenuButton?: boolean;
}

export default function AdminBottomNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 22V12h6v10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/admin',
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      href: '/admin/accounts/users',
      label: 'Accounts',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M23 21v-2a4 4 0 0 0-3-3.87"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/admin/seo',
      label: 'SEO',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: 'Menu',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 12h18M3 6h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      isMenuButton: true,
    },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;

    // Home is active only for /
    if (href === '/') {
      return pathname === '/';
    }
    // Dashboard is active only for exact /admin
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  const isMenuActive = () => {
    // Menu is active for other admin pages not in bottom nav
    return pathname?.startsWith('/admin/listings') ||
           pathname?.startsWith('/admin/bookings') ||
           pathname?.startsWith('/admin/referrals') ||
           pathname?.startsWith('/admin/organisations') ||
           pathname?.startsWith('/admin/financials') ||
           pathname?.startsWith('/admin/reviews') ||
           pathname?.startsWith('/admin/resources') ||
           pathname?.startsWith('/admin/signal') ||
           pathname?.startsWith('/admin/configurations') ||
           pathname?.startsWith('/admin/settings');
  };

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.isMenuButton) {
      e.preventDefault();
      setIsMobileMenuOpen(true);
    }
  };

  return (
    <>
      <nav className={styles.bottomNav}>
        <div className={styles.navContainer}>
          {navItems.map((item, index) => {
            const isItemActive = item.isMenuButton ? isMenuActive() : isActive(item.href);

            if (item.isMenuButton) {
              return (
                <button
                  key={`menu-${index}`}
                  className={`${styles.navItem} ${isItemActive ? styles.navItemActive : ''}`}
                  onClick={(e) => handleNavClick(e, item)}
                >
                  <div className={styles.iconWrapper}>
                    {item.icon}
                  </div>
                  <span className={styles.label}>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`${styles.navItem} ${isItemActive ? styles.navItemActive : ''}`}
              >
                <div className={styles.iconWrapper}>
                  {item.icon}
                </div>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Admin Mobile Menu */}
      <AdminMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
