/**
 * Filename: apps/web/src/app/(authenticated)/account/settings/page.tsx
 * Purpose: Account Settings tab page (Account Hub v4.8 - aligned with hub UI)
 * Created: 2025-11-09
 * Updated: 2025-11-30 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 *
 * Pattern: Uses HubSidebar from authenticated layout, not custom layout
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
import { usePathname } from 'next/navigation';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import AccountTipWidget from '@/app/components/feature/account/AccountTipWidget';
import AccountVideoWidget from '@/app/components/feature/account/AccountVideoWidget';
import IntegrationLinksCard from '@/app/components/feature/students/IntegrationLinksCard';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import AccountHeroHeader from '@/app/components/feature/account/AccountHeroHeader';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

export default function SettingsPage() {
  const { activeRole, profile } = useUserProfile();
  const pathname = usePathname();
  const [isFreeHelpEnabled, setIsFreeHelpEnabled] = useState(false);
  const [isTogglingFreeHelp, setIsTogglingFreeHelp] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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

  // Action handlers
  const handleViewPublicProfile = () => {
    if (profile?.id && profile?.slug) {
      window.open(`/public-profile/${profile.id}/${profile.slug}`, '_blank');
    } else if (profile?.id) {
      window.open(`/public-profile/${profile.id}`, '_blank');
    }
  };

  const handleGrowMyNetwork = () => {
    setShowActionsMenu(false);
    window.location.href = '/network';
  };

  const handlePlanMyBookings = () => {
    setShowActionsMenu(false);
    window.location.href = '/wiselists';
  };

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'personal-info', label: 'Personal Info', active: pathname === '/account/personal-info' },
    { id: 'professional-info', label: 'Professional Info', active: pathname === '/account/professional-info' },
    { id: 'settings', label: 'Settings', active: pathname === '/account/settings' },
  ];

  const handleTabChange = (tabId: string) => {
    window.location.href = `/account/${tabId}`;
  };

  return (
    <HubPageLayout
      header={
        <AccountHeroHeader
          actions={
            <>
              {/* Primary Action: View Public Profile */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleViewPublicProfile}
              >
                View Public Profile
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                      <button
                        onClick={handleGrowMyNetwork}
                        className={actionStyles.menuButton}
                      >
                        Grow My Network
                      </button>
                      <button
                        onClick={handlePlanMyBookings}
                        className={actionStyles.menuButton}
                      >
                        Plan My Bookings
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <AccountCard />
          <AccountHelpWidget />
          <AccountTipWidget />
          <AccountVideoWidget />
        </HubSidebar>
      }
    >
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
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Change Password</h3>
              <p className={styles.cardDescription}>
                Update your password to keep your account secure
              </p>
            </div>
          </Link>

          {/* Notification Preferences (Future) */}
          <div className={`${styles.settingCard} ${styles.cardDisabled}`}>
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
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Delete Account</h3>
              <p className={styles.cardDescription}>
                Permanently delete your account and all associated data
              </p>
            </div>
          </Link>
        </div>
      </div>
    </HubPageLayout>
  );
}
