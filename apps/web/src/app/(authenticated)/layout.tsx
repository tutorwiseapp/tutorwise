/*
 * Filename: src/app/(authenticated)/layout.tsx
 * Purpose: 3-column layout for authenticated hub pages (SDD v3.6)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.0 - Application Layout
 *
 * This layout wraps the /bookings, /financials, and /referrals hubs
 * with a 3-column structure:
 * - Left: AppSidebar (main navigation)
 * - Center: Page content (children)
 * - Right: ContextualSidebar (rendered by individual pages)
 *
 * Note: Hub pages are responsible for rendering their own ContextualSidebar
 * content using the ContextualSidebar component and widgets.
 *
 * Security: This layout enforces authentication - only logged-in users
 * can access hub pages. No role restrictions (all roles can access).
 */
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import AppSidebar from '@/app/components/layout/sidebars/AppSidebar';
import styles from './layout.module.css';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const { profile, isLoading } = useUserProfile();
  const router = useRouter();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/signin?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [profile, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!profile) {
    return null;
  }

  // Render authenticated layout
  return (
    <div className={styles.layoutContainer}>
      {/* Left Column: Main Navigation */}
      <AppSidebar />

      {/* Center Column: Page Content (hub pages render their own ContextualSidebar) */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
