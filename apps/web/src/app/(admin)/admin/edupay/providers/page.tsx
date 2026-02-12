/*
 * Filename: src/app/(admin)/admin/edupay/providers/page.tsx
 * Purpose: Admin page for managing EduPay ISA/Savings providers
 * Created: 2026-02-12
 * Phase: 2 - Platform Management (Priority 2)
 * Pattern: Follows Admin Dashboard Gold Standard
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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


export default function AdminEduPayProvidersPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [providerFilter, setProviderFilter] = useState<'all' | 'isa' | 'savings'>('all');
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editInterestRate, setEditInterestRate] = useState<number>(0);

  // Fetch providers from database
  const { data: providers, isLoading } = useQuery({
    queryKey: ['admin-edupay-providers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/edupay/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      const data = await response.json();
      return data.providers as Provider[];
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  // Update interest rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async ({ provider_id, interest_rate_percent }: { provider_id: string; interest_rate_percent: number }) => {
      const response = await fetch('/api/admin/edupay/providers/update-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id, interest_rate_percent }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-providers'] });
      setEditingProvider(null);
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ provider_id, is_active }: { provider_id: string; is_active: boolean }) => {
      const response = await fetch('/api/admin/edupay/providers/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id, is_active }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-providers'] });
    },
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
    if (providerFilter === 'all') return true;
    return p.provider_type === providerFilter;
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
    if (editingProvider) {
      updateRateMutation.mutate({
        provider_id: editingProvider,
        interest_rate_percent: editInterestRate,
      });
    }
  };

  const handleToggleActive = (providerId: string, currentlyActive: boolean) => {
    toggleActiveMutation.mutate({
      provider_id: providerId,
      is_active: !currentlyActive,
    });
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Provider Management"
          subtitle="Manage ISA and Savings account providers for EduPay conversions"
          className={styles.providersHeader}
          actions={
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterButton} ${providerFilter === 'all' ? styles.filterActive : ''}`}
                onClick={() => setProviderFilter('all')}
              >
                All ({totalProviders})
              </button>
              <button
                className={`${styles.filterButton} ${providerFilter === 'isa' ? styles.filterActive : ''}`}
                onClick={() => setProviderFilter('isa')}
              >
                ISA ({isaProviders})
              </button>
              <button
                className={`${styles.filterButton} ${providerFilter === 'savings' ? styles.filterActive : ''}`}
                onClick={() => setProviderFilter('savings')}
              >
                Savings ({savingsProviders})
              </button>
            </div>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: false },
            { id: 'rules', label: 'Earning Rules', active: false },
            { id: 'providers', label: 'Providers', active: true },
            { id: 'compliance', label: 'Compliance', active: false },
          ]}
          onTabChange={(tabId) => {
            if (tabId === 'overview') router.push('/admin/edupay');
            else if (tabId === 'rules') router.push('/admin/edupay/rules');
            else if (tabId === 'providers') router.push('/admin/edupay/providers');
            else if (tabId === 'compliance') router.push('/admin/edupay/compliance');
          }}
          className={styles.providersTabs}
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
                  disabled={toggleActiveMutation.isPending}
                >
                  {toggleActiveMutation.isPending ? '...' : provider.is_active ? 'Active' : 'Inactive'}
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
                      <button
                        className={styles.saveBtn}
                        onClick={handleSaveRate}
                        disabled={updateRateMutation.isPending}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setEditingProvider(null)}
                        disabled={updateRateMutation.isPending}
                      >
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
