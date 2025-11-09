/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/page.tsx
 * Purpose: Account Settings tab page (Account Hub v4.7)
 * Created: 2025-11-09
 *
 * Phase 5: Consolidated settings page
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
import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h2 className={styles.settingsTitle}>Account Settings</h2>
        <p className={styles.settingsSubtitle}>
          Manage your password, security, and account preferences
        </p>
      </div>

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
  );
}
