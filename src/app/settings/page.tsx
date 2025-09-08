/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings.
 * Change History:
 * C006 - 2025-09-02 : 21:00 - Added 'use client' directive and migrated to useUserProfile.
 * Last Modified: 2025-09-02 : 21:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This is the definitive fix for the build error. The "'use client'" directive has been added to the top of the file, correctly declaring it as a Client Component. It has also been fully migrated to use the Supabase-powered `useUserProfile` hook for authentication and data.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import styles from '@/app/dashboard/page.module.css';
import settingStyles from './page.module.css';

const SettingsPage = () => {
  const { profile, isLoading } = useUserProfile();
  const router = useRouter();

  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login');
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
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
          <div className={settingStyles.action}>
            {desktopNotificationsEnabled ? (
              <>
                <span className={settingStyles.statusEnabled}>Enabled</span>
                <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(false); }} className={`${styles.cardLink} ${settingStyles.dangerLink}`}>Disable</a>
              </>
            ) : (
              <>
                <span className={settingStyles.statusDisabled}>Disabled</span>
                <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(true); }} className={styles.cardLink}>Enable</a>
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