/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings.
 * Change History:
 * C005 - 2025-07-27 : 11:30 - Replaced `useAuth` with Clerk's `useUser` hook.
 * C004 - 2025-07-22 : 00:15 - Applied contentStart class to fix email card alignment.
 * C003 - 2025-07-21 : 23:30 - Refactored to use the standardized grid system from the dashboard.
 * C002 - 2025-07-20 : 10:30 - Updated 'Account Security' card link.
 * C001 - [Date] : [Time] - Initial creation.
 * Last Modified: 2025-07-27 : 11:30
 * Requirement ID (optional): VIN-A-005
 * Change Summary: This is the definitive fix for the `AuthProvider` issue. The old `useAuth`
 * hook has been surgically replaced with `useUser` from Clerk. A standard `useEffect` hook has
 * been added to handle loading states and protect the route by redirecting unauthenticated users.
 * Impact Analysis: This change resolves the final `AuthProvider` dependency crash, fully
 * migrating the Settings page to the Clerk authentication system while preserving all
 * existing layout, styles, and functionality.
 * Dependencies: "@clerk/nextjs", "next/link", "next/navigation", and VDL UI components.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import styles from '@/app/dashboard/page.module.css'; // Re-uses the dashboard grid styles
import settingStyles from './page.module.css';

const SettingsPage = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Your existing state management is preserved
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);

  // This effect protects the route, ensuring only logged-in users can see it.
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // While Clerk is loading the user session, we show a loading state.
  if (!isLoaded || !user) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  // The rest of your component's JSX is preserved exactly as it was.
  return (
    <Container>
      <PageHeader title="Settings" />
      
      <div className={styles.grid}>
      
        <div className={styles.gridCard}>
          <div className={styles.cardContent}>
            <h3>Desktop Notifications</h3>
            <p>Get alerts on your desktop when a referral converts or a payment is made.</p>
          </div>
          <div className={`${settingStyles.action} ${settingStyles.notificationActions}`}>
            {desktopNotificationsEnabled ? (
              <>
                <span className={settingStyles.statusEnabled}>Enabled</span>
                <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(false); }} className={`${settingStyles.cardActionLink} ${settingStyles.dangerLink}`}>Disable</a>
                <a href="#" className={settingStyles.cardActionLink}>Send Test</a>
              </>
            ) : (
              <>
                <span className={settingStyles.statusDisabled}>Disabled</span>
                <div></div>
                <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(true); }} className={settingStyles.cardActionLink}>Enable</a>
              </>
            )}
          </div>
        </div>

        <div className={`${styles.gridCard} ${settingStyles.contentStart}`}>
          <div className={styles.cardContent}>
            <h3>Email Notifications</h3>
          </div>
          <div className={settingStyles.checkboxGroup}>
              <div className={settingStyles.checkboxItem}>
                <label htmlFor="conversionAlerts" className={settingStyles.checkboxLabelText}>Referral activity alerts.</label>
                <Checkbox id="conversionAlerts" label="" checked={conversionAlerts} onCheckedChange={() => setConversionAlerts(p => !p)} />
              </div>
              <div className={settingStyles.checkboxItem}>
                <label htmlFor="newsUpdates" className={settingStyles.checkboxLabelText}>News and updates.</label>
                <Checkbox id="newsUpdates" label="" checked={newsUpdates} onCheckedChange={() => setNewsUpdates(p => !p)} />
              </div>
          </div>
        </div>
        
        <div className={styles.gridCard}>
          <div className={styles.cardContent}>
            <h3>Account Security</h3>
            <p>Manage your login credentials.</p>
          </div>
          <Link href="/settings/change-password" className={styles.cardLink}>Change Password</Link>
        </div>

        <div className={styles.gridCard}>
          <div className={styles.cardContent}>
            <h3>Data & Privacy</h3>
            <p>Delete your account and all associated data permanently.</p>
          </div>
           <Link href="/delete-account" className={`${styles.cardLink} ${settingStyles.dangerLink}`}>Delete Account</Link>
        </div>

      </div>
    </Container>
  );
};

export default SettingsPage;