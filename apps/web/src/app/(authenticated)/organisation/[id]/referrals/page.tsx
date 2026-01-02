/**
 * Filename: /organisation/[id]/referrals/page.tsx
 * Purpose: Organisation referral program dashboard
 * Created: 2025-12-31
 * Updated: 2025-12-31 - Migrated to Hub Layout Architecture
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import { ReferralSettingsCard } from '@/components/feature/organisation/referrals/ReferralSettingsCard';
import { TeamReferralLeaderboard } from '@/components/feature/organisation/referrals/TeamReferralLeaderboard';
import { MemberReferralDashboard } from '@/components/feature/organisation/referrals/MemberReferralDashboard';
import { PayoutExportCard } from '@/components/feature/organisation/referrals/PayoutExportCard';
import { ReferralPipeline } from '@/components/feature/organisation/referrals/ReferralPipeline';
import { ReferralAnalyticsDashboard } from '@/components/feature/organisation/referrals/ReferralAnalyticsDashboard';
import { ReferralAchievements } from '@/components/feature/organisation/referrals/ReferralAchievements';
import { MonthlyChallenges } from '@/components/feature/organisation/referrals/MonthlyChallenges';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import ReferralStatsWidget from '@/app/components/feature/organisation/sidebar/ReferralStatsWidget';
import ReferralHelpWidget from '@/app/components/feature/organisation/sidebar/ReferralHelpWidget';
import ReferralTipWidget from '@/app/components/feature/organisation/sidebar/ReferralTipWidget';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

interface OrganisationReferralsPageProps {
  params: {
    id: string;
  };
}

type TabType = 'overview' | 'pipeline' | 'team' | 'achievements';

export default function OrganisationReferralsPage({
  params,
}: OrganisationReferralsPageProps) {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch organisation details
  const {
    data: organisation,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: ['organisation', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_groups')
        .select('id, name, slug, profile_id')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!params.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if user is owner or member
  const {
    data: membership,
    isLoading: membershipLoading,
  } = useQuery({
    queryKey: ['membership', params.id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data } = await supabase
        .from('group_members')
        .select('id, connection_id')
        .eq('group_id', params.id)
        .eq('connection_id', profile.id)
        .single();

      return data;
    },
    enabled: !!profile?.id && !!params.id,
  });

  // Fetch referral config
  const {
    data: config,
    isLoading: configLoading,
  } = useQuery({
    queryKey: ['referral-config', params.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organisation_referral_config')
        .select('enabled')
        .eq('organisation_id', params.id)
        .single();

      return data;
    },
    enabled: !!params.id,
  });

  const isLoading = profileLoading || orgLoading || membershipLoading || configLoading;
  const isOwner = organisation?.profile_id === profile?.id;
  const isMember = !!membership;
  const programEnabled = config?.enabled || false;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
  };

  const handleEnableProgram = async () => {
    try {
      // Enable the referral program
      const { error } = await supabase
        .from('organisation_referral_config')
        .upsert({
          organisation_id: params.id,
          enabled: true,
          referral_commission_percentage: 10.00,
          organisation_split_percentage: 50.00,
          member_split_percentage: 50.00,
          minimum_booking_value: 0.00,
          require_payment_completion: true,
          payout_threshold: 50.00,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organisation_id'
        });

      if (error) throw error;

      // Refetch config to update UI
      await queryClient.invalidateQueries({ queryKey: ['referral-config', params.id] });

      toast.success('Referral program enabled! Configure settings in the Overview tab.');
      setActiveTab('overview');
    } catch (error) {
      console.error('Error enabling referral program:', error);
      toast.error('Failed to enable referral program');
    }
  };

  // Define tabs based on role (must be before early returns)
  const tabs: HubTab[] = useMemo(() => {
    if (isOwner) {
      return [
        { id: 'overview', label: 'Overview', active: activeTab === 'overview' },
        { id: 'pipeline', label: 'Pipeline', active: activeTab === 'pipeline' },
        { id: 'team', label: 'Team', active: activeTab === 'team' },
        { id: 'achievements', label: 'Achievements', active: activeTab === 'achievements' },
      ];
    } else {
      return [
        { id: 'overview', label: 'My Dashboard', active: activeTab === 'overview' },
        { id: 'achievements', label: 'Achievements', active: activeTab === 'achievements' },
        { id: 'team', label: 'Leaderboard', active: activeTab === 'team' },
      ];
    }
  }, [isOwner, activeTab]);

  // Redirect if not authorized
  if (!isLoading && organisation && !isOwner && !isMember) {
    router.push('/organisation');
    return null;
  }

  // Redirect if no organisation found
  if (!isLoading && !organisation) {
    router.push('/organisation');
    return null;
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading referral program...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referral Program"
          subtitle={
            isOwner
              ? 'Configure and manage your team referral program'
              : 'Track your referrals and earnings'
          }
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Future: Add filters for referral status, date range, etc. */}
            </div>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <ReferralStatsWidget
            organisationId={params.id}
            memberId={!isOwner && isMember ? profile?.id : undefined}
          />
          <ReferralHelpWidget isOwner={isOwner} />
          <ReferralTipWidget />
        </HubSidebar>
      }
      fullWidth={activeTab === 'pipeline'}
    >
      {/* Pipeline Tab: Full-width board */}
      {activeTab === 'pipeline' ? (
        !programEnabled ? (
          <HubEmptyState
            title="Referral Program Not Active"
            description="Enable the referral program in the Overview tab to start tracking conversions."
            actionLabel={isOwner ? 'Go to Settings' : undefined}
            onAction={isOwner ? () => setActiveTab('overview') : undefined}
          />
        ) : (
          <ReferralPipeline organisationId={params.id} />
        )
      ) : (
        <div className={styles.content}>
          {/* Owner View */}
          {isOwner && (
            <>
              {/* Overview Tab - ALWAYS ACCESSIBLE */}
              {activeTab === 'overview' && (
                <>
                  <ReferralSettingsCard
                    organisationId={params.id}
                    isOwner={true}
                  />
                  {programEnabled && (
                    <ReferralAnalyticsDashboard
                      organisationId={params.id}
                      isOwner={true}
                    />
                  )}
                </>
              )}

              {/* Team Tab - Requires program enabled */}
              {activeTab === 'team' && (
                <>
                  {!programEnabled ? (
                    <HubEmptyState
                      title="Referral Program Not Active"
                      description="Enable the referral program to view team performance."
                      actionLabel="Go to Settings"
                      onAction={() => setActiveTab('overview')}
                    />
                  ) : (
                    <>
                      <TeamReferralLeaderboard
                        organisationId={params.id}
                        limit={10}
                        showFullStats={true}
                      />
                      <PayoutExportCard
                        organisationId={params.id}
                        isOwner={true}
                      />
                    </>
                  )}
                </>
              )}

              {/* Achievements Tab - Requires program enabled */}
              {activeTab === 'achievements' && (
                <>
                  {!programEnabled ? (
                    <HubEmptyState
                      title="Referral Program Not Active"
                      description="Enable the referral program to set up achievements."
                      actionLabel="Go to Settings"
                      onAction={() => setActiveTab('overview')}
                    />
                  ) : (
                    <MonthlyChallenges
                      organisationId={params.id}
                      memberId={profile?.id || ''}
                      isOwner={true}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* Member View */}
          {!isOwner && isMember && profile && (
            <>
              {/* Overview Tab - Show message if program disabled */}
              {activeTab === 'overview' && (
                <>
                  {!programEnabled ? (
                    <HubEmptyState
                      title="Referral Program Not Active"
                      description="The referral program has not been enabled for this organisation yet. Contact the organisation owner to activate it."
                    />
                  ) : (
                    <>
                      <MemberReferralDashboard
                        memberId={profile.id}
                        organisationId={params.id}
                        organisationSlug={organisation?.slug || ''}
                      />
                      <ReferralAnalyticsDashboard
                        organisationId={params.id}
                        memberId={profile.id}
                        isOwner={false}
                      />
                      <PayoutExportCard
                        organisationId={params.id}
                        memberId={profile.id}
                        isOwner={false}
                      />
                    </>
                  )}
                </>
              )}

              {/* Achievements Tab - Requires program enabled */}
              {activeTab === 'achievements' && (
                <>
                  {!programEnabled ? (
                    <HubEmptyState
                      title="Referral Program Not Active"
                      description="The referral program is not active yet. Contact your organisation owner."
                    />
                  ) : (
                    <>
                      <ReferralAchievements
                        memberId={profile.id}
                        organisationId={params.id}
                      />
                      <MonthlyChallenges
                        organisationId={params.id}
                        memberId={profile.id}
                        isOwner={false}
                      />
                    </>
                  )}
                </>
              )}

              {/* Team Tab (Leaderboard) - Requires program enabled */}
              {activeTab === 'team' && (
                <>
                  {!programEnabled ? (
                    <HubEmptyState
                      title="Referral Program Not Active"
                      description="The referral program is not active yet. Contact your organisation owner."
                    />
                  ) : (
                    <TeamReferralLeaderboard
                      organisationId={params.id}
                      limit={10}
                      showFullStats={false}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </HubPageLayout>
  );
}
