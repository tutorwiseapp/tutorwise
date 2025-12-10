/**
 * Filename: RecommendedSection.tsx
 * Purpose: Reusable recommended items section component
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Recommended for You
 *
 * Features:
 * - Displays personalized recommendations
 * - Shows match scores
 * - Horizontal scrolling layout
 * - Loading and empty states
 */

'use client';

import React from 'react';
import { useRecommendations, type RecommendedItem } from '@/hooks/useRecommendations';
import MarketplaceListingCard from './MarketplaceListingCard';
import styles from './RecommendedSection.module.css';

interface RecommendedSectionProps {
  title?: string;
  subtitle?: string;
  role?: string;
  limit?: number;
  excludeIds?: string[];
  showMatchScore?: boolean;
}

export default function RecommendedSection({
  title = 'Recommended For You',
  subtitle = 'Based on your profile and preferences',
  role,
  limit = 6,
  excludeIds = [],
  showMatchScore = true,
}: RecommendedSectionProps) {
  const { recommendations, isLoading, error } = useRecommendations({
    role,
    limit,
    excludeIds,
    enabled: true,
  });

  if (isLoading) {
    return (
      <section className={styles.recommendedSection}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Finding perfect matches...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return null; // Silently fail - recommendations are optional
  }

  if (recommendations.length === 0) {
    return null; // Don't show empty section
  }

  return (
    <section className={styles.recommendedSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <div className={styles.scrollContainer}>
        <div className={styles.cardGrid}>
          {recommendations.map((item) => (
            <div key={item.id} className={styles.cardWrapper}>
              <MarketplaceListingCard
                listing={item}
                matchScore={showMatchScore ? item.matchScore : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint for mobile */}
      {recommendations.length > 2 && (
        <div className={styles.scrollHint}>
          Scroll to see more →
        </div>
      )}
    </section>
  );
}
