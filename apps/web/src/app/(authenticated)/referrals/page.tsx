/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-12-03 - Migrated to HubEmptyState component (Phase 2 migration complete)
 * Specification: SDD v3.6, Section 4.3 - /referrals hub, Section 2.0 - Server-side filtering via URL params
 * Change History:
 * C003 - 2025-12-03 : Migrated to HubEmptyState component, removed custom empty state markup
 * C002 - 2025-11-30 : Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 * C001 - 2025-11-02 : Initial creation
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyReferrals } from '@/lib/api/referrals';
import ReferralCard from '@/app/components/feature/referrals/ReferralCard';
import ReferAndEarnView from '@/app/components/feature/referrals/ReferAndEarnView';
import PerformanceView from '@/app/components/feature/referrals/PerformanceView';
import ReferralStatsWidget from '@/app/components/feature/referrals/ReferralStatsWidget';
import ReferralActivityFeed from '@/app/components/feature/referrals/ReferralActivityFeed';
import ReferralHelpWidget from '@/app/components/feature/referrals/ReferralHelpWidget';
import ReferralTipWidget from '@/app/components/feature/referrals/ReferralTipWidget';
import ReferralVideoWidget from '@/app/components/feature/referrals/ReferralVideoWidget';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import ReferralsSkeleton from '@/app/components/feature/referrals/ReferralsSkeleton';
import ReferralsError from '@/app/components/feature/referrals/ReferralsError';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import { Referral, ReferralStatus } from '@/types';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';

type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 4;

export default function ReferralsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read active tab from URL (default: 'refer-and-earn')
  const activeTab = searchParams?.get('tab') || 'refer-and-earn';

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const statusFilter = (searchParams?.get('status') as ReferralStatus | null) || 'all';

  // State for actions menu, search, sort, pagination, and date range
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<'all' | 'last7' | 'last30' | 'last90'>('all');

  // React Query: Fetch referrals with automatic retry, caching, and background refetch
  const {
    data: referrals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['referrals', profile?.id],
    queryFn: getMyReferrals,
    staleTime: 5 * 60 * 1000, // 5 minutes (referrals change less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData, // Show cached data instantly while refetching
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newTab === 'refer-and-earn') {
      params.delete('tab');
      params.delete('status'); // Clear status filter when switching to Refer & Earn
    } else if (newTab === 'performance') {
      params.set('tab', 'performance');
      params.delete('status'); // Clear status filter when switching to Performance
    } else {
      params.set('tab', 'leads');
      if (newTab === 'all') {
        params.delete('status');
      } else {
        params.set('status', newTab);
      }
    }
    router.push(`/referrals${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  // Client-side filtering, searching, and sorting
  const filteredReferrals = useMemo(() => {
    let filtered = referrals.filter((referral: any) => {
      // Status filter
      if (statusFilter !== 'all' && referral.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const referralDate = new Date(referral.created_at);
        const now = new Date();
        const daysAgo = dateRange === 'last7' ? 7 : dateRange === 'last30' ? 30 : 90;
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        if (referralDate < cutoffDate) {
          return false;
        }
      }

      return true;
    });

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((referral: any) => {
        const name = referral.referred_user?.full_name?.toLowerCase() || '';
        const email = referral.referred_user?.email?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc': {
          const aName = a.referred_user?.full_name || '';
          const bName = b.referred_user?.full_name || '';
          return aName.localeCompare(bName);
        }
        case 'name-desc': {
          const aName = a.referred_user?.full_name || '';
          const bName = b.referred_user?.full_name || '';
          return bName.localeCompare(aName);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [referrals, statusFilter, searchQuery, sortBy, dateRange]);

  // Pagination logic
  const totalItems = filteredReferrals.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedReferrals = filteredReferrals.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Calculate referral stats (from ALL referrals, not filtered)
  const stats = useMemo(() => {
    return referrals.reduce(
      (acc: any, ref: any) => {
        acc.totalReferred++;

        // Track earnings by status
        const commission = ref.first_commission?.amount || 0;

        if (ref.status === 'Referred') {
          acc.referredEarned += commission;
        } else if (ref.status === 'Signed Up') {
          acc.signedUp++;
          acc.signedUpEarned += commission;
        } else if (ref.status === 'Converted') {
          acc.signedUp++; // Converted users were also signed up
          acc.converted++;
          acc.convertedEarned += commission;
        }

        acc.totalEarned = acc.referredEarned + acc.signedUpEarned + acc.convertedEarned;

        return acc;
      },
      {
        totalReferred: 0,
        signedUp: 0,
        converted: 0,
        totalEarned: 0,
        referredEarned: 0,
        signedUpEarned: 0,
        convertedEarned: 0
      }
    );
  }, [referrals]);

  // Calculate counts for each status
  const tabCounts = useMemo(() => {
    return {
      all: referrals.length,
      referred: referrals.filter((r: any) => r.status === 'Referred').length,
      signedUp: referrals.filter((r: any) => r.status === 'Signed Up').length,
      converted: referrals.filter((r: any) => r.status === 'Converted').length,
      expired: referrals.filter((r: any) => r.status === 'Expired').length,
    };
  }, [referrals]);

  // Prepare tabs data with count property (HubTabs will format as "Label (count)")
  const tabs: HubTab[] = [
    { id: 'refer-and-earn', label: 'Refer & Earn', active: activeTab === 'refer-and-earn' },
    { id: 'performance', label: 'Performance', active: activeTab === 'performance' },
    { id: 'all', label: 'All Leads', count: tabCounts.all, active: activeTab === 'leads' && statusFilter === 'all' },
    { id: 'Referred', label: 'Referred', count: tabCounts.referred, active: activeTab === 'leads' && statusFilter === 'Referred' },
    { id: 'Signed Up', label: 'Signed Up', count: tabCounts.signedUp, active: activeTab === 'leads' && statusFilter === 'Signed Up' },
    { id: 'Converted', label: 'Converted', count: tabCounts.converted, active: activeTab === 'leads' && statusFilter === 'Converted' },
    { id: 'Expired', label: 'Expired', count: tabCounts.expired, active: activeTab === 'leads' && statusFilter === 'Expired' },
  ];

  // Action handlers
  const handlePrimaryAction = () => {
    if (!profile?.referral_code) {
      toast.error('Referral code not found');
      return;
    }

    const referralLink = `${window.location.origin}?ref=${profile.referral_code}`;
    const shareText = encodeURIComponent('Join me on this amazing platform!');
    const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(referralLink)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleReferOnFacebook = () => {
    if (!profile?.referral_code) {
      toast.error('Referral code not found');
      setShowActionsMenu(false);
      return;
    }

    const referralLink = `${window.location.origin}?ref=${profile.referral_code}`;
    const shareText = encodeURIComponent('Join me on this amazing platform!');
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${shareText}`;

    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowActionsMenu(false);
  };

  const handleReferOnLinkedIn = () => {
    if (!profile?.referral_code) {
      toast.error('Referral code not found');
      setShowActionsMenu(false);
      return;
    }

    const referralLink = `${window.location.origin}?ref=${profile.referral_code}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;

    window.open(linkedInUrl, '_blank', 'width=600,height=400');
    setShowActionsMenu(false);
  };

  const handleExportCSV = () => {
    if (!filteredReferrals || filteredReferrals.length === 0) {
      toast.error('No referrals to export');
      setShowActionsMenu(false);
      return;
    }

    // Build CSV content with expanded columns
    const headers = ['Date', 'Name', 'Email', 'Status', 'Commission', 'Booking ID', 'Notes'];
    const rows = filteredReferrals.map((ref: any) => [
      ref.created_at ? new Date(ref.created_at).toLocaleDateString('en-GB') : 'N/A',
      ref.referred_user?.full_name || 'Anonymous',
      ref.referred_user?.email || 'N/A',
      ref.status || 'N/A',
      ref.first_commission ? `£${ref.first_commission.amount.toFixed(2)}` : '£0.00',
      ref.first_booking?.id || 'N/A',
      ref.status === 'Converted' ? 'First booking completed' : ref.status === 'Signed Up' ? 'Awaiting first booking' : ref.status === 'Expired' ? 'Link expired' : 'Awaiting sign up',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateRangeSuffix = dateRange === 'all' ? 'all-time' : `${dateRange.replace('last', 'last-')}days`;
    link.setAttribute('href', url);
    link.setAttribute('download', `referrals_${dateRangeSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredReferrals.length} referral${filteredReferrals.length !== 1 ? 's' : ''}!`);
    setShowActionsMenu(false);
  };

  const handleRemindReferral = async (referralId: string) => {
    try {
      const response = await fetch('/api/referrals/remind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reminder');
      }

      toast.success('Reminder sent successfully!');
      // Optionally refetch to update reminder count/timestamp
      refetch();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reminder');
    }
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Referrals" className={activeTab === 'refer-and-earn' ? styles.referralHeaderTall : undefined} />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
              totalEarned={0}
            />
            <ReferralActivityFeed referrals={[]} />
            <ReferralHelpWidget />
            <ReferralTipWidget />
            <ReferralVideoWidget />
          </HubSidebar>
        }
      >
        <ReferralsSkeleton />
      </HubPageLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Referrals" className={activeTab === 'refer-and-earn' ? styles.referralHeaderTall : undefined} />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
        sidebar={
          <HubSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
              totalEarned={0}
            />
            <ReferralActivityFeed referrals={[]} />
            <ReferralHelpWidget />
            <ReferralTipWidget />
            <ReferralVideoWidget />
          </HubSidebar>
        }
      >
        <ReferralsError error={error as Error} onRetry={() => refetch()} />
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referrals"
          subtitle={activeTab === 'refer-and-earn' ? 'Refer & Earn 10% Commission' : undefined}
          className={activeTab === 'refer-and-earn' ? styles.referralHeaderTall : undefined}
          filters={
            activeTab === 'leads' ? (
              <div className={filterStyles.filtersContainer}>
                {/* Search Input */}
                <input
                  type="search"
                  placeholder="Search referrals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={filterStyles.searchInput}
                />

                {/* Date Range Filter */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'all' | 'last7' | 'last30' | 'last90')}
                  className={filterStyles.filterSelect}
                >
                  <option value="all">All Time</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="last90">Last 3 Months</option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className={filterStyles.filterSelect}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            ) : undefined
          }
          actions={
            activeTab === 'leads' ? (
              <>
                {/* Primary Action Button - Refer on WhatsApp */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrimaryAction}
                >
                  Refer on WhatsApp
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
                      <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                        <button
                          onClick={handleReferOnFacebook}
                          className={actionStyles.menuButton}
                        >
                          Refer on Facebook
                        </button>
                        <button
                          onClick={handleReferOnLinkedIn}
                          className={actionStyles.menuButton}
                        >
                          Refer on LinkedIn
                        </button>
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
            ) : undefined
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <ReferralStatsWidget
            totalReferred={stats.totalReferred}
            signedUp={stats.signedUp}
            converted={stats.converted}
            totalEarned={stats.totalEarned}
            breakdown={{
              referred: stats.referredEarned,
              signedUp: stats.signedUpEarned,
              converted: stats.convertedEarned,
            }}
          />
          <ReferralActivityFeed referrals={referrals || []} />
          <ReferralHelpWidget />
          <ReferralTipWidget />
          <ReferralVideoWidget />
        </HubSidebar>
      }
    >
      {/* Refer & Earn Tab Content */}
      {activeTab === 'refer-and-earn' && profile?.referral_code && (
        <ReferAndEarnView referralCode={profile.referral_code} />
      )}

      {/* Performance Tab Content */}
      {activeTab === 'performance' && (
        <PerformanceView referrals={referrals || []} />
      )}

      {/* Leads Tab Content */}
      {activeTab === 'leads' && (
        <>
          {/* Empty State */}
          {filteredReferrals.length === 0 && (
            <HubEmptyState
              title="No referrals found"
              description={
                statusFilter === 'all'
                  ? 'Share your referral link to start earning commissions!'
                  : `You have no ${statusFilter.toLowerCase()} referrals.`
              }
            />
          )}

          {/* Referrals List */}
          {filteredReferrals.length > 0 && (
            <>
              <div className={styles.referralsList}>
                {paginatedReferrals.map((referral: any) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onRemind={handleRemindReferral}
                  />
                ))}
              </div>

              {/* Pagination */}
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </>
      )}
    </HubPageLayout>
  );
}
