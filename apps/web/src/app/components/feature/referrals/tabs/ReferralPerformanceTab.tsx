/**
 * Filename: ReferralPerformanceTab.tsx
 * Purpose: Referral performance dashboard tab showing analytics charts
 * Created: 2025-12-07
 * Updated: 2025-12-18 - Renamed from PerformanceView.tsx for naming consistency
 * Phase 3: Performance Dashboard & Gamification
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MousePointerClick, UserPlus, Award, DollarSign } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubKPICard, HubKPIGrid, HubCategoryBreakdownChart, HubTrendChart, HubEarningsTrendChart, type CategoryData, type TrendDataPoint, type WeeklyEarnings } from '@/app/components/hub/charts';
import ReferralLinkSection from '../performance/ReferralLinkSection';
import ReferralRecentList, { RecentReferral } from '../performance/ReferralRecentList';
import GeographicDistribution from '../performance/GeographicDistribution';
import PerformanceInsights from '../performance/PerformanceInsights';
import styles from './ReferralPerformanceTab.module.css';

interface ReferralStats {
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  total_commission_earned: number;
  conversion_rate: number;
  signup_rate: number;
}

interface ReferralPerformanceTabProps {
  referrals: any[];
}

export default function ReferralPerformanceTab({ referrals }: ReferralPerformanceTabProps) {
  const supabase = createClient();
  const { profile } = useUserProfile();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<Error | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Fetch agent data and stats using profile.id
  useEffect(() => {
    async function fetchAgentData() {
      if (!profile?.id) return;

      setLoading(true);
      setStatsError(null);

      try {
        // Fetch referral code
        const { data: agentData } = await supabase
          .from('agents')
          .select('referral_code')
          .eq('profile_id', profile.id)
          .single();

        if (agentData) {
          setReferralCode(agentData.referral_code);
        }

        // Fetch referral stats using RPC
        const { data: statsData, error: statsError } = await supabase.rpc('get_referral_stats', {
          p_agent_id: profile.id,
        });

        if (statsError) {
          console.error('Error fetching referral stats:', statsError);
          setStatsError(statsError as Error);
        } else if (statsData && statsData.length > 0) {
          setStats(statsData[0]);
        }
      } catch (error) {
        console.error('Error in fetchAgentData:', error);
        setStatsError(error as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [profile?.id, supabase]);

  // Calculate attribution breakdown - transform to CategoryData format
  const attributionData = useMemo((): CategoryData[] => {
    const breakdown = {
      url_parameter: 0,
      cookie: 0,
      manual_entry: 0,
    };

    referrals.forEach((ref: any) => {
      if (ref.attribution_method === 'url_parameter') breakdown.url_parameter++;
      else if (ref.attribution_method === 'cookie') breakdown.cookie++;
      else if (ref.attribution_method === 'manual_entry') breakdown.manual_entry++;
    });

    return [
      { label: 'URL Parameter', value: breakdown.url_parameter },
      { label: 'Cookie Tracking', value: breakdown.cookie },
      { label: 'Manual Entry', value: breakdown.manual_entry },
    ];
  }, [referrals]);

  // Calculate conversion trend - transform to TrendDataPoint format
  const conversionTrendData = useMemo((): TrendDataPoint[] => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendMap = new Map<string, { conversions: number; signups: number }>();

    referrals.forEach((ref: any) => {
      const createdDate = new Date(ref.created_at);
      if (createdDate < thirtyDaysAgo) return;

      const date = createdDate.toISOString().split('T')[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { conversions: 0, signups: 0 });
      }

      const day = trendMap.get(date)!;
      if (ref.status === 'Converted') day.conversions++;
      if (ref.status === 'Signed Up' || ref.status === 'Converted') day.signups++;
    });

    return Array.from(trendMap.entries())
      .map(([date, { conversions, signups }]) => ({
        label: new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        value: conversions,
        comparisonValue: signups,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [referrals]);

  // Calculate recent referrals from referrals prop
  const recentReferrals = useMemo(() => {
    return referrals
      .slice()
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((ref: any) => ({
        id: ref.id,
        referred_profile_id: ref.referred_profile_id,
        referred_user_name: ref.referred_user?.full_name || 'Unknown User',
        referred_user_email: ref.referred_user?.email || '',
        status: ref.status,
        attribution_method: ref.attribution_method,
        created_at: ref.created_at,
      }));
  }, [referrals]);

  // Calculate referral sources - transform to CategoryData format
  const sourcesData = useMemo((): CategoryData[] => {
    const sources = {
      'Direct Link': 0,
      'QR Code': 0,
      'Embed Code': 0,
      'Social Share': 0,
    };

    referrals.forEach((ref: any) => {
      const source = ref.referral_source || 'Direct Link';
      if (source in sources) {
        sources[source as keyof typeof sources]++;
      }
    });

    return [
      { label: 'Direct Link', value: sources['Direct Link'] },
      { label: 'QR Code', value: sources['QR Code'] },
      { label: 'Embed Code', value: sources['Embed Code'] },
      { label: 'Social Share', value: sources['Social Share'] },
    ];
  }, [referrals]);

  // Calculate geographic distribution data
  const geographicData = useMemo(() => {
    const cityMap = new Map<string, any>();

    referrals.forEach((ref: any) => {
      if (!ref.geographic_data) return;

      const city = ref.geographic_data.city;
      const region = ref.geographic_data.region || 'Unknown';

      if (!city) return;

      const key = `${city}-${region}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          city,
          region,
          referralCount: 0,
          convertedCount: 0,
        });
      }

      const cityData = cityMap.get(key);
      cityData.referralCount++;
      if (ref.status === 'Converted') {
        cityData.convertedCount++;
      }
    });

    return Array.from(cityMap.values());
  }, [referrals]);

  // Calculate revenue trends - transform to WeeklyEarnings format (using months)
  const revenueTrendsData = useMemo((): WeeklyEarnings[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months: WeeklyEarnings[] = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        week: monthNames[date.getMonth()],
        earnings: 0,
      });
    }

    // Aggregate revenue by month
    referrals.forEach((ref: any) => {
      if (ref.status !== 'Converted' || !ref.first_commission) return;

      const convertedDate = new Date(ref.converted_at || ref.updated_at);
      const monthsAgo =
        (now.getFullYear() - convertedDate.getFullYear()) * 12 +
        (now.getMonth() - convertedDate.getMonth());

      if (monthsAgo >= 0 && monthsAgo < 6) {
        const monthIndex = 5 - monthsAgo;
        months[monthIndex].earnings += ref.first_commission.amount || 0;
      }
    });

    return months;
  }, [referrals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={styles.performanceContainer}>
      {/* Top Section - KPI Grid - Using Hub Components */}
      <HubKPIGrid>
        <HubKPICard
          label="Total Clicks"
          value={loading ? '...' : stats?.total_clicks || 0}
          timeframe="All Time"
          icon={MousePointerClick}
          variant="neutral"
        />
        <HubKPICard
          label="Signups"
          value={loading ? '...' : stats?.total_signups || 0}
          sublabel={stats && stats.signup_rate > 0 ? `${stats.signup_rate.toFixed(1)}% signup rate` : undefined}
          timeframe="All Time"
          icon={UserPlus}
          variant="info"
        />
        <HubKPICard
          label="Conversions"
          value={loading ? '...' : stats?.total_conversions || 0}
          sublabel={stats && stats.conversion_rate > 0 ? `${stats.conversion_rate.toFixed(1)}% conversion rate` : undefined}
          timeframe="All Time"
          icon={Award}
          variant="success"
        />
        <HubKPICard
          label="Commission Earned"
          value={loading ? '...' : formatCurrency(stats?.total_commission_earned || 0)}
          timeframe="All Time"
          icon={DollarSign}
          variant="success"
        />
      </HubKPIGrid>

      {/* Charts Grid Row 1 - Attribution & Conversion Trend */}
      <div className={styles.chartsGrid}>
        <HubCategoryBreakdownChart
          data={attributionData}
          title="Attribution Methods"
          subtitle="How referrals were tracked"
        />
        <HubTrendChart
          data={conversionTrendData}
          title="Conversion Trend"
          subtitle="Last 30 days"
          valueName="Conversions"
          comparisonName="Signups"
          showComparison={true}
        />
      </div>

      {/* Referral Link Section */}
      {referralCode && <ReferralLinkSection referralCode={referralCode} />}

      {/* Charts Grid Row 2 - Sources & Geographic */}
      <div className={styles.chartsGrid}>
        <HubCategoryBreakdownChart
          data={sourcesData}
          title="Referral Sources"
          subtitle="Where referrals came from"
        />
        <GeographicDistribution data={geographicData} />
      </div>

      {/* Charts Grid Row 3 - Revenue & Insights */}
      <div className={styles.chartsGrid}>
        <HubEarningsTrendChart
          data={revenueTrendsData}
          currency="GBP"
        />
        <PerformanceInsights referrals={referrals} />
      </div>

      {/* Recent Referrals - Full width */}
      <ReferralRecentList referrals={recentReferrals} isLoading={false} />
    </div>
  );
}
