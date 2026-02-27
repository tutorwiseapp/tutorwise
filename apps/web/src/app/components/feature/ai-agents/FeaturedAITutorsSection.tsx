/*
 * Filename: FeaturedAITutorsSection.tsx
 * Purpose: Featured AI Tutors section for homepage
 * Phase: 2A - Featured AI Tutors
 * Created: 2026-02-25
 * Displays: 4-6 featured AI tutors in a grid
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, Star, Bot } from 'lucide-react';
import styles from './FeaturedAITutorsSection.module.css';

interface FeaturedAITutor {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  subject: string;
  price_per_hour: number;
  avg_rating: number | null;
  total_reviews: number;
  total_sessions: number;
  avatar_url: string | null;
  is_platform_owned: boolean;
}

export default function FeaturedAITutorsSection() {
  const { data: featuredTutors, isLoading, error } = useQuery({
    queryKey: ['featured-ai-agents'],
    queryFn: async () => {
      const response = await fetch('/api/ai-agents?featured=true&status=published');
      if (!response.ok) throw new Error('Failed to fetch featured AI tutors');
      const data = await response.json();
      return data.data as FeaturedAITutor[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Don't render if no featured tutors
  if (!featuredTutors || featuredTutors.length === 0) return null;

  // Show loading state
  if (isLoading) {
    return (
      <section className={styles.featuredSection}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Featured AI Tutors</h2>
          </div>
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.cardSkeleton} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state (fallback - don't block homepage)
  if (error) {
    console.error('Error loading featured AI tutors:', error);
    return null;
  }

  return (
    <section className={styles.featuredSection}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Featured AI Tutors</h2>
            <p className={styles.subtitle}>
              Discover our handpicked AI tutors, ready to help you learn
            </p>
          </div>
          <Link href="/ai-agents" className={styles.viewAllLink}>
            View All
            <ChevronRight className={styles.chevron} />
          </Link>
        </div>

        {/* Featured Tutors Grid */}
        <div className={styles.grid}>
          {featuredTutors.slice(0, 6).map((tutor) => (
            <Link
              key={tutor.id}
              href={`/ai-agents/${tutor.name}`}
              className={styles.card}
            >
              {/* Avatar */}
              <div className={styles.avatar}>
                {tutor.avatar_url ? (
                  <img src={tutor.avatar_url} alt={tutor.display_name} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <Bot className={styles.botIcon} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={styles.content}>
                <div className={styles.titleRow}>
                  <h3 className={styles.cardTitle}>{tutor.display_name}</h3>
                  {tutor.is_platform_owned && (
                    <span className={styles.platformBadge}>Platform</span>
                  )}
                </div>

                <p className={styles.subject}>{tutor.subject}</p>

                {tutor.description && (
                  <p className={styles.description}>{tutor.description}</p>
                )}

                {/* Stats */}
                <div className={styles.stats}>
                  {tutor.avg_rating && tutor.total_reviews > 0 ? (
                    <div className={styles.rating}>
                      <Star className={styles.starIcon} />
                      <span className={styles.ratingValue}>
                        {tutor.avg_rating.toFixed(1)}
                      </span>
                      <span className={styles.reviewCount}>
                        ({tutor.total_reviews})
                      </span>
                    </div>
                  ) : (
                    <div className={styles.rating}>
                      <span className={styles.noReviews}>New tutor</span>
                    </div>
                  )}

                  <span className={styles.price}>£{tutor.price_per_hour}/hr</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
