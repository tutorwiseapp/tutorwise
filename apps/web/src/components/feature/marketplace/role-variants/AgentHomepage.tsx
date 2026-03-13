/**
 * Filename: AgentHomepage.tsx
 * Purpose: Homepage variant for agents managing multiple tutors
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Role-based Homepage Variants
 *
 * Features:
 * - Browse opportunities for their tutors
 * - Network insights and analytics
 * - Portfolio management overview
 * - Commission tracking
 * - Tutor performance metrics
 */

'use client';

import React from 'react';
import type { MarketplaceItem } from '@/types/marketplace';
import type { Listing } from '@tutorwise/shared-types';
import MarketplaceGrid from '../MarketplaceGrid';
import styles from './AgentHomepage.module.css';

interface AgentHomepageProps {
  items: MarketplaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
  profile: any | null;
}

export default function AgentHomepage({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onSearch,
  onLoadMore,
  profile,
}: AgentHomepageProps) {
  // Filter for job postings (opportunities for tutors)
  const jobPostings = items.filter(item =>
    item.type === 'listing' && (item.data as Listing).listing_category === 'job'
  );

  return (
    <div className={styles.agentHomepage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Agent Dashboard
          </h1>
          <p className={styles.heroSubtitle}>
            Manage your tutor network and discover new opportunities
          </p>

          {/* Quick Action CTAs */}
          <div className={styles.ctaGroup}>
            <button
              className={styles.primaryCta}
              onClick={() => window.location.href = '/dashboard/network'}
            >
              Manage Network
            </button>
            <button
              className={styles.secondaryCta}
              onClick={() => window.location.href = '/dashboard/analytics'}
            >
              View Analytics
            </button>
          </div>
        </div>
      </section>

      {/* Network Overview */}
      {profile && (
        <section className={styles.networkSection}>
          <h2 className={styles.sectionTitle}>Network Overview</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>👥</div>
              <div className={styles.metricValue}>0</div>
              <div className={styles.metricLabel}>Tutors in Network</div>
              <div className={styles.metricChange}>-</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>📊</div>
              <div className={styles.metricValue}>0</div>
              <div className={styles.metricLabel}>Active Listings</div>
              <div className={styles.metricChange}>-</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>💰</div>
              <div className={styles.metricValue}>£0</div>
              <div className={styles.metricLabel}>Total Revenue</div>
              <div className={styles.metricChange}>-</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>📈</div>
              <div className={styles.metricValue}>0%</div>
              <div className={styles.metricLabel}>Avg. Match Score</div>
              <div className={styles.metricChange}>-</div>
            </div>
          </div>
        </section>
      )}

      {/* Top Opportunities */}
      {jobPostings.length > 0 && (
        <section className={styles.opportunitiesSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Top Opportunities</h2>
              <p className={styles.sectionSubtitle}>
                High-value opportunities for your tutor network
              </p>
            </div>
            <button
              className={styles.viewAllButton}
              onClick={() => onSearch('category:job')}
            >
              View All
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

      {/* Performance Insights */}
      <section className={styles.insightsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Performance Insights</h2>
          <p className={styles.sectionSubtitle}>
            Key metrics and trends from your network
          </p>
        </div>

        <div className={styles.insightsGrid}>
          <div className={styles.insightCard}>
            <h3 className={styles.insightTitle}>Top Performing Tutors</h3>
            <div className={styles.insightContent}>
              <p className={styles.insightPlaceholder}>
                Connect tutors to see performance data
              </p>
            </div>
          </div>

          <div className={styles.insightCard}>
            <h3 className={styles.insightTitle}>Most Demanded Subjects</h3>
            <div className={styles.insightContent}>
              <p className={styles.insightPlaceholder}>
                Analyze marketplace to see subject demand
              </p>
            </div>
          </div>

          <div className={styles.insightCard}>
            <h3 className={styles.insightTitle}>Conversion Rate</h3>
            <div className={styles.insightContent}>
              <p className={styles.insightPlaceholder}>
                Track inquiries to bookings conversion
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Marketplace */}
      <section className={styles.browseSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Browse Marketplace</h2>
            <p className={styles.sectionSubtitle}>
              {total > 0 ? `${total} listings and opportunities` : 'Explore all marketplace items'}
            </p>
          </div>
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

      {/* Agent Tools */}
      <section className={styles.toolsSection}>
        <h3 className={styles.toolsTitle}>Agent Tools</h3>
        <div className={styles.toolsGrid}>
          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>🔍</div>
            <h4 className={styles.toolCardTitle}>Smart Matching</h4>
            <p className={styles.toolCardText}>
              Use AI to match your tutors with ideal opportunities
            </p>
            <button className={styles.toolButton}>Coming Soon</button>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>📊</div>
            <h4 className={styles.toolCardTitle}>Analytics Dashboard</h4>
            <p className={styles.toolCardText}>
              Deep insights into your network&apos;s performance
            </p>
            <button className={styles.toolButton}>Coming Soon</button>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>💼</div>
            <h4 className={styles.toolCardTitle}>Portfolio Manager</h4>
            <p className={styles.toolCardText}>
              Manage all your tutors&apos; listings in one place
            </p>
            <button className={styles.toolButton}>Coming Soon</button>
          </div>

          <div className={styles.toolCard}>
            <div className={styles.toolIcon}>📈</div>
            <h4 className={styles.toolCardTitle}>Growth Tools</h4>
            <p className={styles.toolCardText}>
              Marketing and promotion tools for your network
            </p>
            <button className={styles.toolButton}>Coming Soon</button>
          </div>
        </div>
      </section>
    </div>
  );
}
