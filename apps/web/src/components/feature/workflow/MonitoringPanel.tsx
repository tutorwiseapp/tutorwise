'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle, CheckCircle, Activity, Zap, Brain } from 'lucide-react';
import styles from './MonitoringPanel.module.css';

// --- Types ---

interface WorkflowException {
  id: string;
  execution_id: string | null;
  severity: 'high' | 'medium' | 'low';
  domain: string;
  ai_recommendation: string | null;
  confidence_score: number | null;
  evidence_count: number | null;
  claimed_by: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface ActiveExecution {
  id: string;
  process_id: string;
  status: string;
  started_at: string;
  is_shadow: boolean;
  execution_context: Record<string, unknown> | null;
  process_name?: string;
}

interface PlatformHealth {
  failedWebhooks: number;
  shadowDivergences: number;
}

// --- Helpers ---

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: '#dc2626', label: 'High' },
  medium: { color: '#d97706', label: 'Medium' },
  low: { color: '#16a34a', label: 'Low' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// --- Exception Queue Section ---

function ExceptionQueue() {
  const queryClient = useQueryClient();

  const { data: exceptions = [], isFetching, refetch } = useQuery({
    queryKey: ['workflow-exceptions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/exceptions');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load exceptions');
      return data.data as WorkflowException[];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const claimMutation = useMutation({
    mutationFn: (exceptionId: string) =>
      fetch(`/api/admin/workflow/exceptions/${exceptionId}/claim`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-exceptions'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const resolution = window.prompt('Resolution notes (optional):');
      if (resolution === null) throw new Error('cancelled');
      await fetch(`/api/admin/workflow/exceptions/${exceptionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-exceptions'] }),
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <AlertTriangle size={14} />
          Exception Queue
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {isFetching && exceptions.length === 0 && <div className={styles.loading}>Loading…</div>}

      {!isFetching && exceptions.length === 0 && (
        <div className={styles.empty}>
          <CheckCircle size={20} className={styles.emptyIcon} />
          No unresolved exceptions
        </div>
      )}

      {exceptions.map((ex) => {
        const sv = SEVERITY_CONFIG[ex.severity] ?? SEVERITY_CONFIG.low;
        return (
          <div key={ex.id} className={styles.exceptionRow}>
            <div className={styles.exceptionSeverity} style={{ background: sv.color }}>
              {sv.label}
            </div>
            <div className={styles.exceptionBody}>
              <div className={styles.exceptionDomain}>{ex.domain}</div>
              {ex.ai_recommendation && (
                <div className={styles.exceptionRec}>{ex.ai_recommendation}</div>
              )}
              <div className={styles.exceptionMeta}>
                {ex.confidence_score != null && (
                  <span>Confidence: {ex.confidence_score}%</span>
                )}
                {ex.evidence_count != null && (
                  <span>{ex.evidence_count} signals</span>
                )}
                <span>{timeAgo(ex.created_at)}</span>
              </div>
            </div>
            <div className={styles.exceptionActions}>
              {!ex.claimed_by && (
                <button
                  className={styles.actionBtn}
                  onClick={() => claimMutation.mutate(ex.id)}
                  disabled={claimMutation.isPending}
                >
                  Claim
                </button>
              )}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => resolveMutation.mutate(ex.id)}
                disabled={resolveMutation.isPending}
              >
                Resolve
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Active Workflows Section ---

function ActiveWorkflows() {
  const { data: executions = [], isFetching, refetch } = useQuery({
    queryKey: ['active-executions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/execute?status=running,paused&limit=50');
      const data = await res.json();
      return (data.executions ?? []) as ActiveExecution[];
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Activity size={14} />
          Active Workflows
          {executions.length > 0 && (
            <span className={styles.badge}>{executions.length}</span>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {isFetching && executions.length === 0 && <div className={styles.loading}>Loading…</div>}

      {!isFetching && executions.length === 0 && (
        <div className={styles.empty}>No active executions</div>
      )}

      {executions.map((ex) => (
        <div key={ex.id} className={styles.executionRow}>
          <div className={styles.executionStatus}>
            <span
              className={styles.statusDot}
              style={{ background: ex.status === 'running' ? '#3b82f6' : '#f59e0b' }}
            />
            {ex.status}
          </div>
          <div className={styles.executionInfo}>
            <div className={styles.executionId}>{ex.id.slice(0, 8)}…</div>
            <div className={styles.executionTime}>{timeAgo(ex.started_at)}</div>
          </div>
          {ex.is_shadow && <span className={styles.shadowBadge}>Shadow</span>}
        </div>
      ))}
    </div>
  );
}

// --- Platform Health Section ---

function PlatformHealthSection() {
  const { data: health, isFetching, refetch } = useQuery({
    queryKey: ['workflow-health'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/health');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load health');
      return data.data as PlatformHealth;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Zap size={14} />
          Platform Health
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {isFetching && !health && <div className={styles.loading}>Loading…</div>}

      {health && (
        <div className={styles.healthGrid}>
          <div className={`${styles.healthCard} ${health.failedWebhooks > 0 ? styles.healthCardWarn : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.failedWebhooks}</div>
            <div className={styles.healthLabel}>Failed webhooks (DLQ)</div>
          </div>
          <div className={`${styles.healthCard} ${health.shadowDivergences > 0 ? styles.healthCardWarn : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.shadowDivergences}</div>
            <div className={styles.healthLabel}>Shadow divergences</div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Operational Briefing Section ---

function OperationalBriefing() {
  const { data: briefing, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['workflow-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/briefing');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load briefing');
      return data.data.briefing as string;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Brain size={14} />
          Operational Briefing
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Refresh" disabled={isFetching}>
          <RefreshCw size={12} />
        </button>
      </div>

      {isFetching && !briefing && <div className={styles.loading}>Generating briefing…</div>}
      {dataUpdatedAt > 0 && (
        <div className={styles.briefingTime}>
          Last updated: {new Date(dataUpdatedAt).toLocaleString()}
        </div>
      )}
      {briefing && (
        <div className={styles.briefingText}>{briefing}</div>
      )}
    </div>
  );
}

// --- Main MonitoringPanel ---

export function MonitoringPanel() {
  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        <div className={styles.leftCol}>
          <ExceptionQueue />
          <ActiveWorkflows />
        </div>
        <div className={styles.rightCol}>
          <PlatformHealthSection />
          <OperationalBriefing />
        </div>
      </div>
    </div>
  );
}
