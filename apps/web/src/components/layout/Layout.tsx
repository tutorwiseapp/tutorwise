/*
 * Filename: src/components/layout/Layout.tsx
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
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from './Layout.module.css'; // This import will now find the file

// Lazy load LexiChatModal to reduce initial bundle size and prevent hydration issues
const LexiChatModal = dynamic(
  () => import('@/components/feature/lexi').then(mod => ({ default: mod.LexiChatModal })),
  { ssr: false }
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user } = useUserProfile();

  // Define public pages that should show the footer
  // All other pages (authenticated hub pages) will NOT show the footer
  const publicPagesWithFooter = [
    '/',
    '/about',
    '/resources', // Resource articles and category pages
    '/help-centre',
    '/about-tutorwise',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/developer/docs', // Public API documentation
  ];

  // Public-facing pages where the bottom nav should NOT appear.
  // These pages use sticky CTAs instead (MobileBottomCTA) and don't need app navigation.
  const publicRoutesWithoutBottomNav = [
    '/',
    '/marketplace',
    '/about-tutorwise',
    '/resources',
    '/help-centre',
    '/agencies',
    '/companies',
    '/schools',
    '/join',
    '/w',
    '/listings',
    '/public-profile',
    '/org',
  ];

  // Check if current page should show footer
  const shouldShowFooter = publicPagesWithFooter.some(path =>
    pathname === path || pathname?.startsWith(path + '/')
  ) || pathname?.startsWith('/public-profile/');

  // Signed-in users always get bottom nav regardless of page type.
  // Guests skip it on public/marketing pages (those use sticky CTAs instead).
  const shouldShowBottomNav = user
    ? true
    : !publicRoutesWithoutBottomNav.some(path =>
        pathname === path || pathname?.startsWith(path + '/')
      );

  return (
    <div className={styles.appWrapper}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      {shouldShowFooter && <Footer />}
      {shouldShowBottomNav && <BottomNav />}
      {/* Lexi AI Assistant - Available on all pages */}
      <LexiChatModal />
    </div>
  );
};

export default Layout;