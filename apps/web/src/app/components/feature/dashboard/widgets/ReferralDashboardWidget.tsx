/**
 * Filename: ReferralDashboardWidget.tsx
 * Purpose: Comprehensive referral dashboard widget for agent performance tracking
 * Created: 2025-12-16
 * Patent Reference: Section 3 (Hierarchical Attribution), Section 7 (Commission Delegation)
 * Migration: 091_hierarchical_attribution_enhancement.sql, 092_add_referral_performance_indexes.sql
 *
 * Features:
 * - Real-time referral stats (clicks, signups, conversions)
 * - Attribution method breakdown (URL, Cookie, Manual)
 * - Commission earnings tracker
 * - Referral link generator with QR code
 * - Recent referrals list with status badges
 * - Delegation settings link
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  DollarSign,
  Share2,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  MousePointerClick,
  UserPlus,
  Award,
  BarChart3,
  Settings,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import KPICard from './KPICard';
import styles from './ReferralDashboardWidget.module.css';

interface ReferralStats {
  total_clicks: number;
  total_signups: number;
  total_conversions: number;
  total_commission_earned: number;
  conversion_rate: number;
  signup_rate: number;
}

interface AttributionBreakdown {
  url_parameter: number;
  cookie: number;
  manual_entry: number;
}

interface RecentReferral {
  id: string;
  referred_profile_id: string;
  referred_user_name: string;
  referred_user_email: string;
  status: 'Referred' | 'Signed Up' | 'Converted' | 'Churned';
  attribution_method: 'url_parameter' | 'cookie' | 'manual_entry' | null;
  created_at: string;
  commission_amount?: number;
}

interface ReferralDashboardWidgetProps {
  agentId: string;
  referralCode: string;
  className?: string;
}

export default function ReferralDashboardWidget({
  agentId,
  referralCode,
  className = '',
}: ReferralDashboardWidgetProps) {
  const supabase = createClient();

  // State
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [attribution, setAttribution] = useState<AttributionBreakdown | null>(null);
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Referral link
  const referralLink = `${window.location.origin}/a/${referralCode}`;

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. Fetch referral stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_referral_stats', {
        p_agent_id: agentId,
      });

      if (!statsError && statsData) {
        setStats(statsData[0]);
      }

      // 2. Fetch attribution breakdown
      const { data: attributionData, error: attrError } = await supabase
        .from('referrals')
        .select('attribution_method')
        .eq('agent_id', agentId)
        .not('attribution_method', 'is', null);

      if (!attrError && attributionData) {
        const breakdown: AttributionBreakdown = {
          url_parameter: attributionData.filter((r) => r.attribution_method === 'url_parameter').length,
          cookie: attributionData.filter((r) => r.attribution_method === 'cookie').length,
          manual_entry: attributionData.filter((r) => r.attribution_method === 'manual_entry').length,
        };
        setAttribution(breakdown);
      }

      // 3. Fetch recent referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(
          `
          id,
          referred_profile_id,
          status,
          attribution_method,
          created_at,
          profiles:referred_profile_id (
            full_name,
            email
          )
        `
        )
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!referralsError && referralsData) {
        setRecentReferrals(
          referralsData.map((r: any) => ({
            id: r.id,
            referred_profile_id: r.referred_profile_id,
            referred_user_name: r.profiles?.full_name || 'Unknown User',
            referred_user_email: r.profiles?.email || '',
            status: r.status,
            attribution_method: r.attribution_method,
            created_at: r.created_at,
          }))
        );
      }

      setLoading(false);
    }

    fetchData();
  }, [agentId, supabase]);

  // Copy referral link
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status badge variant
  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
    switch (status) {
      case 'Converted':
        return 'success';
      case 'Signed Up':
        return 'info';
      case 'Referred':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  // Attribution method label
  const getAttributionLabel = (method: string | null): string => {
    switch (method) {
      case 'url_parameter':
        return 'Direct Link';
      case 'cookie':
        return 'Cookie Tracking';
      case 'manual_entry':
        return 'Manual Entry';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.loading}>Loading referral data...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.widget} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Users size={24} />
          Referral Dashboard
        </h2>
        <Link href="/account/referrals" className={styles.viewAll}>
          View All <ExternalLink size={16} />
        </Link>
      </div>

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <KPICard
          icon={MousePointerClick}
          label="Total Clicks"
          value={stats?.total_clicks || 0}
          variant="info"
          timeframe="All Time"
        />
        <KPICard
          icon={UserPlus}
          label="Signups"
          value={stats?.total_signups || 0}
          sublabel={`${(stats?.signup_rate || 0).toFixed(1)}% conversion`}
          variant="info"
          timeframe="All Time"
        />
        <KPICard
          icon={Award}
          label="Conversions"
          value={stats?.total_conversions || 0}
          sublabel={`${(stats?.conversion_rate || 0).toFixed(1)}% rate`}
          variant="success"
          timeframe="All Time"
        />
        <KPICard
          icon={DollarSign}
          label="Commission Earned"
          value={`£${(stats?.total_commission_earned || 0).toFixed(2)}`}
          variant="success"
          timeframe="All Time"
        />
      </div>

      {/* Referral Link Section */}
      <div className={styles.linkSection}>
        <h3 className={styles.sectionTitle}>
          <Share2 size={18} />
          Your Referral Link
        </h3>
        <div className={styles.linkBox}>
          <input
            type="text"
            value={referralLink}
            readOnly
            className={styles.linkInput}
            onClick={(e) => e.currentTarget.select()}
          />
          <button onClick={handleCopyLink} className={styles.copyButton}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => setShowQR(!showQR)} className={styles.qrButton}>
            <QrCode size={18} />
            QR Code
          </button>
        </div>

        {showQR && (
          <div className={styles.qrCodeContainer}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`}
              alt="Referral QR Code"
              className={styles.qrCode}
            />
            <p className={styles.qrLabel}>Scan to refer</p>
          </div>
        )}
      </div>

      {/* Attribution Breakdown */}
      {attribution && (
        <div className={styles.attributionSection}>
          <h3 className={styles.sectionTitle}>
            <BarChart3 size={18} />
            Attribution Methods
          </h3>
          <div className={styles.attributionGrid}>
            <div className={styles.attributionCard}>
              <div className={styles.attributionLabel}>Direct Link</div>
              <div className={styles.attributionValue}>{attribution.url_parameter}</div>
              <div className={styles.attributionBar}>
                <div
                  className={styles.attributionBarFill}
                  style={{
                    width: `${
                      ((attribution.url_parameter /
                        (attribution.url_parameter + attribution.cookie + attribution.manual_entry)) *
                        100) || 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className={styles.attributionCard}>
              <div className={styles.attributionLabel}>Cookie Tracking</div>
              <div className={styles.attributionValue}>{attribution.cookie}</div>
              <div className={styles.attributionBar}>
                <div
                  className={styles.attributionBarFill}
                  style={{
                    width: `${
                      ((attribution.cookie /
                        (attribution.url_parameter + attribution.cookie + attribution.manual_entry)) *
                        100) || 0
                    }%`,
                    backgroundColor: '#4CAF50',
                  }}
                />
              </div>
            </div>
            <div className={styles.attributionCard}>
              <div className={styles.attributionLabel}>Manual Entry</div>
              <div className={styles.attributionValue}>{attribution.manual_entry}</div>
              <div className={styles.attributionBar}>
                <div
                  className={styles.attributionBarFill}
                  style={{
                    width: `${
                      ((attribution.manual_entry /
                        (attribution.url_parameter + attribution.cookie + attribution.manual_entry)) *
                        100) || 0
                    }%`,
                    backgroundColor: '#FF9800',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Referrals */}
      <div className={styles.recentSection}>
        <h3 className={styles.sectionTitle}>
          <TrendingUp size={18} />
          Recent Referrals
        </h3>
        {recentReferrals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No referrals yet. Share your link to start earning commissions!</p>
          </div>
        ) : (
          <div className={styles.referralsList}>
            {recentReferrals.map((referral) => (
              <div key={referral.id} className={styles.referralCard}>
                <div className={styles.referralInfo}>
                  <div className={styles.referralName}>{referral.referred_user_name}</div>
                  <div className={styles.referralMeta}>
                    {getAttributionLabel(referral.attribution_method)} •{' '}
                    {new Date(referral.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`${styles.statusBadge} ${styles[getStatusVariant(referral.status)]}`}>
                  {referral.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={styles.footer}>
        <Link href="/account/referrals/settings" className={styles.settingsButton}>
          <Settings size={16} />
          Delegation Settings
        </Link>
      </div>
    </div>
  );
}
