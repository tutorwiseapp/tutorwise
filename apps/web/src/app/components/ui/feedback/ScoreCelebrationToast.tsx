/**
 * Filename: ScoreCelebrationToast.tsx
 * Purpose: Custom celebration toast for CaaS score improvements
 * Created: 2025-12-15
 * Track B Phase 1.3: Priority 3 - Positive reinforcement loop
 *
 * Design Goals:
 * - Celebrate profile improvements with visual feedback
 * - Show score increase (+X points)
 * - Encourage completing more profile sections
 * - Create positive reinforcement loop
 * - Success Metric: Users who see celebration complete 2x more profile sections
 */

'use client';

import React from 'react';
import Link from 'next/link';
import styles from './ScoreCelebrationToast.module.css';

export interface ScoreCelebrationData {
  previousScore: number;
  newScore: number;
  improvement: string; // e.g., "Added DBS Certificate", "Completed Profile"
  nextStep?: {
    label: string;
    href: string;
  };
}

interface ScoreCelebrationToastProps {
  data: ScoreCelebrationData;
  onClose?: () => void;
}

export default function ScoreCelebrationToast({
  data,
  onClose,
}: ScoreCelebrationToastProps) {
  const { previousScore, newScore, improvement, nextStep } = data;
  const pointsGained = newScore - previousScore;

  // Get celebration level based on points gained
  const getCelebrationLevel = () => {
    if (pointsGained >= 10) return { emoji: '🎉', color: '#10b981', label: 'Amazing!' };
    if (pointsGained >= 5) return { emoji: '⭐', color: '#3b82f6', label: 'Great job!' };
    return { emoji: '✅', color: '#6b7280', label: 'Nice!' };
  };

  const celebration = getCelebrationLevel();

  // Track analytics
  React.useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'score_celebration_shown', {
        previous_score: previousScore,
        new_score: newScore,
        points_gained: pointsGained,
        improvement: improvement,
      });
    }
  }, [previousScore, newScore, pointsGained, improvement]);

  const handleNextStepClick = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'score_celebration_next_step_clicked', {
        next_step: nextStep?.label,
        current_score: newScore,
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Close button */}
      {onClose && (
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
      )}

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.emoji}>{celebration.emoji}</span>
        <span className={styles.celebrationLabel} style={{ color: celebration.color }}>
          {celebration.label}
        </span>
      </div>

      {/* Score Change */}
      <div className={styles.scoreChange}>
        <div className={styles.scoreRow}>
          <span className={styles.scoreOld}>{previousScore}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.scoreNew} style={{ color: celebration.color }}>
            {newScore}
          </span>
          <span className={styles.pointsGained} style={{ backgroundColor: celebration.color }}>
            +{pointsGained}
          </span>
        </div>
        <p className={styles.improvementText}>{improvement}</p>
      </div>

      {/* Next Step CTA (optional) */}
      {nextStep && (
        <Link
          href={nextStep.href}
          className={styles.nextStepButton}
          onClick={handleNextStepClick}
        >
          {nextStep.label} →
        </Link>
      )}
    </div>
  );
}

/**
 * Helper function to show score celebration toast
 * Usage in components:
 *
 * import { showScoreCelebration } from '@/app/components/ui/feedback/ScoreCelebrationToast';
 *
 * showScoreCelebration({
 *   previousScore: 45,
 *   newScore: 55,
 *   improvement: 'Added DBS Certificate',
 *   nextStep: {
 *     label: 'Add Intro Video',
 *     href: '/account/professional-info#video'
 *   }
 * });
 */
export function showScoreCelebration(data: ScoreCelebrationData) {
  // Dynamically import toast to avoid SSR issues
  import('react-hot-toast').then(({ default: toast }) => {
    toast.custom(
      (t) => (
        <div
          className={`${t.visible ? styles.toastEnter : styles.toastExit}`}
          style={{
            maxWidth: '420px',
          }}
        >
          <ScoreCelebrationToast
            data={data}
            onClose={() => toast.dismiss(t.id)}
          />
        </div>
      ),
      {
        duration: 6000, // 6 seconds - longer than default to allow reading
        position: 'top-center',
      }
    );
  });
}
