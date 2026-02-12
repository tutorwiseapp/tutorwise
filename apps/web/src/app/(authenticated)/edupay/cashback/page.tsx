/**
 * Filename: src/app/(authenticated)/edupay/cashback/page.tsx
 * Purpose: EduPay Cashback page — earn EP from shopping via affiliate partners
 * Route: /edupay/cashback
 * Created: 2026-02-12
 *
 * Architecture: Hub Layout pattern — Gold Standard (matches bookings/financials)
 * Status: Placeholder — Awin/Tillo integration pending
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
import EduPaySavingsWidget from '@/app/components/feature/edupay/EduPaySavingsWidget';
import EduPayProjectionWidget from '@/app/components/feature/edupay/EduPayProjectionWidget';
import EduPayLoanProfileWidget from '@/app/components/feature/edupay/EduPayLoanProfileWidget';
import EduPayHelpWidget from '@/app/components/feature/edupay/EduPayHelpWidget';
import EduPayVideoWidget from '@/app/components/feature/edupay/EduPayVideoWidget';
import EduPayConversionModal from '@/app/components/feature/edupay/EduPayConversionModal';
import EduPayLoanProfileModal from '@/app/components/feature/edupay/EduPayLoanProfileModal';
import EduPaySkeleton from '@/app/components/feature/edupay/EduPaySkeleton';
import EduPayError from '@/app/components/feature/edupay/EduPayError';
import {
  getEduPayWallet,
  getEduPayProjection,
  getLoanProfile,
  getSavingsSummary,
} from '@/lib/api/edupay';
import styles from '../page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabFilter = 'all' | 'pending' | 'confirmed';
type DateRangeType = 'all' | '30days' | '3months' | '1year';
type CashbackStatus = 'all' | 'pending' | 'confirmed' | 'declined';
type RetailerCategory = 'all' | 'fashion' | 'food' | 'electronics' | 'travel' | 'entertainment' | 'other';

const ITEMS_PER_PAGE = 10;

// Placeholder for cashback transaction type (will be defined properly when API is ready)
interface CashbackTransaction {
  id: string;
  retailer_name: string;
  retailer_category: RetailerCategory;
  sale_amount: number;
  commission_amount: number;
  ep_awarded: number;
  status: 'pending' | 'confirmed' | 'declined';
  transaction_date: string;
  created_at: string;
}

export default function EduPayCashbackPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [statusFilter, setStatusFilter] = useState<CashbackStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<RetailerCategory>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLoanProfileModal, setShowLoanProfileModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);

  // React Query: Fetch wallet with Gold Standard pattern
  const {
    data: wallet,
    isLoading: walletLoading,
    isFetching: walletFetching,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['edupay-wallet', profile?.id],
    queryFn: getEduPayWallet,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds
    gcTime: 10 * 60_000, // 10 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchInterval: 60_000, // Auto-refresh every minute
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

  const { data: savingsSummary } = useQuery({
    queryKey: ['edupay-savings-summary', profile?.id],
    queryFn: getSavingsSummary,
    enabled: !!profile?.id,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Placeholder: cashback transactions will come from API when Awin integration is live
  const transactions: CashbackTransaction[] = useMemo(() => [], []);

  // Filter logic (ready for when data exists)
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Tab filter
    if (tabFilter === 'pending') result = result.filter(t => t.status === 'pending');
    if (tabFilter === 'confirmed') result = result.filter(t => t.status === 'confirmed');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.retailer_name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.retailer_category === categoryFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === '30days') cutoff.setDate(cutoff.getDate() - 30);
      if (dateRange === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
      if (dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
      result = result.filter(t => new Date(t.transaction_date) >= cutoff);
    }

    return result;
  }, [transactions, tabFilter, searchQuery, statusFilter, categoryFilter, dateRange]);

  const totalItems = filteredTransactions.length;
  const paginatedTransactions = useMemo(
    () => filteredTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredTransactions, currentPage],
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tabFilter, searchQuery, statusFilter, categoryFilter, dateRange]);

  // Tab counts
  const stats = useMemo(() => ({
    all: transactions.length,
    pending: transactions.filter(t => t.status === 'pending').length,
    confirmed: transactions.filter(t => t.status === 'confirmed').length,
  }), [transactions]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/edupay/cashback${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Error state - use dedicated error component
  if (walletError) {
    return (
      <EduPayError
        error={walletError as Error}
        onRetry={() => { void refetchWallet(); }}
        title="Failed to Load Cashback Data"
        backUrl="/edupay"
        backLabel="Back to EduPay Wallet"
      />
    );
  }

  // Loading state - use dedicated skeleton component
  if (profileLoading || walletLoading) {
    return <EduPaySkeleton count={4} variant="cashback" />;
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Cashback Rewards"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search retailers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <div style={{ minWidth: '140px' }}>
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
              <div style={{ minWidth: '130px' }}>
                <UnifiedSelect
                  value={statusFilter}
                  onChange={v => setStatusFilter(v as CashbackStatus)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'declined', label: 'Declined' },
                  ]}
                  placeholder="Status"
                />
              </div>
              <div style={{ minWidth: '140px' }}>
                <UnifiedSelect
                  value={categoryFilter}
                  onChange={v => setCategoryFilter(v as RetailerCategory)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    { value: 'fashion', label: 'Fashion' },
                    { value: 'food', label: 'Food & Drink' },
                    { value: 'electronics', label: 'Electronics' },
                    { value: 'travel', label: 'Travel' },
                    { value: 'entertainment', label: 'Entertainment' },
                    { value: 'other', label: 'Other' },
                  ]}
                  placeholder="Category"
                />
              </div>
              {/* Background refresh indicator */}
              {walletFetching && !walletLoading && (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: '#6b7280', animation: 'spin 1s linear infinite' }}
                  title="Refreshing..."
                >
                  sync
                </span>
              )}
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
                        View Partner Stores
                      </button>
                      <button
                        onClick={() => setShowActionsMenu(false)}
                        className={actionStyles.menuButton}
                      >
                        Export Cashback History
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
            { id: 'all', label: 'All Rewards', count: stats.all, active: tabFilter === 'all' },
            { id: 'pending', label: 'Pending', count: stats.pending, active: tabFilter === 'pending' },
            { id: 'confirmed', label: 'Confirmed', count: stats.confirmed, active: tabFilter === 'confirmed' },
          ]}
          onTabChange={handleTabChange}
        />
      }
      sidebar={
        <HubSidebar>
          <EduPayStatsWidget wallet={wallet ?? null} />
          <EduPaySavingsWidget summary={savingsSummary ?? null} />
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
        {paginatedTransactions.length === 0 ? (
          transactions.length === 0 ? (
            <HubEmptyState
              icon={<span className="material-symbols-outlined" style={{ fontSize: '48px' }}>shopping_bag</span>}
              title="Cashback Coming Soon"
              description="We're partnering with 80+ retailers including ASOS, Nike, Deliveroo, and more. Shop at your favourite stores and earn up to 15% back as EP automatically."
              actionLabel="Learn More"
              onAction={() => window.location.href = '/help-centre/features/edupay'}
            />
          ) : (
            <HubEmptyState
              title="No cashback found"
              description="No cashback rewards match your current filters. Try adjusting your search or date range."
            />
          )
        ) : (
          <>
            <div className={styles.ledgerList}>
              {paginatedTransactions.map(tx => (
                <div key={tx.id} style={{
                  padding: '1rem',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{tx.retailer_name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(tx.transaction_date).toLocaleDateString()} · £{tx.sale_amount.toFixed(2)} purchase
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>+{tx.ep_awarded.toLocaleString()} EP</div>
                      <div style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: tx.status === 'confirmed' ? '#d1fae5' : tx.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: tx.status === 'confirmed' ? '#065f46' : tx.status === 'pending' ? '#92400e' : '#991b1b',
                      }}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredTransactions.length > ITEMS_PER_PAGE && (
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
        loanProfile={loanProfile ?? null}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['edupay-wallet'] });
          void queryClient.invalidateQueries({ queryKey: ['edupay-ledger'] });
          void queryClient.invalidateQueries({ queryKey: ['edupay-savings-summary'] });
        }}
        onOpenLoanProfile={() => setShowLoanProfileModal(true)}
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
