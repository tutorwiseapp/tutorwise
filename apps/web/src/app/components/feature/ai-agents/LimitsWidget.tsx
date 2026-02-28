/**
 * AI Tutor Limits Widget
 *
 * Displays user's current AI tutor creation limits based on CaaS score,
 * shows tier information, remaining slots, and upgrade path.
 *
 * @module components/feature/ai-agents/LimitsWidget
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import styles from './LimitsWidget.module.css';

interface LimitsData {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  caasScore: number;
  tier: {
    tierName: string;
    tierColor: string;
    minScore: number;
    maxScore: number;
    maxAIAgents: number;
    description: string;
  };
  nextTier: {
    tierName: string;
    tierColor: string;
    minScore: number;
    maxAIAgents: number;
  } | null;
  upgradeSuggestions: string[];
}

export default function LimitsWidget() {
  const { data: limits, isLoading } = useQuery<LimitsData>({
    queryKey: ['ai-tutor-limits'],
    queryFn: () => fetch('/api/ai-agents/limits').then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading limits...</span>
        </div>
      </div>
    );
  }

  if (!limits) {
    return null;
  }

  const progressPercentage = limits.limit > 0 ? (limits.current / limits.limit) * 100 : 0;
  const isNearLimit = progressPercentage >= 80;
  const isAtLimit = progressPercentage >= 100;

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>AI Tutor Slots</h3>
        <div
          className={styles.tierBadge}
          style={{ backgroundColor: limits.tier.tierColor }}
        >
          {limits.tier.tierName}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span className={styles.progressText}>
            {limits.current} / {limits.limit} used
          </span>
          {limits.remaining > 0 && (
            <span className={styles.remainingText}>
              {limits.remaining} slot{limits.remaining !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${
              isAtLimit ? styles.progressFillFull : isNearLimit ? styles.progressFillNear : ''
            }`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Tier Description */}
      <p className={styles.tierDescription}>{limits.tier.description}</p>

      {/* CaaS Score */}
      <div className={styles.caasSection}>
        <div className={styles.caasLabel}>Your CaaS Score</div>
        <div className={styles.caasScore}>
          {limits.caasScore}
          <span className={styles.caasMax}> / 100</span>
        </div>
      </div>

      {/* Upgrade Section */}
      {limits.nextTier && (
        <div className={styles.upgradeSection}>
          <div className={styles.upgradeHeader}>
            <svg className={styles.upgradeIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.upgradeTitle}>
              Unlock {limits.nextTier.tierName} Tier
            </span>
          </div>
          <p className={styles.upgradeText}>
            Reach {limits.nextTier.minScore} CaaS score to unlock{' '}
            <strong>{limits.nextTier.maxAIAgents} AI tutor slots</strong>
          </p>

          {limits.upgradeSuggestions.length > 0 && (
            <div className={styles.suggestions}>
              <p className={styles.suggestionsTitle}>How to increase your score:</p>
              <ul className={styles.suggestionsList}>
                {limits.upgradeSuggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className={styles.suggestionItem}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a href="/account/professional-info" className={styles.upgradeButton}>
            Improve CaaS Score
          </a>
        </div>
      )}

      {/* At Max Tier */}
      {!limits.nextTier && limits.tier.tierName === 'Elite' && (
        <div className={styles.maxTierSection}>
          <div className={styles.maxTierIcon}>🎉</div>
          <p className={styles.maxTierText}>
            You're at the maximum tier with {limits.limit} AI tutor slots!
          </p>
        </div>
      )}
    </div>
  );
}
