/*
 * Filename: src/app/components/layout/BottomNav.tsx
 * Purpose: Mobile bottom navigation bar for marketplace and main app navigation
 * Created: 2025-12-10
 *
 * Features:
 * - Fixed bottom navigation bar for mobile devices
 * - 5 primary navigation items (Home, Search, Wiselists, Messages, Account)
 * - Active state highlighting
 * - Badge support for notifications
 * - Only visible on mobile (hidden on desktop)
 * - Authentication-aware routing for protected pages
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './BottomNav.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  requiresAuth?: boolean;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUserProfile();

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
      href: '/saved',
      label: 'Saved',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/messages',
      label: 'Messages',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/account',
      label: 'Account',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    // Home is active for /, /marketplace, and /your-home
    if (href === '/') {
      return pathname === '/' || pathname === '/marketplace' || pathname === '/your-home';
    }
    // Saved tab is active for both /saved and /wiselists
    if (href === '/saved') {
      return pathname === '/saved' || pathname?.startsWith('/wiselists');
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.navContainer}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
          >
            <div className={styles.iconWrapper}>
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className={styles.badge}>{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </div>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
