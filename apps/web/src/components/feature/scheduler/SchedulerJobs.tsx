/**
 * Filename: src/components/feature/scheduler/SchedulerJobs.tsx
 * Purpose: Jobs tab — shows all cron-style recurring jobs using HubDataTable + VerticalDotsMenu
 */

'use client';

import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { HubDataTable } from '@/components/hub/data';
import type { Column } from '@/components/hub/data';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import type { StatusVariant } from '@/components/admin/badges/StatusBadge';
import styles from './SchedulerJobs.module.css';

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

function getJobStatus(job: JobItem): 'active' | 'paused' | 'failed' {
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'paused';
  return 'active';
}

function getJobStatusVariant(jobStatus: 'active' | 'paused' | 'failed'): StatusVariant {
  switch (jobStatus) {
    case 'active': return 'active';
    case 'paused': return 'neutral';
    case 'failed': return 'error';
  }
}

const JOB_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  failed: 'Failed',
};

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
          <div className={styles.jobTitle}>{row.title}</div>
          {row.endpoint && (
            <div className={styles.jobEndpoint}>
              {row.http_method || 'GET'} {row.endpoint}
            </div>
          )}
          {row.sql_function && (
            <div className={styles.jobEndpoint}>
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
        <code className={styles.cronExpression}>
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
        return (
          <span className={`${styles.typeBadge} ${isHTTP ? styles.typeHttp : styles.typeSql}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => {
        const jobStatus = getJobStatus(row);
        return (
          <StatusBadge
            variant={getJobStatusVariant(jobStatus)}
            label={JOB_STATUS_LABELS[jobStatus]}
            size="sm"
          />
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
          return <span className={styles.lastRunNever}>Never</span>;
        }
        const isOk = row.last_run.status === 'completed';
        return (
          <div className={styles.lastRunWrapper}>
            <span className={`${styles.lastRunStatus} ${isOk ? styles.lastRunOk : styles.lastRunErr}`}>
              {isOk ? 'OK' : 'ERR'}
            </span>
            <span className={styles.lastRunDate}>
              {format(new Date(row.last_run.started_at), 'MMM d HH:mm')}
            </span>
            {row.last_run.duration_ms != null && (
              <span className={styles.lastRunDuration}>{row.last_run.duration_ms}ms</span>
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
          return <span className={styles.nextRunEmpty}>{'\u2014'}</span>;
        }
        return (
          <span className={styles.nextRunText}>
            {format(new Date(row.scheduled_at), 'MMM d HH:mm')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
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
    <div className={styles.emptyState}>
      <Clock size={32} className={styles.emptyIcon} />
      <p className={styles.emptyTitle}>No scheduled jobs</p>
      <p className={styles.emptyDescription}>Run migrations to seed cron jobs as scheduled items.</p>
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
