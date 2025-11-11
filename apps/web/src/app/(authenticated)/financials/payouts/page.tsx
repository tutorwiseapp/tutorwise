/*
 * Filename: src/app/(authenticated)/financials/payouts/page.tsx
 * Purpose: Payouts tab - manage withdrawals and view payout history
 * Created: 2025-11-11
 * Specification: SDD v4.9 - Payouts page with withdrawal actions
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import WalletBalanceWidget from '@/app/components/financials/WalletBalanceWidget';
import PayoutActionsWidget from '@/app/components/financials/PayoutActionsWidget';
import { Transaction } from '@/types';
import styles from '../page.module.css';

export default function PayoutsPage() {
  const { profile } = useUserProfile();
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    available: 0,
    pending: 0,
    total: 0,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchPayouts = async () => {
      try {
        setIsLoading(true);

        // Fetch payout history (Withdrawal transactions)
        const response = await fetch(`/api/financials?type=Withdrawal`);

        if (!response.ok) {
          throw new Error('Failed to fetch payouts');
        }

        const data = await response.json();
        setPayouts(data.transactions || []);
        setBalances(data.balances || { available: 0, pending: 0, total: 0 });
      } catch (err) {
        console.error('Error fetching payouts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payouts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayouts();
  }, [profile]);

  if (isLoading) {
    return (
      <>
        <div className={styles.loading}>Loading payouts...</div>
        <ContextualSidebar>
          <div className={styles.skeletonWidget} />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Payouts</h1>
          <p className={styles.subtitle}>Manage withdrawals and view payout history</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Payouts Overview */}
        <div className={styles.payoutsOverview}>
          <div className={styles.overviewCard}>
            <h3 className={styles.overviewTitle}>Available to Withdraw</h3>
            <p className={styles.overviewAmount}>£{balances.available.toFixed(2)}</p>
            <p className={styles.overviewSubtext}>
              Funds are available 7 days after service completion
            </p>
          </div>

          <div className={styles.overviewCard}>
            <h3 className={styles.overviewTitle}>In Clearing</h3>
            <p className={styles.overviewAmount}>£{balances.pending.toFixed(2)}</p>
            <p className={styles.overviewSubtext}>
              Funds will become available soon
            </p>
          </div>

          <div className={styles.overviewCard}>
            <h3 className={styles.overviewTitle}>Total Withdrawn</h3>
            <p className={styles.overviewAmount}>
              £{payouts.reduce((sum, p) => sum + Math.abs(p.amount), 0).toFixed(2)}
            </p>
            <p className={styles.overviewSubtext}>
              {payouts.length} {payouts.length === 1 ? 'payout' : 'payouts'}
            </p>
          </div>
        </div>

        {/* Payout History */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Payout History</h2>

          {payouts.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyTitle}>No payouts yet</h3>
              <p className={styles.emptyText}>
                Your withdrawal history will appear here once you request a payout.
              </p>
            </div>
          ) : (
            <div className={styles.payoutsList}>
              {payouts.map((payout) => (
                <div key={payout.id} className={styles.payoutCard}>
                  <div className={styles.payoutMain}>
                    <div>
                      <p className={styles.payoutDescription}>{payout.description}</p>
                      <p className={styles.payoutDate}>
                        {new Date(payout.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className={styles.payoutRight}>
                      <p className={styles.payoutAmount}>
                        £{Math.abs(payout.amount).toFixed(2)}
                      </p>
                      <span className={`${styles.statusBadge} ${styles[`status${payout.status}`]}`}>
                        {payout.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        <WalletBalanceWidget
          available={balances.available}
          pending={balances.pending}
          total={balances.total}
        />
        <PayoutActionsWidget availableBalance={balances.available} />
      </ContextualSidebar>
    </>
  );
}
