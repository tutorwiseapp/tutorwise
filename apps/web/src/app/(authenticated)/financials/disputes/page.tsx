/*
 * Filename: src/app/(authenticated)/financials/disputes/page.tsx
 * Purpose: Disputes tab - view and manage disputed transactions
 * Created: 2025-11-11
 * Specification: SDD v4.9, Section 3.4 - Disputes & Chargebacks (Placeholder for Phase 3)
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import WalletBalanceWidget from '@/app/components/financials/WalletBalanceWidget';
import { Transaction } from '@/types';
import styles from '../page.module.css';

export default function DisputesPage() {
  const { profile } = useUserProfile();
  const [disputes, setDisputes] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    available: 0,
    pending: 0,
    total: 0,
  });

  useEffect(() => {
    if (!profile) return;

    const fetchDisputes = async () => {
      try {
        setIsLoading(true);

        // Fetch disputed transactions
        const response = await fetch(`/api/financials?status=disputed`);

        if (!response.ok) {
          throw new Error('Failed to fetch disputes');
        }

        const data = await response.json();
        setDisputes(data.transactions || []);
        setBalances(data.balances || { available: 0, pending: 0, total: 0 });
      } catch (err) {
        console.error('Error fetching disputes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load disputes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisputes();
  }, [profile]);

  if (isLoading) {
    return (
      <>
        <div className={styles.loading}>Loading disputes...</div>
        <ContextualSidebar>
          <div className={styles.skeletonWidget} />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      <div className={styles.content}>
        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Disputes Overview */}
        {disputes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No disputes</h3>
            <p className={styles.emptyText}>
              Great news! You have no disputed transactions.
            </p>
          </div>
        ) : (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Disputed Transactions</h2>
            <div className={styles.disputesList}>
              {disputes.map((dispute) => (
                <div key={dispute.id} className={styles.disputeCard}>
                  <div className={styles.disputeHeader}>
                    <span className={`${styles.statusBadge} ${styles.statusDisputed}`}>
                      Disputed
                    </span>
                    <p className={styles.disputeDate}>
                      {new Date(dispute.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className={styles.disputeMain}>
                    <div>
                      <p className={styles.disputeDescription}>{dispute.description}</p>
                      <p className={styles.disputeType}>{dispute.type}</p>
                    </div>
                    <p className={styles.disputeAmount}>
                      £{Math.abs(dispute.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className={styles.disputeActions}>
                    <button className={styles.disputeButton} disabled>
                      View Details
                    </button>
                    <button className={styles.disputeButton} disabled>
                      Submit Evidence
                    </button>
                  </div>
                  <p className={styles.disputeNote}>
                    <strong>Note:</strong> Dispute management will be available in Phase 3.
                    Please contact support for assistance.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contextual Sidebar */}
      <ContextualSidebar>
        <WalletBalanceWidget
          available={balances.available}
          pending={balances.pending}
          total={balances.total}
        />
      </ContextualSidebar>
    </>
  );
}
