/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/page.tsx
 * Purpose: Account Settings tab page (Account Hub v4.8 - aligned with hub UI)
 * Created: 2025-11-09
 * Updated: 2025-11-09 - Refactored to follow Dashboard hub pattern
 *
 * Pattern: Uses ContextualSidebar from authenticated layout, not custom layout
 * Features:
 * - Change Password
 * - Delete Account
 * - Notification Preferences (future)
 * - Privacy Settings (future)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Trash2, Bell, Lock } from 'lucide-react';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import { AccountTabs } from '@/app/components/account/AccountTabs';
import { HeroProfileCard } from '@/app/components/account/HeroProfileCard';
import { RoleStatsCard } from '@/app/components/account/RoleStatsCard';
import { ProfileCompletenessWidget } from '@/app/components/account/ProfileCompletenessWidget';
import { MessagesWidget } from '@/app/components/account/MessagesWidget';
import { QuickActionsWidget } from '@/app/components/account/QuickActionsWidget';
import PageHeader from '@/app/components/ui/PageHeader';
import styles from './page.module.css';

export default function SettingsPage() {
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
          <div className={styles.settingsGrid}>
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

      {/* Right Sidebar - Account Widgets */}
      <ContextualSidebar>
        <HeroProfileCard />
        <ProfileCompletenessWidget />
        <RoleStatsCard />
        <MessagesWidget />
        <QuickActionsWidget />
      </ContextualSidebar>
    </>
  );
}
