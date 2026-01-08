/**
 * Filename: ProfileGrowthWidget.tsx
 * Purpose: Unified CaaS Score + Getting Started card for Dashboard Sidebar
 * Created: 2025-12-15
 * Design: Combines credibility scoring with onboarding progress
 *
 * Features:
 * - Circular score badge with star rating
 * - Progress tracker (X of Y steps completed)
 * - Next step highlight with CTA button
 * - Expandable list of all steps with point badges
 * - Each step is a clickable link to relevant page
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import { InfoTooltip } from '@/app/components/ui/Tooltip';
import styles from './ProfileGrowthWidget.module.css';

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

interface ProfileStep {
  id: number;
  title: string;
  description: string;
  action: string;
  href: string;
  pointsGain: number;
  completed: boolean;
  icon?: string;
}

interface ProfileGrowthWidgetProps {
  userId: string;
  role: 'client' | 'tutor' | 'agent';
}

export default function ProfileGrowthWidget({ userId, role }: ProfileGrowthWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
              role_type: role,
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

  const score = scoreData?.data?.total_score || 0;
  const breakdown = scoreData?.data?.score_breakdown || {};

  // Generate profile steps based on score breakdown
  const getProfileSteps = (): ProfileStep[] => {
    const steps: ProfileStep[] = [];

    // Step 1: Complete Your Profile
    steps.push({
      id: 1,
      title: 'Complete Your Profile',
      description: 'Showcase your expertise, qualifications, and teaching style',
      action: 'Edit Profile',
      href: '/account/personal-info',
      pointsGain: 7,
      completed: (breakdown.profile_completion || 0) >= 10,
      icon: '✏️',
    });

    // Step 2: Upload DBS Certificate
    steps.push({
      id: 2,
      title: 'Upload your DBS certificate',
      description: 'Verified tutors get 3x more inquiries',
      action: 'Upload DBS',
      href: '/account/professional-info',
      pointsGain: 10,
      completed: (breakdown.verification || 0) >= 10,
      icon: '🛡️',
    });

    // Step 3: Set Your Availability
    steps.push({
      id: 3,
      title: 'Set Your Availability',
      description: 'Students book tutors with clear schedules',
      action: 'Set Availability',
      href: '/account/professional-info',
      pointsGain: 8,
      completed: (breakdown.availability || 0) >= 5,
      icon: '📅',
    });

    // Step 4: Verify Your Qualifications
    steps.push({
      id: 4,
      title: 'Verify Your Qualifications',
      description: 'Upload certificates to increase trust',
      action: 'Add Credentials',
      href: '/account/professional-info',
      pointsGain: 10,
      completed: (breakdown.credentials || 0) >= 5,
      icon: '🎓',
    });

    // Step 5: Set Up Payouts
    steps.push({
      id: 5,
      title: 'Set Up Payouts',
      description: 'Configure your bank account to receive payments',
      action: 'Payout Settings',
      href: '/payments',
      pointsGain: 0,
      completed: false,
      icon: '💳',
    });

    return steps;
  };

  const steps = getProfileSteps();
  const completedCount = steps.filter((s) => s.completed).length;
  const nextStep = steps.find((s) => !s.completed);
  const totalPotentialPoints = steps
    .filter((s) => !s.completed)
    .reduce((sum, s) => sum + s.pointsGain, 0);

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
      {/* Header - Standard Pattern */}
      <div className={styles.header}>
        <h3 className={styles.title}>Credibility Score (CaaS)</h3>
      </div>

      {/* Content - Standard 16px padding */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>Loading score...</div>
        ) : error ? (
          <div className={styles.error}>Unable to load score</div>
        ) : (
          <>
            {/* Score Display */}
            <div className={styles.scoreSection}>
              <InfoTooltip
                text="Your Credibility Score is calculated based on profile completion, verification status, credentials, availability, and response rates. Higher scores improve your visibility in search results."
                side="right"
              >
                <div className={`${styles.scoreCircle} ${getScoreColor(score)}`}>
                  <span className={styles.scoreNumber}>{score}</span>
                  <span className={styles.scoreOutOf}>/100</span>
                </div>
              </InfoTooltip>

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

            {/* Divider */}
            <div className={styles.divider} />

            {/* Progress Indicator */}
            <div className={styles.progressSection}>
              <p className={styles.progressText}>
                {completedCount} of {steps.length} steps completed
              </p>
            </div>

            {/* Next Step Highlight */}
            {nextStep && (
              <div className={styles.nextStepSection}>
                <h4 className={styles.nextStepLabel}>NEXT STEP</h4>
                <p className={styles.nextStepTitle}>
                  {totalPotentialPoints > 0 ? `Easy Wins (${totalPotentialPoints}+ points)` : nextStep.title}
                </p>
                <p className={styles.nextStepDescription}>{nextStep.description}</p>
              </div>
            )}

            {/* All Steps Completed */}
            {!nextStep && (
              <div className={styles.allComplete}>
                <p className={styles.allCompleteText}>
                  🎉 You&apos;ve completed all profile steps!
                </p>
              </div>
            )}

            {/* Expandable Steps List */}
            <div className={styles.expandableSection}>
              <button
                className={styles.expandToggle}
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
              >
                <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                View all steps
              </button>

              {isExpanded && (
                <ul className={styles.stepsList}>
                  {steps.map((step) => (
                    <li key={step.id} className={styles.stepItem}>
                      <Link href={step.href} className={styles.stepLink}>
                        <div className={styles.stepLeft}>
                          <span className={styles.stepNumber}>{step.id}</span>
                          <span className={styles.stepTitle}>{step.title}</span>
                        </div>
                        {step.pointsGain > 0 && (
                          <InfoTooltip
                            text={`Complete this step to gain ${step.pointsGain} points towards your Credibility Score`}
                            side="left"
                          >
                            <span className={styles.stepPoints}>+{step.pointsGain}</span>
                          </InfoTooltip>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer Link */}
            <div className={styles.footer}>
              <Link href="/help/caas-score" className={styles.footerLink}>
                How is this calculated?
              </Link>
            </div>
          </>
        )}
      </div>
    </HubComplexCard>
  );
}
