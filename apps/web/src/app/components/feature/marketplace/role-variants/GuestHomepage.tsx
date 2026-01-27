/**
 * Filename: GuestHomepage.tsx
 * Purpose: Homepage variant for unauthenticated/guest users
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Role-based Homepage Variants
 *
 * Features:
 * - Standard marketplace grid
 * - Sign-up prompts and CTAs
 * - Featured tutors showcase
 * - Social proof elements
 * - Value proposition sections
 */

'use client';

import React from 'react';
import type { MarketplaceItem } from '@/types/marketplace';
import MarketplaceGrid from '../MarketplaceGrid';
import TrendingSection from '../TrendingSection';
import styles from './GuestHomepage.module.css';

interface GuestHomepageProps {
  items: MarketplaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onSearch: (query: string) => void;
  onLoadMore: () => void;
}

export default function GuestHomepage({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onSearch,
  onLoadMore,
}: GuestHomepageProps) {
  return (
    <div className={styles.guestHomepage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Find Your Perfect Tutor
          </h1>
          <p className={styles.heroSubtitle}>
            Connect with thousands of verified tutors for personalized learning
          </p>

          {/* Sign-up CTA */}
          <div className={styles.ctaGroup}>
            <button
              className={styles.primaryCta}
              onClick={() => window.location.href = '/auth/signup?role=client'}
            >
              Get Started as a Student
            </button>
            <button
              className={styles.secondaryCta}
              onClick={() => window.location.href = '/auth/signup?role=tutor'}
            >
              Become a Tutor
            </button>
          </div>

          {/* Social Proof */}
          <div className={styles.socialProof}>
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>10,000+</span>
              <span className={styles.proofLabel}>Verified Tutors</span>
            </div>
            <div className={styles.proofDivider}>•</div>
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>50,000+</span>
              <span className={styles.proofLabel}>Sessions Completed</span>
            </div>
            <div className={styles.proofDivider}>•</div>
            <div className={styles.proofItem}>
              <span className={styles.proofValue}>4.9/5</span>
              <span className={styles.proofLabel}>Average Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className={styles.valueSection}>
        <h2 className={styles.sectionTitle}>Why Choose Tutorwise?</h2>
        <div className={styles.valueGrid}>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>🎯</div>
            <h3 className={styles.valueTitle}>Perfect Match</h3>
            <p className={styles.valueText}>
              Our AI-powered matching finds tutors that fit your learning style and goals
            </p>
          </div>

          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>✓</div>
            <h3 className={styles.valueTitle}>Verified Experts</h3>
            <p className={styles.valueText}>
              All tutors are identity and DBS verified for your safety and peace of mind
            </p>
          </div>

          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>💰</div>
            <h3 className={styles.valueTitle}>Best Value</h3>
            <p className={styles.valueText}>
              Compare prices, read reviews, and find quality tutoring at competitive rates
            </p>
          </div>

          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>📅</div>
            <h3 className={styles.valueTitle}>Flexible Scheduling</h3>
            <p className={styles.valueText}>
              Book sessions that fit your schedule with instant booking and easy rescheduling
            </p>
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      {items.length > 0 && (
        <section className={styles.featuredSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Featured Tutors</h2>
            <p className={styles.sectionSubtitle}>
              Top-rated tutors ready to help you succeed
            </p>
          </div>

          <MarketplaceGrid
            items={items.slice(0, 6)}
            isLoading={isLoading}
            isLoadingMore={false}
            hasSearched={false}
            hasMore={false}
            total={Math.min(6, items.length)}
            onLoadMore={() => {}}
          />

          <div className={styles.viewAllContainer}>
            <button
              className={styles.viewAllButton}
              onClick={() => window.location.href = '/auth/signup'}
            >
              Sign Up to View All Tutors
            </button>
          </div>
        </section>
      )}

      {/* Trending Insights */}
      <TrendingSection
        title="Trending Subjects"
        subtitle="Discover what&apos;s popular in the marketplace right now"
        limit={6}
      />

      {/* Browse by Subject */}
      <section className={styles.subjectsSection}>
        <h2 className={styles.sectionTitle}>Popular Subjects</h2>
        <div className={styles.subjectGrid}>
          <button
            className={styles.subjectCard}
            onClick={() => onSearch('Mathematics')}
          >
            <span className={styles.subjectIcon}>📐</span>
            <span className={styles.subjectName}>Mathematics</span>
          </button>

          <button
            className={styles.subjectCard}
            onClick={() => onSearch('English')}
          >
            <span className={styles.subjectIcon}>📚</span>
            <span className={styles.subjectName}>English</span>
          </button>

          <button
            className={styles.subjectCard}
            onClick={() => onSearch('Sciences')}
          >
            <span className={styles.subjectIcon}>🔬</span>
            <span className={styles.subjectName}>Sciences</span>
          </button>

          <button
            className={styles.subjectCard}
            onClick={() => onSearch('Languages')}
          >
            <span className={styles.subjectIcon}>🌍</span>
            <span className={styles.subjectName}>Languages</span>
          </button>

          <button
            className={styles.subjectCard}
            onClick={() => onSearch('Computer Science')}
          >
            <span className={styles.subjectIcon}>💻</span>
            <span className={styles.subjectName}>Computer Science</span>
          </button>

          <button
            className={styles.subjectCard}
            onClick={() => onSearch('Music')}
          >
            <span className={styles.subjectIcon}>🎵</span>
            <span className={styles.subjectName}>Music</span>
          </button>
        </div>
      </section>

      {/* All Listings */}
      <section className={styles.allListingsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {total > 0 ? `Browse All ${total} Listings` : 'Browse Marketplace'}
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

      {/* Bottom CTA */}
      <section className={styles.bottomCta}>
        <div className={styles.bottomCtaContent}>
          <h2 className={styles.bottomCtaTitle}>Ready to Get Started?</h2>
          <p className={styles.bottomCtaText}>
            Join thousands of students and tutors already learning on Tutorwise
          </p>
          <button
            className={styles.bottomCtaButton}
            onClick={() => window.location.href = '/auth/signup'}
          >
            Sign Up for Free
          </button>
        </div>
      </section>
    </div>
  );
}
