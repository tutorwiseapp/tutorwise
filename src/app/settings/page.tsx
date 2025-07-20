/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings.
 *
 * Change History:
 * C002 - 2025-07-20 : 10:30 - Updated 'Account Security' card to link to the new change-password page.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 10:30
 * Requirement ID (optional): VIN-A-005
 *
 * Change Summary:
 * Changed the "Change Password" link in the "Account Security" card to point to the canonical
 * `/settings/change-password` route instead of the profile page. This integrates the new page
 * into the user settings flow.
 *
 * Impact Analysis:
 * This change correctly routes the user to the dedicated password change form, improving security
 * and user experience.
 *
 * Dependencies: "react", "next/link", "@/app/components/auth/AuthProvider", and various UI components.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { User } from '@/types';

// Import our real, reusable components
import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import styles from './page.module.css';

const SettingsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem('vinite_loggedin_user') || 'null');
    setUser(loggedInUser);

    const savedFontSize = localStorage.getItem('app_font_size');
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_font_size', fontSize.toString());
  }, [fontSize]);

  if (!user) {
    return <Container><p className={styles.loading}>Loading...</p></Container>;
  }

  const dynamicFontStyles = {
    '--font-size-dynamic-xl': `${fontSize * 1.25}px`,
    '--font-size-dynamic-base': `${fontSize}px`,
    '--font-size-dynamic-sm': `${fontSize * 1.00}px`,
  } as React.CSSProperties;

  return (
    <Container>
      <div style={dynamicFontStyles}>
        
        <div className={styles.pageHeaderContainer}>
          <PageHeader title="Settings" />
          <div className={styles.fontSizeSelector}>
            <button className={`${styles.fontSizeButton} ${fontSize === 14 ? styles.active : ''}`} onClick={() => setFontSize(14)}>A</button>
            <button className={`${styles.fontSizeButton} ${fontSize === 16 ? styles.active : ''}`} onClick={() => setFontSize(16)}>A</button>
            <button className={`${styles.fontSizeButton} ${fontSize === 18 ? styles.active : ''}`} onClick={() => setFontSize(18)}>A</button>
          </div>
        </div>
        
        <div className={styles.settingsGrid}>
        
          <div className={styles.settingsCard}>
            <div className={styles.content}>
              <h3 className={styles.title}>Desktop Notifications</h3>
              <p className={styles.description}>Get alerts on your desktop when a referral converts or a payment is made.</p>
            </div>
            <div className={`${styles.action} ${styles.notificationActions}`}>
              {desktopNotificationsEnabled ? (
                <>
                  <span className={styles.statusEnabled}>Enabled</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(false); }} className={`${styles.cardActionLink} ${styles.dangerLink}`}>Disable</a>
                  <a href="#" className={styles.cardActionLink}>Send Test</a>
                </>
              ) : (
                <>
                  <span className={styles.statusDisabled}>Disabled</span>
                  <div></div>
                  <a href="#" onClick={(e) => { e.preventDefault(); setDesktopNotificationsEnabled(true); }} className={styles.cardActionLink}>Enable</a>
                </>
              )}
            </div>
          </div>

          <div className={styles.settingsCard}>
            <div className={styles.content}>
              <h3 className={styles.title}>Email Notifications</h3>
              <div className={styles.checkboxGroup}>
                 <div className={styles.checkboxItem}>
                    <label htmlFor="conversionAlerts" className={styles.checkboxLabelText}>Referral conversion alerts.</label>
                    <Checkbox id="conversionAlerts" label="" checked={conversionAlerts} onCheckedChange={() => setConversionAlerts(p => !p)} />
                 </div>
                 <div className={styles.checkboxItem}>
                    <label htmlFor="newsUpdates" className={styles.checkboxLabelText}>Platform news and updates.</label>
                    <Checkbox id="newsUpdates" label="" checked={newsUpdates} onCheckedChange={() => setNewsUpdates(p => !p)} />
                 </div>
              </div>
            </div>
          </div>
          
          <div className={styles.settingsCard}>
            <div className={styles.content}>
              <h3 className={styles.title}>Account Security</h3>
              <p className={styles.description}>Manage your login credentials and enable two-factor authentication.</p>
            </div>
            <div className={styles.action}>
               {/* --- THIS IS THE FIX --- */}
              <Link href="/settings/change-password" className={styles.cardActionLink}>Change Password</Link>
            </div>
          </div>

          <div className={styles.settingsCard}>
            <div className={styles.content}>
              <h3 className={styles.title}>Data & Privacy</h3>
              <p className={styles.description}>Delete your account and all associated data permanently. This action cannot be undone.</p>
            </div>
            <div className={styles.action}>
               <Link href="/delete-account" className={`${styles.cardActionLink} ${styles.dangerLink}`}>Delete Account</Link>
            </div>
          </div>

        </div>
      </div>
    </Container>
  );
};

export default SettingsPage;