/**
 * Filename: apps/web/src/app/components/ui/MatchScore.tsx
 * Purpose: Display match score with visual indicators and breakdown
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Match Score Display
 *
 * Features:
 * - Color-coded progress bar
 * - Badge with match label
 * - Optional detailed breakdown
 * - Reasons for the match
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <MatchScore
 *   score={matchScore}
 *   showBreakdown={false}
 *   size="medium"
 * />
 * ```
 */

'use client';

import React, { useState } from 'react';
import type { MatchScore as MatchScoreType } from '@/lib/services/matchScoring';
import styles from './MatchScore.module.css';

export interface MatchScoreProps {
  score: MatchScoreType;
  showBreakdown?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function MatchScore({
  score,
  showBreakdown = false,
  size = 'medium',
  className = '',
}: MatchScoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getColorClass = (value: number): string => {
    if (value >= 90) return styles.colorExcellent;
    if (value >= 75) return styles.colorGreat;
    if (value >= 60) return styles.colorGood;
    if (value >= 40) return styles.colorFair;
    return styles.colorPoor;
  };

  const getLabelText = (label: string): string => {
    const labels = {
      excellent: 'Excellent Match',
      great: 'Great Match',
      good: 'Good Match',
      fair: 'Fair Match',
      poor: 'Limited Match',
    };
    return labels[label as keyof typeof labels] || label;
  };

  const getIcon = (label: string): string => {
    const icons = {
      excellent: '⭐',
      great: '✨',
      good: '👍',
      fair: '👌',
      poor: '🤔',
    };
    return icons[label as keyof typeof icons] || '';
  };

  return (
    <div className={`${styles.matchScoreContainer} ${styles[size]} ${className}`}>
      {/* Main Score Display */}
      <div className={styles.scoreHeader}>
        <div className={styles.scoreInfo}>
          <div className={`${styles.scoreBadge} ${getColorClass(score.overall)}`}>
            <span className={styles.scoreIcon}>{getIcon(score.label)}</span>
            <span className={styles.scoreValue}>{score.overall}%</span>
          </div>
          <div className={styles.scoreLabel}>
            {getLabelText(score.label)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${getColorClass(score.overall)}`}
            style={{ width: `${score.overall}%` }}
          />
        </div>
      </div>

      {/* Reasons */}
      {score.reasons.length > 0 && (
        <div className={styles.reasons}>
          {score.reasons.map((reason, index) => (
            <div key={index} className={styles.reason}>
              <span className={styles.reasonIcon}>•</span>
              <span className={styles.reasonText}>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown Toggle */}
      {showBreakdown && (
        <div className={styles.breakdownSection}>
          <button
            className={styles.breakdownToggle}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <span>View Breakdown</span>
            <span className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ''}`}>
              ▼
            </span>
          </button>

          {isExpanded && (
            <div className={styles.breakdown}>
              <BreakdownItem
                label="Semantic Match"
                value={score.breakdown.semantic}
                weight={40}
              />
              <BreakdownItem
                label="Subject Match"
                value={score.breakdown.subject}
                weight={25}
              />
              <BreakdownItem
                label="Level Match"
                value={score.breakdown.level}
                weight={15}
              />
              <BreakdownItem
                label="Location Match"
                value={score.breakdown.location}
                weight={10}
              />
              <BreakdownItem
                label="Price Match"
                value={score.breakdown.price}
                weight={5}
              />
              <BreakdownItem
                label="Availability"
                value={score.breakdown.availability}
                weight={5}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BreakdownItemProps {
  label: string;
  value: number;
  weight: number;
}

function BreakdownItem({ label, value, weight }: BreakdownItemProps) {
  const getColorClass = (val: number): string => {
    if (val >= 80) return styles.colorExcellent;
    if (val >= 60) return styles.colorGreat;
    if (val >= 40) return styles.colorGood;
    return styles.colorFair;
  };

  return (
    <div className={styles.breakdownItem}>
      <div className={styles.breakdownLabel}>
        <span>{label}</span>
        <span className={styles.breakdownWeight}>({weight}%)</span>
      </div>
      <div className={styles.breakdownBar}>
        <div
          className={`${styles.breakdownFill} ${getColorClass(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className={styles.breakdownValue}>{value}%</div>
    </div>
  );
}

/**
 * Compact version for use in cards
 */
export function MatchScoreBadge({
  score,
  onClick,
}: {
  score: MatchScoreType;
  onClick?: () => void;
}) {
  const getColorClass = (value: number): string => {
    if (value >= 90) return styles.colorExcellent;
    if (value >= 75) return styles.colorGreat;
    if (value >= 60) return styles.colorGood;
    if (value >= 40) return styles.colorFair;
    return styles.colorPoor;
  };

  const getIcon = (label: string): string => {
    const icons = {
      excellent: '⭐',
      great: '✨',
      good: '👍',
      fair: '👌',
      poor: '🤔',
    };
    return icons[label as keyof typeof icons] || '';
  };

  return (
    <div
      className={`${styles.compactBadge} ${getColorClass(score.overall)}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={styles.compactIcon}>{getIcon(score.label)}</span>
      <span className={styles.compactValue}>{score.overall}% match</span>
    </div>
  );
}
