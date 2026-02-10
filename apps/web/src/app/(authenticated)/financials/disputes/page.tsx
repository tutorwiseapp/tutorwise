/*
 * Filename: src/app/(authenticated)/financials/disputes/page.tsx
 * Purpose: Disputes tab - view and manage disputed transactions with status filtering
 * Created: 2025-11-11
 * Updated: 2025-12-03 - Migrated to HubPageLayout, HubTabs, HubRowCard with client avatars, HubEmptyState
 * Specification: SDD v4.9, Section 3.4 - Disputes & Chargebacks with status tabs
 * Change History:
 * C001 - 2025-12-03 : Migrated to Hub Layout Architecture with HubRowCard and client avatars
 */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getDisputes } from '@/lib/api/financials';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import WalletBalanceWidget from '@/app/components/feature/financials/WalletBalanceWidget';
import DisputeHelpWidget from '@/app/components/feature/financials/DisputeHelpWidget';
import DisputeTipWidget from '@/app/components/feature/financials/DisputeTipWidget';
import DisputeVideoWidget from '@/app/components/feature/financials/DisputeVideoWidget';
import DisputeCard from '@/app/components/feature/financials/DisputeCard';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import toast from 'react-hot-toast';
import styles from '../page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

// Dispute statuses per SDD v4.9 ASCII Diagram 3
type DisputeStatus = 'action_required' | 'under_review' | 'won' | 'lost' | 'all';
type DateRangeType = 'all' | '7days' | '30days' | '3months' | '6months' | '1year';

export default function DisputesPage() {
  const { profile, isLoading: _profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  // Read filter from URL
  const statusFilter = (searchParams?.get('status') as DisputeStatus) || 'all';

  // Fetch disputes with React Query
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data,
    isLoading,
    isFetching: _isFetching,
    error,
  } = useQuery({
    queryKey: ['disputes', profile?.id],
    queryFn: getDisputes,
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always', // Always refetch when component mounts (page is clicked)
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Memoize to prevent unnecessary re-renders
  const disputes = useMemo(() => data?.transactions || [], [data?.transactions]);
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
  const handleFilterChange = (newStatus: DisputeStatus) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
    }
    router.push(`/financials/disputes${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Client-side filtering based on URL param + search + date range
  const filteredDisputes = useMemo(() => {
    let filtered = disputes;

    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter((dispute) => {
        const status = dispute.status?.toLowerCase();
        if (statusFilter === 'action_required') return status === 'disputed' || status === 'action_required';
        if (statusFilter === 'under_review') return status === 'under_review' || status === 'reviewing';
        if (statusFilter === 'won') return status === 'won' || status === 'resolved';
        if (statusFilter === 'lost') return status === 'lost' || status === 'failed';
        return false;
      });
    }

    // Search filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((dispute) =>
        dispute.description?.toLowerCase().includes(query)
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
      filtered = filtered.filter((dispute) => new Date(dispute.created_at) >= cutoffDate);
    }

    return filtered;
  }, [disputes, statusFilter, searchQuery, dateRange]);

  // Action handlers
  const handleContactSupport = () => {
    toast('Redirecting to support...', { icon: '💬' });
  };

  const handleExportCSV = () => {
    if (!filteredDisputes.length) {
      toast.error('No disputes to export');
      return;
    }

    const headers = ['Date', 'Description', 'Amount', 'Status'];
    const rows = filteredDisputes.map(dispute => [
      new Date(dispute.created_at).toLocaleDateString('en-GB'),
      dispute.description || '',
      `£${Math.abs(dispute.amount).toFixed(2)}`,
      dispute.status || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `disputes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Disputes exported successfully');
    setShowActionsMenu(false);
  };

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      all: disputes.length,
      action_required: 0,
      under_review: 0,
      won: 0,
      lost: 0,
    };

    disputes.forEach((dispute) => {
      const status = dispute.status?.toLowerCase();
      if (status === 'disputed' || status === 'action_required') counts.action_required++;
      if (status === 'under_review' || status === 'reviewing') counts.under_review++;
      if (status === 'won' || status === 'resolved') counts.won++;
      if (status === 'lost' || status === 'failed') counts.lost++;
    });

    return counts;
  }, [disputes]);

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'all', label: 'All', count: tabCounts.all, active: statusFilter === 'all' },
    { id: 'action_required', label: 'Action Required', count: tabCounts.action_required, active: statusFilter === 'action_required' },
    { id: 'under_review', label: 'Under Review', count: tabCounts.under_review, active: statusFilter === 'under_review' },
    { id: 'won', label: 'Won', count: tabCounts.won, active: statusFilter === 'won' },
    { id: 'lost', label: 'Lost', count: tabCounts.lost, active: statusFilter === 'lost' },
  ];

  // Get status variant for badge
  const _getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'won' || lowerStatus === 'resolved') return 'success';
    if (lowerStatus === 'disputed' || lowerStatus === 'action_required') return 'error';
    if (lowerStatus === 'under_review' || lowerStatus === 'reviewing') return 'warning';
    if (lowerStatus === 'lost' || lowerStatus === 'failed') return 'neutral';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Disputes" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <DisputeHelpWidget />
            <DisputeTipWidget />
            <DisputeVideoWidget />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading disputes...</div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Disputes"
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search disputes..."
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
                onClick={handleContactSupport}
              >
                Contact Support
              </Button>

              {/* Secondary Actions: Dropdown Menu */}
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
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
          onTabChange={(tabId) => handleFilterChange(tabId as DisputeStatus)}
        />
      }
      sidebar={
        <HubSidebar>
          <WalletBalanceWidget
            available={balances.available}
            pending={balances.pending}
            total={balances.total}
          />
          <DisputeHelpWidget />
          <DisputeTipWidget />
          <DisputeVideoWidget />
        </HubSidebar>
      }
    >
      {/* Subtle Error Banner (like Messages page) */}
      {hasShownError && (
        <div className={styles.errorBanner}>
          <p>⚠️ Unable to load disputes</p>
        </div>
      )}

      {/* Disputes List - HubRowCard with client avatars */}
      {filteredDisputes.length === 0 ? (
          disputes.length === 0 ? (
            <HubEmptyState
              title="No disputes yet"
              description="Great news! You have no disputed transactions."
            />
          ) : (
            <HubEmptyState
              title="No disputes found"
              description={`No disputes match your current filter (${statusFilter.replace('_', ' ')}).`}
            />
          )
        ) : (
          <div className={styles.disputesList}>
            {filteredDisputes.map((dispute) => (
              <DisputeCard
                key={dispute.id}
                dispute={dispute}
              />
            ))}
          </div>
        )}
    </HubPageLayout>
  );
}
