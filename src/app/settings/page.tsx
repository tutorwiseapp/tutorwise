/*
 * Filename: src/app/settings/page.tsx
 * Purpose: Provides a central hub for users to manage application and account settings.
 * Last Modified: 2025-09-08
 * Requirement ID: VIN-A-005
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import toast from 'react-hot-toast';

import Container from '@/app/components/layout/Container';
import PageHeader from '@/app/components/ui/PageHeader';
import Checkbox from '@/app/components/ui/form/Checkbox';
import dashboardStyles from '@/app/dashboard/page.module.css';
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

  const handleToggleNotifications = (e: React.MouseEvent) => {
    e.preventDefault();
    setDesktopNotificationsEnabled(prev => !prev);
  };

  const handleSendTestNotification = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('Vinite Test Notification', {
        body: 'If you can see this, notifications are working!',
        icon: '/favicon.ico'
      });
      toast.success('Test notification sent!');
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Vinite Test Notification', {
            body: 'If you can see this, notifications are working!',
            icon: '/favicon.ico'
          });
          toast.success('Permissions granted and test notification sent!');
        } else {
          toast.error('Notification permissions were not granted.');
        }
      });
    } else {
       toast.error('Notifications are blocked. Please enable them in your browser settings.');
    }
  };


  if (isLoading || !profile) {
    return <Container><p className={dashboardStyles.loading}>Loading...</p></Container>;
  }

  return (
    <Container>
      <PageHeader title="Settings" />
      <div className={dashboardStyles.grid}>
        <div className={dashboardStyles.gridCard}>
          <div className={dashboardStyles.cardContent}>
            <h3>Desktop Notifications</h3>
            <p>Get alerts on your desktop when a referral converts or a payment is made.</p>
          </div>
          <div className={settingStyles.action}>
            <div className={settingStyles.actionGroup}>
                <span className={desktopNotificationsEnabled ? settingStyles.statusEnabled : settingStyles.statusDisabled}>
                  {desktopNotificationsEnabled ? 'Enabled' : 'Disabled'}
                </span>
            </div>
            <a href="#" onClick={handleToggleNotifications} className={`${dashboardStyles.cardLink} ${settingStyles.toggleLink} ${desktopNotificationsEnabled ? settingStyles.dangerLink : ''}`}>
              {desktopNotificationsEnabled ? 'Disable' : 'Enable'}
            </a>
            <a href="#" onClick={handleSendTestNotification} className={dashboardStyles.cardLink}>Send Test</a>
          </div>
        </div>
        <div className={`${dashboardStyles.gridCard} ${settingStyles.contentStart}`}>
          <div className={dashboardStyles.cardContent}>
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
        <div className={dashboardStyles.gridCard}>
          <div className={dashboardStyles.cardContent}>
            <h3>Account Security</h3>
            <p>Manage your login credentials.</p>
          </div>
           <Link href="/settings/change-password" className={dashboardStyles.cardLink}>Change Password</Link>
        </div>
        <div className={dashboardStyles.gridCard}>
          <div className={dashboardStyles.cardContent}>
            <h3>Data & Privacy</h3>
            <p>Delete your account and all associated data permanently.</p>
          </div>
           <Link href="/delete-account" className={`${dashboardStyles.cardLink} ${settingStyles.dangerLink}`}>Delete Account</Link>
        </div>
      </div>
    </Container>
  );
};

export default SettingsPage;