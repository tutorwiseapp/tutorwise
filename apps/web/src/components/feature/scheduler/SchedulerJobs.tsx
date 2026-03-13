/**
 * Filename: src/components/feature/scheduler/SchedulerJobs.tsx
 * Purpose: Jobs tab — shows all cron-style recurring jobs with status, schedule, last/next run
 */

'use client';

import { Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Play, Pause, Clock, Terminal, Globe, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import Button from '@/app/components/ui/actions/Button';
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

  if (isLoading) {
    return <div className={styles.loading}>Loading jobs...</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Clock size={32} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No scheduled jobs</p>
        <p className={styles.emptyDescription}>Run migrations to seed cron jobs as scheduled items.</p>
      </div>
    );
  }

  return (
    <div className={styles.jobsTable}>
      <div className={styles.header}>
        <span className={styles.colName}>Job</span>
        <span className={styles.colSchedule}>Schedule</span>
        <span className={styles.colType}>Type</span>
        <span className={styles.colStatus}>Status</span>
        <span className={styles.colLastRun}>Last Run</span>
        <span className={styles.colNextRun}>Next Run</span>
        <span className={styles.colActions}>Actions</span>
      </div>

      {jobs.map((job) => {
        const isActive = job.status === 'scheduled' || job.status === 'in_progress';
        const isFailed = job.status === 'failed';
        const isPaused = job.status === 'cancelled';

        return (
          <Fragment key={job.id}>
          <div className={`${styles.row} ${isPaused ? styles.paused : ''} ${isFailed ? styles.failed : ''}`}>
            <div className={styles.colName}>
              <div className={styles.jobTitle}>{job.title}</div>
              <div className={styles.jobTarget}>
                {job.endpoint && (
                  <span className={styles.endpoint}>
                    <Globe size={10} />
                    {job.http_method || 'GET'} {job.endpoint}
                  </span>
                )}
                {job.sql_function && (
                  <span className={styles.endpoint}>
                    <Terminal size={10} />
                    {job.sql_function}()
                  </span>
                )}
              </div>
            </div>

            <div className={styles.colSchedule}>
              <code className={styles.cronExpr}>{job.cron_expression || job.recurrence || '—'}</code>
            </div>

            <div className={styles.colType}>
              <span className={`${styles.typeBadge} ${styles[`type_${job.type}`]}`}>
                {job.type === 'cron_job' ? 'HTTP' : job.type === 'sql_func' ? 'SQL' : job.type}
              </span>
            </div>

            <div className={styles.colStatus}>
              {isActive && (
                <span className={styles.statusActive}>
                  <CheckCircle2 size={12} />
                  Active
                </span>
              )}
              {isPaused && (
                <span className={styles.statusPaused}>
                  <Pause size={12} />
                  Paused
                </span>
              )}
              {isFailed && (
                <span className={styles.statusFailed}>
                  <AlertCircle size={12} />
                  Failed
                </span>
              )}
            </div>

            <div className={styles.colLastRun}>
              {job.last_run ? (
                <div className={styles.lastRun}>
                  <span className={`${styles.runStatus} ${styles[`run_${job.last_run.status}`]}`}>
                    {job.last_run.status === 'completed' ? 'OK' : 'ERR'}
                  </span>
                  <span className={styles.runTime}>
                    {format(new Date(job.last_run.started_at), 'MMM d HH:mm')}
                  </span>
                  {job.last_run.duration_ms != null && (
                    <span className={styles.runDuration}>{job.last_run.duration_ms}ms</span>
                  )}
                </div>
              ) : (
                <span className={styles.noRun}>Never</span>
              )}
            </div>

            <div className={styles.colNextRun}>
              {isActive ? (
                <span className={styles.nextTime}>
                  {format(new Date(job.scheduled_at), 'MMM d HH:mm')}
                </span>
              ) : (
                <span className={styles.noRun}>—</span>
              )}
            </div>

            <div className={styles.colActions}>
              {isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: job.id, action: 'pause' })}
                  title="Pause job"
                >
                  <Pause size={14} />
                </Button>
              )}
              {(isPaused || isFailed) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: job.id, action: 'resume' })}
                  title="Resume job"
                >
                  <Play size={14} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewHistory(job.id)}
                title="View history"
              >
                <RotateCw size={14} />
              </Button>
            </div>

          </div>
          {isFailed && job.last_error && (
            <div className={styles.errorRow}>
              <AlertCircle size={12} />
              <span>{job.last_error}</span>
            </div>
          )}
          </Fragment>
        );
      })}
    </div>
  );
}
