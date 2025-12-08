/**
 * Filename: PerformanceView.tsx
 * Purpose: Performance dashboard tab showing analytics charts
 * Created: 2025-12-07
 * Phase 3: Performance Dashboard & Gamification
 */

'use client';

import React, { useMemo } from 'react';
import ReferralSourcesChart from './performance/ReferralSourcesChart';
import GeographicDistribution from './performance/GeographicDistribution';
import ReferralRevenueTrends from './performance/ReferralRevenueTrends';
import PerformanceInsights from './PerformanceInsights';
import styles from './PerformanceView.module.css';

interface PerformanceViewProps {
  referrals: any[];
}

export default function PerformanceView({ referrals }: PerformanceViewProps) {
  // Calculate referral sources data
  const sourcesData = useMemo(() => {
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

    return sources;
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

  // Calculate revenue trends data (last 6 months)
  const revenueTrends = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months: { month: string; revenue: number }[] = [];

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: monthNames[date.getMonth()],
        revenue: 0,
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
        months[monthIndex].revenue += ref.first_commission.amount || 0;
      }
    });

    return months;
  }, [referrals]);

  return (
    <div className={styles.performanceContainer}>
      {/* Left Column - Charts */}
      <div className={styles.leftColumn}>
        {/* Referral Sources Chart */}
        <ReferralSourcesChart data={sourcesData} />

        {/* Geographic Distribution */}
        <GeographicDistribution data={geographicData} />
      </div>

      {/* Right Column - Revenue Trends & Performance Insights */}
      <div className={styles.rightColumn}>
        <ReferralRevenueTrends data={revenueTrends} currency="GBP" />
        <PerformanceInsights referrals={referrals} />
      </div>
    </div>
  );
}
