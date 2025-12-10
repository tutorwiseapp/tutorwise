/**
 * Filename: ClientHomepage.tsx
 * Purpose: Homepage variant for clients looking to hire tutors
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Role-based Homepage Variants
 *
 * Features:
 * - Browse tutors grid
 * - "Post a Job" CTA
 * - Recommended tutors based on profile
 * - Recently viewed tutors
 * - Quick filters for common searches
 */

'use client';

import React from 'react';
import type { MarketplaceItem } from '@/types/marketplace';
import MarketplaceGrid from '../MarketplaceGrid';
import RecommendedSection from '../RecommendedSection';
import styles from './ClientHomepage.module.css';

interface ClientHomepageProps {
  items: MarketplaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
  profile: any | null;
}

export default function ClientHomepage({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onSearch,
  onLoadMore,
  profile,
}: ClientHomepageProps) {
  return (
    <div className={styles.clientHomepage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Find Your Perfect Tutor
          </h1>
          <p className={styles.heroSubtitle}>
            Browse thousands of verified tutors and find the right match for your learning goals
          </p>

          {/* Quick Action CTAs */}
          <div className={styles.ctaGroup}>
            <button
              className={styles.primaryCta}
              onClick={() => window.location.href = '/listings/create?category=job'}
            >
              Post a Job
            </button>
            <button
              className={styles.secondaryCta}
              onClick={() => onSearch('')}
            >
              Browse All Tutors
            </button>
          </div>
        </div>
      </section>

      {/* Quick Filters */}
      <section className={styles.quickFilters}>
        <h2 className={styles.sectionTitle}>Popular Searches</h2>
        <div className={styles.filterChips}>
          <button
            className={styles.filterChip}
            onClick={() => onSearch('GCSE Maths')}
          >
            GCSE Maths
          </button>
          <button
            className={styles.filterChip}
            onClick={() => onSearch('A-Level Physics')}
          >
            A-Level Physics
          </button>
          <button
            className={styles.filterChip}
            onClick={() => onSearch('English Language')}
          >
            English Language
          </button>
          <button
            className={styles.filterChip}
            onClick={() => onSearch('University Support')}
          >
            University Support
          </button>
          <button
            className={styles.filterChip}
            onClick={() => onSearch('Online Tutoring')}
          >
            Online Tutoring
          </button>
        </div>
      </section>

      {/* Personalized Recommendations */}
      {profile && (
        <RecommendedSection
          title="Recommended For You"
          subtitle="Tutors matched to your learning goals and interests"
          role="client"
          limit={6}
          showMatchScore={true}
        />
      )}

      {/* Main Marketplace Grid */}
      <section className={styles.marketplaceSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {total > 0 ? `${total} Tutors Available` : 'All Tutors'}
          </h2>
        </div>

        <MarketplaceGrid
          items={items}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasSearched={false}
          hasMore={hasMore}
          total={total}
          onLoadMore={onLoadMore}
        />
      </section>

      {/* Trust & Safety Banner */}
      <section className={styles.trustBanner}>
        <div className={styles.trustContent}>
          <h3 className={styles.trustTitle}>Why Choose TutorWise?</h3>
          <div className={styles.trustFeatures}>
            <div className={styles.trustFeature}>
              <span className={styles.trustIcon}>✓</span>
              <span>Verified Tutors</span>
            </div>
            <div className={styles.trustFeature}>
              <span className={styles.trustIcon}>✓</span>
              <span>Secure Payments</span>
            </div>
            <div className={styles.trustFeature}>
              <span className={styles.trustIcon}>✓</span>
              <span>Money-back Guarantee</span>
            </div>
            <div className={styles.trustFeature}>
              <span className={styles.trustIcon}>✓</span>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
