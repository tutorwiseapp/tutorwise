/*
 * Filename: src/components/layout/BottomNav.tsx
 * Purpose: Mobile bottom navigation bar for marketplace and main app navigation
 * Created: 2025-12-10
 * Updated: 2025-12-11 - Integrated MobileMenu component for hamburger menu
 * Updated: 2026-01-30 - Route-based admin navigation (renders AdminBottomNav on /admin/* routes)
 *
 * Features:
 * - Fixed bottom navigation bar for mobile devices
 * - 5 primary navigation items (Home, Dashboard, Bookings, Referrals, Menu)
 * - Active state highlighting
 * - Badge support for notifications
 * - Only visible on mobile (hidden on desktop)
 * - Authentication-aware routing for protected pages
 * - Menu tab opens MobileMenu slide-in panel
 * - Route-based detection: renders AdminBottomNav when on /admin/* routes
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, LayoutDashboard, CalendarDays, Users, Menu as MenuIcon } from 'lucide-react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import MobileMenu from './MobileMenu';
import AdminBottomNav from '@/components/admin/layout/AdminBottomNav';
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
  const isAdminUser = profile?.is_admin === true;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Route-based detection: if on admin routes, render AdminBottomNav
  const isAdminRoute = pathname?.startsWith('/admin');
  if (isAdminRoute && isAdminUser) {
    return <AdminBottomNav />;
  }

  const navItems: NavItem[] = [
    {
      href: '/marketplace',
      label: 'Explore',
      icon: <Compass size={22} strokeWidth={1.75} />,
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={22} strokeWidth={1.75} />,
    },
    {
      href: '/bookings',
      label: 'Bookings',
      icon: <CalendarDays size={22} strokeWidth={1.75} />,
      requiresAuth: true,
    },
    {
      href: '/referrals',
      label: 'Referrals',
      icon: <Users size={22} strokeWidth={1.75} />,
      requiresAuth: true,
    },
    {
      label: 'Menu',
      icon: <MenuIcon size={22} strokeWidth={1.75} />,
      isMenuButton: true,
    },
  ];

  const isActive = (href?: string) => {
    if (!href) return false;

    // Explore is active for /marketplace, /, and /about-tutorwise
    if (href === '/marketplace') {
      return pathname === '/marketplace' || pathname === '/' || pathname === '/about-tutorwise';
    }
    return pathname?.startsWith(href);
  };

  const isMenuActive = () => {
    // Menu is active for account, messages, wiselists, network, financials, payments, listings, marketplace, reviews, organisation
    // Note: my-students is now under /account/students/my-students, so covered by /account check
    return pathname?.startsWith('/account') ||
           pathname?.startsWith('/messages') ||
           pathname?.startsWith('/wiselists') ||
           pathname?.startsWith('/network') ||
           pathname?.startsWith('/financials') ||
           pathname?.startsWith('/payments') ||
           pathname?.startsWith('/listings') ||
           pathname?.startsWith('/marketplace') ||
           pathname?.startsWith('/reviews') ||
           pathname?.startsWith('/organisations');
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
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAdminUser={isAdminUser}
      />
    </>
  );
}
