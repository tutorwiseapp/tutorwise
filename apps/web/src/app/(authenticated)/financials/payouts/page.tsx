/*
 * Filename: src/app/(authenticated)/financials/payouts/page.tsx
 * Purpose: Payouts tab - manage withdrawals and view payout history with status filtering
 * Created: 2025-11-11
 * Updated: 2025-12-03 - Migrated to HubPageLayout, HubTabs, HubRowCard with payment icons, HubEmptyState
 * Specification: SDD v4.9 - Payouts page with withdrawal actions and status tabs
 * Change History:
 * C001 - 2025-12-03 : Migrated to Hub Layout Architecture with HubRowCard and payment icons
 */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubRowCard from '@/app/components/hub/content/HubRowCard/HubRowCard';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import WalletBalanceWidget from '@/app/components/feature/financials/WalletBalanceWidget';
import PayoutActionsWidget from '@/app/components/feature/financials/PayoutActionsWidget';
import Button from '@/app/components/ui/actions/Button';
import { Transaction } from '@/types';
import toast from 'react-hot-toast';
import styles from '../page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Payout statuses per SDD v4.9 ASCII Diagram 2
type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'all';
type DateRangeType = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';

export default function PayoutsPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payouts, setPayouts] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    available: 0,
    pending: 0,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as PayoutStatus) || 'all';

  // Update URL when filter changes
  const handleFilterChange = (newStatus: PayoutStatus) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/financials/payouts${params.toString() ? `?${params.toString()}` : ''}`);
  };

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

  // Client-side filtering based on URL param + search + date range
  const filteredPayouts = useMemo(() => {
    let filtered = payouts;

    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter((payout) => {
        const status = payout.status?.toLowerCase();
        if (statusFilter === 'pending') return status === 'clearing';
        if (statusFilter === 'in_transit') return status === 'paid_out' || status === 'in_transit';
        if (statusFilter === 'paid') return status === 'paid' || status === 'paid_out';
        if (statusFilter === 'failed') return status === 'failed';
        return false;
      });
    }

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((payout) =>
        payout.description?.toLowerCase().includes(query)
      );
    }

    // Date range filtering
    if (dateRange !== 'all') {
      const cutoffDate = new Date();
      switch (dateRange) {
        case '7days':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          break;
        case '3months':
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          break;
        case '6months':
          cutoffDate.setMonth(cutoffDate.getMonth() - 6);
          break;
        case '1year':
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
      }
      filtered = filtered.filter((payout) => new Date(payout.created_at) >= cutoffDate);
    }

    return filtered;
  }, [payouts, statusFilter, searchQuery, dateRange]);

  // Action handlers
  const handleRequestWithdrawal = () => {
    if (balances.available <= 0) {
      toast.error('No funds available to withdraw');
      return;
    }
    toast('Withdrawal request feature coming soon!', { icon: '💰' });
  };

  const handleExportCSV = () => {
    if (!filteredPayouts.length) {
      toast.error('No payouts to export');
      return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Status'];
    const rows = filteredPayouts.map(payout => [
      new Date(payout.created_at).toLocaleDateString('en-GB'),
      payout.description || '',
      `£${Math.abs(payout.amount).toFixed(2)}`,
      payout.status || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payouts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Payouts exported successfully');
    setShowActionsMenu(false);
  };

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      all: payouts.length,
      pending: 0,
      in_transit: 0,
      paid: 0,
      failed: 0,
    };

    payouts.forEach((payout) => {
      const status = payout.status?.toLowerCase();
      if (status === 'clearing') counts.pending++;
      if (status === 'paid_out' || status === 'in_transit') counts.in_transit++;
      if (status === 'paid' || status === 'paid_out') counts.paid++;
      if (status === 'failed') counts.failed++;
    });

    return counts;
  }, [payouts]);

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'all', label: 'All', count: tabCounts.all, active: statusFilter === 'all' },
    { id: 'pending', label: 'Pending', count: tabCounts.pending, active: statusFilter === 'pending' },
    { id: 'in_transit', label: 'In Transit', count: tabCounts.in_transit, active: statusFilter === 'in_transit' },
    { id: 'paid', label: 'Paid', count: tabCounts.paid, active: statusFilter === 'paid' },
    { id: 'failed', label: 'Failed', count: tabCounts.failed, active: statusFilter === 'failed' },
  ];

  // Get status variant for badge
  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'paid' || lowerStatus === 'paid_out') return 'success';
    if (lowerStatus === 'clearing' || lowerStatus === 'pending') return 'warning';
    if (lowerStatus === 'failed') return 'error';
    if (lowerStatus === 'in_transit') return 'info';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Payouts" subtitle="Manage withdrawals and view payout history" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading payouts...</div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Payouts"
          subtitle="Manage withdrawals and view payout history"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

              {/* Date Range Dropdown */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                className={filterStyles.filterSelect}
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          }
          actions={
            <>
              {/* Primary Action Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestWithdrawal}
              >
                Request Withdrawal
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ⋮
                </Button>

                {showActionsMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />

                    {/* Dropdown Menu */}
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={handleExportCSV}
                        className={actionStyles.menuButton}
                      >
                        Export CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={(tabId) => handleFilterChange(tabId as PayoutStatus)}
        />
      }
      sidebar={
        <HubSidebar>
          <WalletBalanceWidget
            available={balances.available}
            pending={balances.pending}
            total={balances.total}
          />
          <PayoutActionsWidget availableBalance={balances.available} />
        </HubSidebar>
      }
    >
      {/* Error State */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {/* Payouts Overview - Grid Cards (shown on "All" tab) */}
      {statusFilter === 'all' && (
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
      )}

      {/* Payout History - HubRowCard List */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {statusFilter === 'all' ? 'Payout History' : `${statusFilter.replace('_', ' ').charAt(0).toUpperCase()}${statusFilter.replace('_', ' ').slice(1)} Payouts`}
        </h2>

        {filteredPayouts.length === 0 ? (
          payouts.length === 0 ? (
            <HubEmptyState
              title="No payouts yet"
              description="Your withdrawal history will appear here once you request a payout."
            />
          ) : (
            <HubEmptyState
              title="No payouts found"
              description={`No payouts match your current filter (${statusFilter.replace('_', ' ')}).`}
            />
          )
        ) : (
          <div className={styles.payoutsList}>
            {filteredPayouts.map((payout) => (
              <HubRowCard
                key={payout.id}
                image={{
                  src: null,
                  alt: 'Bank Account',
                  fallbackChar: '💳',
                }}
                title={`£${Math.abs(payout.amount).toFixed(2)}`}
                status={{
                  label: payout.status || 'Unknown',
                  variant: getStatusVariant(payout.status || ''),
                }}
                description={payout.description}
                meta={[
                  `Requested on ${new Date(payout.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`,
                  payout.type || 'Withdrawal',
                ]}
                actions={
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </HubPageLayout>
  );
}
