/*
 * Filename: src/app/(admin)/admin/operations/page.tsx
 * Purpose: Admin Operations — daily brief, platform health, exception queue, agent status
 * Created: 2026-03-11
 */
'use client';

import React, { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, ArrowUp, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import type { IntentResult } from '@/lib/conductor/IntentDetector';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type TabFilter = 'overview' | 'exceptions' | 'agents';

interface HealthData {
  workflows: {
    running: number;
    failed24h: number;
    shadowDivergences: number;
  };
  hitl: {
    pendingCount: number;
    pendingTasks: Array<{ id: string; name: string; execution_id: string; created_at: string }>;
  };
  exceptions: {
    openCount: number;
    criticalCount: number;
    recent: Array<{
      id: string;
      title: string;
      severity: string;
      source: string;
      created_at: string;
    }>;
  };
  agents: {
    active: Array<{ slug: string; name: string; status: string; last_run_at: string | null }>;
    recentRuns24h: Array<{ id: string; agent_slug: string; status: string; created_at: string }>;
  };
  teams: {
    recentRuns24h: Array<{ id: string; team_id: string; status: string; created_at: string; team: { name: string } | null }>;
  };
}

interface BriefData {
  date: string;
  brief: string;
  generatedAt: string;
}

interface ExceptionItem {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  source: string;
  status: string;
  claimed_by: string | null;
  claimed_by_profile: { full_name: string } | null;
  created_at: string;
}

const QUICK_ACTIONS = [
  { label: 'Show at-risk tutors', command: 'Show at-risk tutors' },
  { label: 'Platform health', command: 'Show platform health overview' },
  { label: 'Run commission payout', command: 'Run commission payout' },
  { label: 'Referral analytics', command: 'Show referral analytics' },
  { label: 'Booking pipeline', command: 'Show booking pipeline health' },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminOperationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'overview';

  const handleTabChange = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/admin/operations${params.toString() ? `?${params.toString()}` : ''}`);
  }, [router, searchParams]);

  // Health data — core operational pulse, poll every 30s, always fresh on mount/focus
  const { data: healthData, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ['admin', 'operations', 'health'],
    queryFn: async () => {
      const res = await fetch('/api/admin/operations/health');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 20_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  // Brief — AI-generated, expensive; stale 30min, passive poll 30min, revalidate on focus; only fetch on overview tab
  const { data: briefData, isLoading: briefLoading, isFetching: briefFetching } = useQuery<BriefData>({
    queryKey: ['admin', 'operations', 'brief'],
    queryFn: async () => {
      const res = await fetch('/api/admin/operations/brief');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: tabFilter === 'overview',
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 60_000,
  });

  const refreshBrief = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/operations/brief?refresh=true');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'operations', 'brief'], data);
    },
    onError: (err) => {
      console.error('[Operations] Brief refresh failed:', err);
      toast.error('Failed to refresh brief');
    },
  });

  // Exceptions — full list, only when tab active; poll every 20s (matches MonitoringPanel pattern)
  const { data: exceptionsData, isError: exceptionsError } = useQuery<{ data: ExceptionItem[]; total: number }>({
    queryKey: ['admin', 'operations', 'exceptions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/operations/exceptions?status=open&limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load exceptions');
      return { data: json.data ?? [], total: json.total ?? 0 };
    },
    enabled: tabFilter === 'exceptions',
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
  });

  // Exception actions
  type ExceptionAction = 'claim' | 'resolve' | 'dismiss';
  const exceptionAction = useMutation({
    mutationFn: async ({ id, action, resolution }: { id: string; action: ExceptionAction; resolution?: string }) => {
      const res = await fetch(`/api/admin/operations/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_data, variables) => {
      const labels: Record<ExceptionAction, string> = { claim: 'Claimed', resolve: 'Resolved', dismiss: 'Dismissed' };
      toast.success(`Exception ${labels[variables.action] ?? 'updated'}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations', 'health'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations', 'exceptions'] });
    },
    onError: (err) => {
      console.error('[Operations] Exception action failed:', err);
      toast.error(err instanceof Error ? err.message : 'Action failed');
    },
  });

  // Inline command bar state
  const [command, setCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const handleCommand = useCallback(async (input: string) => {
    if (!input.trim() || isRunning) return;
    setIsRunning(true);
    setLastMessage(null);

    try {
      const classifyRes = await fetch('/api/admin/conductor/classify-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (classifyRes.ok) {
        const { data: intent } = await classifyRes.json() as { data: IntentResult };

        if (intent.confidence >= 0.7) {
          if (intent.intent === 'query_agent' && intent.target_agent_slug) {
            router.push(`/admin/conductor/agents/${intent.target_agent_slug}${intent.prompt ? `?prompt=${encodeURIComponent(intent.prompt)}` : ''}`);
            setLastMessage(`Routing to ${intent.target_agent_slug} agent...`);
            setCommand('');
            return;
          }
          if (intent.intent === 'view_analytics') {
            router.push('/admin/conductor?tab=intelligence');
            setLastMessage(`Opening ${intent.analytics_tab ?? 'intelligence'} view...`);
            setCommand('');
            return;
          }
        }
      }

      // Fallback
      const res = await fetch('/api/admin/workflow/execute/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input }),
      });
      const data = await res.json();
      setLastMessage(data.result?.message ?? data.error ?? 'No response');
      setCommand('');
    } catch (err) {
      console.error('[Operations] Command failed:', err);
      setLastMessage('Failed to send command');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, router]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(command);
  }, [command, handleCommand]);

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="Operations"
            subtitle="Platform health, AI brief, and exception queue"
            className={styles.adminHeader}
            actions={
              <span className={styles.liveIndicator}>
                <span className={styles.liveDot} />
                Live
              </span>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
              { id: 'exceptions', label: `Exceptions${healthData?.exceptions.openCount ? ` (${healthData.exceptions.openCount})` : ''}`, active: tabFilter === 'exceptions' },
              { id: 'agents', label: 'Agents', active: tabFilter === 'agents' },
            ]}
            onTabChange={handleTabChange}
            className={styles.adminTabs}
          />
        }
      >
        <div className={styles.container}>
          {/* Command Bar — conversational input */}
          <div className={styles.commandSection}>
            <form className={styles.commandForm} onSubmit={handleSubmit}>
              <textarea
                className={styles.commandInput}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommand(command);
                  }
                }}
                placeholder='e.g. "Show at-risk tutors" or "Run commission payout" or "Show referral analytics"'
                rows={1}
                disabled={isRunning}
              />
              <button className={styles.commandSubmit} type="submit" disabled={isRunning || !command.trim()}>
                {isRunning ? <Loader2 size={18} className={styles.spinner} /> : <ArrowUp size={18} />}
              </button>
            </form>
            <div className={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className={styles.quickChip}
                  onClick={() => handleCommand(action.command)}
                  disabled={isRunning}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {lastMessage && <p className={styles.commandResult}>{lastMessage}</p>}
          </div>

          {tabFilter === 'overview' && (
            <>
              {/* Stats Grid */}
              {healthLoading ? (
                <div className={styles.loading}><Loader2 size={16} className={styles.spinner} /> Loading health data...</div>
              ) : healthData ? (
                /* Stats cards — click to navigate */
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCardClickable} onClick={() => router.push('/admin/conductor?tab=execution')}>
                      <p className={styles.statLabel}>Running Workflows</p>
                      <p className={healthData.workflows.running > 0 ? styles.statValueSuccess : styles.statValue}>
                        {healthData.workflows.running}
                      </p>
                    </div>
                    <div className={styles.statCardClickable} onClick={() => router.push('/admin/conductor?tab=monitoring')}>
                      <p className={styles.statLabel}>Failed (24h)</p>
                      <p className={healthData.workflows.failed24h > 0 ? styles.statValueDanger : styles.statValue}>
                        {healthData.workflows.failed24h}
                      </p>
                    </div>
                    <div className={styles.statCardClickable} onClick={() => router.push('/admin/conductor?tab=execution')}>
                      <p className={styles.statLabel}>Pending HITL</p>
                      <p className={healthData.hitl.pendingCount > 0 ? styles.statValueWarning : styles.statValue}>
                        {healthData.hitl.pendingCount}
                      </p>
                    </div>
                    <div className={styles.statCardClickable} onClick={() => handleTabChange('exceptions')}>
                      <p className={styles.statLabel}>Open Exceptions</p>
                      <p className={healthData.exceptions.openCount > 0 ? styles.statValueDanger : styles.statValue}>
                        {healthData.exceptions.openCount}
                      </p>
                    </div>
                  </div>

                  {/* Two-panel row: Exceptions + Agents */}
                  <div className={styles.panelsRow}>
                    {/* Recent Exceptions */}
                    <div className={styles.panel}>
                      <h3 className={styles.panelTitle}>
                        <AlertTriangle size={14} />
                        Recent Exceptions
                        {healthData.exceptions.openCount > 0 && (
                          <span className={styles.panelBadge}>{healthData.exceptions.openCount}</span>
                        )}
                      </h3>
                      {healthData.exceptions.recent.length === 0 ? (
                        <p className={styles.emptyState}>No open exceptions</p>
                      ) : (
                        <ul className={styles.exceptionList}>
                          {healthData.exceptions.recent.map((ex) => (
                            <li key={ex.id} className={styles.exceptionItem}>
                              <span className={`${styles.severityDot} ${
                                ex.severity === 'critical' ? styles.severityCritical :
                                ex.severity === 'high' ? styles.severityHigh :
                                ex.severity === 'medium' ? styles.severityMedium :
                                styles.severityLow
                              }`} />
                              <div>
                                <p className={styles.exceptionTitle}>{ex.title}</p>
                                <p className={styles.exceptionMeta}>{ex.source} · {timeAgo(ex.created_at)}</p>
                              </div>
                              <div className={styles.exceptionActions}>
                                <button
                                  className={styles.claimBtn}
                                  onClick={() => exceptionAction.mutate({ id: ex.id, action: 'claim' })}
                                  disabled={exceptionAction.isPending}
                                >
                                  Claim
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Agent Status */}
                    <div className={styles.panel}>
                      <h3 className={styles.panelTitle}>
                        <CheckCircle2 size={14} />
                        Agent Status
                        <span className={styles.panelBadgeNeutral}>{healthData.agents.active.length}</span>
                      </h3>
                      {healthData.agents.active.length === 0 ? (
                        <p className={styles.emptyState}>No active agents</p>
                      ) : (
                        <ul className={styles.agentList}>
                          {healthData.agents.active.map((agent) => (
                            <li key={agent.slug} className={styles.agentItem}>
                              <span className={`${styles.agentDot} ${agent.status === 'active' && agent.last_run_at ? styles.agentActive : styles.agentIdle}`} />
                              <span className={styles.agentName}>{agent.name}</span>
                              <span className={styles.agentLastRun}>{timeAgo(agent.last_run_at)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {/* AI Brief */}
              <div className={styles.briefSection}>
                <div className={styles.briefHeader}>
                  <h3 className={styles.briefTitle}>AI Operations Brief</h3>
                  <div className={styles.briefHeaderActions}>
                    {briefFetching && !briefLoading && !refreshBrief.isPending && <Loader2 size={12} className={styles.spinner} style={{ color: '#9ca3af' }} />}
                    {briefData && <span className={styles.briefMeta}>Generated {timeAgo(briefData.generatedAt)}</span>}
                    <button
                      className={styles.refreshBtn}
                      onClick={() => refreshBrief.mutate()}
                      disabled={refreshBrief.isPending || briefLoading}
                    >
                      <RefreshCw size={12} className={refreshBrief.isPending ? styles.spinner : undefined} />
                      {refreshBrief.isPending ? 'Generating...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                {briefLoading ? (
                  <div className={styles.loading}><Loader2 size={14} className={styles.spinner} /> Generating brief...</div>
                ) : briefData?.brief ? (
                  <div className={styles.briefContent}>{briefData.brief}</div>
                ) : (
                  <p className={styles.briefEmpty}>No brief available. Click Refresh to generate.</p>
                )}
              </div>
            </>
          )}

          {tabFilter === 'exceptions' && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>
                <AlertTriangle size={14} />
                Exception Queue
                {exceptionsData && exceptionsData.total > 0 && (
                  <span className={styles.panelBadge}>{exceptionsData.total}</span>
                )}
              </h3>
              {exceptionsError ? (
                <div className={styles.errorState}>
                  <XCircle size={16} />
                  <span>Failed to load exceptions. Try refreshing the page.</span>
                </div>
              ) : !exceptionsData || exceptionsData.data.length === 0 ? (
                <p className={styles.emptyState}>No open exceptions</p>
              ) : (
                <ul className={styles.exceptionList}>
                  {exceptionsData.data.map((ex) => (
                    <li key={ex.id} className={styles.exceptionItem}>
                      <span className={`${styles.severityDot} ${
                        ex.severity === 'critical' ? styles.severityCritical :
                        ex.severity === 'high' ? styles.severityHigh :
                        ex.severity === 'medium' ? styles.severityMedium :
                        styles.severityLow
                      }`} />
                      <div>
                        <p className={styles.exceptionTitle}>{ex.title}</p>
                        <p className={styles.exceptionMeta}>
                          {ex.source} · {ex.severity} · {timeAgo(ex.created_at)}
                          {ex.claimed_by_profile && ` · claimed by ${ex.claimed_by_profile.full_name}`}
                        </p>
                        {ex.description && (
                          <p className={styles.exceptionDescription}>
                            {ex.description}
                          </p>
                        )}
                      </div>
                      <div className={styles.exceptionActions}>
                        {ex.status === 'open' && (
                          <button
                            className={styles.claimBtn}
                            onClick={() => exceptionAction.mutate({ id: ex.id, action: 'claim' })}
                            disabled={exceptionAction.isPending}
                          >
                            Claim
                          </button>
                        )}
                        {(ex.status === 'open' || ex.status === 'claimed') && (
                          <>
                            <button
                              className={styles.resolveBtn}
                              onClick={() => exceptionAction.mutate({ id: ex.id, action: 'resolve', resolution: 'Resolved from Operations queue' })}
                              disabled={exceptionAction.isPending}
                            >
                              Resolve
                            </button>
                            <button
                              className={styles.dismissBtn}
                              onClick={() => exceptionAction.mutate({ id: ex.id, action: 'dismiss' })}
                              disabled={exceptionAction.isPending}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tabFilter === 'agents' && (
            <>
              {healthLoading ? (
                <div className={styles.loading}><Loader2 size={16} className={styles.spinner} /> Loading...</div>
              ) : healthData ? (
                <div className={styles.panelsRow}>
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>Specialist Agents</h3>
                    {healthData.agents.active.length === 0 ? (
                      <p className={styles.emptyState}>No active agents</p>
                    ) : (
                      <ul className={styles.agentList}>
                        {healthData.agents.active.map((agent) => (
                          <li key={agent.slug} className={styles.agentItem}>
                            <span className={`${styles.agentDot} ${agent.status === 'active' && agent.last_run_at ? styles.agentActive : styles.agentIdle}`} />
                            <span className={styles.agentName}>{agent.name}</span>
                            <span className={styles.agentLastRun}>{timeAgo(agent.last_run_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>Recent Runs (24h)</h3>
                    {healthData.agents.recentRuns24h.length === 0 && healthData.teams.recentRuns24h.length === 0 ? (
                      <p className={styles.emptyState}>No runs in last 24 hours</p>
                    ) : (
                      <ul className={styles.agentList}>
                        {healthData.agents.recentRuns24h.map((run) => (
                          <li key={run.id} className={styles.agentItem}>
                            <span className={`${styles.agentDot} ${run.status === 'completed' ? styles.agentActive : styles.agentIdle}`} />
                            <span className={styles.agentName}>{run.agent_slug}</span>
                            <span className={styles.agentLastRun}>{run.status} · {timeAgo(run.created_at)}</span>
                          </li>
                        ))}
                        {healthData.teams.recentRuns24h.map((run) => (
                          <li key={run.id} className={styles.agentItem}>
                            <span className={`${styles.agentDot} ${run.status === 'completed' ? styles.agentActive : styles.agentIdle}`} />
                            <span className={styles.agentName}>Team: {run.team?.name ?? run.team_id.slice(0, 8)}</span>
                            <span className={styles.agentLastRun}>{run.status} · {timeAgo(run.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}
