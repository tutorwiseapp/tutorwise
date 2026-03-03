'use client';

import { Loader2, RefreshCw, Clock, CheckCircle, XCircle, Pause, Play } from 'lucide-react';
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
  onRefresh: () => void;
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Done' },
  { value: 'failed', label: 'Failed' },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running': return <Play size={12} className={styles.iconRunning} />;
    case 'paused': return <Pause size={12} className={styles.iconPaused} />;
    case 'completed': return <CheckCircle size={12} className={styles.iconDone} />;
    case 'failed': return <XCircle size={12} className={styles.iconFailed} />;
    case 'cancelled': return <XCircle size={12} className={styles.iconCancelled} />;
    default: return <Clock size={12} />;
  }
}

function formatDuration(startedAt: string, completedAt: string | null) {
  const end = completedAt ? new Date(completedAt) : new Date();
  const seconds = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function ExecutionList({
  executions,
  isLoading,
  statusFilter,
  selectedId,
  onFilterChange,
  onSelect,
  onRefresh,
}: ExecutionListProps) {
  const filtered = statusFilter === 'all'
    ? executions
    : executions.filter((e) => e.status === statusFilter);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterChip} ${statusFilter === f.value ? styles.filterActive : ''}`}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className={styles.refreshButton} onClick={onRefresh} title="Refresh">
          {isLoading ? (
            <Loader2 size={14} className={styles.spinner} />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      <div className={styles.list}>
        {isLoading && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Loader2 size={20} className={styles.spinner} />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className={styles.emptyState}>No executions found.</div>
        )}

        {filtered.map((execution) => (
          <button
            key={execution.id}
            className={`${styles.row} ${selectedId === execution.id ? styles.rowSelected : ''}`}
            onClick={() => onSelect(execution)}
          >
            <div className={styles.rowLeft}>
              <StatusIcon status={execution.status} />
              <div className={styles.rowInfo}>
                <span className={styles.processName}>
                  {execution.process?.name ?? 'Unknown Process'}
                </span>
                <span className={styles.execMeta}>
                  {execution.is_shadow && <span className={styles.shadowBadge}>shadow</span>}
                  {formatDuration(execution.started_at, execution.completed_at)}
                </span>
              </div>
            </div>
            <span className={`${styles.statusBadge} ${styles[`status_${execution.status}`]}`}>
              {execution.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
