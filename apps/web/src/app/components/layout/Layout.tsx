/*
 * Filename: src/app/components/layout/Layout.tsx
 * Purpose: Provides the main visual layout for the application (Header, Main, Footer).
 * ...
 * Change Summary:
 * The component's styling has been correctly moved to a dedicated CSS module. All redundant
 * and incorrect font definitions have been removed.
 * Updated: 2025-11-03 - Hide footer on hub pages (bookings, financials, referrals)
 */
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import styles from './Layout.module.css'; // This import will now find the file

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // Hide footer on hub pages (3-column layout pages)
  const isHubPage = pathname?.startsWith('/dashboard') ||
                    pathname?.startsWith('/bookings') ||
                    pathname?.startsWith('/financials') ||
                    pathname?.startsWith('/referrals') ||
                    pathname?.startsWith('/listings') ||
                    pathname?.startsWith('/reviews') ||
                    pathname?.startsWith('/messages') ||
                    pathname?.startsWith('/network');

  return (
    <div className={styles.appWrapper}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      {!isHubPage && <Footer />}
    </div>
  );
};

export default Layout;