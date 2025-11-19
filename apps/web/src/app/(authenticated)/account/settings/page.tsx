/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/page.tsx
 * Purpose: Account Settings tab page (Account Hub v4.8 - aligned with hub UI)
 * Created: 2025-11-09
 * Updated: 2025-11-16 - Added Free Help Now toggle (v5.9)
 *
 * Pattern: Uses ContextualSidebar from authenticated layout, not custom layout
 * Features:
 * - Offer Free Help (tutors only) - v5.9
 * - Change Password
 * - Delete Account
 * - Notification Preferences (future)
 * - Privacy Settings (future)
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Trash2, Bell, Lock, Heart } from 'lucide-react';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import { AccountTabs } from '@/app/components/account/AccountTabs';
import AccountCard from '@/app/components/account/AccountCard';
import IntegrationLinksCard from '@/app/components/students/IntegrationLinksCard';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './page.module.css';

export default function SettingsPage() {
  const { activeRole, profile } = useUserProfile();
  const [isFreeHelpEnabled, setIsFreeHelpEnabled] = useState(false);
  const [isTogglingFreeHelp, setIsTogglingFreeHelp] = useState(false);

  // Load initial free help status
  useEffect(() => {
    if (profile?.available_free_help) {
      setIsFreeHelpEnabled(true);
    }
  }, [profile]);

  const handleFreeHelpToggle = async () => {
    setIsTogglingFreeHelp(true);
    try {
      const endpoint = isFreeHelpEnabled
        ? '/api/presence/free-help/offline'
        : '/api/presence/free-help/online';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update free help status');
      }

      setIsFreeHelpEnabled(!isFreeHelpEnabled);
    } catch (error) {
      console.error('Failed to toggle free help:', error);
      alert('Failed to update free help status. Please try again.');
    } finally {
      setIsTogglingFreeHelp(false);
    }
  };

  return (
    <>
      {/* Center Column - Account Content */}
      <div className={styles.container}>
        <PageHeader
          title="Account Settings"
          subtitle="Manage your personal information, professional details, and account settings"
        />
      </div>

      {/* Tabs - Outside container for full-width effect */}
      <AccountTabs />

      {/* Content container */}
      <div className={styles.container}>
        <div className={styles.content}>
          {/* v5.0: Student Integrations - Only visible to student role */}
          {activeRole === 'student' && (
            <div style={{ marginBottom: 'var(--space-4, 32px)' }}>
              <IntegrationLinksCard />
            </div>
          )}

          <div className={styles.settingsGrid}>
            {/* v5.9: Free Help Now - Only visible to tutors */}
            {activeRole === 'tutor' && (
              <div className={styles.settingCard}>
                <div className={styles.cardIcon}>
                  <Heart size={24} />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Offer Free Help</h3>
                  <p className={styles.cardDescription}>
                    Offer 30-minute free sessions to students. Build your reputation and help the community.
                  </p>
                </div>
                <div className={styles.toggleWrapper}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={isFreeHelpEnabled}
                      onChange={handleFreeHelpToggle}
                      disabled={isTogglingFreeHelp}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
              </div>
            )}
            {/* Change Password */}
            <Link href="/settings/change-password" className={styles.settingCard}>
              <div className={styles.cardIcon}>
                <Lock size={24} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Change Password</h3>
                <p className={styles.cardDescription}>
                  Update your password to keep your account secure
                </p>
              </div>
            </Link>

            {/* Notification Preferences (Future) */}
            <div className={`${styles.settingCard} ${styles.cardDisabled}`}>
              <div className={styles.cardIcon}>
                <Bell size={24} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Notification Preferences</h3>
                <p className={styles.cardDescription}>
                  Manage email and push notification settings
                </p>
                <span className={styles.comingSoonBadge}>Coming Soon</span>
              </div>
            </div>

            {/* Privacy Settings (Future) */}
            <div className={`${styles.settingCard} ${styles.cardDisabled}`}>
              <div className={styles.cardIcon}>
                <Shield size={24} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Privacy Settings</h3>
                <p className={styles.cardDescription}>
                  Control who can see your profile and activity
                </p>
                <span className={styles.comingSoonBadge}>Coming Soon</span>
              </div>
            </div>

            {/* Delete Account */}
            <Link href="/delete-account" className={`${styles.settingCard} ${styles.cardDanger}`}>
              <div className={styles.cardIcon}>
                <Trash2 size={24} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Delete Account</h3>
                <p className={styles.cardDescription}>
                  Permanently delete your account and all associated data
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Account Card */}
      <ContextualSidebar>
        <AccountCard />
      </ContextualSidebar>
    </>
  );
}
