/**
 * Filename: src/app/(authenticated)/financials/edupay/cashback/page.tsx
 * Purpose: EduPay Cashback page — earn EP from shopping via affiliate partners
 * Route: /financials/edupay/cashback
 * Created: 2026-02-12
 *
 * Architecture: Hub Layout pattern — mirrors main EduPay wallet page
 * Status: Placeholder — Awin/Tillo integration pending
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
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

type TabFilter = 'all' | 'pending' | 'available';

export default function EduPayCashbackPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
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

  const handleTabChange = (tabId: string) => {
    setTabFilter(tabId as TabFilter);
  };

  // Error state
  if (walletError) {
    return (
      <HubPageLayout
        header={<HubHeader title="Cashback Rewards" />}
        sidebar={<HubSidebar><div className={styles.skeletonWidget} /></HubSidebar>}
      >
        <div className={styles.container}>
          <div className={styles.error}>
            <p>Failed to load EduPay data. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => { void refetchWallet(); }}>
              Try Again
            </Button>
          </div>
        </div>
      </HubPageLayout>
    );
  }

  // Loading state
  if (profileLoading || walletLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Cashback Rewards" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          <div className={styles.loading}>Loading Cashback...</div>
        </div>
      </HubPageLayout>
    );
  }

  // Placeholder stats for coming soon tabs
  const stats = {
    all: 0,
    pending: 0,
    available: 0,
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Cashback Rewards"
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
            { id: 'available', label: 'Available', count: stats.available, active: tabFilter === 'available' },
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
        <HubEmptyState
          icon={<span className="material-symbols-outlined" style={{ fontSize: '48px' }}>shopping_bag</span>}
          title="Cashback Coming Soon"
          description="We're partnering with 80+ retailers including ASOS, Nike, Deliveroo, and more. Shop at your favourite stores and earn up to 15% back as EP automatically."
          actionLabel="Learn More"
          onAction={() => window.location.href = '/help-centre/features/edupay'}
        />
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
