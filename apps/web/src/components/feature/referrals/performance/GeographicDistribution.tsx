/**
 * Filename: GeographicDistribution.tsx
 * Purpose: Geographic distribution of referrals (UK cities)
 * Created: 2025-12-07
 * Phase 3: Performance Dashboard
 *
 * Note: Using list-based visualization for MVP. Can be upgraded to interactive UK map later.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import styles from './GeographicDistribution.module.css';

export interface CityData {
  city: string;
  region: string;
  referralCount: number;
  convertedCount: number;
}

interface GeographicDistributionProps {
  data: CityData[];
}

const GeographicDistribution = memo(function GeographicDistribution({
  data = []
}: GeographicDistributionProps) {
  // Sort by referral count (descending) and take top 10
  const topCities = useMemo(() =>
    [...data]
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 10),
    [data]
  );

  const totalReferrals = useMemo(() =>
    data.reduce((sum, city) => sum + city.referralCount, 0),
    [data]
  );

  const hasData = data.length > 0 && totalReferrals > 0;

  // Calculate conversion rate for a city
  const getConversionRate = (city: CityData) => {
    if (city.referralCount === 0) return 0;
    return (city.convertedCount / city.referralCount) * 100;
  };

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MapPin className={styles.icon} size={20} />
          <h3 className={styles.title}>Geographic Distribution</h3>
        </div>
      </div>

      <div className={styles.content}>
        {!hasData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No geographic data available yet. As you get more referrals, you&apos;ll see where they&apos;re coming from.</p>
          </div>
        ) : (
          <div className={styles.citiesList}>
            {topCities.map((city, index) => {
              const conversionRate = getConversionRate(city);
              const percentage = (city.referralCount / totalReferrals) * 100;

              return (
                <div key={`${city.city}-${city.region}`} className={styles.cityItem}>
                  <div className={styles.cityRank}>#{index + 1}</div>
                  <div className={styles.cityInfo}>
                    <div className={styles.cityHeader}>
                      <span className={styles.cityName}>{city.city}</span>
                      <span className={styles.cityCount}>{city.referralCount} referrals</span>
                    </div>
                    <div className={styles.cityMeta}>
                      <span className={styles.cityRegion}>{city.region}</span>
                      {city.convertedCount > 0 && (
                        <span className={styles.cityConversion}>
                          {conversionRate.toFixed(0)}% converted
                        </span>
                      )}
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show count if there are more cities */}
            {data.length > 10 && (
              <div className={styles.moreInfo}>
                +{data.length - 10} more {data.length - 10 === 1 ? 'city' : 'cities'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default GeographicDistribution;
