/**
 * Filename: src/app/(authenticated)/financials/edupay/savings/page.tsx
 * Purpose: EduPay Savings page — view ISA/Savings allocations and linked providers
 * Route: /financials/edupay/savings
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
import EduPayStatsWidget from '@/app/components/feature/edupay/EduPayStatsWidget';
import EduPaySavingsWidget from '@/app/components/feature/edupay/EduPaySavingsWidget';
import EduPayProjectionWidget from '@/app/components/feature/edupay/EduPayProjectionWidget';
import EduPayLoanProfileWidget from '@/app/components/feature/edupay/EduPayLoanProfileWidget';
import EduPayHelpWidget from '@/app/components/feature/edupay/EduPayHelpWidget';
import EduPayVideoWidget from '@/app/components/feature/edupay/EduPayVideoWidget';
import EduPayConversionModal from '@/app/components/feature/edupay/EduPayConversionModal';
import EduPayLoanProfileModal from '@/app/components/feature/edupay/EduPayLoanProfileModal';
import {
  getEduPayWallet,
  getEduPayProjection,
  getLoanProfile,
  getSavingsSummary,
} from '@/lib/api/edupay';
import styles from '../page.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

type TabFilter = 'all' | 'isa' | 'savings';

const ITEMS_PER_PAGE = 10;

export default function EduPaySavingsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'all';

  const [currentPage, setCurrentPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showLoanProfileModal, setShowLoanProfileModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);

  // Queries — same pattern as main EduPay page
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
  const allocations = useMemo(() => [], []);

  // Tab counts (placeholder — will be computed from real allocations)
  const stats = useMemo(() => ({
    all: savingsSummary?.allocation_count ?? 0,
    isa: 0, // Will be computed from allocations
    savings: 0, // Will be computed from allocations
  }), [savingsSummary]);

  // Filtered and paginated allocations (placeholder)
  const filteredAllocations = useMemo(() => {
    // Filter by tab when real data is available
    return allocations;
  }, [allocations]);

  const totalItems = filteredAllocations.length;
  const paginatedAllocations = useMemo(
    () => filteredAllocations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredAllocations, currentPage],
  );

  // Reset to page 1 when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tabFilter]);

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/financials/edupay/savings${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Error state
  if (walletError || savingsError) {
    return (
      <HubPageLayout
        header={<HubHeader title="Savings & ISA" />}
        sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load Savings data. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => { void refetchWallet(); }}>
              Try Again
            </Button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  // Loading state
  if (profileLoading || walletLoading || savingsLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Savings & ISA" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading Savings...</div>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Savings & ISA"
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
        {!hasAllocations ? (
          <HubEmptyState
            icon={<span className="material-symbols-outlined" style={{ fontSize: '48px' }}>savings</span>}
            title="No Savings Allocations Yet"
            description="When you convert EP to an ISA or Savings account, your allocations will appear here. Earn up to 5.1% APY in tax-free ISAs or 4.6% APY in savings accounts."
            actionLabel="Convert EP"
            onAction={() => setShowConversionModal(true)}
          />
        ) : paginatedAllocations.length === 0 ? (
          <HubEmptyState
            title="No allocations found"
            description="No allocations match your current filter. Try selecting a different tab."
          />
        ) : (
          <>
            {/* Summary card when allocations exist */}
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
