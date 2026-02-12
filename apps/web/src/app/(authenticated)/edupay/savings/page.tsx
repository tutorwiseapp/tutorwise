/**
 * Filename: src/app/(authenticated)/edupay/savings/page.tsx
 * Purpose: EduPay Savings page — view ISA/Savings allocations and linked providers
 * Route: /edupay/savings
 * Created: 2026-02-12
 *
 * Architecture: Hub Layout pattern — mirrors main EduPay wallet page
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

type TabFilter = 'all' | 'isa' | 'savings';
type DateRangeType = 'all' | '30days' | '3months' | '1year';
type AccountType = 'all' | 'isa' | 'savings';
type ProviderType = 'all' | 'trading212' | 'chase' | 'moneybox' | 'plum' | 'other';

const ITEMS_PER_PAGE = 10;

// Placeholder for allocation type (will be defined properly when API is ready)
interface SavingsAllocation {
  id: string;
  account_type: 'isa' | 'savings';
  provider_name: string;
  provider_id: ProviderType;
  gbp_amount: number;
  apy_rate: number;
  projected_interest: number;
  allocation_date: string;
  created_at: string;
}

export default function EduPaySavingsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLoanProfileModal, setShowLoanProfileModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);

  // Queries — Gold Standard pattern with auto-refresh
  const { data: wallet, isLoading: walletLoading, isFetching: walletFetching, error: walletError, refetch: refetchWallet } = useQuery({
    queryKey: ['edupay-wallet', profile?.id],
    queryFn: getEduPayWallet,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
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

  const { data: savingsSummary, isLoading: savingsLoading, error: savingsError } = useQuery({
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

  const hasAllocations = savingsSummary && savingsSummary.total_gbp_allocated > 0;

  // Placeholder for allocation list — will be populated when allocation API is ready
  const allocations: SavingsAllocation[] = useMemo(() => [], []);

  // Filter logic (ready for when data exists)
  const filteredAllocations = useMemo(() => {
    let result = [...allocations];

    // Tab filter
    if (tabFilter === 'isa') result = result.filter(a => a.account_type === 'isa');
    if (tabFilter === 'savings') result = result.filter(a => a.account_type === 'savings');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.provider_name.toLowerCase().includes(q));
    }

    // Account type filter
    if (accountTypeFilter !== 'all') {
      result = result.filter(a => a.account_type === accountTypeFilter);
    }

    // Provider filter
    if (providerFilter !== 'all') {
      result = result.filter(a => a.provider_id === providerFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === '30days') cutoff.setDate(cutoff.getDate() - 30);
      if (dateRange === '3months') cutoff.setMonth(cutoff.getMonth() - 3);
      if (dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
      result = result.filter(a => new Date(a.allocation_date) >= cutoff);
    }

    return result;
  }, [allocations, tabFilter, searchQuery, accountTypeFilter, providerFilter, dateRange]);

  const totalItems = filteredAllocations.length;
  const paginatedAllocations = useMemo(
    () => filteredAllocations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredAllocations, currentPage],
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tabFilter, searchQuery, accountTypeFilter, providerFilter, dateRange]);

  // Tab counts
  const stats = useMemo(() => ({
    all: allocations.length,
    isa: allocations.filter(a => a.account_type === 'isa').length,
    savings: allocations.filter(a => a.account_type === 'savings').length,
  }), [allocations]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/edupay/savings${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Error state — Gold Standard pattern
  if (walletError || savingsError) {
    return (
      <EduPayError
        error={walletError || savingsError}
        onRetry={() => { void refetchWallet(); }}
        title="Failed to load Savings data"
        backUrl="/edupay"
        backLabel="Back to EduPay"
      />
    );
  }

  // Loading state — Gold Standard pattern
  if (profileLoading || walletLoading || savingsLoading) {
    return <EduPaySkeleton variant="savings" count={4} />;
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Savings & ISA"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search providers..."
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
                  value={accountTypeFilter}
                  onChange={v => setAccountTypeFilter(v as AccountType)}
                  options={[
                    { value: 'all', label: 'All Accounts' },
                    { value: 'isa', label: 'ISA' },
                    { value: 'savings', label: 'Savings' },
                  ]}
                  placeholder="Account type"
                />
              </div>
              <div style={{ minWidth: '140px' }}>
                <UnifiedSelect
                  value={providerFilter}
                  onChange={v => setProviderFilter(v as ProviderType)}
                  options={[
                    { value: 'all', label: 'All Providers' },
                    { value: 'trading212', label: 'Trading 212' },
                    { value: 'chase', label: 'Chase' },
                    { value: 'moneybox', label: 'Moneybox' },
                    { value: 'plum', label: 'Plum' },
                    { value: 'other', label: 'Other' },
                  ]}
                  placeholder="Provider"
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
                        Link New Account
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
            { id: 'all', label: 'All Allocations', count: stats.all, active: tabFilter === 'all' },
            { id: 'isa', label: 'ISA', count: stats.isa, active: tabFilter === 'isa' },
            { id: 'savings', label: 'Savings', count: stats.savings, active: tabFilter === 'savings' },
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
        {paginatedAllocations.length === 0 ? (
          allocations.length === 0 && !hasAllocations ? (
            <HubEmptyState
              icon={<span className="material-symbols-outlined" style={{ fontSize: '48px' }}>savings</span>}
              title="No Savings Allocations Yet"
              description="When you convert EP to an ISA or Savings account, your allocations will appear here. Earn up to 5.1% APY in tax-free ISAs or 4.6% APY in savings accounts."
              actionLabel="Convert EP"
              onAction={() => setShowConversionModal(true)}
            />
          ) : allocations.length === 0 && hasAllocations ? (
            // Has summary data but no detailed allocation list yet
            <>
              <div className={styles.ledgerList}>
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  border: '1px solid #e5e7eb',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Allocated</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                        £{savingsSummary?.total_gbp_allocated.toFixed(2) ?? '0.00'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Projected Interest (12mo)</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#059669' }}>
                        +£{savingsSummary?.total_projected_interest.toFixed(2) ?? '0.00'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Allocations</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                        {savingsSummary?.allocation_count ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '1rem 0' }}>
                  Full allocation history and detailed projections coming soon.
                </p>
              </div>
            </>
          ) : (
            <HubEmptyState
              title="No allocations found"
              description="No allocations match your current filters. Try adjusting your search or date range."
            />
          )
        ) : (
          <>
            <div className={styles.ledgerList}>
              {paginatedAllocations.map(allocation => (
                <div key={allocation.id} style={{
                  padding: '1rem',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{allocation.provider_name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(allocation.allocation_date).toLocaleDateString()} · {allocation.apy_rate}% APY
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>£{allocation.gbp_amount.toFixed(2)}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: allocation.account_type === 'isa' ? '#dbeafe' : '#f3e8ff',
                        color: allocation.account_type === 'isa' ? '#1e40af' : '#7c3aed',
                      }}>
                        {allocation.account_type === 'isa' ? 'ISA' : 'Savings'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#059669' }}>
                    Projected interest: +£{allocation.projected_interest.toFixed(2)}/year
                  </div>
                </div>
              ))}
            </div>
            {filteredAllocations.length > ITEMS_PER_PAGE && (
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
