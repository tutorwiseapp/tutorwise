/**
 * Filename: src/components/feature/workflow/ExecutionList.tsx
 * Purpose: Workflow execution list using HubDataTable
 * Updated: 2026-03-14 - Migrated from custom div list to HubDataTable
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Clock, Play, Pause, CheckCircle, XCircle } from 'lucide-react';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import type { StatusVariant } from '@/components/admin/badges/StatusBadge';
import styles from './ExecutionList.module.css';

export interface WorkflowExecution {
  id: string;
  process_id: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  is_shadow: boolean;
  execution_context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  process?: { name: string; category: string; execution_mode?: string } | null;
}

type StatusFilter = 'all' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface ExecutionListProps {
  executions: WorkflowExecution[];
  isLoading: boolean;
  statusFilter: StatusFilter;
  selectedId: string | null;
  onFilterChange: (f: StatusFilter) => void;
  onSelect: (execution: WorkflowExecution) => void;
  toolbarActions?: React.ReactNode;
  emptyState?: React.ReactNode;
}

function formatDuration(startedAt: string, completedAt: string | null) {
  const end = completedAt ? new Date(completedAt) : new Date();
  const seconds = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running': return <Play size={14} className={styles.iconRunning} />;
    case 'paused': return <Pause size={14} className={styles.iconPaused} />;
    case 'completed': return <CheckCircle size={14} className={styles.iconDone} />;
    case 'failed': return <XCircle size={14} className={styles.iconFailed} />;
    case 'cancelled': return <XCircle size={14} className={styles.iconCancelled} />;
    default: return <Clock size={14} />;
  }
}

function getStatusBadgeVariant(status: string): StatusVariant {
  switch (status) {
    case 'running': return 'processing';
    case 'paused': return 'pending';
    case 'completed': return 'completed';
    case 'failed': return 'error';
    case 'cancelled': return 'cancelled';
    default: return 'neutral';
  }
}

const STATUS_LABEL_MAP: Record<string, string> = {
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const filters: Filter[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Running', value: 'running' },
      { label: 'Paused', value: 'paused' },
      { label: 'Completed', value: 'completed' },
      { label: 'Failed', value: 'failed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

export function ExecutionList({
  executions,
  isLoading,
  statusFilter,
  selectedId: _selectedId,
  onFilterChange,
  onSelect,
  toolbarActions,
  emptyState: emptyStateOverride,
}: ExecutionListProps) {
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  const handleFilterChange = useCallback(
    (filterKey: string, value: string | string[]) => {
      if (filterKey === 'status') {
        const v = typeof value === 'string' ? value : value[0] || 'all';
        onFilterChange(v as StatusFilter);
      }
    },
    [onFilterChange],
  );

  const columns: Column<WorkflowExecution>[] = useMemo(
    () => [
      {
        key: 'statusIcon',
        label: '',
        width: '40px',
        render: (row) => <StatusIcon status={row.status} />,
      },
      {
        key: 'executionId',
        label: 'Execution',
        render: (row) => (
          <span className={styles.execId}>{row.id.slice(0, 8)}</span>
        ),
      },
      {
        key: 'startedAt',
        label: 'Started',
        width: '150px',
        hideOnMobile: true,
        render: (row) => (
          <span className={styles.startedAt}>
            {new Date(row.started_at).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'duration',
        label: 'Duration',
        width: '100px',
        hideOnMobile: true,
        render: (row) => (
          <span className={styles.durationText}>
            {formatDuration(row.started_at, row.completed_at)}
          </span>
        ),
      },
      {
        key: 'mode',
        label: 'Mode',
        width: '80px',
        hideOnMobile: true,
        render: (row) =>
          row.is_shadow ? (
            <span className={styles.shadowBadge}>shadow</span>
          ) : (
            <span className={styles.liveBadge}>live</span>
          ),
      },
      {
        key: 'status',
        label: 'Status',
        width: '110px',
        render: (row) => (
          <StatusBadge
            variant={getStatusBadgeVariant(row.status)}
            label={STATUS_LABEL_MAP[row.status] || row.status}
            size="sm"
          />
        ),
      },
    ],
    [],
  );

  const defaultEmpty = (
    <div className={styles.emptyState}>
      <Clock size={32} className={styles.emptyIcon} />
      <p className={styles.emptyTitle}>No executions found</p>
      <p className={styles.emptyDescription}>
        Workflow executions will appear here once processes are started.
      </p>
    </div>
  );

  const emptyState = emptyStateOverride ?? defaultEmpty;

  return (
    <HubDataTable<WorkflowExecution>
      columns={columns}
      data={filtered}
      loading={isLoading}
      filters={filters}
      onFilterChange={handleFilterChange}
      onRowClick={onSelect}
      emptyState={emptyState}
      searchPlaceholder="Search executions..."
      getRowId={(row) => row.id}
      toolbarActions={toolbarActions}
    />
  );
}
