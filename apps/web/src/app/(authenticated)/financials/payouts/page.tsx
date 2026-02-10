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

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getPayouts } from '@/lib/api/financials';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import WalletBalanceWidget from '@/app/components/feature/financials/WalletBalanceWidget';
import PayoutHelpWidget from '@/app/components/feature/financials/PayoutHelpWidget';
import PayoutTipWidget from '@/app/components/feature/financials/PayoutTipWidget';
import PayoutVideoWidget from '@/app/components/feature/financials/PayoutVideoWidget';
import PayoutCard from '@/app/components/feature/financials/PayoutCard';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import toast from 'react-hot-toast';
import styles from '../page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Payout statuses per SDD v4.9 ASCII Diagram 2
type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'all';
type DateRangeType = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';

export default function PayoutsPage() {
  const { profile, isLoading: _profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as PayoutStatus) || 'all';

  // Fetch payouts with React Query
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data,
    isLoading,
    isFetching: _isFetching,
    error,
  } = useQuery({
    queryKey: ['payouts', profile?.id],
    queryFn: getPayouts,
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  const payouts = useMemo(() => data?.transactions || [], [data?.transactions]);
  const balances = useMemo(() => data?.balances || { available: 0, pending: 0, total: 0 }, [data?.balances]);

  // Show error banner only once to prevent flashing (like Messages page)
  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
    } else if (!error && hasShownError) {
      setHasShownError(false);
    }
  }, [error, hasShownError]);

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
  const _getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
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
        header={<HubHeader title="Payouts" />}
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
              <UnifiedSelect
                value={dateRange}
                onChange={(value) => setDateRange(value as DateRangeType)}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: '7days', label: 'Last 7 Days' },
                  { value: '30days', label: 'Last 30 Days' },
                  { value: '3months', label: 'Last 3 Months' },
                  { value: '6months', label: 'Last 6 Months' },
                  { value: '1year', label: 'Last Year' }
                ]}
                placeholder="Date range"
              />
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
                  square
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
          <PayoutHelpWidget />
          <PayoutTipWidget />
          <PayoutVideoWidget />
        </HubSidebar>
      }
    >
      {/* Subtle Error Banner (like Messages page) */}
      {hasShownError && (
        <div className={styles.errorBanner}>
          <p>⚠️ Unable to load payouts</p>
        </div>
      )}

      {/* Payout History - HubRowCard List */}
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
              <PayoutCard
                key={payout.id}
                payout={payout}
              />
            ))}
          </div>
        )}
    </HubPageLayout>
  );
}
