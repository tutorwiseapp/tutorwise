'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle, CheckCircle, Activity, Zap, Brain, UserCheck, Calendar, FileText, Bot, Users, Bell } from 'lucide-react';
import styles from './MonitoringPanel.module.css';

// --- Types ---

interface WorkflowException {
  id: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  source_entity_type: string | null;
  source_entity_id: string | null;
  title: string;
  description: string | null;
  context: Record<string, unknown>;
  claimed_by: string | null;
  claimed_at: string | null;
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

interface PendingApproval {
  id: string;
  started_at: string;
  execution_context: {
    team_id: string;
    team_slug: string;
    team_name: string;
    task: string;
    pattern: 'supervisor' | 'pipeline' | 'swarm';
    trigger_type: string;
  } | null;
}

interface PlatformHealth {
  workflows: {
    running: number;
    failed24h: number;
    shadowDivergences: number;
  };
  hitl: {
    pendingCount: number;
  };
  exceptions: {
    openCount: number;
    criticalCount: number;
  };
  failedWebhooks: number;
}

// --- Helpers ---

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: '#991b1b', label: 'Critical' },
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

// --- Pending Approvals Section ---

const PATTERN_LABEL: Record<string, string> = {
  supervisor: 'supervisor',
  pipeline: 'pipeline',
  swarm: 'swarm',
};

function PendingApprovals() {
  const queryClient = useQueryClient();

  const { data: approvals = [], isFetching, refetch } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/execute?status=awaiting_approval&limit=20');
      const data = await res.json();
      return (data.executions ?? []) as PendingApproval[];
    },
    staleTime: 20_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const resumeMutation = useMutation({
    mutationFn: async ({ runId, teamId, approved }: { runId: string; teamId: string; approved: boolean }) => {
      const res = await fetch(`/api/admin/teams/${teamId}/runs/${runId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Resume failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['active-executions'] });
    },
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <UserCheck size={14} />
          Pending Approval
          {approvals.length > 0 && (
            <span className={`${styles.badge} ${styles.badgeAmber}`}>{approvals.length}</span>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {isFetching && approvals.length === 0 && <div className={styles.loading}>Loading…</div>}

      {!isFetching && approvals.length === 0 && (
        <div className={styles.empty}>
          <CheckCircle size={20} className={styles.emptyIcon} />
          No runs awaiting approval
        </div>
      )}

      {approvals.map((run) => {
        const ctx = run.execution_context;
        const teamId = ctx?.team_id ?? '';
        const isThisPending = resumeMutation.isPending && (resumeMutation.variables as { runId: string })?.runId === run.id;

        return (
          <div key={run.id} className={styles.approvalRow}>
            <div className={styles.approvalBody}>
              <div className={styles.approvalTeam}>
                {ctx?.team_name ?? 'Unknown team'}
                {ctx?.pattern && (
                  <span className={`${styles.patternBadge} ${styles[`pattern_${ctx.pattern}` as keyof typeof styles]}`}>
                    {PATTERN_LABEL[ctx.pattern] ?? ctx.pattern}
                  </span>
                )}
              </div>
              {ctx?.task && (
                <div className={styles.approvalTask}>
                  {ctx.task.length > 120 ? `${ctx.task.slice(0, 120)}…` : ctx.task}
                </div>
              )}
              <div className={styles.approvalMeta}>{timeAgo(run.started_at)}</div>
            </div>
            <div className={styles.approvalActions}>
              <button
                className={`${styles.actionBtn} ${styles.approveBtn}`}
                onClick={() => resumeMutation.mutate({ runId: run.id, teamId, approved: true })}
                disabled={isThisPending || resumeMutation.isPending}
              >
                Approve
              </button>
              <button
                className={`${styles.actionBtn} ${styles.rejectBtn}`}
                onClick={() => resumeMutation.mutate({ runId: run.id, teamId, approved: false })}
                disabled={isThisPending || resumeMutation.isPending}
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
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

  const exceptionAction = useMutation({
    mutationFn: async ({ id, action, resolution, resolution_type }: {
      id: string;
      action: 'claim' | 'resolve' | 'dismiss' | 'escalate';
      resolution?: string;
      resolution_type?: string;
    }) => {
      const res = await fetch(`/api/admin/workflow/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution, resolution_type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Action failed');
      }
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
          <div key={ex.id} className={styles.exceptionRow} role="listitem" aria-label={`${sv.label} severity exception: ${ex.title}`}>
            <div className={styles.exceptionSeverity} style={{ background: sv.color }}>
              {sv.label}
            </div>
            <div className={styles.exceptionBody}>
              <div className={styles.exceptionDomain}>{ex.title}</div>
              {ex.description && (
                <div className={styles.exceptionRec}>{ex.description}</div>
              )}
              <div className={styles.exceptionMeta}>
                <span>{ex.source.replace(/_/g, ' ')}</span>
                <span>{timeAgo(ex.created_at)}</span>
              </div>
            </div>
            <div className={styles.exceptionActions}>
              {!ex.claimed_by && (
                <button
                  className={styles.actionBtn}
                  onClick={() => exceptionAction.mutate({ id: ex.id, action: 'claim' })}
                  disabled={exceptionAction.isPending}
                  aria-label={`Claim exception: ${ex.title}`}
                >
                  Claim
                </button>
              )}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => {
                  const resolution = window.prompt('Resolution notes (optional):');
                  if (resolution === null) return;
                  exceptionAction.mutate({ id: ex.id, action: 'resolve', resolution });
                }}
                disabled={exceptionAction.isPending}
                aria-label={`Resolve exception: ${ex.title}`}
              >
                Resolve
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => exceptionAction.mutate({ id: ex.id, action: 'dismiss' })}
                disabled={exceptionAction.isPending}
                aria-label={`Dismiss exception: ${ex.title}`}
              >
                Dismiss
              </button>
              {ex.severity === 'critical' || ex.severity === 'high' ? (
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnEscalate}`}
                  onClick={() => exceptionAction.mutate({ id: ex.id, action: 'escalate' })}
                  disabled={exceptionAction.isPending}
                  aria-label={`Escalate exception: ${ex.title}`}
                >
                  Escalate
                </button>
              ) : null}
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
          <div className={`${styles.healthCard} ${health.workflows.running > 0 ? styles.healthCardOk : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.workflows.running}</div>
            <div className={styles.healthLabel}>Running workflows</div>
          </div>
          <div className={`${styles.healthCard} ${health.workflows.failed24h > 0 ? styles.healthCardWarn : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.workflows.failed24h}</div>
            <div className={styles.healthLabel}>Failed (24h)</div>
          </div>
          <div className={`${styles.healthCard} ${health.failedWebhooks > 0 ? styles.healthCardWarn : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.failedWebhooks}</div>
            <div className={styles.healthLabel}>Failed webhooks (DLQ)</div>
          </div>
          <div className={`${styles.healthCard} ${health.workflows.shadowDivergences > 0 ? styles.healthCardWarn : styles.healthCardOk}`}>
            <div className={styles.healthValue}>{health.workflows.shadowDivergences}</div>
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

// --- Upcoming Schedule ---

const SCHEDULE_TYPE_ICONS: Record<string, typeof FileText> = {
  content: FileText,
  agent_run: Bot,
  team_run: Users,
  task: CheckCircle,
  reminder: Bell,
};

const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  content: '#0d9488',
  agent_run: '#7c3aed',
  team_run: '#6366f1',
  task: '#f59e0b',
  reminder: '#ef4444',
};

function UpcomingSchedule() {
  const { data: items = [], isFetching } = useQuery<Array<{
    id: string; title: string; type: string; scheduled_at: string; status: string; color: string | null;
  }>>({
    queryKey: ['scheduler-upcoming-monitor'],
    queryFn: async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const params = new URLSearchParams({ from: now.toISOString(), to: end.toISOString() });
      const res = await fetch(`/api/admin/scheduler?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).filter((i: { status: string }) => i.status === 'scheduled').slice(0, 5);
    },
    staleTime: 60000,
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Calendar size={14} />
          Upcoming Schedule
        </div>
        <a href="/admin/scheduler" className={styles.viewAllLink} style={{ fontSize: '0.75rem', color: '#0d9488', textDecoration: 'none' }}>
          View all
        </a>
      </div>
      {isFetching && items.length === 0 && <div className={styles.loading}>Loading…</div>}
      {items.length === 0 && !isFetching && <div className={styles.emptyState}>No upcoming items</div>}
      {items.map((item) => {
        const Icon = SCHEDULE_TYPE_ICONS[item.type] || FileText;
        const accentColor = item.color || SCHEDULE_TYPE_COLORS[item.type] || '#6b7280';
        const dt = new Date(item.scheduled_at);
        const timeStr = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return (
          <div key={item.id} className={styles.approvalItem} style={{ borderLeftColor: accentColor }}>
            <div className={styles.approvalMeta}>
              <Icon size={12} style={{ color: accentColor }} />
              <span className={styles.approvalType}>{item.type.replace('_', ' ')}</span>
              <span className={styles.approvalTime}>{timeStr}</span>
            </div>
            <div className={styles.approvalTitle}>{item.title}</div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main MonitoringPanel ---

export function MonitoringPanel() {
  return (
    <div className={styles.container}>
      <div className={styles.columns}>
        <div className={styles.leftCol}>
          <PendingApprovals />
          <ExceptionQueue />
          <ActiveWorkflows />
        </div>
        <div className={styles.rightCol}>
          <UpcomingSchedule />
          <PlatformHealthSection />
          <OperationalBriefing />
        </div>
      </div>
    </div>
  );
}
