/**
 * Filename: /organisation/[id]/referrals/page.tsx
 * Purpose: Organisation referral program dashboard
 * Created: 2025-12-31
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ReferralSettingsCard } from '@/components/feature/organisation/referrals/ReferralSettingsCard';
import { TeamReferralLeaderboard } from '@/components/feature/organisation/referrals/TeamReferralLeaderboard';
import { MemberReferralDashboard } from '@/components/feature/organisation/referrals/MemberReferralDashboard';
import { PayoutExportCard } from '@/components/feature/organisation/referrals/PayoutExportCard';
import { ConversionPipelineBoard } from '@/components/feature/organisation/referrals/ConversionPipelineBoard';
import styles from './page.module.css';

interface OrganisationReferralsPageProps {
  params: {
    id: string;
  };
}

export default async function OrganisationReferralsPage({
  params,
}: OrganisationReferralsPageProps) {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get organisation details
  const { data: organisation, error: orgError } = await supabase
    .from('connection_groups')
    .select('id, name, slug, profile_id')
    .eq('id', params.id)
    .single();

  if (orgError || !organisation) {
    redirect('/organisation');
  }

  // Check if user is owner
  const isOwner = organisation.profile_id === user.id;

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id, connection_id')
    .eq('group_id', organisation.id)
    .eq('connection_id', user.id)
    .single();

  const isMember = !!membership;

  if (!isOwner && !isMember) {
    redirect('/organisation');
  }

  // Get referral config to check if program is enabled
  const { data: config } = await supabase
    .from('organisation_referral_config')
    .select('enabled')
    .eq('organisation_id', organisation.id)
    .single();

  const programEnabled = config?.enabled || false;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Page Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Referral Program</h1>
            <p className={styles.subtitle}>
              {isOwner
                ? 'Configure and manage your team referral program'
                : 'Track your referrals and earnings'}
            </p>
          </div>
        </div>

        {/* Owner View: Settings + Full Dashboard */}
        {isOwner && (
          <>
            <ReferralSettingsCard
              organisationId={organisation.id}
              isOwner={true}
            />

            {programEnabled && (
              <>
                <ConversionPipelineBoard
                  organisationId={organisation.id}
                />

                <TeamReferralLeaderboard
                  organisationId={organisation.id}
                  limit={10}
                  showFullStats={true}
                />

                <PayoutExportCard
                  organisationId={organisation.id}
                  isOwner={true}
                />
              </>
            )}
          </>
        )}

        {/* Member View: Personal Dashboard */}
        {!isOwner && isMember && (
          <>
            {programEnabled ? (
              <>
                <MemberReferralDashboard
                  memberId={user.id}
                  organisationId={organisation.id}
                  organisationSlug={organisation.slug}
                />

                <TeamReferralLeaderboard
                  organisationId={organisation.id}
                  limit={10}
                  showFullStats={false}
                />

                <PayoutExportCard
                  organisationId={organisation.id}
                  memberId={user.id}
                  isOwner={false}
                />
              </>
            ) : (
              <div className={styles.disabledMessage}>
                <h2>Referral Program Not Active</h2>
                <p>
                  The referral program has not been enabled for this organisation yet.
                  Contact the organisation owner to activate it.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
