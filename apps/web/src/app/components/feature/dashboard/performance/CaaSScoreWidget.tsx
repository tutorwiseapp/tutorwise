/**
 * Filename: CaaSScoreWidget.tsx
 * Purpose: CaaS (Credibility as a Service) Score Widget for Dashboard Sidebar
 * Created: 2025-12-15
 * Track B Phase 1.1: Priority 1 - Always-visible score + actionable "easy wins"
 *
 * Design Goals:
 * - Display current CaaS score prominently
 * - Show visual rating (stars/progress bar)
 * - List top 3 "easy wins" with highest impact
 * - One-click CTAs to complete missing items
 * - Success Metric: 60%+ users click at least one "Easy Win" CTA
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './CaaSScoreWidget.module.css';

interface CaaSScoreData {
  profile_id: string;
  total_score: number; // 0-100
  score_breakdown: {
    profile_completion?: number;
    verification?: number;
    credentials?: number;
    video?: number;
    availability?: number;
    response_rate?: number;
    reviews?: number;
  };
  role_type: 'tutor' | 'client' | 'agent';
  calculated_at: string;
  calculation_version: string;
}

interface EasyWin {
  title: string;
  description: string;
  pointsGain: number;
  action: string;
  href: string;
  icon: string;
}

interface CaaSScoreWidgetProps {
  userId: string;
}

export default function CaaSScoreWidget({ userId }: CaaSScoreWidgetProps) {
  // Fetch CaaS score data
  const {
    data: scoreData,
    isLoading,
    error,
  } = useQuery<{ success: boolean; data: CaaSScoreData }>({
    queryKey: ['caas-score', userId],
    queryFn: async () => {
      const response = await fetch(`/api/caas/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Score not calculated yet - return default
          return {
            success: false,
            data: {
              profile_id: userId,
              total_score: 0,
              score_breakdown: {},
              role_type: 'tutor' as const,
              calculated_at: new Date().toISOString(),
              calculation_version: '1.0',
            },
          };
        }
        throw new Error('Failed to fetch CaaS score');
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate easy wins based on missing components
  const getEasyWins = (): EasyWin[] => {
    if (!scoreData?.data) return [];

    const breakdown = scoreData.data.score_breakdown;
    const wins: EasyWin[] = [];

    // Video intro (+5 points)
    if (!breakdown.video || breakdown.video === 0) {
      wins.push({
        title: 'Add 30-Second Intro Video',
        description: 'Quick video intro boosts trust',
        pointsGain: 5,
        action: 'Add Video',
        href: '/account/professional-info',
        icon: '🎥',
      });
    }

    // DBS Certificate (+10 points)
    if (!breakdown.verification || breakdown.verification < 10) {
      wins.push({
        title: 'Upload DBS Certificate',
        description: 'Verified tutors get 3x more inquiries',
        pointsGain: 10,
        action: 'Upload DBS',
        href: '/account/professional-info',
        icon: '🛡️',
      });
    }

    // Credentials/Qualifications (+8 points)
    if (!breakdown.credentials || breakdown.credentials < 5) {
      wins.push({
        title: 'Add Teaching Credentials',
        description: 'Showcase your qualifications',
        pointsGain: 8,
        action: 'Add Credentials',
        href: '/account/professional-info',
        icon: '🎓',
      });
    }

    // Availability (+5 points)
    if (!breakdown.availability || breakdown.availability < 5) {
      wins.push({
        title: 'Set Your Availability',
        description: 'Students book tutors with clear schedules',
        pointsGain: 5,
        action: 'Set Availability',
        href: '/account/professional-info',
        icon: '📅',
      });
    }

    // Profile completion (+7 points)
    if (!breakdown.profile_completion || breakdown.profile_completion < 10) {
      wins.push({
        title: 'Complete Your Profile',
        description: 'Fill in bio, subjects, and experience',
        pointsGain: 7,
        action: 'Complete Profile',
        href: '/account/professional-info',
        icon: '✏️',
      });
    }

    // Sort by points gain (highest first) and return top 3
    return wins.sort((a, b) => b.pointsGain - a.pointsGain).slice(0, 3);
  };

  const easyWins = getEasyWins();
  const score = scoreData?.data?.total_score || 0;

  // Calculate star rating (0-5 stars, based on 0-100 score)
  const getStarRating = (score: number): number => {
    return Math.round((score / 100) * 5);
  };

  const stars = getStarRating(score);

  // Get score color class
  const getScoreColor = (score: number): string => {
    if (score >= 80) return styles.scoreExcellent;
    if (score >= 60) return styles.scoreGood;
    if (score >= 40) return styles.scoreFair;
    return styles.scorePoor;
  };

  return (
    <HubComplexCard>
      <div className={styles.container}>
        <h3 className={styles.title}>Credibility Score (CaaS)</h3>

        {isLoading ? (
          <div className={styles.loading}>Loading score...</div>
        ) : error ? (
          <div className={styles.error}>Unable to load score</div>
        ) : (
          <>
            {/* Score Display */}
            <div className={styles.scoreSection}>
              <div className={`${styles.scoreCircle} ${getScoreColor(score)}`}>
                <span className={styles.scoreNumber}>{score}</span>
                <span className={styles.scoreOutOf}>/100</span>
              </div>

              {/* Star Rating */}
              <div className={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= stars ? styles.starFilled : styles.starEmpty}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Score Description */}
              <p className={styles.scoreDescription}>
                {score >= 80 && 'Excellent! You stand out in search results'}
                {score >= 60 && score < 80 && 'Good score! A few tweaks to reach excellent'}
                {score >= 40 && score < 60 && 'Fair score. Complete easy wins to improve'}
                {score < 40 && 'Build trust by completing your profile'}
              </p>
            </div>

            {/* Easy Wins Section */}
            {easyWins.length > 0 && (
              <div className={styles.easyWinsSection}>
                <h4 className={styles.easyWinsTitle}>
                  🎯 Easy Wins ({easyWins.reduce((sum, win) => sum + win.pointsGain, 0)}+ points)
                </h4>

                <ul className={styles.easyWinsList}>
                  {easyWins.map((win, index) => (
                    <li key={index} className={styles.easyWinItem}>
                      <div className={styles.winContent}>
                        <span className={styles.winIcon}>{win.icon}</span>
                        <div className={styles.winDetails}>
                          <div className={styles.winHeader}>
                            <span className={styles.winTitle}>{win.title}</span>
                            <span className={styles.winPoints}>+{win.pointsGain}</span>
                          </div>
                          <p className={styles.winDescription}>{win.description}</p>
                        </div>
                      </div>
                      <Link href={win.href} className={styles.winAction}>
                        {win.action}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* All items complete */}
            {easyWins.length === 0 && score >= 80 && (
              <div className={styles.allComplete}>
                <p className={styles.allCompleteText}>
                  🎉 You&apos;ve maxed out your credibility score!
                </p>
              </div>
            )}

            {/* Learn More Link */}
            <div className={styles.footer}>
              <Link href="/help/caas-score" className={styles.learnMore}>
                How is this calculated?
              </Link>
            </div>
          </>
        )}
      </div>
    </HubComplexCard>
  );
}
