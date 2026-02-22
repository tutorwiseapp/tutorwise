/**
 * Filename: SageProSubscriptionsTable.tsx
 * Purpose: Admin Sage Pro subscriptions data table with filtering, sorting, and bulk actions
 * Created: 2026-02-22
 * Pattern: Follows OrganisationsTable structure
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column } from '@/app/components/hub/data';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import { formatDate as formatDateUtil, calculateDaysRemaining } from '@/lib/utils/format-date';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import styles from './SageProSubscriptionsTable.module.css';
import { exportToCSV, CSVFormatters, type CSVColumn } from '@/lib/utils/exportToCSV';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

// Sage Pro Subscription interface
interface SageProSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  questions_used: number;
  questions_quota: number;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
  // Joined user data
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export default function SageProSubscriptionsTable() {
  const supabase = createClient();

  // State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Fetch subscriptions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'admin-sage-subscriptions',
      page,
      limit,
      sortKey,
      sortDirection,
      searchQuery,
    ],
    queryFn: async () => {
      let query = supabase
        .from('sage_pro_subscriptions')
        .select(
          `
          *,
          user:user_id(id, full_name, email, avatar_url)
        `,
          { count: 'exact' }
        );

      // Apply search filter - search by user email or full name
      if (searchQuery) {
        // We need to join and filter by user fields
        // Since we can't directly filter on joined table in Supabase, we'll fetch and filter client-side
        // Or use a more complex query structure
        // For now, let's use a simpler approach with email search via user_id lookup
      }

      // Apply sorting
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      // Flatten foreign key arrays (Supabase returns arrays for single joins)
      const subscriptions = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      })) as SageProSubscription[];

      // Client-side filtering if search query exists
      let filteredSubscriptions = subscriptions;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredSubscriptions = subscriptions.filter((sub) => {
          const userName = sub.user?.full_name?.toLowerCase() || '';
          const userEmail = sub.user?.email?.toLowerCase() || '';
          return userName.includes(lowerQuery) || userEmail.includes(lowerQuery);
        });
      }

      return {
        subscriptions: filteredSubscriptions,
        total: searchQuery ? filteredSubscriptions.length : (count || 0),
      };
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
    retry: 2,
  });

  const subscriptions = data?.subscriptions || [];
  const total = data?.total || 0;

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Handle export to CSV
  const handleExport = () => {
    if (!subscriptions || subscriptions.length === 0) return;

    const columns: CSVColumn<SageProSubscription>[] = [
      { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
      { key: 'created_at', header: 'Created', format: CSVFormatters.date },
      { key: 'user', header: 'User Name', format: (value: any) => value?.full_name || 'N/A' },
      { key: 'user', header: 'User Email', format: (value: any) => value?.email || 'N/A' },
      { key: 'status', header: 'Status' },
      { key: 'trial_start', header: 'Trial Start', format: (value) => value ? formatDateUtil(value as string) : 'N/A' },
      { key: 'trial_end', header: 'Trial End', format: (value) => value ? formatDateUtil(value as string) : 'N/A' },
      {
        key: 'trial_end',
        header: 'Trial Status',
        format: (value) => {
          if (!value) return 'N/A';
          const days = calculateDaysRemaining(value as string);
          return days > 0 ? `${days} days left` : `Expired ${Math.abs(days)} days ago`;
        },
      },
      { key: 'current_period_end', header: 'Next Billing', format: CSVFormatters.date },
      {
        key: 'cancel_at_period_end',
        header: 'Billing Action',
        format: (value) => value ? 'Cancels' : 'Renews',
      },
      {
        key: 'questions_used',
        header: 'Questions Used',
        format: (value) => String(value || 0),
      },
      {
        key: 'questions_quota',
        header: 'Questions Quota',
        format: (value) => String(value || 0),
      },
      {
        key: 'storage_used_bytes',
        header: 'Storage Used',
        format: (value) => formatBytes(value as number),
      },
    ];

    exportToCSV(subscriptions, columns, 'sage-pro-subscriptions');
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Columns following Universal Column Order: ID → Date → Service → Domain → Actions
  const columns: Column<SageProSubscription>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '100px',
      sortable: true,
      render: (sub) => (
        <span style={{ fontSize: '0.875rem', color: '#374151' }}>
          {formatIdForDisplay(sub.id)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '140px',
      sortable: true,
      render: (sub) => (
        <span className={styles.dateCell}>
          {formatDate(sub.created_at)}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'User',
      width: '200px',
      sortable: false,
      render: (sub) => sub.user ? (
        <div className={styles.userCell}>
          {sub.user.avatar_url && (
            <img
              src={sub.user.avatar_url}
              alt={sub.user.full_name || 'User'}
              className={styles.avatar}
            />
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{sub.user.full_name || 'Unknown'}</div>
            <div className={styles.userEmail}>{sub.user.email}</div>
          </div>
        </div>
      ) : (
        <span className={styles.emptyCell}>N/A</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      sortable: true,
      render: (sub) => {
        const statusLabels: Record<string, string> = {
          trialing: 'trialing',
          active: 'active',
          canceled: 'canceled',
          past_due: 'past_due',
          incomplete: 'incomplete',
          unpaid: 'unpaid',
        };

        return (
          <span className={styles.statusText}>
            {statusLabels[sub.status] || sub.status}
          </span>
        );
      },
    },
    {
      key: 'trial_start',
      label: 'Trial Start',
      width: '110px',
      sortable: true,
      render: (sub) => {
        return sub.trial_start ? (
          <span className={styles.dateCell}>{formatDateUtil(sub.trial_start)}</span>
        ) : (
          <span className={styles.emptyCell}>—</span>
        );
      },
    },
    {
      key: 'trial_end',
      label: 'Trial End',
      width: '110px',
      sortable: true,
      render: (sub) => {
        if (!sub.trial_end) return <span className={styles.emptyCell}>—</span>;

        const daysRemaining = calculateDaysRemaining(sub.trial_end);
        const textColor = daysRemaining <= 3 ? '#dc2626' : daysRemaining <= 7 ? '#ea580c' : '#374151';

        return (
          <span className={styles.dateCell} style={{ color: textColor, fontWeight: daysRemaining <= 3 ? 600 : 400 }}>
            {formatDateUtil(sub.trial_end)}
          </span>
        );
      },
    },
    {
      key: 'trial_status',
      label: 'Trial Status',
      width: '110px',
      sortable: false,
      render: (sub) => {
        if (!sub.trial_end) return <span className={styles.emptyCell}>—</span>;

        const daysRemaining = calculateDaysRemaining(sub.trial_end);

        return (
          <div className={styles.trialStatusCell}>
            {daysRemaining > 0 ? (
              <>
                <div className={`${styles.statusDot} ${styles.statusActive}`} />
                <span className={styles.trialDays}>{daysRemaining}d left</span>
              </>
            ) : (
              <>
                <div className={`${styles.statusDot} ${styles.statusExpired}`} />
                <span className={styles.trialExpired}>Expired</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'next_billing',
      label: 'Next Billing',
      width: '130px',
      sortable: true,
      render: (sub) => {
        if (!sub.current_period_end) return <span className={styles.emptyCell}>—</span>;

        return (
          <span className={styles.dateCell}>{formatDateUtil(sub.current_period_end)}</span>
        );
      },
    },
    {
      key: 'questions_used',
      label: 'Questions',
      width: '120px',
      sortable: true,
      render: (sub) => (
        <div className={styles.usageCell}>
          <span className={styles.usageValue}>
            {sub.questions_used.toLocaleString()} / {sub.questions_quota.toLocaleString()}
          </span>
          <div className={styles.usageBar}>
            <div
              className={styles.usageBarFill}
              style={{
                width: `${Math.min((sub.questions_used / sub.questions_quota) * 100, 100)}%`,
                backgroundColor: sub.questions_used >= sub.questions_quota ? '#dc2626' : '#10b981',
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'storage_used_bytes',
      label: 'Storage',
      width: '120px',
      sortable: true,
      render: (sub) => (
        <div className={styles.usageCell}>
          <span className={styles.usageValue}>
            {formatBytes(sub.storage_used_bytes)} / {formatBytes(sub.storage_quota_bytes)}
          </span>
          <div className={styles.usageBar}>
            <div
              className={styles.usageBarFill}
              style={{
                width: `${Math.min((sub.storage_used_bytes / sub.storage_quota_bytes) * 100, 100)}%`,
                backgroundColor: sub.storage_used_bytes >= sub.storage_quota_bytes ? '#dc2626' : '#3b82f6',
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      sortable: false,
      render: (sub) => {
        const isActiveOrTrialing = ['active', 'trialing'].includes(sub.status);
        const isInactive = !['active', 'trialing'].includes(sub.status);

        const resetDisabled = !isInactive;
        const activateDisabled = !!isActiveOrTrialing;

        return (
          <VerticalDotsMenu
            actions={[
              { label: 'View User Profile', onClick: () => window.open(`/profile/${sub.user_id}`, '_blank') },
              {
                label: 'Reset Trial Period',
                disabled: resetDisabled,
                color: '#ea580c',
                title: resetDisabled ? 'No inactive subscription to reset' : 'Delete subscription and allow fresh trial',
                onClick: async () => {
                  if (!confirm(`Reset trial period for "${sub.user?.full_name || sub.user?.email}"?\n\nThis will delete the current subscription record and allow them to start a fresh 14-day trial.`)) return;
                  try {
                    const response = await fetch(`/api/admin/sage/${sub.user_id}/reset-trial`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to reset trial');
                    alert(data.message);
                    refetch();
                  } catch (error: any) {
                    alert(`Error: ${error.message}`);
                  }
                },
              },
              {
                label: 'Force Activate (Free)',
                disabled: activateDisabled,
                color: '#059669',
                title: activateDisabled ? 'Subscription already active' : 'Grant 1 year free access',
                onClick: async () => {
                  if (!confirm(`Force activate subscription for "${sub.user?.full_name || sub.user?.email}"?\n\nThis will grant them free Sage Pro access for 1 year without requiring payment.`)) return;
                  try {
                    const response = await fetch(`/api/admin/sage/${sub.user_id}/force-activate`, { method: 'POST' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to force activate');
                    alert(data.message);
                    refetch();
                  } catch (error: any) {
                    alert(`Error: ${error.message}`);
                  }
                },
              },
              {
                label: 'Reset Usage Quota',
                color: '#3b82f6',
                title: 'Reset questions and storage usage to zero',
                onClick: async () => {
                  if (!confirm(`Reset usage quota for "${sub.user?.full_name || sub.user?.email}"?\n\nThis will reset their questions used and storage used back to 0.`)) return;
                  try {
                    const response = await fetch(`/api/admin/sage/${sub.user_id}/reset-quota`, { method: 'POST' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to reset quota');
                    alert(data.message);
                    refetch();
                  } catch (error: any) {
                    alert(`Error: ${error.message}`);
                  }
                },
              },
              {
                label: 'Delete Subscription',
                color: '#dc2626',
                title: 'Permanently remove subscription record',
                onClick: async () => {
                  if (!confirm(`Delete subscription for "${sub.user?.full_name || sub.user?.email}"?\n\nThis will permanently remove the subscription record. They will need to start a new trial.${sub.stripe_subscription_id ? '\n\nWARNING: This will NOT cancel the Stripe subscription. You must do that manually in Stripe dashboard.' : ''}`)) return;
                  try {
                    const response = await fetch(`/api/admin/sage/${sub.user_id}/subscription`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Failed to delete subscription');
                    alert(data.message);
                    refetch();
                  } catch (error: any) {
                    alert(`Error: ${error.message}`);
                  }
                },
              },
            ]}
          />
        );
      },
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Export Selected',
      value: 'export',
      onClick: () => {
        const selectedSubs = subscriptions.filter(sub => selectedRows.has(sub.id));
        if (selectedSubs.length === 0) return;

        const columns: CSVColumn<SageProSubscription>[] = [
          { key: 'id', header: 'ID', format: (value) => formatIdForDisplay(value as string) },
          { key: 'user', header: 'User', format: (value: any) => value?.full_name || 'N/A' },
          { key: 'user', header: 'Email', format: (value: any) => value?.email || 'N/A' },
          { key: 'status', header: 'Status' },
          { key: 'questions_used', header: 'Questions Used', format: (value) => String(value || 0) },
        ];

        exportToCSV(selectedSubs, columns, 'selected-sage-subscriptions');
      },
    },
  ];

  return (
    <HubDataTable
      columns={columns}
      data={subscriptions}
      loading={isLoading}
      error={error?.message}
      pagination={{
        page,
        limit,
        total,
        onPageChange: setPage,
        onLimitChange: setLimit,
      }}
      selectable={true}
      selectedRows={selectedRows}
      onSelectionChange={setSelectedRows}
      onSort={(key: string, direction: 'asc' | 'desc') => {
        setSortKey(key);
        setSortDirection(direction);
      }}
      onSearch={setSearchQuery}
      searchPlaceholder="Search by user name or email..."
      onExport={handleExport}
      onRefresh={handleRefresh}
      autoRefreshInterval={ADMIN_TABLE_DEFAULTS.REFRESH_FAST}
      bulkActions={bulkActions}
      emptyMessage="No Sage Pro subscriptions found"
    />
  );
}
