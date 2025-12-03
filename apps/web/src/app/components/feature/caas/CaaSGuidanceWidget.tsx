/**
 * Filename: CaaSGuidanceWidget.tsx
 * Purpose: CaaS Guidance Widget for tutor dashboard sidebar (CaaS v5.5)
 * Created: 2025-11-15
 *
 * Features:
 * - Displays current credibility score for tutors
 * - Shows "Next Best Actions" checklist to improve score
 * - Progress tracking with actionable recommendations
 * - Only displays for TUTOR role users
 * - Appears in dashboard HubSidebar
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/app/components/ui/data-display/Card';
import { TrendingUp, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import styles from './CaaSGuidanceWidget.module.css';

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

interface ActionItem {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  link?: string;
}

interface CaaSGuidanceWidgetProps {
  profileId: string;
  profile: {
    bio_video_url?: string | null;
    dbs_verified?: boolean | null;
    qualifications?: string[] | null;
    identity_verified?: boolean;
  };
}

export function CaaSGuidanceWidget({ profileId, profile }: CaaSGuidanceWidgetProps) {
  const [scoreData, setScoreData] = useState<CaaSScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await fetch(`/api/caas/${profileId}`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setScoreData(result.data);
          }
        } else if (response.status === 404) {
          // Score not calculated yet
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
  }, [profileId]);

  // Don't render if loading or not a tutor
  if (loading) {
    return null;
  }

  if (!scoreData || scoreData.role_type !== 'TUTOR') {
    return null;
  }

  const { total_score, score_breakdown } = scoreData;

  // Calculate action items based on current score breakdown
  const getActionItems = (): ActionItem[] => {
    const actions: ActionItem[] = [];

    // Action 1: Add 30s intro video (+5 pts)
    const hasVideoIntro = Boolean(profile.bio_video_url && profile.bio_video_url !== '');
    actions.push({
      id: 'video-intro',
      title: 'Add 30-Second Intro Video',
      description: 'Upload a short intro video to boost your digital professionalism score',
      points: 5,
      completed: hasVideoIntro,
      link: '/account/professional',
    });

    // Action 2: Complete DBS check (+5 pts)
    const hasValidDBS = Boolean(profile.dbs_verified === true);
    actions.push({
      id: 'dbs-check',
      title: 'Complete DBS Check',
      description: 'Verify your background check to increase safety score',
      points: 5,
      completed: hasValidDBS,
      link: '/account/verification',
    });

    // Action 3: Add QTS qualification (+10 pts)
    const hasQTS = profile.qualifications?.includes('QTS') || false;
    actions.push({
      id: 'qts-qualification',
      title: 'Add QTS Qualification',
      description: 'Add Qualified Teacher Status to your qualifications',
      points: 10,
      completed: hasQTS,
      link: '/account/professional',
    });

    // Action 4: Connect Google Calendar (+5 pts)
    // We can infer this from the digital score bucket
    const digitalScore = score_breakdown.digital || 0;
    const hasIntegrations = digitalScore >= 5;
    actions.push({
      id: 'google-calendar',
      title: 'Connect Google Calendar',
      description: 'Sync your calendar for better scheduling',
      points: 5,
      completed: hasIntegrations,
      link: '/settings',
    });

    // Sort by incomplete first, then by points (highest first)
    return actions.sort((a, b) => {
      if (a.completed === b.completed) {
        return b.points - a.points;
      }
      return a.completed ? 1 : -1;
    });
  };

  const actionItems = getActionItems();
  const completedActions = actionItems.filter(a => a.completed).length;
  const potentialGain = actionItems
    .filter(a => !a.completed)
    .reduce((sum, a) => sum + a.points, 0);

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return styles.scoreExcellent;
    if (score >= 60) return styles.scoreGood;
    if (score >= 40) return styles.scoreFair;
    return styles.scoreLow;
  };

  return (
    <Card className={styles.guidanceWidget}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <TrendingUp size={20} className={styles.trendIcon} />
          <h3 className={styles.title}>Credibility Score</h3>
        </div>
      </div>

      {/* Current Score Display */}
      <div className={styles.scoreDisplay}>
        <div className={`${styles.scoreBadge} ${getScoreColor(total_score)}`}>
          <span className={styles.scoreNumber}>{total_score}</span>
          <span className={styles.scoreMax}>/100</span>
        </div>
        {potentialGain > 0 && (
          <p className={styles.potentialGain}>
            Gain up to <strong>+{potentialGain} points</strong> by completing actions below
          </p>
        )}
      </div>

      {/* Action Items */}
      <div className={styles.actionsSection}>
        <h4 className={styles.actionsTitle}>Next Best Actions</h4>
        <div className={styles.actionsList}>
          {actionItems.map((action) => (
            <div key={action.id} className={styles.actionItem}>
              <div className={styles.actionHeader}>
                {action.completed ? (
                  <CheckCircle2 size={20} className={styles.iconCompleted} />
                ) : (
                  <Circle size={20} className={styles.iconIncomplete} />
                )}
                <div className={styles.actionContent}>
                  <div className={styles.actionTitleRow}>
                    <span className={action.completed ? styles.actionTitleCompleted : styles.actionTitleIncomplete}>
                      {action.title}
                    </span>
                    <span className={styles.actionPoints}>+{action.points}pts</span>
                  </div>
                  <p className={styles.actionDescription}>{action.description}</p>
                  {action.link && !action.completed && (
                    <Link href={action.link} className={styles.actionLink}>
                      Take action <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Summary */}
        <div className={styles.progressSummary}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(completedActions / actionItems.length) * 100}%` }}
            />
          </div>
          <p className={styles.progressText}>
            {completedActions} of {actionItems.length} actions completed
          </p>
        </div>
      </div>
    </Card>
  );
}
