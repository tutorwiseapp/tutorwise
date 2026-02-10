/**
 * Filename: TeamReferralLeaderboard.tsx
 * Purpose: Display team member referral leaderboard
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trophy, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils/initials';
import styles from './TeamReferralLeaderboard.module.css';

interface MemberStats {
  member_id: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  total_referrals: number;
  converted_count: number;
  conversion_rate: number;
  total_earnings: number;
  pending_earnings: number;
  rank_by_conversions: number;
  referrals_this_month: number;
  conversions_this_month: number;
  earnings_this_month: number;
}

interface TeamReferralLeaderboardProps {
  organisationId: string;
  limit?: number;
  showFullStats?: boolean;
}

export function TeamReferralLeaderboard({
  organisationId,
  limit = 10,
  showFullStats = false
}: TeamReferralLeaderboardProps) {
  const supabase = createClient();

  const [stats, setStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all-time' | 'month'>('all-time');

  useEffect(() => {
    loadLeaderboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId, period]);

  const loadLeaderboard = async () => {
    try {
      // Fetch member stats from materialized view
      let query = supabase
        .from('member_referral_stats')
        .select(`
          *,
          profile:member_id (
            full_name,
            avatar_url
          )
        `)
        .eq('organisation_id', organisationId)
        .order(period === 'month' ? 'earnings_this_month' : 'total_earnings', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      setStats(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: '#fbbf24', label: '1st Place' };
    if (rank === 2) return { icon: '🥈', color: '#94a3b8', label: '2nd Place' };
    if (rank === 3) return { icon: '🥉', color: '#cd7f32', label: '3rd Place' };
    return { icon: `#${rank}`, color: '#64748b', label: `${rank}th Place` };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading leaderboard...</div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Trophy className={styles.headerIcon} size={24} />
          <h2 className={styles.title}>Team Referral Leaderboard</h2>
        </div>
        <div className={styles.empty}>
          <Users size={48} />
          <p>No referrals yet. Start referring clients to appear on the leaderboard!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Trophy className={styles.headerIcon} size={24} />
          <div>
            <h2 className={styles.title}>Team Referral Leaderboard</h2>
            <p className={styles.subtitle}>Top performing team members</p>
          </div>
        </div>

        <div className={styles.periodToggle}>
          <button
            className={`${styles.periodButton} ${period === 'all-time' ? styles.active : ''}`}
            onClick={() => setPeriod('all-time')}
          >
            All Time
          </button>
          <button
            className={`${styles.periodButton} ${period === 'month' ? styles.active : ''}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      <div className={styles.leaderboard}>
        {stats.map((member, index) => {
          const rank = index + 1;
          const badge = getRankBadge(rank);
          const initials = getInitials(member.profile?.full_name || 'Unknown');
          const earnings = period === 'month' ? member.earnings_this_month : member.total_earnings;
          const conversions = period === 'month' ? member.conversions_this_month : member.converted_count;
          const referrals = period === 'month' ? member.referrals_this_month : member.total_referrals;

          return (
            <div
              key={member.member_id}
              className={`${styles.memberRow} ${rank <= 3 ? styles.topThree : ''}`}
            >
              {/* Rank Badge */}
              <div
                className={styles.rankBadge}
                style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
              >
                {typeof badge.icon === 'string' && badge.icon.startsWith('#')
                  ? badge.icon
                  : <span className={styles.medalIcon}>{badge.icon}</span>
                }
              </div>

              {/* Avatar */}
              <div className={styles.avatarWrapper}>
                {member.profile?.avatar_url ? (
                  <Image
                    src={member.profile.avatar_url}
                    alt={member.profile.full_name}
                    width={48}
                    height={48}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {initials}
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div className={styles.memberInfo}>
                <div className={styles.memberName}>
                  {member.profile?.full_name || 'Unknown Member'}
                </div>
                <div className={styles.memberStats}>
                  <span className={styles.stat}>
                    <Users size={14} />
                    {referrals} referrals
                  </span>
                  <span className={styles.stat}>
                    <TrendingUp size={14} />
                    {conversions} converted
                  </span>
                  {member.conversion_rate > 0 && (
                    <span className={styles.stat}>
                      {member.conversion_rate}% rate
                    </span>
                  )}
                </div>
              </div>

              {/* Earnings */}
              <div className={styles.earnings}>
                <div className={styles.earningsAmount}>
                  {formatCurrency(earnings)}
                </div>
                {member.pending_earnings > 0 && (
                  <div className={styles.pending}>
                    {formatCurrency(member.pending_earnings)} pending
                  </div>
                )}
              </div>

              {/* Achievement Badge (for top performers) */}
              {rank === 1 && conversions >= 5 && (
                <div className={styles.achievement}>
                  <Award size={20} />
                  <span>Top Performer</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showFullStats && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <DollarSign className={styles.summaryIcon} size={20} />
            <div>
              <div className={styles.summaryValue}>
                {formatCurrency(stats.reduce((sum, m) => sum + (period === 'month' ? m.earnings_this_month : m.total_earnings), 0))}
              </div>
              <div className={styles.summaryLabel}>Total Earnings</div>
            </div>
          </div>

          <div className={styles.summaryItem}>
            <Users className={styles.summaryIcon} size={20} />
            <div>
              <div className={styles.summaryValue}>
                {stats.reduce((sum, m) => sum + (period === 'month' ? m.conversions_this_month : m.converted_count), 0)}
              </div>
              <div className={styles.summaryLabel}>Total Conversions</div>
            </div>
          </div>

          <div className={styles.summaryItem}>
            <TrendingUp className={styles.summaryIcon} size={20} />
            <div>
              <div className={styles.summaryValue}>
                {stats.reduce((sum, m) => sum + (period === 'month' ? m.referrals_this_month : m.total_referrals), 0)}
              </div>
              <div className={styles.summaryLabel}>Total Referrals</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
