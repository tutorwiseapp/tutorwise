'use client';

import { useMemo } from 'react';
import type { Profile } from '@/types';
import styles from './ProfileCompletenessIndicator.module.css';

interface ProfileCompletenessIndicatorProps {
  profile: Profile;
}

interface CompletenessCheck {
  key: string;
  label: string;
  completed: boolean;
}

export default function ProfileCompletenessIndicator({ profile }: ProfileCompletenessIndicatorProps) {
  const { completenessScore, checks, incompleteCount } = useMemo(() => {
    const checks: CompletenessCheck[] = [
      {
        key: 'display_name',
        label: 'Add your display name',
        completed: Boolean(profile.display_name && profile.display_name.length >= 2),
      },
      {
        key: 'avatar',
        label: 'Upload a profile photo',
        completed: Boolean(profile.avatar_url),
      },
      {
        key: 'bio',
        label: 'Write a bio',
        completed: Boolean(profile.bio && profile.bio.length >= 50),
      },
      {
        key: 'categories',
        label: 'Add your categories',
        completed: Boolean(profile.categories && profile.categories.length > 0),
      },
      {
        key: 'achievements',
        label: 'List your achievements',
        completed: Boolean(profile.achievements && profile.achievements.length >= 30),
      },
      {
        key: 'cover_photo',
        label: 'Upload a cover photo',
        completed: Boolean(profile.cover_photo_url),
      },
    ];

    const completedCount = checks.filter(c => c.completed).length;
    const totalCount = checks.length;
    const score = Math.round((completedCount / totalCount) * 100);
    const incompleteCount = totalCount - completedCount;

    return {
      completenessScore: score,
      checks,
      incompleteCount,
    };
  }, [profile]);

  const getScoreColor = () => {
    if (completenessScore >= 80) return styles.scoreHigh;
    if (completenessScore >= 50) return styles.scoreMedium;
    return styles.scoreLow;
  };

  const getScoreMessage = () => {
    if (completenessScore === 100) return 'Your profile is complete!';
    if (completenessScore >= 80) return 'Almost there! Just a few more steps.';
    if (completenessScore >= 50) return 'You\'re halfway there!';
    return 'Let\'s complete your profile.';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Profile Completeness</h3>
        <div className={`${styles.score} ${getScoreColor()}`}>
          {completenessScore}%
        </div>
      </div>

      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${completenessScore}%` }}
        />
      </div>

      <p className={styles.message}>{getScoreMessage()}</p>

      {incompleteCount > 0 && (
        <div className={styles.checklistContainer}>
          <h4 className={styles.checklistTitle}>
            {incompleteCount} {incompleteCount === 1 ? 'item' : 'items'} to complete:
          </h4>
          <ul className={styles.checklist}>
            {checks.filter(check => !check.completed).map(check => (
              <li key={check.key} className={styles.checklistItem}>
                <span className={styles.checkIcon}>○</span>
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {completenessScore === 100 && (
        <div className={styles.completeBadge}>
          <span className={styles.badgeIcon}>✓</span>
          <span className={styles.badgeText}>Profile Complete</span>
        </div>
      )}
    </div>
  );
}
