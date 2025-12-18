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
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import AccountTipWidget from '@/app/components/feature/account/AccountTipWidget';
import AccountVideoWidget from '@/app/components/feature/account/AccountVideoWidget';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import AccountHeroHeader from '@/app/components/feature/account/AccountHeroHeader';
import Button from '@/app/components/ui/actions/Button';
import DelegationSettingsPanel from '@/app/components/feature/referrals/content/DelegationSettingsPanel';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

export default function ReferralPreferencesPage() {
  const { profile } = useUserProfile();
  const pathname = usePathname();
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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
            <AccountCard />
            <AccountHelpWidget />
            <AccountTipWidget />
            <AccountVideoWidget />
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
          <AccountCard />
          <AccountHelpWidget />
          <AccountTipWidget />
          <AccountVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        <DelegationSettingsPanel tutorId={profile.id} />
      </div>
    </HubPageLayout>
  );
}
