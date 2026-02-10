/**
 * Filename: src/app/(authenticated)/financials/edupay/page.tsx
 * Purpose: EduPay hub page — EP wallet, ledger, and loan projections
 * Route: /financials/edupay
 * Created: 2026-02-10
 * Design: Section 17 of docs/feature/edupay/edupay-solution-design.md
 *
 * Architecture: Hub Layout pattern — mirrors financials/page.tsx
 * Shell: HubPageLayout + HubHeader + HubTabs + HubSidebar + HubPagination + HubEmptyState
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import EduPayStatsWidget from '@/app/components/feature/edupay/EduPayStatsWidget';
import EduPayProjectionWidget from '@/app/components/feature/edupay/EduPayProjectionWidget';
import EduPayLoanProfileWidget from '@/app/components/feature/edupay/EduPayLoanProfileWidget';
import EduPayHelpWidget from '@/app/components/feature/edupay/EduPayHelpWidget';
import EduPayVideoWidget from '@/app/components/feature/edupay/EduPayVideoWidget';
import EduPayLedgerCard from '@/app/components/feature/edupay/EduPayLedgerCard';
import EduPayConversionModal from '@/app/components/feature/edupay/EduPayConversionModal';
import EduPayLoanProfileModal from '@/app/components/feature/edupay/EduPayLoanProfileModal';
import {
  getEduPayWallet,
  getEduPayLedger,
  getEduPayProjection,
  getLoanProfile,
} from '@/lib/api/edupay';
import styles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabFilter = 'all' | 'pending' | 'available' | 'converted';
type DateRangeType = 'all' | '30days' | '3months' | '1year';
type EventType = 'all' | 'tutoring_income' | 'referral_income' | 'affiliate_spend' | 'gift_reward' | 'caas_threshold';

const ITEMS_PER_PAGE = 10;

export default function EduPayPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [eventType, setEventType] = useState<EventType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLoanProfileModal, setShowLoanProfileModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);

  const queryClient = useQueryClient();

  // Queries — gold standard pattern (matches listings/bookings/referrals)
  const { data: wallet, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useQuery({
    queryKey: ['edupay-wallet', profile?.id],
    queryFn: getEduPayWallet,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: ledger, isLoading: ledgerLoading, error: ledgerError, refetch: refetchLedger } = useQuery({
    queryKey: ['edupay-ledger', profile?.id],
    queryFn: getEduPayLedger,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: loanProfile } = useQuery({
    queryKey: ['edupay-loan-profile', profile?.id],
    queryFn: getLoanProfile,
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: projection } = useQuery({
    queryKey: ['edupay-projection', profile?.id],
    queryFn: getEduPayProjection,
    enabled: !!profile?.id && !!loanProfile,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const entries = useMemo(() => ledger ?? [], [ledger]);

  // Tab + filter logic
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Tab filter
    if (tabFilter === 'pending') result = result.filter(e => e.status === 'pending');
    if (tabFilter === 'available') result = result.filter(e => e.status === 'available');
    if (tabFilter === 'converted') result = result.filter(e => e.status === 'processed');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.note?.toLowerCase().includes(q) || e.event_type?.toLowerCase().includes(q));
    }

    // Event type filter
    if (eventType !== 'all') {
      result = result.filter(e => e.event_type === eventType);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === '30days') cutoff.setDate(cutoff.getDate() - 30);
      if (dateRange === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
      if (dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
      result = result.filter(e => new Date(e.created_at) >= cutoff);
    }

    return result;
  }, [entries, tabFilter, searchQuery, eventType, dateRange]);

  const totalItems = filteredEntries.length;
  const paginatedEntries = useMemo(
    () => filteredEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredEntries, currentPage],
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tabFilter, searchQuery, dateRange, eventType]);

  const stats = useMemo(() => ({
    all: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    available: entries.filter(e => e.status === 'available').length,
    converted: entries.filter(e => e.status === 'processed').length,
  }), [entries]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/financials/edupay${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Error state
  const hasError = !!walletError || !!ledgerError;
  if (hasError) {
    return (
      <HubPageLayout
        header={<HubHeader title="EduPay" />}
        sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load EduPay data. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => { void refetchWallet(); void refetchLedger(); }}>
              Try Again
            </Button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  // Loading state
  if (profileLoading || walletLoading || ledgerLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="EduPay" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading EduPay...</div>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="EduPay"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <div style={{ minWidth: '150px' }}>
                <UnifiedSelect
                  value={dateRange}
                  onChange={v => setDateRange(v as DateRangeType)}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '30days', label: 'Last 30 Days' },
                    { value: '3months', label: 'Last 3 Months' },
                    { value: '1year', label: 'Last Year' },
                  ]}
                  placeholder="Date range"
                />
              </div>
              <div style={{ minWidth: '150px' }}>
                <UnifiedSelect
                  value={eventType}
                  onChange={v => setEventType(v as EventType)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'tutoring_income', label: 'Tutoring' },
                    { value: 'referral_income', label: 'Referral' },
                    { value: 'affiliate_spend', label: 'Affiliate' },
                    { value: 'gift_reward', label: 'Gift Reward' },
                    { value: 'caas_threshold', label: 'CaaS Reward' },
                  ]}
                  placeholder="Activity type"
                />
              </div>
            </div>
          }
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => setShowConversionModal(true)}>
                Convert EP
              </Button>
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
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className={actionStyles.dropdownMenu}>
                      {loanProfile && (
                        <button
                          onClick={() => { setShowLoanProfileModal(true); setShowActionsMenu(false); }}
                          className={actionStyles.menuButton}
                        >
                          Edit Loan Profile
                        </button>
                      )}
                      <button
                        onClick={() => setShowActionsMenu(false)}
                        className={actionStyles.menuButton}
                      >
                        Export EP History
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
          tabs={[
            { id: 'all', label: 'All Activity', count: stats.all, active: tabFilter === 'all' },
            { id: 'pending', label: 'Pending', count: stats.pending, active: tabFilter === 'pending' },
            { id: 'available', label: 'Available', count: stats.available, active: tabFilter === 'available' },
            { id: 'converted', label: 'Converted', count: stats.converted, active: tabFilter === 'converted' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <EduPayStatsWidget wallet={wallet ?? null} />
          <EduPayProjectionWidget
            loanProfile={loanProfile ?? null}
            wallet={wallet ?? null}
            projection={projection ?? null}
          />
          <EduPayLoanProfileWidget
            loanProfile={loanProfile ?? null}
          />
          <EduPayHelpWidget />
          <EduPayVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.container}>
        {paginatedEntries.length === 0 ? (
          entries.length === 0 ? (
            <HubEmptyState
              title="No EduPay activity yet"
              description="Complete tutoring sessions, refer friends, or shop via affiliate links to start earning EP."
              actionLabel={!loanProfile ? 'Set Up Loan Profile' : undefined}
              onAction={!loanProfile ? () => setShowLoanProfileModal(true) : undefined}
            />
          ) : (
            <HubEmptyState
              title="No activity found"
              description="No EP activity matches your current filters. Try adjusting your search or date range."
            />
          )
        ) : (
          <>
            <div className={styles.ledgerList}>
              {paginatedEntries.map(entry => (
                <EduPayLedgerCard key={entry.id} entry={entry} />
              ))}
            </div>
            {filteredEntries.length > ITEMS_PER_PAGE && (
              <HubPagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      <EduPayConversionModal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        wallet={wallet ?? null}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['edupay-wallet'] });
          void queryClient.invalidateQueries({ queryKey: ['edupay-ledger'] });
        }}
      />

      <EduPayLoanProfileModal
        isOpen={showLoanProfileModal}
        onClose={() => setShowLoanProfileModal(false)}
        loanProfile={loanProfile ?? null}
        onSave={() => {
          void queryClient.invalidateQueries({ queryKey: ['edupay-loan-profile'] });
          void queryClient.invalidateQueries({ queryKey: ['edupay-projection'] });
        }}
      />
    </HubPageLayout>
  );
}
