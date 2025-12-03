/*
 * Filename: src/app/(authenticated)/referrals/page.tsx
 * Purpose: Referrals hub page - displays referral lead pipeline (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-30 - Migrated to Hub Layout Architecture with HubPageLayout, HubHeader, HubTabs
 * Specification: SDD v3.6, Section 4.3 - /referrals hub, Section 2.0 - Server-side filtering via URL params
 */
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getMyReferrals } from '@/lib/api/referrals';
import ReferralCard from '@/app/components/feature/referrals/ReferralCard';
import ReferralAssetWidget from '@/app/components/feature/referrals/ReferralAssetWidget';
import ReferralStatsWidget from '@/app/components/feature/referrals/ReferralStatsWidget';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import ReferralsSkeleton from '@/app/components/feature/referrals/ReferralsSkeleton';
import ReferralsError from '@/app/components/feature/referrals/ReferralsError';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import { Referral, ReferralStatus } from '@/types';
import styles from './page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';

type SortType = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 10;

export default function ReferralsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter from URL (SDD v3.6: URL is single source of truth)
  const statusFilter = (searchParams?.get('status') as ReferralStatus | null) || 'all';

  // State for actions menu, search, sort, and pagination
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // React Query: Fetch referrals with automatic retry, caching, and background refetch
  const {
    data: referrals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['referrals', profile?.id],
    queryFn: getMyReferrals,
    enabled: !!profile && !profileLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes (referrals change less frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Update URL when filter changes
  const handleFilterChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newStatus === 'all') {
      params.delete('status');
    } else {
      params.set('status', newStatus);
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
  }, [referrals, statusFilter, searchQuery, sortBy]);

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
        if (ref.status === 'Signed Up' || ref.status === 'Converted') {
          acc.signedUp++;
        }
        if (ref.status === 'Converted') {
          acc.converted++;
          if (ref.first_commission) {
            acc.totalEarned += ref.first_commission.amount;
          }
        }
        return acc;
      },
      { totalReferred: 0, signedUp: 0, converted: 0, totalEarned: 0 }
    );
  }, [referrals]);

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'all', label: 'All Leads', active: statusFilter === 'all' },
    { id: 'Referred', label: 'Referred', active: statusFilter === 'Referred' },
    { id: 'Signed Up', label: 'Signed Up', active: statusFilter === 'Signed Up' },
    { id: 'Converted', label: 'Converted', active: statusFilter === 'Converted' },
    { id: 'Expired', label: 'Expired', active: statusFilter === 'Expired' },
  ];

  // Action handlers (placeholder for now)
  const handlePrimaryAction = () => {
    toast('Primary action coming soon!', { icon: '🚀' });
  };

  const handleSecondaryAction1 = () => {
    toast('Secondary action 1 coming soon!', { icon: '⚡' });
    setShowActionsMenu(false);
  };

  const handleSecondaryAction2 = () => {
    toast('Secondary action 2 coming soon!', { icon: '✨' });
    setShowActionsMenu(false);
  };

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Referrals" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
        sidebar={
          <HubSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
            />
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
        header={<HubHeader title="Referrals" />}
        tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
        sidebar={
          <HubSidebar>
            <ReferralStatsWidget
              totalReferred={0}
              signedUp={0}
              converted={0}
            />
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
          filters={
            <div className={filterStyles.filtersContainer}>
              {/* Search Input */}
              <input
                type="search"
                placeholder="Search referrals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />

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
          }
          actions={
            <>
              {/* Primary Action Button (Placeholder) */}
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrimaryAction}
              >
                Primary Action
              </Button>

              {/* Secondary Actions: Dropdown Menu (Placeholder) */}
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
                    <div className={actionStyles.dropdownMenu} style={{ display: 'block' }}>
                      <button
                        onClick={handleSecondaryAction1}
                        className={actionStyles.menuButton}
                      >
                        Secondary Action 1
                      </button>
                      <button
                        onClick={handleSecondaryAction2}
                        className={actionStyles.menuButton}
                      >
                        Secondary Action 2
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleFilterChange} />}
      sidebar={
        <HubSidebar>
          <ReferralStatsWidget
            totalReferred={stats.totalReferred}
            signedUp={stats.signedUp}
            converted={stats.converted}
          />

          {profile?.referral_code && (
            <ReferralAssetWidget
              referralCode={profile.referral_code}
              variant="dashboard"
            />
          )}
        </HubSidebar>
      }
    >
      {/* Empty State */}
      {filteredReferrals.length === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>No referrals found</h3>
          <p className={styles.emptyText}>
            {statusFilter === 'all'
              ? 'Share your referral link to start earning commissions!'
              : `You have no ${statusFilter.toLowerCase()} referrals.`}
          </p>
        </div>
      )}

      {/* Referrals List */}
      {filteredReferrals.length > 0 && (
        <>
          <div className={styles.referralsList}>
            {paginatedReferrals.map((referral: any) => (
              <ReferralCard key={referral.id} referral={referral} />
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
    </HubPageLayout>
  );
}
