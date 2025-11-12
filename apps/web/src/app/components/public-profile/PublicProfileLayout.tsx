/**
 * Filename: apps/web/src/app/components/public-profile/PublicProfileLayout.tsx
 * Purpose: Client-side wrapper for public profile with conditional AppSidebar
 * Created: 2025-11-12
 * Updated: 2025-11-12 - Implements conditional AppSidebar for authenticated users
 *
 * Features:
 * - Conditional AppSidebar rendering (shown for authenticated users, hidden for anonymous)
 * - Maintains consistent 3-column layout for authenticated users
 * - Seamless 2-column layout for anonymous visitors
 */
'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AppSidebar from '@/app/components/layout/sidebars/AppSidebar';
import styles from './PublicProfileLayout.module.css';

interface PublicProfileLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function PublicProfileLayout({ children, sidebar }: PublicProfileLayoutProps) {
  const { profile, isLoading } = useUserProfile();
  const isAuthenticated = !isLoading && !!profile;

  return (
    <div className={`${styles.layoutContainer} ${isAuthenticated ? styles.authenticated : styles.anonymous}`}>
      {/* Conditionally render AppSidebar for authenticated users */}
      {isAuthenticated && <AppSidebar />}

      {/* Main Content */}
      <div className={styles.mainContent}>
        {children}
      </div>

      {/* Right Sidebar */}
      <div className={styles.rightSidebar}>
        {sidebar}
      </div>
    </div>
  );
}
