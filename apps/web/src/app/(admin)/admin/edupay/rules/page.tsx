/*
 * Filename: src/app/(admin)/admin/edupay/rules/page.tsx
 * Purpose: Admin page for managing EduPay earning rules and multipliers
 * Created: 2026-02-12
 * Updated: 2026-02-12 - Refactored to use HubDataTable and VerticalDotsMenu
 * Phase: 2 - Platform Management (Priority 2)
 * Pattern: Follows Admin Dashboard Gold Standard
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import { AlertTriangle } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
import EditRuleModal from './components/EditRuleModal';
import AddRuleModal from './components/AddRuleModal';
import RuleHistoryModal from './components/RuleHistoryModal';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface EduPayRule {
  id: string;
  event_type: string;
  description: string;
  ep_per_unit: number;
  unit_type: string;
  platform_fee_percent: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function AdminEduPayRulesPage() {
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<EduPayRule | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [ruleForHistory, setRuleForHistory] = useState<EduPayRule | null>(null);

  // Fetch rules
  const { data: rulesData, isLoading, refetch, error } = useQuery<{ rules: EduPayRule[]; total: number }>({
    queryKey: ['admin-edupay-rules-table', page, limit],
    queryFn: async () => {
      // Get total count
      const { count } = await supabase
        .from('edupay_rules')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
      const { data, error } = await supabase
        .from('edupay_rules')
        .select('*')
        .order('event_type', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        throw new Error(`Failed to fetch rules: ${error.message}`);
      }

      return {
        rules: data as EduPayRule[],
        total: count || 0,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const rules = rulesData?.rules || [];

  // Toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('edupay_rules')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to toggle rule: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-edupay-rules-table'] });
    },
  });

  // Format event type for display
  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Action handlers
  const handleEditRule = (rule: EduPayRule) => {
    setRuleToEdit(rule);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (rule: EduPayRule) => {
    const action = rule.is_active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} the "${formatEventType(rule.event_type)}" rule?`)) {
      toggleRuleMutation.mutate({ id: rule.id, isActive: !rule.is_active });
    }
  };

  const handleViewHistory = (rule: EduPayRule) => {
    setRuleForHistory(rule);
    setIsHistoryModalOpen(true);
  };

  // Define columns following universal column order
  const columns: Column<EduPayRule>[] = [
    {
      key: 'event_type',
      label: 'Event Type',
      width: '160px',
      sortable: true,
      render: (rule) => (
        <span className={styles.eventType}>{formatEventType(rule.event_type)}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      width: '220px',
      hideOnMobile: true,
      render: (rule) => (
        <span className={styles.description}>{rule.description || '—'}</span>
      ),
    },
    {
      key: 'ep_per_unit',
      label: 'EP per Unit',
      width: '100px',
      sortable: true,
      render: (rule) => (
        <span className={styles.epValue}>{rule.ep_per_unit} EP</span>
      ),
    },
    {
      key: 'unit_type',
      label: 'Unit',
      width: '100px',
      hideOnMobile: true,
      render: (rule) => (
        <span className={styles.unitType}>{rule.unit_type}</span>
      ),
    },
    {
      key: 'platform_fee_percent',
      label: 'Platform Fee',
      width: '100px',
      hideOnMobile: true,
      render: (rule) => (
        <span>{rule.platform_fee_percent}%</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      width: '100px',
      render: (rule) => <StatusBadge isActive={rule.is_active} />,
    },
    {
      key: 'updated_at',
      label: 'Updated',
      width: '120px',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (rule) => (
        <span className={styles.dateCell}>{formatDate(rule.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (rule) => (
        <VerticalDotsMenu
          actions={[
            { label: 'Edit Rule', onClick: () => handleEditRule(rule) },
            {
              label: rule.is_active ? 'Deactivate' : 'Activate',
              onClick: () => handleToggleStatus(rule),
              variant: rule.is_active ? 'danger' : 'default',
            },
            { label: 'View History', onClick: () => handleViewHistory(rule) },
          ]}
        />
      ),
    },
  ];

  // Define filters
  const filters: Filter[] = [
    {
      key: 'status',
      label: 'All Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  // Pagination config
  const paginationConfig: PaginationConfig = {
    page,
    limit,
    total: rulesData?.total || 0,
    onPageChange: setPage,
    onLimitChange: (newLimit) => {
      setLimit(newLimit);
      setPage(1);
    },
    pageSizeOptions: [10, 20, 50, 100],
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!rules || rules.length === 0) return;

    const headers = ['Event Type', 'Description', 'EP per Unit', 'Unit Type', 'Platform Fee %', 'Status', 'Updated'];
    const rows = rules.map((rule) => [
      formatEventType(rule.event_type),
      rule.description || '',
      rule.ep_per_unit,
      rule.unit_type,
      rule.platform_fee_percent,
      rule.is_active ? 'Active' : 'Inactive',
      formatDate(rule.updated_at),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edupay-rules-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="EduPay Management"
          subtitle="Earning rules configuration"
          className={styles.rulesHeader}
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
              Add New Rule
            </Button>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'overview', label: 'Overview', active: false },
            { id: 'rules', label: 'Earning Rules', active: true },
            { id: 'providers', label: 'Providers', active: false },
            { id: 'compliance', label: 'Compliance', active: false },
          ]}
          onTabChange={(tabId) => {
            if (tabId === 'overview') router.push('/admin/edupay');
            else if (tabId === 'rules') router.push('/admin/edupay/rules');
            else if (tabId === 'providers') router.push('/admin/edupay/providers');
            else if (tabId === 'compliance') router.push('/admin/edupay/compliance');
          }}
          className={styles.rulesTabs}
        />
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Rules Help"
            items={[
              { question: 'What are earning rules?', answer: 'Rules define how many EP users earn per unit of activity (e.g., £1 earned, referral converted).' },
              { question: 'Platform fee?', answer: 'The % Tutorwise takes from each conversion. Standard is 10% — users receive 90%.' },
              { question: 'Changing rules?', answer: 'Changes apply to NEW earnings only. Existing EP balances are not affected.' },
            ]}
          />
          <AdminTipWidget
            title="Configuration Tips"
            tips={[
              'Standard rate: 100 EP per £1 GBP',
              'Platform fee should remain at 10%',
              'Deactivate rules instead of deleting',
              'Test changes in staging first',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Edit Rule Modal */}
      <EditRuleModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        rule={ruleToEdit}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-edupay-rules-table'] });
        }}
      />

      {/* Add Rule Modal */}
      <AddRuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-edupay-rules-table'] });
        }}
        existingEventTypes={rules.map(r => r.event_type)}
      />

      {/* Rule History Modal */}
      <RuleHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        rule={ruleForHistory}
      />

      {/* Rules Table with HubDataTable */}
      <HubDataTable
        columns={columns}
        data={rules}
        loading={isLoading}
        onRefresh={() => refetch()}
        onExport={handleExport}
        filters={filters}
        pagination={paginationConfig}
        emptyMessage={error ? `Error loading rules: ${(error as Error).message}` : 'No earning rules found.'}
        searchPlaceholder="Search rules..."
        autoRefreshInterval={60000}
        enableSavedViews={true}
        savedViewsKey="admin_edupay_rules_savedViews"
      />

      {/* Warning Notice */}
      <div className={styles.warningNotice}>
        <AlertTriangle size={16} />
        <span>
          Changes to earning rules affect all future EP earnings. Existing wallet balances are not affected.
          Contact engineering before making significant rate changes.
        </span>
      </div>
    </HubPageLayout>
  );
}
