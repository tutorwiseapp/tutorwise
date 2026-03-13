/**
 * Filename: TutorHomepage.tsx
 * Purpose: Homepage variant for tutors looking for students/opportunities
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Role-based Homepage Variants
 *
 * Features:
 * - Browse job postings and student requests
 * - "Create Listing" CTA
 * - Skill matching opportunities
 * - Quick stats dashboard
 * - Recent activity feed
 */

'use client';

import React from 'react';
import type { MarketplaceItem } from '@/types/marketplace';
import type { Listing } from '@tutorwise/shared-types';
import MarketplaceGrid from '../MarketplaceGrid';
import RecommendedSection from '../RecommendedSection';
import styles from './TutorHomepage.module.css';

interface TutorHomepageProps {
  items: MarketplaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
  profile: any | null;
}

export default function TutorHomepage({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onSearch,
  onLoadMore,
  profile,
}: TutorHomepageProps) {
  // Filter for job postings
  const jobPostings = items.filter(item =>
    item.type === 'listing' && (item.data as Listing).listing_category === 'job'
  );
  const otherItems = items.filter(item =>
    !(item.type === 'listing' && (item.data as Listing).listing_category === 'job')
  );

  return (
    <div className={styles.tutorHomepage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Tutor'}!
          </h1>
          <p className={styles.heroSubtitle}>
            Find students looking for your expertise and grow your tutoring business
          </p>

          {/* Quick Action CTAs */}
          <div className={styles.ctaGroup}>
            <button
              className={styles.primaryCta}
              onClick={() => window.location.href = '/listings/create'}
            >
              Create New Listing
            </button>
            <button
              className={styles.secondaryCta}
              onClick={() => window.location.href = '/dashboard'}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      {profile && (
        <section className={styles.statsSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👁</div>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Profile Views</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💬</div>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Inquiries</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📅</div>
              <div className={styles.statValue}>0</div>
              <div className={styles.statLabel}>Bookings</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⭐</div>
              <div className={styles.statValue}>-</div>
              <div className={styles.statLabel}>Rating</div>
            </div>
          </div>
        </section>
      )}

      {/* Job Opportunities */}
      {jobPostings.length > 0 && (
        <section className={styles.jobsSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Job Opportunities</h2>
              <p className={styles.sectionSubtitle}>
                Students and parents actively looking for tutors
              </p>
            </div>
            <button
              className={styles.viewAllButton}
              onClick={() => onSearch('category:job')}
            >
              View All Jobs
            </button>
          </div>

          <MarketplaceGrid
            items={jobPostings.slice(0, 6)}
            isLoading={isLoading}
            isLoadingMore={false}
            hasSearched={false}
            hasMore={false}
            total={jobPostings.length}
            onLoadMore={() => {}}
          />
        </section>
      )}

      {/* Skill Matching */}
      {profile?.subjects && profile.subjects.length > 0 && (
        <RecommendedSection
          title="Matched to Your Skills"
          subtitle={`Opportunities in ${profile.subjects.join(', ')}`}
          role="tutor"
          limit={6}
          showMatchScore={true}
        />
      )}

      {/* Browse All */}
      <section className={styles.browseSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              {total > 0 ? `${total} Opportunities Available` : 'Browse Marketplace'}
            </h2>
            <p className={styles.sectionSubtitle}>
              Explore all listings and connect with potential students
            </p>
          </div>
        </div>

        <MarketplaceGrid
          items={otherItems}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasSearched={false}
          hasMore={hasMore}
          total={total}
          onLoadMore={onLoadMore}
        />
      </section>

      {/* Growth Tips */}
      <section className={styles.tipsSection}>
        <h3 className={styles.tipsTitle}>Tips to Attract More Students</h3>
        <div className={styles.tipsGrid}>
          <div className={styles.tipCard}>
            <div className={styles.tipNumber}>1</div>
            <h4 className={styles.tipCardTitle}>Complete Your Profile</h4>
            <p className={styles.tipCardText}>
              Add your qualifications, experience, and a professional photo
            </p>
          </div>
          <div className={styles.tipCard}>
            <div className={styles.tipNumber}>2</div>
            <h4 className={styles.tipCardTitle}>Offer Free Trials</h4>
            <p className={styles.tipCardText}>
              Attract more students with a free trial session
            </p>
          </div>
          <div className={styles.tipCard}>
            <div className={styles.tipNumber}>3</div>
            <h4 className={styles.tipCardTitle}>Respond Quickly</h4>
            <p className={styles.tipCardText}>
              Fast response times increase booking rates
            </p>
          </div>
          <div className={styles.tipCard}>
            <div className={styles.tipNumber}>4</div>
            <h4 className={styles.tipCardTitle}>Keep Availability Updated</h4>
            <p className={styles.tipCardText}>
              Regular updates help students find open time slots
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
