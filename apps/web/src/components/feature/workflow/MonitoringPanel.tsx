'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle, Activity, Zap, Brain, UserCheck,
  Calendar, FileText, Bot, Users, Bell, Clock, Info,
} from 'lucide-react';
import { HubDataTable } from '@/components/hub/data';
import type { Column } from '@/components/hub/data';
import { HubWidgetCard } from '@/components/hub/content';
import HubStatsCard from '@/components/hub/sidebar/cards/HubStatsCard';
import type { StatRow } from '@/components/hub/sidebar/cards/HubStatsCard';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import type { StatusBadgeColor } from '@/components/admin/badges/StatusBadge';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
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

interface ScheduleItem {
  id: string;
  title: string;
  type: string;
  scheduled_at: string;
  status: string;
  color: string | null;
}

// --- Helpers ---

const SEVERITY_COLORS: Record<string, StatusBadgeColor> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  low: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const PATTERN_COLORS: Record<string, StatusBadgeColor> = {
  supervisor: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  pipeline: { bg: '#e0f2fe', text: '#0891b2', border: '#a5f3fc' },
  swarm: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
};

const SCHEDULE_TYPE_ICONS: Record<string, typeof FileText> = {
  content: FileText,
  agent_run: Bot,
  team_run: Users,
  task: CheckCircle,
  reminder: Bell,
};

const SCHEDULE_TYPE_COLORS: Record<string, StatusBadgeColor> = {
  content: { bg: '#e0f2f1', text: '#0d9488', border: '#99f6e4' },
  agent_run: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  team_run: { bg: '#e0e7ff', text: '#6366f1', border: '#c7d2fe' },
  task: { bg: '#fef3c7', text: '#f59e0b', border: '#fde68a' },
  reminder: { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

function getDayLabel(dt: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

// --- Platform Health (used in sidebar stats card) ---

function useHealthStats() {
  return useQuery({
    queryKey: ['workflow-health'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/health');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load health');
      return data.data as PlatformHealth;
    },
    staleTime: 60_000,
  });
}

// --- Pending Approvals ---

function PendingApprovals() {
  const queryClient = useQueryClient();

  const { data: approvals = [], isFetching } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/execute?status=awaiting_approval&limit=20');
      const data = await res.json();
      return (data.executions ?? []) as PendingApproval[];
    },
    staleTime: 30_000,
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

  const approvalColumns: Column<PendingApproval>[] = [
    {
      key: 'team_name',
      label: 'Team',
      render: (run) => {
        const ctx = run.execution_context;
        const patternColor = ctx?.pattern ? PATTERN_COLORS[ctx.pattern] : undefined;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {ctx?.team_name ?? 'Unknown team'}
            {ctx?.pattern && patternColor && (
              <StatusBadge variant="neutral" label={ctx.pattern} size="xs" color={patternColor} />
            )}
          </span>
        );
      },
    },
    {
      key: 'task',
      label: 'Task',
      hideOnMobile: true,
      render: (run) => {
        const task = run.execution_context?.task;
        if (!task) return '—';
        return task.length > 100 ? `${task.slice(0, 100)}…` : task;
      },
    },
    {
      key: 'started_at',
      label: 'Time',
      width: '80px',
      render: (run) => timeAgo(run.started_at),
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (run) => {
        const ctx = run.execution_context;
        const teamId = ctx?.team_id ?? '';
        const actions: MenuAction[] = [
          {
            label: 'Approve',
            onClick: () => resumeMutation.mutate({ runId: run.id, teamId, approved: true }),
            disabled: resumeMutation.isPending,
            color: '#16a34a',
          },
          {
            label: 'Reject',
            onClick: () => resumeMutation.mutate({ runId: run.id, teamId, approved: false }),
            variant: 'danger',
            disabled: resumeMutation.isPending,
          },
        ];
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  return (
    <HubWidgetCard
      title="Pending Approval"
      icon={UserCheck}
      badge={approvals.length}
      badgeVariant="amber"
      flush
    >
      <HubDataTable<PendingApproval>
        compact
        columns={approvalColumns}
        data={approvals}
        loading={isFetching && approvals.length === 0}
        emptyMessage="No runs awaiting approval"
      />
    </HubWidgetCard>
  );
}

// --- Exception Queue ---

function ExceptionQueue() {
  const queryClient = useQueryClient();

  const { data: exceptions = [], isFetching } = useQuery({
    queryKey: ['workflow-exceptions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/exceptions');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load exceptions');
      return data.data as WorkflowException[];
    },
    staleTime: 30_000,
  });

  const exceptionAction = useMutation({
    mutationFn: async ({ id, action, resolution }: {
      id: string;
      action: 'claim' | 'resolve' | 'dismiss' | 'escalate';
      resolution?: string;
    }) => {
      const res = await fetch(`/api/admin/workflow/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Action failed');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-exceptions'] }),
  });

  const exceptionColumns: Column<WorkflowException>[] = [
    {
      key: 'severity',
      label: 'Severity',
      width: '90px',
      render: (ex) => {
        const color = SEVERITY_COLORS[ex.severity] ?? SEVERITY_COLORS.low;
        return <StatusBadge variant="neutral" label={ex.severity} size="sm" color={color} />;
      },
    },
    {
      key: 'title',
      label: 'Issue',
      render: (ex) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{ex.title}</div>
          {ex.description && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {ex.description.length > 80 ? `${ex.description.slice(0, 80)}…` : ex.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      width: '100px',
      hideOnMobile: true,
      render: (ex) => ex.source.replace(/_/g, ' '),
    },
    {
      key: 'created_at',
      label: 'Time',
      width: '80px',
      render: (ex) => timeAgo(ex.created_at),
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (ex) => {
        const actions: MenuAction[] = [];
        if (!ex.claimed_by) {
          actions.push({
            label: 'Claim',
            onClick: () => exceptionAction.mutate({ id: ex.id, action: 'claim' }),
            disabled: exceptionAction.isPending,
          });
        }
        actions.push({
          label: 'Resolve',
          onClick: () => {
            const resolution = window.prompt('Resolution notes (optional):');
            if (resolution === null) return;
            exceptionAction.mutate({ id: ex.id, action: 'resolve', resolution });
          },
          disabled: exceptionAction.isPending,
          color: '#006c67',
        });
        actions.push({
          label: 'Dismiss',
          onClick: () => exceptionAction.mutate({ id: ex.id, action: 'dismiss' }),
          disabled: exceptionAction.isPending,
        });
        if (ex.severity === 'critical' || ex.severity === 'high') {
          actions.push({
            label: 'Escalate',
            onClick: () => exceptionAction.mutate({ id: ex.id, action: 'escalate' }),
            variant: 'danger',
            disabled: exceptionAction.isPending,
          });
        }
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  return (
    <HubWidgetCard
      title="Exception Queue"
      icon={AlertTriangle}
      badge={exceptions.length}
      badgeVariant="red"
      flush
    >
      <HubDataTable<WorkflowException>
        compact
        columns={exceptionColumns}
        data={exceptions}
        loading={isFetching && exceptions.length === 0}
        emptyMessage="No unresolved exceptions"
      />
    </HubWidgetCard>
  );
}

// --- Active Workflows ---

function ActiveWorkflows() {
  const { data: executions = [], isFetching } = useQuery({
    queryKey: ['active-executions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/execute?status=running,paused&limit=50');
      const data = await res.json();
      return (data.executions ?? []) as ActiveExecution[];
    },
    staleTime: 30_000,
  });

  const executionColumns: Column<ActiveExecution>[] = [
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      render: (ex) => (
        <StatusBadge
          variant={ex.status === 'running' ? 'processing' : 'pending'}
          label={ex.status}
          size="sm"
        />
      ),
    },
    {
      key: 'id',
      label: 'Execution',
      render: (ex) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {ex.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      key: 'started_at',
      label: 'Started',
      width: '80px',
      render: (ex) => timeAgo(ex.started_at),
    },
    {
      key: 'shadow',
      label: '',
      width: '60px',
      render: (ex) => ex.is_shadow
        ? <StatusBadge variant="info" label="Shadow" size="xs" color={{ bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' }} />
        : null,
    },
  ];

  return (
    <HubWidgetCard
      title="Active Workflows"
      icon={Activity}
      badge={executions.length}
      flush
    >
      <HubDataTable<ActiveExecution>
        compact
        columns={executionColumns}
        data={executions}
        loading={isFetching && executions.length === 0}
        emptyMessage="No active executions"
      />
    </HubWidgetCard>
  );
}

// --- Operational Briefing ---

function OperationalBriefing() {
  const { data: briefing, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['workflow-briefing'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/briefing');
      const data = await res.json();
      if (!data.success) throw new Error('Failed to load briefing');
      return data.data.briefing as string;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <HubWidgetCard
      title="Operational Briefing"
      icon={Brain}
      loading={isFetching && !briefing}
    >
      {dataUpdatedAt > 0 && (
        <div className={styles.briefingTime}>
          Last updated: {new Date(dataUpdatedAt).toLocaleString()}
        </div>
      )}
      {briefing ? (
        <div className={styles.briefingText}>{briefing}</div>
      ) : !isFetching ? (
        <div className={styles.widgetEmpty}>No briefing available</div>
      ) : null}
    </HubWidgetCard>
  );
}

// --- Upcoming Schedule ---

function UpcomingSchedule() {
  const { data: items = [], isFetching } = useQuery<ScheduleItem[]>({
    queryKey: ['scheduler-upcoming-monitor'],
    queryFn: async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const params = new URLSearchParams({ from: now.toISOString(), to: end.toISOString() });
      const res = await fetch(`/api/admin/scheduler?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).filter((i: { status: string }) => i.status === 'scheduled').slice(0, 10);
    },
    staleTime: 60_000,
  });

  const grouped = useMemo(() => {
    const groups: { label: string; items: ScheduleItem[] }[] = [];
    const groupMap = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      const dt = new Date(item.scheduled_at);
      const label = getDayLabel(dt);
      if (!groupMap.has(label)) groupMap.set(label, []);
      groupMap.get(label)!.push(item);
    }
    for (const [label, groupItems] of groupMap) {
      groups.push({ label, items: groupItems });
    }
    return groups;
  }, [items]);

  return (
    <HubWidgetCard
      title="Upcoming Schedule"
      icon={Calendar}
      flush
      headerAction={
        <a href="/admin/scheduler" className={styles.viewAllLink}>View all</a>
      }
      loading={isFetching && items.length === 0}
    >
      {items.length === 0 && !isFetching ? (
        <div className={styles.widgetEmpty}>No upcoming items in the next 7 days</div>
      ) : (
        <div className={styles.scheduleList}>
          {grouped.map((group) => (
            <div key={group.label} className={styles.scheduleGroup}>
              <div className={styles.scheduleDayLabel}>{group.label}</div>
              {group.items.map((item) => {
                const Icon = SCHEDULE_TYPE_ICONS[item.type] || FileText;
                const typeColor = SCHEDULE_TYPE_COLORS[item.type] ?? { bg: '#f3f4f6', text: '#6b7280' };
                const dt = new Date(item.scheduled_at);
                const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={item.id} className={styles.scheduleItem}>
                    <div className={styles.scheduleItemIcon}>
                      <Icon size={14} style={{ color: typeColor.text }} />
                    </div>
                    <div className={styles.scheduleItemContent}>
                      <div className={styles.scheduleItemTitle}>{item.title}</div>
                      <div className={styles.scheduleItemMeta}>
                        <StatusBadge variant="neutral" label={item.type.replace(/_/g, ' ')} size="sm" color={typeColor} />
                        <span className={styles.scheduleItemTime}>
                          <Clock size={10} /> {timeStr}
                        </span>
                        <span className={styles.scheduleItemUntil}>{timeUntil(item.scheduled_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </HubWidgetCard>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function MonitoringSidebar() {
  const { data: health } = useHealthStats();

  const healthStats: StatRow[] = [
    { label: 'Running', value: health?.workflows.running ?? 0 },
    { label: 'Failed (24h)', value: health?.workflows.failed24h ?? 0, valueColor: health && health.workflows.failed24h > 0 ? 'red' : 'default' },
    { label: 'Failed Webhooks', value: health?.failedWebhooks ?? 0 },
    { label: 'Shadow Divergences', value: health?.workflows.shadowDivergences ?? 0 },
    { label: 'Pending HITL', value: health?.hitl.pendingCount ?? 0, valueColor: health && health.hitl.pendingCount > 0 ? 'orange' : 'default' },
    { label: 'Open Exceptions', value: health?.exceptions.openCount ?? 0, valueColor: health && health.exceptions.openCount > 0 ? 'red' : 'default' },
  ];

  return (
    <>
      <HubStatsCard title="Platform Health" stats={healthStats} />
      <HubWidgetCard title="Monitoring Help">
        <div className={styles.tipsList}>
          <p><strong>Pending Approval</strong> shows team runs awaiting human review.</p>
          <p><strong>Exception Queue</strong> surfaces failed or stuck workflow executions.</p>
          <p><strong>Active Workflows</strong> tracks all currently running processes.</p>
          <p>Shadow mode runs execute in parallel without affecting live data.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Monitoring Tips">
        <div className={styles.tipsList}>
          <p>Critical exceptions trigger escalation alerts automatically.</p>
          <p>Shadow runs execute in parallel without affecting live data — use to validate before go-live.</p>
          <p>HITL approvals pause team runs until you approve or reject.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}

// --- Main MonitoringPanel ---

export function MonitoringPanel() {
  return (
    <div className={styles.mainContent}>
      <div className={styles.topRow}>
        <PendingApprovals />
        <ExceptionQueue />
        <ActiveWorkflows />
      </div>
      <div className={styles.bottomRow}>
        <UpcomingSchedule />
        <OperationalBriefing />
      </div>
    </div>
  );
}
