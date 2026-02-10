/**
 * Filename: MonthlyChallenges.tsx
 * Purpose: Display and manage monthly referral challenges
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trophy, Users, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import styles from './MonthlyChallenges.module.css';

interface Challenge {
  id: string;
  name: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_description: string;
  reward_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  current_value?: number;
  is_winner?: boolean;
  participant_count?: number;
}

interface MonthlyChallengesProps {
  organisationId: string;
  memberId: string;
  isOwner: boolean;
}

export function MonthlyChallenges({
  organisationId,
  memberId,
  isOwner,
}: MonthlyChallengesProps) {
  const supabase = createClient();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId, memberId]);

  const loadChallenges = async () => {
    try {
      // Get active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('referral_challenges')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (challengesError) throw challengesError;

      // Get member's participation
      if (challengesData && challengesData.length > 0) {
        const challengeIds = challengesData.map((c) => c.id);

        const { data: participationData, error: participationError } = await supabase
          .from('challenge_participants')
          .select('challenge_id, current_value, is_winner')
          .eq('member_id', memberId)
          .in('challenge_id', challengeIds);

        if (participationError) throw participationError;

        // Get participant counts
        const { data: countsData, error: countsError } = await supabase
          .from('challenge_participants')
          .select('challenge_id')
          .in('challenge_id', challengeIds);

        if (countsError) throw countsError;

        // Merge data
        const participationMap = new Map(
          participationData?.map((p) => [p.challenge_id, p]) || []
        );

        const countsMap = countsData?.reduce((acc, item) => {
          acc[item.challenge_id] = (acc[item.challenge_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const merged = challengesData.map((challenge) => {
          const participation = participationMap.get(challenge.id);
          return {
            ...challenge,
            current_value: participation?.current_value || 0,
            is_winner: participation?.is_winner || false,
            participant_count: countsMap?.[challenge.id] || 0,
          };
        });

        setChallenges(merged);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          member_id: memberId,
          current_value: 0,
        });

      if (error) throw error;
      loadChallenges();
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'most_referrals':
        return Users;
      case 'highest_conversion':
        return Target;
      case 'fastest_conversion':
        return TrendingUp;
      case 'team_total':
        return Trophy;
      default:
        return Award;
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      most_referrals: 'Most Referrals',
      highest_conversion: 'Highest Conversion Rate',
      fastest_conversion: 'Fastest Conversion',
      team_total: 'Team Goal',
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Monthly Challenges</h2>
          <p className={styles.subtitle}>
            Compete with your team and earn rewards for top performance
          </p>
        </div>
      </div>

      {/* Challenges Grid */}
      {challenges.length > 0 ? (
        <div className={styles.challengesGrid}>
          {challenges.map((challenge) => {
            const Icon = getChallengeIcon(challenge.challenge_type);
            const daysLeft = getDaysRemaining(challenge.end_date);
            const progress = challenge.target_value > 0
              ? Math.min((challenge.current_value || 0) / challenge.target_value * 100, 100)
              : 0;
            const hasJoined = (challenge.current_value || 0) >= 0;

            return (
              <div
                key={challenge.id}
                className={`${styles.challengeCard} ${
                  challenge.is_winner ? styles.winner : ''
                }`}
              >
                {/* Winner Badge */}
                {challenge.is_winner && (
                  <div className={styles.winnerBadge}>
                    <Trophy size={16} />
                    <span>Winner!</span>
                  </div>
                )}

                {/* Icon */}
                <div className={styles.challengeIcon}>
                  <Icon size={32} />
                </div>

                {/* Content */}
                <div className={styles.challengeContent}>
                  <h3 className={styles.challengeName}>{challenge.name}</h3>
                  <p className={styles.challengeDescription}>{challenge.description}</p>

                  {/* Type */}
                  <div className={styles.challengeType}>
                    {getChallengeTypeLabel(challenge.challenge_type)}
                  </div>

                  {/* Target */}
                  <div className={styles.challengeTarget}>
                    <Target size={16} />
                    <span>Target: {challenge.target_value}</span>
                  </div>

                  {/* Progress */}
                  {hasJoined && (
                    <div className={styles.progressSection}>
                      <div className={styles.progressHeader}>
                        <span>Your Progress</span>
                        <span className={styles.progressValue}>
                          {challenge.current_value} / {challenge.target_value}
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reward */}
                  <div className={styles.reward}>
                    <Award size={16} />
                    <span>
                      {challenge.reward_description}
                      {challenge.reward_amount > 0 &&
                        ` - ${formatCurrency(challenge.reward_amount)}`}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className={styles.challengeFooter}>
                    <div className={styles.timeline}>
                      <Calendar size={14} />
                      <span>
                        {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                      </span>
                    </div>
                    <div className={styles.daysLeft}>
                      {daysLeft > 0 ? (
                        <>
                          <span className={styles.daysCount}>{daysLeft}</span>
                          <span className={styles.daysLabel}>days left</span>
                        </>
                      ) : (
                        <span className={styles.ended}>Ended</span>
                      )}
                    </div>
                  </div>

                  {/* Participants */}
                  {challenge.participant_count && challenge.participant_count > 0 && (
                    <div className={styles.participants}>
                      <Users size={14} />
                      <span>{challenge.participant_count} participants</span>
                    </div>
                  )}

                  {/* Join Button */}
                  {!hasJoined && daysLeft > 0 && (
                    <button
                      className={styles.joinButton}
                      onClick={() => joinChallenge(challenge.id)}
                    >
                      Join Challenge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Trophy size={48} />
          <p>No active challenges right now</p>
          <p className={styles.emptySubtitle}>
            {isOwner
              ? 'Create a challenge to motivate your team!'
              : 'Check back soon for new challenges'}
          </p>
        </div>
      )}
    </div>
  );
}
