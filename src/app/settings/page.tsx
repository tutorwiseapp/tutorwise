/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings, migrated to Kinde.
 * Change History:
 * C006 - 2025-08-26 : 15:00 - Replaced Clerk's useUser hook with Kinde's useKindeBrowserClient.
 * C005 - 2025-07-27 : 11:30 - Replaced useAuth with Clerk's useUser hook.
 * Last Modified: 2025-08-26 : 15:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been migrated from Clerk to Kinde. The `useUser` hook was replaced with `useKindeBrowserClient` to manage authentication state and protect the route, resolving the "Module not found" build error.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs'; // --- THIS IS THE FIX ---

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import styles from '@/app/dashboard/page.module.css'; // Re-uses the dashboard grid styles
import settingStyles from './page.module.css';

const SettingsPage = () => {
  const { isAuthenticated, isLoading } = useKindeBrowserClient(); // --- THIS IS THE FIX ---
  const router = useRouter();

  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/api/auth/login'); // --- THIS IS THE FIX ---
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

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