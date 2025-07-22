/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings.
 *
 * Change History:
 * C004 - 2025-07-22 : 00:15 - Applied contentStart class to fix email card alignment.
 * C003 - 2025-07-21 : 23:30 - Refactored to use the standardized grid system from the dashboard.
 * C002 - 2025-07-20 : 10:30 - Updated 'Account Security' card link.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 00:15
 * Requirement ID (optional): VIN-A-005
 *
 * Change Summary:
 * The "Email Notifications" card now uses the `settingStyles.contentStart` utility class.
 * This overrides the default vertical centering and aligns its content to the top, creating
 * a visually consistent layout with the other cards on the page.
 *
 * Impact Analysis:
 * This change resolves the final layout inconsistency on the Settings page.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import styles from '@/app/dashboard/page.module.css';
import settingStyles from './page.module.css';

const SettingsPage = () => {
  const { user, isLoading } = useAuth();
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);

  if (isLoading || !user) {
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

        {/* --- THIS IS THE FIX --- */}
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