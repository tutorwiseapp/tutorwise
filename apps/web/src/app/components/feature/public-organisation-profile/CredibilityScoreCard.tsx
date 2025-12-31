/**
 * Filename: CredibilityScoreCard.tsx
 * Purpose: Credibility Score display card for public tutor profiles (CaaS v5.5)
 * Created: 2025-11-15
 * Updated: 2025-12-08 - Added optional scoreData prop for server-side performance optimization
 *
 * Features:
 * - Large score badge (e.g., "92/100")
 * - 5-bucket breakdown visualization for tutors
 * - "What is this?" tooltip with explanation
 * - Only displays for TUTOR profiles with calculated scores
 * - Co-located with VerificationCard in public profile sidebar
 * - Supports server-side data passing (recommended) or client-side fetch (fallback)
 */

'use client';

import { useEffect, useState } from 'react';
import Card from '@/app/components/ui/data-display/Card';
import { HelpCircle, Award } from 'lucide-react';
import styles from './CredibilityScoreCard.module.css';

interface ScoreBreakdown {
  performance?: number;
  qualifications?: number;
  network?: number;
  safety?: number;
  digital?: number;
  gate?: string;
}

interface CaaSScoreData {
  profile_id: string;
  total_score: number;
  score_breakdown: ScoreBreakdown;
  role_type: 'TUTOR' | 'CLIENT' | 'AGENT' | 'STUDENT';
  calculated_at: string;
  calculation_version: string;
}

interface CredibilityScoreCardProps {
  profileId: string;
  scoreData?: CaaSScoreData | null; // Optional: pass from server-side for performance
}

export function CredibilityScoreCard({ profileId, scoreData: initialScoreData }: CredibilityScoreCardProps) {
  const [scoreData, setScoreData] = useState<CaaSScoreData | null>(initialScoreData ?? null);
  const [loading, setLoading] = useState(!initialScoreData);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Skip fetch if scoreData was provided via props
    if (initialScoreData !== undefined) {
      return;
    }

    async function fetchScore() {
      try {
        const response = await fetch(`/api/caas/${profileId}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setScoreData(result.data);
          }
        } else if (response.status === 404) {
          // Score not calculated yet - this is expected for new profiles
          setScoreData(null);
        } else {
          console.error('Failed to fetch CaaS score:', response.status);
          setScoreData(null);
        }
      } catch (error) {
        console.error('Error fetching CaaS score:', error);
        setScoreData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchScore();
  }, [profileId, initialScoreData]);

  // Always show card with placeholder if no data
  if (loading) {
    return (
      <Card className={styles.credibilityCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Credibility Score</h3>
        </div>
        <div className={styles.placeholderContainer}>
          <div className={styles.placeholderIcon}>
            <Award size={40} strokeWidth={1.5} />
          </div>
          <p className={styles.placeholderText}>Loading...</p>
        </div>
      </Card>
    );
  }

  // Show placeholder if no score data
  if (!scoreData) {
    return (
      <Card className={styles.credibilityCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Credibility Score</h3>
        </div>
        <div className={styles.placeholderContainer}>
          <div className={styles.placeholderIcon}>
            <Award size={40} strokeWidth={1.5} />
          </div>
          <p className={styles.placeholderText}>Score not calculated yet</p>
        </div>
      </Card>
    );
  }

  // Show placeholder for non-tutor profiles
  if (scoreData.role_type !== 'TUTOR') {
    return (
      <Card className={styles.credibilityCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Credibility Score</h3>
        </div>
        <div className={styles.placeholderContainer}>
          <div className={styles.placeholderIcon}>
            <Award size={40} strokeWidth={1.5} />
          </div>
          <p className={styles.placeholderText}>Available for tutors only</p>
        </div>
      </Card>
    );
  }

  const { total_score, score_breakdown } = scoreData;

  // Show placeholder if safety gated
  if (total_score === 0 && score_breakdown.gate) {
    return (
      <Card className={styles.credibilityCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Credibility Score</h3>
        </div>
        <div className={styles.placeholderContainer}>
          <div className={styles.placeholderIcon}>
            <Award size={40} strokeWidth={1.5} />
          </div>
          <p className={styles.placeholderText}>Score under review</p>
        </div>
      </Card>
    );
  }

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return styles.scoreExcellent;
    if (score >= 60) return styles.scoreGood;
    if (score >= 40) return styles.scoreFair;
    return styles.scoreLow;
  };

  // Bucket labels and max scores for tutors
  const buckets = [
    { label: 'Performance', key: 'performance', max: 30 },
    { label: 'Qualifications', key: 'qualifications', max: 30 },
    { label: 'Network', key: 'network', max: 20 },
    { label: 'Safety', key: 'safety', max: 10 },
    { label: 'Digital', key: 'digital', max: 10 },
  ];

  return (
    <Card className={styles.credibilityCard}>
      {/* Header with title and help icon */}
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Credibility Score</h3>
        <button
          className={styles.helpButton}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="What is this?"
        >
          <HelpCircle size={18} />
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipArrow} />
            <p className={styles.tooltipText}>
              Credibility Score measures professional quality across 5 key areas:
              performance, qualifications, network, safety, and digital professionalism.
              Higher scores indicate more established and trustworthy tutors.
            </p>
          </div>
        )}
      </div>

      <div className={styles.cardContent}>

      {/* Large Score Badge */}
      <div className={styles.scoreBadgeContainer}>
        <div className={`${styles.scoreBadge} ${getScoreColor(total_score)}`}>
          <span className={styles.scoreNumber}>{total_score}</span>
          <span className={styles.scoreMax}>/100</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className={styles.breakdown}>
        <h4 className={styles.breakdownTitle}>Score Breakdown</h4>
        <div className={styles.bucketsContainer}>
          {buckets.map((bucket) => {
            const value = score_breakdown[bucket.key as keyof ScoreBreakdown] as number || 0;
            const percentage = (value / bucket.max) * 100;

            return (
              <div key={bucket.key} className={styles.bucketItem}>
                <div className={styles.bucketHeader}>
                  <span className={styles.bucketLabel}>{bucket.label}</span>
                  <span className={styles.bucketScore}>
                    {value}/{bucket.max}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </Card>
  );
}
