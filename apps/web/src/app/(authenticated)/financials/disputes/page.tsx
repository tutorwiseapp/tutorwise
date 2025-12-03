/*
 * Filename: src/app/(authenticated)/financials/disputes/page.tsx
 * Purpose: Disputes tab - view and manage disputed transactions with status filtering
 * Created: 2025-11-11
 * Updated: 2025-11-11 - Added dispute status filter tabs per SDD v4.9
 * Specification: SDD v4.9, Section 3.4 - Disputes & Chargebacks with status tabs
 */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import WalletBalanceWidget from '@/app/components/feature/financials/WalletBalanceWidget';
import { Transaction } from '@/types';
import styles from '../page.module.css';

// Dispute statuses per SDD v4.9 ASCII Diagram 3
type DisputeStatus = 'action_required' | 'under_review' | 'won' | 'lost' | 'all';

export default function DisputesPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disputes, setDisputes] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    available: 0,
    pending: 0,
    total: 0,
  });

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as DisputeStatus) || 'all';

  // Update URL when filter changes
  const handleFilterChange = (newStatus: DisputeStatus) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/financials/disputes${params.toString() ? `?${params.toString()}` : ''}`);
  };

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

  // Client-side filtering based on URL param
  // Map internal status to dispute filter statuses
  const filteredDisputes = disputes.filter((dispute) => {
    if (statusFilter === 'all') return true;

    // Map dispute statuses to our filter categories
    const status = dispute.status?.toLowerCase();
    if (statusFilter === 'action_required') return status === 'disputed' || status === 'action_required';
    if (statusFilter === 'under_review') return status === 'under_review' || status === 'reviewing';
    if (statusFilter === 'won') return status === 'won' || status === 'resolved';
    if (statusFilter === 'lost') return status === 'lost' || status === 'failed';

    return false;
  });

  if (isLoading) {
    return (
      <>
        <div className={styles.loading}>Loading disputes...</div>
        <HubSidebar>
          <div className={styles.skeletonWidget} />
        </HubSidebar>
      </>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Disputes</h1>
          <p className={styles.subtitle}>View and manage disputed transactions</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => handleFilterChange('all')}
          className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
        >
          All
        </button>
        <button
          onClick={() => handleFilterChange('action_required')}
          className={`${styles.filterTab} ${statusFilter === 'action_required' ? styles.filterTabActive : ''}`}
        >
          Action Required
        </button>
        <button
          onClick={() => handleFilterChange('under_review')}
          className={`${styles.filterTab} ${statusFilter === 'under_review' ? styles.filterTabActive : ''}`}
        >
          Under Review
        </button>
        <button
          onClick={() => handleFilterChange('won')}
          className={`${styles.filterTab} ${statusFilter === 'won' ? styles.filterTabActive : ''}`}
        >
          Won
        </button>
        <button
          onClick={() => handleFilterChange('lost')}
          className={`${styles.filterTab} ${statusFilter === 'lost' ? styles.filterTabActive : ''}`}
        >
          Lost
        </button>
      </div>

      <div className={styles.content}>
        {/* Error State */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* Disputes Overview */}
        {filteredDisputes.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No disputes found</h3>
            <p className={styles.emptyText}>
              {disputes.length === 0
                ? 'Great news! You have no disputed transactions.'
                : `No disputes match your current filter (${statusFilter}).`}
            </p>
          </div>
        ) : (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Disputed Transactions</h2>
            <div className={styles.disputesList}>
              {filteredDisputes.map((dispute) => (
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
      <HubSidebar>
        <WalletBalanceWidget
          available={balances.available}
          pending={balances.pending}
          total={balances.total}
        />
      </HubSidebar>
    </>
  );
}
