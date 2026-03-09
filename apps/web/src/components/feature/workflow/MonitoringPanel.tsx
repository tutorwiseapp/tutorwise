'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Activity, Zap, Brain } from 'lucide-react';
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

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
  const [exceptions, setExceptions] = useState<WorkflowException[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflow/exceptions');
      const data = await res.json();
      if (data.success) setExceptions(data.data as WorkflowException[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClaim = useCallback(async (exceptionId: string) => {
    try {
      await fetch(`/api/admin/workflow/exceptions/${exceptionId}/claim`, { method: 'POST' });
      fetchExceptions();
    } catch {
      // ignore
    }
  }, [fetchExceptions]);

  const handleResolve = useCallback(async (exceptionId: string) => {
    const resolution = window.prompt('Resolution notes (optional):');
    if (resolution === null) return; // cancelled
    try {
      await fetch(`/api/admin/workflow/exceptions/${exceptionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      fetchExceptions();
    } catch {
      // ignore
    }
  }, [fetchExceptions]);

  useEffect(() => { fetchExceptions(); }, [fetchExceptions]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <AlertTriangle size={14} />
          Exception Queue
        </div>
        <button className={styles.refreshBtn} onClick={fetchExceptions} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && exceptions.length === 0 && (
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
                  onClick={() => handleClaim(ex.id)}
                >
                  Claim
                </button>
              )}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => handleResolve(ex.id)}
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
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflow/execute?status=running,paused&limit=50');
      const data = await res.json();
      if (data.executions) setExecutions(data.executions as ActiveExecution[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

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
        <button className={styles.refreshBtn} onClick={fetchActive} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && executions.length === 0 && (
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
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflow/health');
      const data = await res.json();
      if (data.success) setHealth(data.data as PlatformHealth);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Zap size={14} />
          Platform Health
        </div>
        <button className={styles.refreshBtn} onClick={fetchHealth} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

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
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workflow/briefing');
      const data = await res.json();
      if (data.success) {
        setBriefing(data.data.briefing);
        setLastFetched(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Brain size={14} />
          Operational Briefing
        </div>
        <button className={styles.refreshBtn} onClick={fetchBriefing} title="Refresh" disabled={loading}>
          <RefreshCw size={12} />
        </button>
      </div>

      {loading && <div className={styles.loading}>Generating briefing…</div>}
      {lastFetched && (
        <div className={styles.briefingTime}>
          Last updated: {formatTime(lastFetched.toISOString())}
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
