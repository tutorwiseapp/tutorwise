/**
 * Filename: src/components/feature/scheduler/SchedulerJobs.tsx
 * Purpose: Jobs tab — shows all cron-style recurring jobs using HubDataTable + VerticalDotsMenu
 */

'use client';

import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { HubDataTable } from '@/app/components/hub/data';
import type { Column } from '@/app/components/hub/data';
import VerticalDotsMenu from '@/app/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/app/components/ui/actions/VerticalDotsMenu';

interface JobItem {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduled_at: string;
  recurrence: string | null;
  cron_expression: string | null;
  endpoint: string | null;
  sql_function: string | null;
  http_method: string | null;
  tags: string[];
  last_error: string | null;
  attempt_count: number;
  max_retries: number;
  metadata: Record<string, unknown>;
  last_run?: { started_at: string; status: string; duration_ms: number | null } | null;
}

interface SchedulerJobsProps {
  onViewHistory: (itemId: string) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#dcfce7', text: '#16a34a', label: 'Active' },
  paused: { bg: '#f3f4f6', text: '#6b7280', label: 'Paused' },
  failed: { bg: '#fee2e2', text: '#dc2626', label: 'Failed' },
};

function getJobStatus(job: JobItem): 'active' | 'paused' | 'failed' {
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'paused';
  return 'active';
}

export default function SchedulerJobs({ onViewHistory }: SchedulerJobsProps) {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<JobItem[]>({
    queryKey: ['scheduler-jobs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/scheduler/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = await res.json();
      return json.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pause' | 'resume' }) => {
      const res = await fetch(`/api/admin/scheduler/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'pause' ? 'cancelled' : 'scheduled' }),
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler-items'] });
    },
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
  }, [queryClient]);

  const columns: Column<JobItem>[] = [
    {
      key: 'title',
      label: 'Job Name',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.title}</div>
          {row.endpoint && (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontFamily: 'monospace' }}>
              {row.http_method || 'GET'} {row.endpoint}
            </div>
          )}
          {row.sql_function && (
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontFamily: 'monospace' }}>
              {row.sql_function}()
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'cron_expression',
      label: 'Schedule',
      width: '140px',
      hideOnMobile: true,
      render: (row) => (
        <code
          style={{
            fontSize: '12px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            fontFamily: 'monospace',
          }}
        >
          {row.cron_expression || row.recurrence || '\u2014'}
        </code>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: '80px',
      hideOnMobile: true,
      render: (row) => {
        const isHTTP = row.type === 'cron_job';
        const label = isHTTP ? 'HTTP' : row.type === 'sql_func' ? 'SQL' : row.type;
        const color = isHTTP ? '#2563eb' : '#d97706';
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: `${color}18`,
              color,
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (row) => {
        const jobStatus = getJobStatus(row);
        const config = STATUS_CONFIG[jobStatus];
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: config.bg,
              color: config.text,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'last_run',
      label: 'Last Run',
      width: '160px',
      hideOnTablet: true,
      render: (row) => {
        if (!row.last_run) {
          return <span style={{ fontSize: '13px', color: '#9ca3af' }}>Never</span>;
        }
        const statusColor = row.last_run.status === 'completed' ? '#16a34a' : '#dc2626';
        const statusLabel = row.last_run.status === 'completed' ? 'OK' : 'ERR';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '1px 4px',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: `${statusColor}18`,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
            <span style={{ color: '#4b5563' }}>
              {format(new Date(row.last_run.started_at), 'MMM d HH:mm')}
            </span>
            {row.last_run.duration_ms != null && (
              <span style={{ color: '#9ca3af', fontSize: '11px' }}>{row.last_run.duration_ms}ms</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'scheduled_at',
      label: 'Next Run',
      width: '120px',
      hideOnTablet: true,
      render: (row) => {
        const jobStatus = getJobStatus(row);
        if (jobStatus !== 'active') {
          return <span style={{ fontSize: '13px', color: '#9ca3af' }}>{'\u2014'}</span>;
        }
        return (
          <span style={{ fontSize: '13px', color: '#4b5563' }}>
            {format(new Date(row.scheduled_at), 'MMM d HH:mm')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (row) => {
        const jobStatus = getJobStatus(row);
        const actions: MenuAction[] = [];

        if (jobStatus === 'active') {
          actions.push({
            label: 'Pause',
            onClick: () => toggleMutation.mutate({ id: row.id, action: 'pause' }),
          });
        }
        if (jobStatus === 'paused' || jobStatus === 'failed') {
          actions.push({
            label: 'Resume',
            onClick: () => toggleMutation.mutate({ id: row.id, action: 'resume' }),
          });
        }
        actions.push({
          label: 'View History',
          onClick: () => onViewHistory(row.id),
        });
        actions.push({
          label: 'Edit',
          onClick: () => {},
          disabled: true,
          title: 'Coming soon',
        });

        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  const emptyState = (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6b7280' }}>
      <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
      <p style={{ fontWeight: 500, marginBottom: '4px' }}>No scheduled jobs</p>
      <p style={{ fontSize: '13px' }}>Run migrations to seed cron jobs as scheduled items.</p>
    </div>
  );

  return (
    <HubDataTable<JobItem>
      columns={columns}
      data={jobs}
      loading={isLoading}
      searchPlaceholder="Search jobs..."
      onSearch={() => {}}
      onRefresh={handleRefresh}
      autoRefreshInterval={30000}
      emptyState={emptyState}
      getRowId={(row) => row.id}
    />
  );
}
