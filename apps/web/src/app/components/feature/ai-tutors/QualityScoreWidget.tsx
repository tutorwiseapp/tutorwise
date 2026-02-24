/**
 * AI Tutor Quality Score Widget
 *
 * Displays AI tutor quality score (0-100) with detailed metrics breakdown.
 * Shows circular progress indicator and performance metrics.
 *
 * @module components/feature/ai-tutors/QualityScoreWidget
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import styles from './QualityScoreWidget.module.css';

interface QualityData {
  id: string;
  display_name: string;
  quality_score: number;
  metrics: {
    session_completion_rate: number;
    avg_rating: number;
    total_sessions: number;
    review_count: number;
    escalation_rate: number;
    material_completeness: number;
    material_count: number;
    link_count: number;
    last_calculated_at: string | null;
  };
  breakdown: {
    session_completion: string;
    avg_rating: string;
    total_sessions: string;
    escalation_rate: string;
    materials: string;
  };
  tier: 'excellent' | 'good' | 'average' | 'needs_improvement';
  is_owner: boolean;
  last_updated: string | null;
}

interface QualityScoreWidgetProps {
  aiTutorId: string;
}

export default function QualityScoreWidget({ aiTutorId }: QualityScoreWidgetProps) {
  const { data: quality, isLoading, refetch } = useQuery<QualityData>({
    queryKey: ['ai-tutor-quality', aiTutorId],
    queryFn: () => fetch(`/api/ai-tutors/${aiTutorId}/quality`).then((r) => r.json()),
  });

  const handleRecalculate = async () => {
    await fetch(`/api/ai-tutors/${aiTutorId}/quality/recalculate`, {
      method: 'POST',
    });
    refetch();
  };

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading quality score...</span>
        </div>
      </div>
    );
  }

  if (!quality) {
    return null;
  }

  const score = quality.quality_score;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color based on tier
  const tierColors = {
    excellent: '#10b981', // green
    good: '#3b82f6', // blue
    average: '#f59e0b', // orange
    needs_improvement: '#ef4444', // red
  };
  const scoreColor = tierColors[quality.tier];

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>AI Quality Score</h3>
        {quality.is_owner && (
          <button
            className={styles.recalculateButton}
            onClick={handleRecalculate}
            title="Recalculate quality score"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12a8 8 0 018-8V2.5M20 12a8 8 0 01-8 8v1.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 4l-2 2 2 2M12 20l2-2-2-2"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Circular Progress */}
      <div className={styles.scoreCircle}>
        <svg className={styles.progressRing} width="120" height="120">
          {/* Background circle */}
          <circle
            className={styles.progressRingBg}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
            r="45"
            cx="60"
            cy="60"
          />
          {/* Progress circle */}
          <circle
            className={styles.progressRingProgress}
            stroke={scoreColor}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            r="45"
            cx="60"
            cy="60"
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className={styles.scoreValue}>
          <span className={styles.scoreNumber}>{score}</span>
          <span className={styles.scoreMax}>/100</span>
        </div>
      </div>

      {/* Tier Badge */}
      <div className={styles.tierBadge} style={{ backgroundColor: scoreColor }}>
        {quality.tier.replace('_', ' ').toUpperCase()}
      </div>

      {/* Metrics Breakdown */}
      <div className={styles.metrics}>
        <h4 className={styles.metricsTitle}>Performance Metrics</h4>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Session Completion</span>
            <span className={styles.metricValue}>{quality.breakdown.session_completion}</span>
          </div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricBarFill}
              style={{
                width: `${quality.metrics.session_completion_rate}%`,
                backgroundColor: quality.metrics.session_completion_rate >= 80 ? '#10b981' : '#f59e0b',
              }}
            />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Average Rating</span>
            <span className={styles.metricValue}>{quality.breakdown.avg_rating}</span>
          </div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricBarFill}
              style={{
                width: `${(quality.metrics.avg_rating / 5) * 100}%`,
                backgroundColor: quality.metrics.avg_rating >= 4 ? '#10b981' : '#f59e0b',
              }}
            />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Sessions</span>
            <span className={styles.metricValue}>{quality.breakdown.total_sessions}</span>
          </div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricBarFill}
              style={{
                width: `${Math.min(100, quality.metrics.total_sessions * 2)}%`,
                backgroundColor: '#3b82f6',
              }}
            />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Escalation Rate</span>
            <span className={styles.metricValue}>{quality.breakdown.escalation_rate}</span>
          </div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricBarFill}
              style={{
                width: `${quality.metrics.escalation_rate}%`,
                backgroundColor: quality.metrics.escalation_rate <= 20 ? '#10b981' : '#ef4444',
              }}
            />
          </div>
        </div>

        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Materials</span>
            <span className={styles.metricValue}>{quality.breakdown.materials}</span>
          </div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricBarFill}
              style={{
                width: `${quality.metrics.material_completeness}%`,
                backgroundColor: '#8b5cf6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {quality.last_updated && (
        <div className={styles.lastUpdated}>
          Last updated: {new Date(quality.last_updated).toLocaleDateString()}
        </div>
      )}

      {/* Improvement Suggestions */}
      {quality.is_owner && score < 80 && (
        <div className={styles.suggestions}>
          <h4 className={styles.suggestionsTitle}>Ways to Improve</h4>
          <ul className={styles.suggestionsList}>
            {quality.metrics.session_completion_rate < 80 && (
              <li>Improve session completion rate by better addressing client needs</li>
            )}
            {quality.metrics.avg_rating < 4 && (
              <li>Improve average rating by providing more helpful responses</li>
            )}
            {quality.metrics.total_sessions < 10 && (
              <li>Complete more sessions to build track record ({quality.metrics.total_sessions}/50)</li>
            )}
            {quality.metrics.escalation_rate > 20 && (
              <li>Reduce escalation rate by improving AI responses</li>
            )}
            {quality.metrics.material_completeness < 75 && (
              <li>Add more materials (target: 5+ files or 10+ total resources)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
