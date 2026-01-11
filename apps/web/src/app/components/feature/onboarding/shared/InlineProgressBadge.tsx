/**
 * Filename: InlineProgressBadge.tsx
 * Purpose: Inline progress indicator with CaaS points for onboarding wizard
 * Created: 2026-01-10
 *
 * Design: Combines Option A (Earn +X pts) + Option D (35/55 · 64%) with visual dots
 * Layout: "Earn +10 pts · ○○○●○ · 35/55 · 64% ›"
 * Position: Right side of step title to save vertical space
 */

'use client';

import React, { useState } from 'react';
import styles from './InlineProgressBadge.module.css';

interface Step {
  name: string;
  points: number;
  completed: boolean;
  current: boolean;
}

interface InlineProgressBadgeProps {
  currentPoints: number;        // e.g., 35
  totalPoints: number;          // 55
  currentStepPoints: number;    // e.g., 10 for verification
  requiredPoints?: number;      // 45 (optional steps excluded)
  steps: Step[];                // All onboarding steps
}

export default function InlineProgressBadge({
  currentPoints,
  totalPoints,
  currentStepPoints,
  requiredPoints,
  steps,
}: InlineProgressBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate percentage based on required points if provided, else total
  const basePoints = requiredPoints || totalPoints;
  const percentage = Math.round((currentPoints / basePoints) * 100);

  // Get percentage color class
  const getPercentageClass = () => {
    if (percentage >= 80) return styles.percentageExcellent;
    if (percentage >= 60) return styles.percentageGood;
    if (percentage >= 40) return styles.percentageFair;
    return styles.percentagePoor;
  };

  return (
    <div
      className={styles.container}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Earn Badge */}
      <span className={styles.earnBadge}>
        Earn +{currentStepPoints} pts
      </span>

      {/* Separator */}
      <span className={styles.separator}>·</span>

      {/* Visual Dots */}
      <div className={styles.dots}>
        {steps.map((step, index) => (
          <span
            key={index}
            className={
              step.completed
                ? styles.dotCompleted
                : step.current
                ? styles.dotCurrent
                : styles.dotPending
            }
            title={`${step.name} (${step.points} pts)`}
          >
            {step.completed ? '●' : step.current ? '◐' : '○'}
          </span>
        ))}
      </div>

      {/* Separator */}
      <span className={styles.separator}>·</span>

      {/* Progress Fraction */}
      <span className={styles.progress}>
        {currentPoints}/{requiredPoints || totalPoints}
      </span>

      {/* Separator */}
      <span className={styles.separator}>·</span>

      {/* Percentage */}
      <span className={`${styles.percentage} ${getPercentageClass()}`}>
        {percentage}%
      </span>

      {/* Chevron */}
      <span className={styles.chevron}>
        {showTooltip ? '▼' : '›'}
      </span>

      {/* Hover Tooltip */}
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            Profile Setup Progress
          </div>
          <ul className={styles.stepsList}>
            {steps.map((step, index) => (
              <li
                key={index}
                className={
                  step.completed
                    ? styles.stepCompleted
                    : step.current
                    ? styles.stepCurrent
                    : styles.stepPending
                }
              >
                <span className={styles.stepIcon}>
                  {step.completed ? '✓' : step.current ? '→' : '○'}
                </span>
                <span className={styles.stepName}>{step.name}</span>
                <span className={styles.stepPoints}>+{step.points}</span>
              </li>
            ))}
          </ul>
          <div className={styles.tooltipFooter}>
            <strong>{currentPoints}</strong> of <strong>{requiredPoints || totalPoints}</strong> points earned
            {requiredPoints && requiredPoints < totalPoints && (
              <span className={styles.optionalNote}>
                {' '}(+{totalPoints - requiredPoints} optional)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
