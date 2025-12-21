/*
 * Filename: src/app/components/layout/BottomNav.tsx
 * Purpose: Mobile bottom navigation bar for marketplace and main app navigation
 * Created: 2025-12-10
 * Updated: 2025-12-11 - Integrated MobileMenu component for hamburger menu
 *
 * Features:
 * - Fixed bottom navigation bar for mobile devices
 * - 5 primary navigation items (Home, Dashboard, Bookings, Referrals, Menu)
 * - Active state highlighting
 * - Badge support for notifications
 * - Only visible on mobile (hidden on desktop)
 * - Authentication-aware routing for protected pages
 * - Menu tab opens MobileMenu slide-in panel
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import MobileMenu from './MobileMenu';
import styles from './BottomNav.module.css';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  requiresAuth?: boolean;
  isMenuButton?: boolean;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUserProfile();
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
      href: '/dashboard',
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
      href: '/bookings',
      label: 'Bookings',
      icon: (
        <svg width="27" height="27" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 14l9-5-9-5-9 5 9 5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      requiresAuth: true,
    },
    {
      href: '/referrals',
      label: 'Referrals',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 12v8H4v-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 7H2l2-4h16l2 4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 12v8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 7v5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      requiresAuth: true,
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

    // Home is active for /, /marketplace, and /about-tutorwise
    if (href === '/') {
      return pathname === '/' || pathname === '/marketplace' || pathname === '/about-tutorwise';
    }
    return pathname?.startsWith(href);
  };

  const isMenuActive = () => {
    // Menu is active for account, messages, wiselists, network, financials, payments, listings, marketplace, reviews, organisation, my-students
    return pathname?.startsWith('/account') ||
           pathname?.startsWith('/messages') ||
           pathname?.startsWith('/wiselists') ||
           pathname?.startsWith('/network') ||
           pathname?.startsWith('/financials') ||
           pathname?.startsWith('/payments') ||
           pathname?.startsWith('/listings') ||
           pathname?.startsWith('/marketplace') ||
           pathname?.startsWith('/reviews') ||
           pathname?.startsWith('/organisation') ||
           pathname?.startsWith('/my-students');
  };

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    // If it's the menu button, toggle mobile menu
    if (item.isMenuButton) {
      e.preventDefault();
      setIsMobileMenuOpen(true);
      return;
    }

    // If the item requires auth and user is not logged in, redirect to login
    if (item.requiresAuth && !profile) {
      e.preventDefault();
      router.push('/login');
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
                    {item.badge && item.badge > 0 && (
                      <span className={styles.badge}>{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
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
                onClick={(e) => handleNavClick(e, item)}
              >
                <div className={styles.iconWrapper}>
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className={styles.badge}>{item.badge > 99 ? '99+' : item.badge}</span>
                  )}
                </div>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}
