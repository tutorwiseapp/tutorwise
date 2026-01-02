/**
 * Filename: ReferralStatsWidget.tsx
 * Purpose: Referral program performance stats sidebar widget
 * Created: 2026-01-02
 * Pattern: Follows OrganisationStatsWidget pattern using HubStatsCard
 *
 * Displays: Total Referrals, Conversions, Conversion Rate, Total Earnings
 */

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';

interface ReferralStatsWidgetProps {
  organisationId: string;
  memberId?: string; // If provided, shows member stats; otherwise shows org-wide stats
  className?: string;
}

interface OrgReferralStats {
  total_referrals: number;
  total_conversions: number;
  conversion_rate: number;
  total_earnings: number;
  active_members: number;
}

interface MemberReferralStats {
  total_referrals: number;
  converted_count: number;
  conversion_rate: number;
  total_earnings: number;
}

export default function ReferralStatsWidget({
  organisationId,
  memberId,
  className,
}: ReferralStatsWidgetProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orgStats, setOrgStats] = useState<OrgReferralStats | null>(null);
  const [memberStats, setMemberStats] = useState<MemberReferralStats | null>(null);

  useEffect(() => {
    loadStats();
  }, [organisationId, memberId]);

  const loadStats = async () => {
    try {
      if (memberId) {
        // Load member-specific stats
        const { data, error } = await supabase
          .from('member_referral_stats')
          .select('total_referrals, converted_count, conversion_rate, total_earnings')
          .eq('organisation_id', organisationId)
          .eq('member_id', memberId)
          .single();

        if (error) throw error;
        setMemberStats(data);
      } else {
        // Load organisation-wide stats
        const { data, error } = await supabase.rpc('get_organisation_referral_summary', {
          p_organisation_id: organisationId,
        });

        if (error) {
          console.error('RPC error:', error);
          // Fallback: aggregate from member_referral_stats
          const { data: memberData, error: memberError } = await supabase
            .from('member_referral_stats')
            .select('total_referrals, converted_count, total_earnings')
            .eq('organisation_id', organisationId);

          if (memberError) throw memberError;

          const aggregated = memberData.reduce(
            (acc, member) => ({
              total_referrals: acc.total_referrals + (Number(member.total_referrals) || 0),
              total_conversions: acc.total_conversions + (Number(member.converted_count) || 0),
              total_earnings: acc.total_earnings + (Number(member.total_earnings) || 0),
              active_members: acc.active_members + 1,
              conversion_rate: 0,
            }),
            { total_referrals: 0, total_conversions: 0, total_earnings: 0, active_members: 0, conversion_rate: 0 }
          );

          aggregated.conversion_rate =
            aggregated.total_referrals > 0
              ? (aggregated.total_conversions / aggregated.total_referrals) * 100
              : 0;

          setOrgStats(aggregated);
        } else {
          setOrgStats(data);
        }
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <HubStatsCard
        title={memberId ? 'My Referral Stats' : 'Referral Program'}
        stats={[
          { label: 'Loading...', value: '-' },
        ]}
        className={className}
      />
    );
  }

  // Member view
  if (memberId && memberStats) {
    const stats: StatRow[] = [
      {
        label: 'Total Referrals',
        value: memberStats.total_referrals,
      },
      {
        label: 'Conversions',
        value: memberStats.converted_count,
      },
      {
        label: 'Conversion Rate',
        value: `${(memberStats.conversion_rate || 0).toFixed(1)}%`,
        valueColor: (memberStats.conversion_rate || 0) >= 20 ? 'green' : 'default',
      },
      {
        label: 'Total Earnings',
        value: `£${(memberStats.total_earnings || 0).toFixed(2)}`,
        valueColor: 'black-bold',
      },
    ];

    return (
      <HubStatsCard
        title="My Referral Stats"
        stats={stats}
        className={className}
      />
    );
  }

  // Organisation view
  if (!memberId && orgStats) {
    const stats: StatRow[] = [
      {
        label: 'Active Members',
        value: orgStats.active_members,
      },
      {
        label: 'Total Referrals',
        value: orgStats.total_referrals,
      },
      {
        label: 'Conversions',
        value: orgStats.total_conversions,
      },
      {
        label: 'Avg Conversion Rate',
        value: `${(orgStats.conversion_rate || 0).toFixed(1)}%`,
        valueColor: (orgStats.conversion_rate || 0) >= 20 ? 'green' : 'default',
      },
      {
        label: 'Total Earnings',
        value: `£${(orgStats.total_earnings || 0).toFixed(2)}`,
        valueColor: 'black-bold',
      },
    ];

    return (
      <HubStatsCard
        title="Referral Program"
        stats={stats}
        className={className}
      />
    );
  }

  // Empty state
  return (
    <HubStatsCard
      title={memberId ? 'My Referral Stats' : 'Referral Program'}
      stats={[
        { label: 'No data available', value: '-' },
      ]}
      className={className}
    />
  );
}
