/**
 * Filename: apps/web/src/app/(authenticated)/account/referral-preferences/page.tsx
 * Purpose: Referral Preferences tab page - Commission delegation settings
 * Created: 2025-12-18
 * Pattern: Uses HubPageLayout, HubHeader, HubTabs matching other account pages
 */
'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import DelegationStatsWidget from '@/components/feature/referrals/sidebar/DelegationStatsWidget';
import DelegationHelpWidget from '@/components/feature/referrals/sidebar/DelegationHelpWidget';
import DelegationTipWidget from '@/components/feature/referrals/sidebar/DelegationTipWidget';
import DelegationVideoWidget from '@/components/feature/referrals/sidebar/DelegationVideoWidget';
import { HubPageLayout, HubTabs } from '@/components/hub/layout';
import type { HubTab } from '@/components/hub/layout';
import AccountHeroHeader from '@/components/feature/account/AccountHeroHeader';
import Button from '@/components/ui/actions/Button';
import DelegationSettingsPanel from '@/components/feature/referrals/content/DelegationSettingsPanel';
import styles from './page.module.css';
import actionStyles from '@/components/hub/styles/hub-actions.module.css';

export default function ReferralPreferencesPage() {
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [delegationStats, setDelegationStats] = useState({
    profileDefaultSet: false,
    totalListings: 0,
    listingsWithOverrides: 0,
    listingsUsingDefault: 0,
  });

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
    { id: 'referral-preferences', label: 'Referral Preferences', active: pathname === '/account/referral-preferences' },
    { id: 'settings', label: 'Settings', active: pathname === '/account/settings' },
  ];

  const handleTabChange = (tabId: string) => {
    window.location.href = `/account/${tabId}`;
  };

  if (!profile) {
    return (
      <HubPageLayout
        header={<AccountHeroHeader />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <DelegationStatsWidget {...delegationStats} />
            <DelegationHelpWidget />
            <DelegationTipWidget />
            <DelegationVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading...</div>
      </HubPageLayout>
    );
  }

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
                  square
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
          <DelegationStatsWidget {...delegationStats} />
          <DelegationHelpWidget />
          <DelegationTipWidget />
          <DelegationVideoWidget />
        </HubSidebar>
      }
    >
      <DelegationSettingsPanel
        tutorId={profile.id}
        onStatsUpdate={setDelegationStats}
      />
    </HubPageLayout>
  );
}
