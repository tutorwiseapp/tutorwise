/**
 * Filename: MemberReferralDashboard.tsx
 * Purpose: Individual team member referral dashboard with personal link and stats
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Link as LinkIcon,
  Copy,
  QrCode,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Share2
} from 'lucide-react';
import Image from 'next/image';
import styles from './MemberReferralDashboard.module.css';

interface DashboardData {
  total_referrals: number;
  converted_referrals: number;
  conversion_rate: number;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  rank_in_org: number;
  referrals_this_month: number;
  earnings_this_month: number;
  recent_referrals: Array<{
    id: string;
    status: string;
    created_at: string;
    converted_at?: string;
    commission: number;
    referred_name?: string;
  }>;
}

interface MemberReferralDashboardProps {
  memberId: string;
  organisationId: string;
  organisationSlug: string;
}

export function MemberReferralDashboard({
  memberId,
  organisationId,
  organisationSlug
}: MemberReferralDashboardProps) {
  const supabase = createClient();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadReferralCode();
  }, [memberId, organisationId]);

  const loadDashboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_member_referral_dashboard', {
        p_member_id: memberId,
        p_organisation_id: organisationId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setDashboardData(data[0]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferralCode = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        // Generate new code if doesn't exist
        const newCode = await generateReferralCode();
        setReferralCode(newCode);
      }
    } catch (error) {
      console.error('Error loading referral code:', error);
    }
  };

  const generateReferralCode = async () => {
    // Generate unique code (8 characters)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', memberId);

      if (error) throw error;

      return code;
    } catch (error) {
      console.error('Error generating referral code:', error);
      return '';
    }
  };

  const getReferralLink = () => {
    return `${window.location.origin}/join/${organisationSlug}?ref=${referralCode}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleGenerateQR = () => {
    setShowQR(!showQR);
  };

  const getQRCodeUrl = () => {
    // Use QR server API (same as existing referral system)
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getReferralLink())}`;
  };

  const handleShare = async () => {
    const link = getReferralLink();
    const text = `Join our team on Tutorwise! ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tutorwise Referral',
          text: text,
          url: link
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      'Referred': { label: 'Pending', color: '#94a3b8' },
      'Signed Up': { label: 'Signed Up', color: '#3b82f6' },
      'Converted': { label: 'Converted', color: '#10b981' }
    };

    return badges[status] || { label: status, color: '#64748b' };
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading your referral dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Referral Link Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <LinkIcon className={styles.headerIcon} size={24} />
          <h2 className={styles.cardTitle}>Your Referral Link</h2>
        </div>

        <div className={styles.linkSection}>
          <div className={styles.linkBox}>
            <input
              type="text"
              value={getReferralLink()}
              readOnly
              className={styles.linkInput}
            />
            <button
              onClick={handleCopyLink}
              className={styles.copyButton}
              title="Copy link"
            >
              {copied ? '✓ Copied!' : <Copy size={20} />}
            </button>
          </div>

          <div className={styles.linkActions}>
            <button onClick={handleGenerateQR} className={styles.actionButton}>
              <QrCode size={18} />
              QR Code
            </button>
            <button onClick={handleShare} className={styles.actionButton}>
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>

        {/* QR Code Display (inline, similar to existing pattern) */}
        {showQR && (
          <div className={styles.qrCodeContainer}>
            <img
              src={getQRCodeUrl()}
              alt="Referral QR Code"
              className={styles.qrCode}
            />
            <p className={styles.qrLabel}>
              Scan to refer or save for marketing materials
            </p>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <Users size={24} style={{ color: '#667eea' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{dashboardData?.total_referrals || 0}</div>
            <div className={styles.statLabel}>Total Referrals</div>
            <div className={styles.statSubtext}>
              {dashboardData?.referrals_this_month || 0} this month
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <TrendingUp size={24} style={{ color: '#10b981' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{dashboardData?.converted_referrals || 0}</div>
            <div className={styles.statLabel}>Conversions</div>
            <div className={styles.statSubtext}>
              {dashboardData?.conversion_rate || 0}% conversion rate
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <DollarSign size={24} style={{ color: '#10b981' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatCurrency(dashboardData?.total_earnings || 0)}</div>
            <div className={styles.statLabel}>Total Earnings</div>
            <div className={styles.statSubtext}>
              {formatCurrency(dashboardData?.earnings_this_month || 0)} this month
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Award size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>#{dashboardData?.rank_in_org || '-'}</div>
            <div className={styles.statLabel}>Team Ranking</div>
            <div className={styles.statSubtext}>
              {formatCurrency(dashboardData?.pending_earnings || 0)} pending
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Recent Referrals</h2>
        </div>

        {dashboardData?.recent_referrals && dashboardData.recent_referrals.length > 0 ? (
          <div className={styles.referralsList}>
            {dashboardData.recent_referrals.map((referral) => {
              const badge = getStatusBadge(referral.status);
              const date = new Date(referral.created_at);

              return (
                <div key={referral.id} className={styles.referralItem}>
                  <div className={styles.referralInfo}>
                    <div className={styles.referralName}>
                      {referral.referred_name || 'New Referral'}
                    </div>
                    <div className={styles.referralDate}>
                      {date.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  <div
                    className={styles.statusBadge}
                    style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                  >
                    {badge.label}
                  </div>

                  {referral.status === 'Converted' && (
                    <div className={styles.commission}>
                      {formatCurrency(referral.commission)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Users size={48} />
            <p>No referrals yet. Share your link to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
