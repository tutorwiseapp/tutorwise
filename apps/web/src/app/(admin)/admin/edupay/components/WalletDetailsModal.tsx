/**
 * Filename: WalletDetailsModal.tsx
 * Purpose: Admin modal for viewing EduPay wallet details
 * Created: 2026-02-12
 * Pattern: Follows HubComplexModal pattern with detail sections
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import Button from '@/app/components/ui/actions/Button';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { Wallet, User, Calendar, TrendingUp, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import styles from './WalletDetailsModal.module.css';

interface WalletWithUser {
  id: string;
  user_id: string;
  total_ep: number;
  available_ep: number;
  pending_ep: number;
  converted_ep: number;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletWithUser | null;
  onViewLedger: (wallet: WalletWithUser) => void;
}

interface RecentActivity {
  id: string;
  type: 'earn' | 'convert' | 'pending_clear';
  ep_amount: number;
  description: string;
  created_at: string;
  status: string;
}

export default function WalletDetailsModal({
  isOpen,
  onClose,
  wallet,
  onViewLedger,
}: WalletDetailsModalProps) {
  const supabase = createClient();

  // Fetch recent activity for this wallet
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery<RecentActivity[]>({
    queryKey: ['wallet-recent-activity', wallet?.user_id],
    queryFn: async () => {
      if (!wallet) return [];

      const { data, error } = await supabase
        .from('edupay_ledger')
        .select('id, type, ep_amount, description, created_at, status')
        .eq('user_id', wallet.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent activity:', error);
        return [];
      }

      return data as RecentActivity[];
    },
    enabled: isOpen && !!wallet,
    staleTime: 30_000,
  });

  // Format EP with commas
  const formatEP = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date only
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get user initials
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return { Icon: TrendingUp, color: '#10b981' };
      case 'convert':
        return { Icon: TrendingDown, color: '#3b82f6' };
      case 'pending_clear':
        return { Icon: CheckCircle2, color: '#f59e0b' };
      default:
        return { Icon: Clock, color: '#6b7280' };
    }
  };

  if (!wallet) return null;

  const gbpValue = wallet.available_ep / 100; // 100 EP = £1

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={onClose}
      title="Wallet Details"
      subtitle={wallet.profiles?.full_name || 'Unknown User'}
      size="lg"
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onViewLedger(wallet)}>
            View Full Ledger
          </Button>
        </div>
      }
    >
      <div className={styles.content}>
        {/* User Section */}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>
            {getInitials(wallet.profiles?.full_name)}
          </div>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>{wallet.profiles?.full_name || 'Unknown User'}</h3>
            <p className={styles.userEmail}>{wallet.profiles?.email || 'No email'}</p>
            <span className={styles.userId}>
              <User size={12} />
              {formatIdForDisplay(wallet.user_id)}
            </span>
          </div>
        </div>

        {/* Balance Cards */}
        <div className={styles.balanceGrid}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceIcon}>
              <Wallet size={20} />
            </div>
            <div className={styles.balanceContent}>
              <span className={styles.balanceLabel}>Total EP Earned</span>
              <span className={styles.balanceValue}>{formatEP(wallet.total_ep)}</span>
            </div>
          </div>

          <div className={`${styles.balanceCard} ${styles.balanceCardPrimary}`}>
            <div className={styles.balanceIcon}>
              <CheckCircle2 size={20} />
            </div>
            <div className={styles.balanceContent}>
              <span className={styles.balanceLabel}>Available EP</span>
              <span className={styles.balanceValue}>{formatEP(wallet.available_ep)}</span>
              <span className={styles.balanceSubtext}>≈ £{gbpValue.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.balanceCard}>
            <div className={styles.balanceIcon}>
              <Clock size={20} />
            </div>
            <div className={styles.balanceContent}>
              <span className={styles.balanceLabel}>Pending EP</span>
              <span className={styles.balanceValue}>{formatEP(wallet.pending_ep)}</span>
            </div>
          </div>

          <div className={styles.balanceCard}>
            <div className={styles.balanceIcon}>
              <TrendingDown size={20} />
            </div>
            <div className={styles.balanceContent}>
              <span className={styles.balanceLabel}>Converted EP</span>
              <span className={styles.balanceValue}>{formatEP(wallet.converted_ep)}</span>
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        <div className={styles.infoSection}>
          <h4 className={styles.sectionTitle}>
            <Wallet size={16} />
            Wallet Information
          </h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Wallet ID</span>
              <span className={styles.infoValue}>{formatIdForDisplay(wallet.id)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Created</span>
              <span className={styles.infoValue}>{formatDate(wallet.created_at)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Last Updated</span>
              <span className={styles.infoValue}>{formatDate(wallet.updated_at)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Conversion Rate</span>
              <span className={styles.infoValue}>100 EP = £1</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={styles.activitySection}>
          <h4 className={styles.sectionTitle}>
            <Calendar size={16} />
            Recent Activity
          </h4>

          {isLoadingActivity ? (
            <div className={styles.loadingActivity}>Loading activity...</div>
          ) : !recentActivity || recentActivity.length === 0 ? (
            <div className={styles.emptyActivity}>No recent activity</div>
          ) : (
            <div className={styles.activityList}>
              {recentActivity.map((activity) => {
                const { Icon, color } = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={styles.activityIcon} style={{ backgroundColor: `${color}15`, color }}>
                      <Icon size={14} />
                    </div>
                    <div className={styles.activityContent}>
                      <span className={styles.activityDescription}>
                        {activity.description || `${activity.type.replace('_', ' ')} transaction`}
                      </span>
                      <span className={styles.activityDate}>
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>
                    <div className={styles.activityAmount}>
                      <span className={activity.type === 'earn' ? styles.amountPositive : styles.amountNeutral}>
                        {activity.type === 'earn' ? '+' : ''}{formatEP(activity.ep_amount)} EP
                      </span>
                      <span className={`${styles.activityStatus} ${styles[`status_${activity.status}`]}`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HubComplexModal>
  );
}
