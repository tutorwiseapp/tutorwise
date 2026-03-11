'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ExecutionModeToggle } from './ExecutionModeToggle';
import type { WorkflowProcess } from './types';
import styles from './GoLiveReadiness.module.css';

const LIVE_READY_THRESHOLD = 50;

interface ShadowStats {
  total: number;
  clean: number;
  diverged: number;
  lastRunAt: string | null;
  readyForLive: boolean;
  threshold: number;
  byStatus: Record<string, number>;
}

interface GoLiveReadinessProps {
  process: WorkflowProcess;
  onModeChanged: (newMode: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function GoLiveReadiness({ process, onModeChanged }: GoLiveReadinessProps) {
  const [stats, setStats] = useState<ShadowStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/workflow/processes/${process.id}/shadow-stats`);
      const data = await res.json();
      if (data.success) setStats(data.data as ShadowStats);
    } catch (err) {
      console.warn('[GoLiveReadiness] Failed to fetch shadow stats:', err);
      toast.error('Failed to load shadow stats');
    } finally {
      setLoading(false);
    }
  }, [process.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!stats && loading) {
    return (
      <div className={styles.container}>
        <Loader2 size={14} className={styles.spinner} />
        <span className={styles.loadingText}>Loading shadow stats…</span>
      </div>
    );
  }

  if (!stats) return null;

  const progressPct = Math.min(100, (stats.clean / LIVE_READY_THRESHOLD) * 100);
  const isReady = stats.readyForLive;

  return (
    <div className={`${styles.container} ${isReady ? styles.containerReady : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {isReady
            ? <CheckCircle size={14} className={styles.iconReady} />
            : <AlertTriangle size={14} className={styles.iconPending} />
          }
          <span className={styles.title}>Go-Live Readiness</span>
        </div>
        <button className={styles.refreshBtn} onClick={fetchStats} disabled={loading} title="Refresh">
          {loading ? <Loader2 size={12} className={styles.spinner} /> : <RefreshCw size={12} />}
        </button>
      </div>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${isReady ? styles.progressReady : ''}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <span className={styles.statItem}>
          <span className={styles.statValue}>{stats.clean}</span>
          <span className={styles.statLabel}>/{LIVE_READY_THRESHOLD} clean runs</span>
        </span>
        {stats.diverged > 0 && (
          <span className={`${styles.statItem} ${styles.statDiverged}`}>
            <span className={styles.statValue}>{stats.diverged}</span>
            <span className={styles.statLabel}> divergence{stats.diverged !== 1 ? 's' : ''}</span>
          </span>
        )}
        {stats.total > 0 && (
          <span className={`${styles.statItem} ${styles.statTotal}`}>
            {stats.total} total shadow run{stats.total !== 1 ? 's' : ''}
          </span>
        )}
        {stats.lastRunAt && (
          <span className={`${styles.statItem} ${styles.statMeta}`}>
            last {timeAgo(stats.lastRunAt)}
          </span>
        )}
      </div>

      {/* Status breakdown */}
      {Object.keys(stats.byStatus).length > 0 && (
        <div className={styles.breakdown}>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <span key={status} className={`${styles.chip} ${styles[`chip_${status}`]}`}>
              {count} {status}
            </span>
          ))}
        </div>
      )}

      {/* Readiness verdict */}
      {isReady ? (
        <div className={styles.verdict}>
          <CheckCircle size={12} />
          {LIVE_READY_THRESHOLD}+ clean shadow runs with 0 divergences — ready to go live.
        </div>
      ) : (
        <div className={styles.verdictPending}>
          {stats.diverged > 0
            ? `Resolve ${stats.diverged} divergence${stats.diverged !== 1 ? 's' : ''} before going live.`
            : `${LIVE_READY_THRESHOLD - stats.clean} more clean run${LIVE_READY_THRESHOLD - stats.clean !== 1 ? 's' : ''} needed.`
          }
        </div>
      )}

      {/* ExecutionModeToggle — only show when in shadow mode */}
      {process.execution_mode === 'shadow' && (
        <div className={styles.toggleRow}>
          <ExecutionModeToggle
            processId={process.id}
            processName={process.name}
            currentMode="shadow"
            onModeChanged={(m) => onModeChanged(m)}
          />
        </div>
      )}
    </div>
  );
}
