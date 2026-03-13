/**
 * Filename: src/components/feature/scheduler/SchedulerHistory.tsx
 * Purpose: History tab — execution log from scheduler_runs table
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
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

export default function SchedulerHistory({ filterItemId, onClearFilter }: SchedulerHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: runs = [], isLoading } = useQuery<RunRecord[]>({
    queryKey: ['scheduler-runs', filterItemId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterItemId) params.set('item_id', filterItemId);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/scheduler/runs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch runs');
      const json = await res.json();
      return json.data;
    },
    staleTime: 15000,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading history...</div>;
  }

  return (
    <div className={styles.historyPanel}>
      {/* Filters */}
      <div className={styles.filters}>
        {filterItemId && (
          <button className={styles.clearFilter} onClick={onClearFilter}>
            Showing runs for one job — clear filter
          </button>
        )}
        <div className={styles.statusFilters}>
          {['', 'completed', 'failed', 'running'].map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {runs.length === 0 ? (
        <div className={styles.emptyState}>
          <Clock size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No execution history</p>
          <p className={styles.emptyDescription}>Runs will appear here once the scheduler service processes items.</p>
        </div>
      ) : (
        <div className={styles.runsList}>
          {runs.map((run) => (
            <div key={run.id} className={`${styles.runRow} ${styles[`run_${run.status}`]}`}>
              <div className={styles.runIcon}>
                {run.status === 'completed' && <CheckCircle2 size={16} className={styles.iconSuccess} />}
                {run.status === 'failed' && <XCircle size={16} className={styles.iconFailed} />}
                {run.status === 'running' && <Loader2 size={16} className={styles.iconRunning} />}
              </div>

              <div className={styles.runInfo}>
                <div className={styles.runTitle}>{run.item_title}</div>
                <div className={styles.runMeta}>
                  <span className={`${styles.typeBadge} ${styles[`type_${run.item_type}`]}`}>
                    {run.item_type === 'cron_job' ? 'HTTP' : run.item_type === 'sql_func' ? 'SQL' : run.item_type}
                  </span>
                  {run.attempt > 1 && <span className={styles.attempt}>Attempt {run.attempt}</span>}
                </div>
              </div>

              <div className={styles.runTime}>
                <div className={styles.startTime}>{format(new Date(run.started_at), 'MMM d HH:mm:ss')}</div>
                {run.duration_ms != null && (
                  <div className={styles.duration}>
                    {run.duration_ms > 1000
                      ? `${(run.duration_ms / 1000).toFixed(1)}s`
                      : `${run.duration_ms}ms`}
                  </div>
                )}
              </div>

              {run.error && (
                <div className={styles.runError}>
                  {run.error.slice(0, 200)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
