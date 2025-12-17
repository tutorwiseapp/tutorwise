/*
 * Filename: src/app/components/layout/Layout.tsx
 * Purpose: Provides the main visual layout for the application (Header, Main, Footer).
 * ...
 * Change Summary:
 * The component's styling has been correctly moved to a dedicated CSS module. All redundant
 * and incorrect font definitions have been removed.
 * Updated: 2025-11-03 - Hide footer on hub pages (bookings, financials, referrals)
 * Updated: 2025-12-02 - Hide header on hub pages to prevent double header with HubHeader
 * Updated: 2025-12-17 - Refactored footer logic: whitelist public pages instead of blacklisting hub pages
 *                       This prevents needing to update Layout.tsx every time a new hub page is created
 */
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import styles from './Layout.module.css'; // This import will now find the file

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // Define public pages that should show the footer
  // All other pages (authenticated hub pages) will NOT show the footer
  const publicPagesWithFooter = [
    '/',
    '/about',
    '/help-centre',
    '/your-home',
    '/signin',
    '/signup',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/developer/docs', // Public API documentation
  ];

  // Check if current page should show footer
  const shouldShowFooter = publicPagesWithFooter.some(path =>
    pathname === path || pathname?.startsWith(path + '/')
  ) || pathname?.startsWith('/public-profile/');

  return (
    <div className={styles.appWrapper}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      {shouldShowFooter && <Footer />}
      <BottomNav />
    </div>
  );
};

export default Layout;