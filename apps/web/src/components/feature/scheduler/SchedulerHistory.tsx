/**
 * Filename: src/components/feature/scheduler/SchedulerHistory.tsx
 * Purpose: History tab — execution log using HubDataTable + VerticalDotsMenu
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column, Filter, PaginationConfig } from '@/app/components/hub/data';
import styles from './SchedulerHistory.module.css';

interface RunRecord {
  id: string;
  item_id: string;
  item_title: string;
  item_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  attempt: number;
}

interface SchedulerHistoryProps {
  filterItemId?: string | null;
  onClearFilter?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  content: 'Content',
  agent_run: 'Agent Run',
  team_run: 'Team Run',
  task: 'Task',
  reminder: 'Reminder',
  cron_job: 'HTTP',
  sql_func: 'SQL',
};

const TYPE_COLORS: Record<string, string> = {
  content: '#0d9488',
  agent_run: '#7c3aed',
  team_run: '#6366f1',
  task: '#f59e0b',
  reminder: '#ef4444',
  cron_job: '#2563eb',
  sql_func: '#d97706',
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '\u2014';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export default function SchedulerHistory({ filterItemId, onClearFilter }: SchedulerHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: runs = [], isLoading, refetch } = useQuery<RunRecord[]>({
    queryKey: ['scheduler-runs', filterItemId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterItemId) params.set('item_id', filterItemId);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '200');

      const res = await fetch(`/api/admin/scheduler/runs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch runs');
      const json = await res.json();
      return json.data;
    },
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // Client-side sort
  const sorted = useMemo(() => {
    if (!sortKey) return runs;
    return [...runs].sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;
      if (sortKey === 'started_at') {
        aVal = new Date(a.started_at).getTime();
        bVal = new Date(b.started_at).getTime();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [runs, sortKey, sortDirection]);

  // Paginate
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  const handleSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  const handleFilterChange = useCallback((filterKey: string, value: string | string[]) => {
    if (filterKey === 'status') {
      setStatusFilter(typeof value === 'string' ? value : value[0] || '');
      setPage(1);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const pagination: PaginationConfig = {
    page,
    limit: pageSize,
    total: sorted.length,
    onPageChange: setPage,
  };

  const filters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'All', value: '' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Running', value: 'running' },
      ],
    },
  ];

  const toolbarActions = filterItemId ? (
    <button onClick={onClearFilter} className={styles.filteredBadge}>
      Filtered to one job — clear
    </button>
  ) : undefined;

  const columns: Column<RunRecord>[] = [
    {
      key: 'status',
      label: 'Status',
      width: '60px',
      render: (row) => {
        if (row.status === 'completed') {
          return <CheckCircle2 size={16} className={styles.statusCompleted} />;
        }
        if (row.status === 'failed') {
          return <XCircle size={16} className={styles.statusFailed} />;
        }
        if (row.status === 'running') {
          return <Loader2 size={16} className={styles.statusRunning} />;
        }
        return <Clock size={16} className={styles.statusPending} />;
      },
    },
    {
      key: 'item_title',
      label: 'Item',
      render: (row) => {
        const color = TYPE_COLORS[row.item_type] || '#6b7280';
        return (
          <div className={styles.itemWrapper}>
            <span className={styles.itemTitle}>{row.item_title}</span>
            <span
              className={styles.itemTypeBadge}
              style={{ backgroundColor: `${color}18`, color }}
            >
              {TYPE_LABELS[row.item_type] || row.item_type}
            </span>
          </div>
        );
      },
    },
    {
      key: 'started_at',
      label: 'Started At',
      sortable: true,
      width: '160px',
      hideOnMobile: true,
      render: (row) => (
        <span className={styles.dateText}>
          {format(new Date(row.started_at), 'd MMM yyyy HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'duration_ms',
      label: 'Duration',
      width: '100px',
      hideOnMobile: true,
      render: (row) => (
        <span className={row.duration_ms != null ? styles.durationText : styles.durationEmpty}>
          {formatDuration(row.duration_ms)}
        </span>
      ),
    },
    {
      key: 'attempt',
      label: 'Attempt',
      width: '80px',
      hideOnTablet: true,
      render: (row) => (
        <span className={row.attempt > 1 ? styles.attemptRetry : styles.attemptFirst}>
          {row.attempt}
        </span>
      ),
    },
    {
      key: 'error',
      label: 'Error',
      hideOnTablet: true,
      render: (row) => {
        if (!row.error) {
          return <span className={styles.errorEmpty}>{'\u2014'}</span>;
        }
        return (
          <span className={styles.errorText} title={row.error}>
            {row.error.slice(0, 120)}
          </span>
        );
      },
    },
  ];

  const emptyState = (
    <div className={styles.emptyState}>
      <Clock size={32} className={styles.emptyIcon} />
      <p className={styles.emptyTitle}>No execution history</p>
      <p className={styles.emptyDescription}>Runs will appear here once the scheduler service processes items.</p>
    </div>
  );

  return (
    <HubDataTable<RunRecord>
      columns={columns}
      data={paginated}
      loading={isLoading}
      filters={filters}
      onFilterChange={handleFilterChange}
      onSort={handleSort}
      onRefresh={handleRefresh}
      autoRefreshInterval={15000}
      pagination={pagination}
      emptyState={emptyState}
      searchPlaceholder="Search runs..."
      toolbarActions={toolbarActions}
      getRowId={(row) => row.id}
    />
  );
}
