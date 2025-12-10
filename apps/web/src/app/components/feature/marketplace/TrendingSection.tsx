/**
 * Filename: TrendingSection.tsx
 * Purpose: Display trending subjects and marketplace insights
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Trending Subjects & Insights
 *
 * Features:
 * - Trending subjects with growth indicators
 * - Price trends
 * - Location insights
 * - Interactive period selection
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { TrendingSubject, PriceTrend, LocationInsight } from '@/lib/services/trendingAnalytics';
import styles from './TrendingSection.module.css';

interface TrendingSectionProps {
  title?: string;
  subtitle?: string;
  showPrices?: boolean;
  showLocations?: boolean;
  limit?: number;
}

export default function TrendingSection({
  title = 'Trending Now',
  subtitle = 'Popular subjects and emerging trends in the marketplace',
  showPrices = false,
  showLocations = false,
  limit = 6,
}: TrendingSectionProps) {
  const [trendingSubjects, setTrendingSubjects] = useState<TrendingSubject[]>([]);
  const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);
  const [locations, setLocations] = useState<LocationInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketplace/insights?period=${period}&type=all`);

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const result = await response.json();
      const data = result.data;

      setTrendingSubjects(data.trendingSubjects || []);
      setPriceTrends(data.priceTrends || []);
      setLocations(data.topLocations || []);
    } catch (err) {
      console.error('Trending insights fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className={styles.trendingSection}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading insights...</p>
        </div>
      </section>
    );
  }

  if (error || trendingSubjects.length === 0) {
    return null; // Silently fail - insights are optional
  }

  const displayedSubjects = trendingSubjects.slice(0, limit);

  return (
    <section className={styles.trendingSection}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {/* Period selector */}
        <div className={styles.periodSelector}>
          <button
            className={`${styles.periodButton} ${period === '7d' ? styles.active : ''}`}
            onClick={() => setPeriod('7d')}
          >
            7 days
          </button>
          <button
            className={`${styles.periodButton} ${period === '30d' ? styles.active : ''}`}
            onClick={() => setPeriod('30d')}
          >
            30 days
          </button>
          <button
            className={`${styles.periodButton} ${period === '90d' ? styles.active : ''}`}
            onClick={() => setPeriod('90d')}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Trending Subjects Grid */}
      <div className={styles.trendingGrid}>
        {displayedSubjects.map((subject) => (
          <div key={subject.subject} className={styles.trendingCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.subjectName}>{subject.subject}</h3>
              <span className={`${styles.badge} ${styles[subject.label]}`}>
                {subject.label === 'hot' && '🔥 Hot'}
                {subject.label === 'rising' && '📈 Rising'}
                {subject.label === 'steady' && '📊 Steady'}
              </span>
            </div>

            <div className={styles.cardStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Listings</span>
                <span className={styles.statValue}>{subject.count}</span>
              </div>

              <div className={styles.stat}>
                <span className={styles.statLabel}>Growth</span>
                <span className={`${styles.statValue} ${subject.growth > 0 ? styles.positive : styles.negative}`}>
                  {subject.growth > 0 ? '+' : ''}{subject.growth.toFixed(0)}%
                </span>
              </div>

              {subject.avgPrice > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Avg Price</span>
                  <span className={styles.statValue}>£{subject.avgPrice.toFixed(0)}/hr</span>
                </div>
              )}
            </div>

            {subject.popularLevels.length > 0 && (
              <div className={styles.levels}>
                {subject.popularLevels.map((level) => (
                  <span key={level} className={styles.levelChip}>
                    {level}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Price Trends (optional) */}
      {showPrices && priceTrends.length > 0 && (
        <div className={styles.priceSection}>
          <h3 className={styles.sectionTitle}>Price Trends</h3>
          <div className={styles.priceGrid}>
            {priceTrends.slice(0, 5).map((trend) => (
              <div key={trend.subject} className={styles.priceCard}>
                <div className={styles.priceSubject}>{trend.subject}</div>
                <div className={styles.priceValue}>£{trend.avgPrice.toFixed(0)}/hr</div>
                <div className={styles.priceRange}>
                  £{trend.minPrice.toFixed(0)} - £{trend.maxPrice.toFixed(0)}
                </div>
                <div className={`${styles.priceChange} ${trend.priceChange > 0 ? styles.up : styles.down}`}>
                  {trend.priceChange > 0 ? '↑' : '↓'} {Math.abs(trend.priceChange).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location Insights (optional) */}
      {showLocations && locations.length > 0 && (
        <div className={styles.locationSection}>
          <h3 className={styles.sectionTitle}>Popular Locations</h3>
          <div className={styles.locationGrid}>
            {locations.slice(0, 5).map((location) => (
              <div key={location.city} className={styles.locationCard}>
                <div className={styles.locationCity}>{location.city}</div>
                <div className={styles.locationCount}>{location.count} listings</div>
                <div className={styles.locationSubjects}>
                  {location.topSubjects.slice(0, 3).join(', ')}
                </div>
                {location.avgPrice > 0 && (
                  <div className={styles.locationPrice}>
                    Avg: £{location.avgPrice.toFixed(0)}/hr
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
