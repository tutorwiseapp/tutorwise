/*
 * Filename: src/app/(admin)/admin/edupay/providers/page.tsx
 * Purpose: Admin page for managing EduPay ISA/Savings providers
 * Created: 2026-02-12
 * Phase: 2 - Platform Management (Priority 2)
 * Pattern: Follows Admin Dashboard Gold Standard
 */
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { Building2, Users, Percent, AlertTriangle, Check, X, Edit2 } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface Provider {
  id: string;
  name: string;
  provider_type: 'isa' | 'savings';
  description: string;
  interest_rate_percent: number;
  logo_url: string | null;
  is_active: boolean;
  linked_accounts_count?: number;
  created_at: string;
  updated_at: string;
}

// Mock providers data (in production, this would come from a providers table)
const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'moneybox',
    name: 'Moneybox',
    provider_type: 'isa',
    description: 'Easy investing and ISA accounts with round-up savings',
    interest_rate_percent: 5.14,
    logo_url: null,
    is_active: true,
    linked_accounts_count: 12,
    created_at: '2026-01-01',
    updated_at: '2026-02-01',
  },
  {
    id: 'chase',
    name: 'Chase UK',
    provider_type: 'savings',
    description: 'Digital bank with competitive savings rates',
    interest_rate_percent: 4.75,
    logo_url: null,
    is_active: true,
    linked_accounts_count: 8,
    created_at: '2026-01-01',
    updated_at: '2026-02-01',
  },
  {
    id: 'trading212',
    name: 'Trading 212',
    provider_type: 'isa',
    description: 'Stocks and shares ISA with cash interest',
    interest_rate_percent: 5.20,
    logo_url: null,
    is_active: true,
    linked_accounts_count: 5,
    created_at: '2026-01-01',
    updated_at: '2026-02-01',
  },
  {
    id: 'plum',
    name: 'Plum',
    provider_type: 'savings',
    description: 'AI-powered savings and investment app',
    interest_rate_percent: 5.00,
    logo_url: null,
    is_active: false,
    linked_accounts_count: 0,
    created_at: '2026-01-01',
    updated_at: '2026-02-01',
  },
];

export default function AdminEduPayProvidersPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'isa' | 'savings'>('all');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editInterestRate, setEditInterestRate] = useState<number>(0);

  // In production, fetch from database. For now, use mock data.
  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin-edupay-providers'],
    queryFn: async () => {
      // TODO: Replace with actual database query when providers table exists
      return MOCK_PROVIDERS;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Fetch linked accounts count per provider
  const { data: linkedAccountsStats } = useQuery({
    queryKey: ['admin-edupay-linked-accounts-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edupay_linked_accounts')
        .select('provider_id');

      if (error) {
        console.error('Failed to fetch linked accounts:', error);
        return {};
      }

      // Count accounts per provider
      const counts: Record<string, number> = {};
      data?.forEach((account) => {
        counts[account.provider_id] = (counts[account.provider_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60_000,
  });

  // Filter providers by tab
  const filteredProviders = providers?.filter((p) => {
    if (activeTab === 'all') return true;
    return p.provider_type === activeTab;
  }) || [];

  // Calculate stats
  const totalProviders = providers?.length || 0;
  const activeProviders = providers?.filter(p => p.is_active).length || 0;
  const isaProviders = providers?.filter(p => p.provider_type === 'isa').length || 0;
  const savingsProviders = providers?.filter(p => p.provider_type === 'savings').length || 0;

  const handleEditRate = (provider: Provider) => {
    setEditingProvider(provider.id);
    setEditInterestRate(provider.interest_rate_percent);
  };

  const handleSaveRate = () => {
    // TODO: Save to database
    console.log('Saving rate:', editingProvider, editInterestRate);
    setEditingProvider(null);
  };

  const handleToggleActive = (providerId: string, currentlyActive: boolean) => {
    // TODO: Update in database
    console.log('Toggle active:', providerId, !currentlyActive);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Provider Management"
          subtitle="Manage ISA and Savings account providers for EduPay conversions"
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'all', label: 'All Providers', count: totalProviders, active: activeTab === 'all' },
            { id: 'isa', label: 'ISA Providers', count: isaProviders, active: activeTab === 'isa' },
            { id: 'savings', label: 'Savings Providers', count: savingsProviders, active: activeTab === 'savings' },
          ]}
          onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Provider Stats"
            stats={[
              { label: 'Total Providers', value: totalProviders },
              { label: 'Active', value: activeProviders },
              { label: 'ISA Providers', value: isaProviders },
              { label: 'Savings Providers', value: savingsProviders },
            ]}
          />
          <AdminHelpWidget
            title="Provider Help"
            items={[
              { question: 'What are providers?', answer: 'Providers are ISA and savings account partners where users can allocate their converted EP earnings.' },
              { question: 'Interest rates?', answer: 'Rates are indicative and updated periodically. Users see projections based on these rates.' },
              { question: 'Adding providers?', answer: 'Contact engineering to integrate new providers via their API.' },
            ]}
          />
          <AdminTipWidget
            title="Management Tips"
            tips={[
              'Review interest rates monthly',
              'Deactivate providers that are deprecated',
              'Monitor linked accounts for popular providers',
              'Keep provider descriptions up to date',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Providers Grid */}
      <div className={styles.providersGrid}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.providerCardSkeleton} />
          ))
        ) : filteredProviders.length === 0 ? (
          <div className={styles.emptyState}>
            <Building2 size={48} />
            <p>No providers found</p>
          </div>
        ) : (
          filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className={`${styles.providerCard} ${!provider.is_active ? styles.inactive : ''}`}
            >
              <div className={styles.providerHeader}>
                <div className={styles.providerLogo}>
                  {provider.name.charAt(0)}
                </div>
                <div className={styles.providerInfo}>
                  <h3 className={styles.providerName}>{provider.name}</h3>
                  <span className={`${styles.providerType} ${styles[provider.provider_type]}`}>
                    {provider.provider_type.toUpperCase()}
                  </span>
                </div>
                <button
                  className={`${styles.statusToggle} ${provider.is_active ? styles.active : ''}`}
                  onClick={() => handleToggleActive(provider.id, provider.is_active)}
                >
                  {provider.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              <p className={styles.providerDescription}>{provider.description}</p>

              <div className={styles.providerStats}>
                <div className={styles.statItem}>
                  <Percent size={16} />
                  {editingProvider === provider.id ? (
                    <div className={styles.editRate}>
                      <input
                        type="number"
                        value={editInterestRate}
                        onChange={(e) => setEditInterestRate(parseFloat(e.target.value) || 0)}
                        step={0.01}
                        min={0}
                        max={20}
                        className={styles.rateInput}
                      />
                      <button className={styles.saveBtn} onClick={handleSaveRate}>
                        <Check size={14} />
                      </button>
                      <button className={styles.cancelBtn} onClick={() => setEditingProvider(null)}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.statValue}>{provider.interest_rate_percent}% APY</span>
                      <button
                        className={styles.editRateBtn}
                        onClick={() => handleEditRate(provider)}
                      >
                        <Edit2 size={12} />
                      </button>
                    </>
                  )}
                </div>
                <div className={styles.statItem}>
                  <Users size={16} />
                  <span className={styles.statValue}>
                    {linkedAccountsStats?.[provider.id] || provider.linked_accounts_count || 0} linked
                  </span>
                </div>
              </div>

              <div className={styles.providerFooter}>
                <span className={styles.lastUpdated}>
                  Updated: {new Date(provider.updated_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Notice */}
      <div className={styles.infoNotice}>
        <AlertTriangle size={16} />
        <span>
          Provider integrations are currently in stub mode. Contact engineering to enable live integrations.
        </span>
      </div>
    </HubPageLayout>
  );
}
