/**
 * Filename: apps/web/src/app/(authenticated)/account/professional-info/page.tsx
 * Purpose: Professional Information tab page (Account Hub v4.8 - aligned with hub UI)
 * Created: 2025-11-09
 * Updated: 2025-11-30 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 *
 * Pattern: Uses HubSidebar from authenticated layout, not custom layout
 */
'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { updateProfile, updateRoleDetails } from '@/lib/api/profiles';
import ProfessionalInfoForm from '@/app/components/feature/account/ProfessionalInfoForm';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import AccountCard from '@/app/components/feature/account/AccountCard';
import AccountHelpWidget from '@/app/components/feature/account/AccountHelpWidget';
import AccountTipWidget from '@/app/components/feature/account/AccountTipWidget';
import AccountVideoWidget from '@/app/components/feature/account/AccountVideoWidget';
import { HubPageLayout, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import AccountHeroHeader from '@/app/components/feature/account/AccountHeroHeader';
import Button from '@/app/components/ui/actions/Button';
import type { Profile } from '@/types';
import toast from 'react-hot-toast';
import { showScoreCelebration } from '@/app/components/ui/feedback/ScoreCelebrationToast';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

export default function ProfessionalPage() {
  const { profile, refreshProfile, activeRole } = useUserProfile();
  const pathname = usePathname();
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const handleSave = async (updatedProfile: Partial<Profile>) => {
    try {
      // Fetch previous CaaS score before saving
      let previousScore = 0;
      try {
        const scoreResponse = await fetch(`/api/caas/${profile?.id}`);
        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json();
          previousScore = scoreData.data?.total_score || 0;
        }
      } catch (err) {
        console.log('[ProfessionalInfo] Could not fetch previous score:', err);
      }

      // Check if the update contains role-specific data (professional_details)
      if (updatedProfile.professional_details) {
        // Extract role type from active role
        const roleType = profile?.active_role || 'tutor';

        // Get the role-specific data
        const roleData = updatedProfile.professional_details[roleType as keyof typeof updatedProfile.professional_details];

        if (roleData) {
          // Save to role_details table
          await updateRoleDetails(roleType as 'tutor' | 'client' | 'agent', roleData as any);
        }

        // Remove professional_details from the update object since it's not a profiles table column
        const { professional_details, ...profileUpdates } = updatedProfile;

        // Update other profile fields if any
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(profileUpdates);
        }
      } else {
        // No role-specific data, just update profile
        await updateProfile(updatedProfile);
      }

      await refreshProfile();
      toast.success('Profile updated successfully');

      // Fetch new CaaS score after save and show celebration if improved
      try {
        // Wait a bit for CaaS recalculation
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newScoreResponse = await fetch(`/api/caas/${profile?.id}`);
        if (newScoreResponse.ok) {
          const newScoreData = await newScoreResponse.json();
          const newScore = newScoreData.data?.total_score || 0;

          // Show celebration if score improved
          if (newScore > previousScore) {
            // Determine improvement description based on what was updated
            let improvement = 'Updated Professional Info';
            if (updatedProfile.professional_details) {
              const roleType = profile?.active_role || 'tutor';
              const roleData = updatedProfile.professional_details[roleType as keyof typeof updatedProfile.professional_details];

              if (roleType === 'tutor' && roleData) {
                const tutorData = roleData as any;
                if (tutorData.qualifications) improvement = 'Added Qualifications';
                else if (tutorData.certifications?.length > 0) improvement = 'Added Certifications';
                else if (tutorData.subjects?.length > 0) improvement = 'Added Teaching Subjects';
                else if (tutorData.hourly_rate) improvement = 'Set Hourly Rate';
              }
            }

            // Determine next step based on score
            let nextStep = undefined;
            if (newScore < 60) {
              nextStep = {
                label: 'Complete Personal Info',
                href: '/account/personal-info',
              };
            } else if (newScore < 80) {
              nextStep = {
                label: 'Add More Details',
                href: '/account/professional-info',
              };
            }

            showScoreCelebration({
              previousScore,
              newScore,
              improvement,
              nextStep,
            });
          }
        }
      } catch (err) {
        console.log('[ProfessionalInfo] Could not show score celebration:', err);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
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
        <ProfessionalInfoForm profile={profile} onSave={handleSave} activeRole={activeRole} />
      </div>
    </HubPageLayout>
  );
}
