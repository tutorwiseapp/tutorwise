'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, RefreshCw, ChevronDown, ChevronRight,
  History, BookOpen, Save, Trash2,
  CheckCircle2, XCircle, Loader2, ArrowRight,
} from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter } from '@/components/hub/data';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
import { HubWidgetCard } from '@/components/hub/content';
import styles from './SimulationPanel.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentOutput {
  agent_slug: string;
  output: string;
  status: string;
  duration_ms: number;
}

interface TeamRun {
  id: string;
  team_id: string;
  trigger_type: string;
  task: string;
  team_result: string | null;
  agent_outputs: AgentOutput[] | null;
  status: string;
  duration_ms: number | null;
  created_at: string;
  team_name: string;
  team_pattern: string;
  team_slug: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  pattern: string;
}

interface CustomScenario {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  task: string;
  triggerType: string;
  createdAt: string;
  lastRunStatus: string | null;
}

type SubTab = 'run' | 'output' | 'scenarios';
type TriggerType = 'manual' | 'webhook' | 'cron';

// ── Built-in scenario packs ───────────────────────────────────────────────────

const BUILT_IN_SCENARIOS = [
  {
    id: 'bi-devops-health',
    name: 'Platform health check',
    teamMatch: 'DevOps',
    task: 'Run a full platform health check across all systems. Report on reliability, performance, and any critical issues needing immediate attention.',
  },
  {
    id: 'bi-devops-booking',
    name: '30-day booking performance',
    teamMatch: 'DevOps',
    task: 'Analyse the last 30 days of booking performance. Identify trends, drops, and opportunities. Include conversion rates and agent performance.',
  },
  {
    id: 'bi-devops-security',
    name: 'Security audit',
    teamMatch: 'DevOps',
    task: 'Conduct a security audit of the platform. Review access controls, recent changes, potential vulnerabilities, and compliance with best practices.',
  },
  {
    id: 'bi-devops-cas',
    name: 'CAS agent performance review',
    teamMatch: 'DevOps',
    task: 'Review performance of all CAS specialist agents. Report on run success rates, response quality, tool usage, and any agents needing attention.',
  },
  {
    id: 'bi-gtm-q2',
    name: 'Q2 growth analysis',
    teamMatch: 'GTM',
    task: 'Analyse Q2 growth performance across all channels. Review acquisition, conversion, retention, and revenue metrics. Identify what is working and what needs adjustment.',
  },
  {
    id: 'bi-gtm-referral',
    name: 'Referral funnel health',
    teamMatch: 'GTM',
    task: 'Audit the referral funnel end to end. Review referral sign-ups, conversion rates, commission payouts, and agent engagement. Flag any leaks or opportunities.',
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    completed: styles.statusCompleted,
    failed: styles.statusFailed,
    running: styles.statusRunning,
    awaiting_approval: styles.statusWaiting,
  };
  const labels: Record<string, string> = {
    completed: 'Completed',
    failed: 'Failed',
    running: 'Running',
    awaiting_approval: 'Awaiting Approval',
  };
  return (
    <span className={`${styles.statusBadge} ${cfg[status] ?? styles.statusRunning}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Agent Outputs Accordion (shared) ─────────────────────────────────────────

function AgentOutputsAccordion({ outputs }: { outputs: AgentOutput[] }) {
  const [open, setOpen] = useState(false);
  const maxMs = Math.max(...outputs.map(a => a.duration_ms ?? 0), 1);

  return (
    <div className={styles.agentSection}>
      <button className={styles.agentToggle} onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {outputs.length} agent outputs
      </button>
      {open && (
        <div className={styles.agentList}>
          {outputs.map((ao, i) => (
            <div key={i} className={styles.agentOutputRow}>
              <div className={styles.agentMeta}>
                <span className={styles.agentSlug}>{ao.agent_slug}</span>
                <span className={styles.agentDuration}>{fmtDuration(ao.duration_ms)}</span>
                <StatusBadge status={ao.status} />
              </div>
              <div className={styles.agentBarTrack}>
                <div
                  className={styles.agentBarFill}
                  style={{ width: `${Math.round(((ao.duration_ms ?? 0) / maxMs) * 100)}%` }}
                />
              </div>
              <div className={styles.agentOutputText}>
                {ao.output?.slice(0, 500)}{(ao.output?.length ?? 0) > 500 ? '…' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Run Result Block ──────────────────────────────────────────────────────────

interface RunResultData {
  team_result: string | null;
  agent_outputs: AgentOutput[] | null;
  status: string;
  duration_ms: number | null;
}

function RunResultBlock({ result }: { result: RunResultData }) {
  return (
    <div className={styles.runResult}>
      <div className={styles.resultMeta}>
        <StatusBadge status={result.status} />
        <span className={styles.resultDuration}>{fmtDuration(result.duration_ms)}</span>
      </div>
      {result.team_result && (
        <div className={styles.resultText}>{result.team_result}</div>
      )}
      {result.agent_outputs && result.agent_outputs.length > 0 && (
        <AgentOutputsAccordion outputs={result.agent_outputs} />
      )}
    </div>
  );
}

// ── Run Sub-tab ───────────────────────────────────────────────────────────────

interface RunSubTabProps {
  teams: AgentTeam[];
  onRunComplete: () => void;
  initialTeamId?: string;
  initialTask?: string;
}

function RunSubTab({ teams, onRunComplete, initialTeamId = '', initialTask = '' }: RunSubTabProps) {
  const [teamId, setTeamId] = useState(initialTeamId);
  const [task, setTask] = useState(initialTask);
  const [triggerType, setTriggerType] = useState<TriggerType>('manual');
  const [hitl, setHitl] = useState(false);
  const [result, setResult] = useState<RunResultData | null>(null);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error('Select a team');
      if (!task.trim()) throw new Error('Enter a task');
      const res = await fetch(`/api/admin/teams/${teamId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), trigger_type: hitl ? 'hitl' : triggerType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Run failed');
      return json.data as RunResultData;
    },
    onSuccess: (data) => {
      setResult(data);
      onRunComplete();
    },
  });

  const saveScenario = () => {
    if (!teamId || !task.trim()) return;
    const team = teams.find(t => t.id === teamId);
    const name = prompt('Scenario name:');
    if (!name) return;
    const stored = JSON.parse(localStorage.getItem('sim_scenarios') ?? '[]') as CustomScenario[];
    stored.push({
      id: crypto.randomUUID(),
      name,
      teamId,
      teamName: team?.name ?? '',
      task: task.trim(),
      triggerType,
      createdAt: new Date().toISOString(),
      lastRunStatus: null,
    });
    localStorage.setItem('sim_scenarios', JSON.stringify(stored));
  };

  return (
    <div className={styles.runTab}>
      <div className={styles.runForm}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Team</label>
          <UnifiedSelect
            options={teams.map(t => ({ value: t.id, label: t.name }))}
            value={teamId}
            onChange={v => { setTeamId(String(v)); setResult(null); }}
            placeholder="Select a team…"
          />
        </div>

        <div className={styles.formRow2}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Trigger type</label>
            <UnifiedSelect
              options={[
                { value: 'manual', label: 'Manual' },
                { value: 'webhook', label: 'Webhook' },
                { value: 'cron', label: 'Cron' },
              ]}
              value={triggerType}
              onChange={v => setTriggerType(v as TriggerType)}
              disabled={hitl}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>HITL mode</label>
            <button
              type="button"
              className={`${styles.toggleBtn} ${hitl ? styles.toggleOn : ''}`}
              onClick={() => setHitl(h => !h)}
            >
              <span className={styles.toggleDot} />
              {hitl ? 'Enabled — run pauses for approval' : 'Disabled'}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Task</label>
          <textarea
            className={styles.textarea}
            value={task}
            onChange={e => { setTask(e.target.value); setResult(null); }}
            placeholder="Describe what you want the team to do…"
            rows={5}
          />
        </div>

        {runMutation.isError && (
          <div className={styles.errorMsg}>{(runMutation.error as Error).message}</div>
        )}

        <div className={styles.runFooter}>
          <button
            className={styles.runBtn}
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || !teamId || !task.trim()}
          >
            {runMutation.isPending
              ? <><Loader2 size={14} className={styles.spin} /> Running…</>
              : <><Play size={14} /> Run</>
            }
          </button>
          {result && (
            <button className={styles.secondaryBtn} onClick={saveScenario}>
              <Save size={13} /> Save as Scenario
            </button>
          )}
          {result && (
            <button className={styles.secondaryBtn} onClick={() => { setResult(null); setTask(''); }}>
              <RefreshCw size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {result && <RunResultBlock result={result} />}
    </div>
  );
}

// ── Output Sub-tab ────────────────────────────────────────────────────────────

function OutputSubTab({
  runs,
  isFetching,
  refetch,
  teams,
}: {
  runs: TeamRun[];
  isFetching: boolean;
  refetch: () => void;
  teams: AgentTeam[];
}) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string | string[]>>({});

  const rerunMutation = useMutation({
    mutationFn: async (run: TeamRun) => {
      const res = await fetch(`/api/admin/teams/${run.team_id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: run.task, trigger_type: run.trigger_type ?? 'manual' }),
      });
      if (!res.ok) throw new Error('Re-run failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-runs'] }),
  });

  const deleteRunMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/teams/runs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-runs'] }),
  });

  const statusFilter = (filterValues.status as string) || 'all';
  const teamFilter = (filterValues.team as string) || 'all';

  const filtered = runs
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => teamFilter === 'all' || r.team_id === teamFilter);

  const expandedRun = expandedId ? filtered.find(r => r.id === expandedId) : null;

  const tableFilters: Filter[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'running', label: 'Running' },
      ],
    },
    {
      key: 'team',
      label: 'Team',
      options: [
        { value: 'all', label: 'All teams' },
        ...teams.map(t => ({ value: t.id, label: t.name })),
      ],
    },
  ];

  const columns: Column<TeamRun>[] = [
    {
      key: 'team_name',
      label: 'Team',
      width: '140px',
      sortable: true,
    },
    {
      key: 'task',
      label: 'Task',
      render: (row) => (
        <span title={row.task}>
          {row.task.length > 80 ? row.task.slice(0, 80) + '…' : row.task}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'duration_ms',
      label: 'Duration',
      width: '90px',
      sortable: true,
      render: (row) => fmtDuration(row.duration_ms),
      hideOnMobile: true,
    },
    {
      key: 'created_at',
      label: 'When',
      width: '90px',
      sortable: true,
      render: (row) => timeAgo(row.created_at),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      label: '',
      width: '48px',
      render: (row) => {
        const actions: MenuAction[] = [
          {
            label: 'Re-run',
            onClick: () => rerunMutation.mutate(row),
          },
          {
            label: 'View Details',
            onClick: () => setExpandedId(prev => prev === row.id ? null : row.id),
          },
        ];
        if (row.status !== 'running') {
          actions.push({
            label: 'Delete',
            variant: 'danger',
            onClick: () => {
              if (confirm('Delete this run record?')) {
                deleteRunMutation.mutate(row.id);
                if (expandedId === row.id) setExpandedId(null);
              }
            },
          });
        }
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  ];

  return (
    <div className={styles.outputTab}>
      <HubDataTable<TeamRun>
        columns={columns}
        data={filtered}
        loading={isFetching}
        filters={tableFilters}
        onFilterChange={(key, value) =>
          setFilterValues(prev => ({ ...prev, [key]: value }))
        }
        onRefresh={() => refetch()}
        emptyMessage="No runs match the current filters"
        getRowId={(row) => row.id}
      />

      {expandedRun && (
        <div className={styles.outputExpanded}>
          <div className={styles.expandedMeta}>
            <span className={styles.expandedLabel}>Trigger:</span> {expandedRun.trigger_type}
            <span className={styles.expandedLabel} style={{ marginLeft: 12 }}>Team:</span> {expandedRun.team_name}
            <span className={styles.expandedLabel} style={{ marginLeft: 12 }}>Run ID:</span>
            <span className={styles.runIdText}>{expandedRun.id.slice(0, 8)}…</span>
          </div>
          <div className={styles.expandedTask}><strong>Task:</strong> {expandedRun.task}</div>
          {expandedRun.team_result && (
            <div className={styles.resultText}>{expandedRun.team_result}</div>
          )}
          {expandedRun.agent_outputs && expandedRun.agent_outputs.length > 0 && (
            <AgentOutputsAccordion outputs={expandedRun.agent_outputs} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Scenarios Sub-tab ─────────────────────────────────────────────────────────

function ScenariosSubTab({
  teams,
  onLoadScenario,
}: {
  teams: AgentTeam[];
  onLoadScenario: (teamId: string, task: string) => void;
}) {
  const queryClient = useQueryClient();
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('sim_scenarios') ?? '[]');
  });
  const [runAllProgress, setRunAllProgress] = useState<
    Array<{ id: string; name: string; status: 'pending' | 'running' | 'done' | 'failed' }> | null
  >(null);
  const stopRef = useRef(false);
  const [scenarioRunningId, setScenarioRunningId] = useState<string | null>(null);

  function resolveTeam(teamMatch: string): AgentTeam | undefined {
    return teams.find(t => t.name.toLowerCase().includes(teamMatch.toLowerCase()));
  }

  async function runScenario(teamId: string, task: string, scenarioId: string): Promise<'completed' | 'failed'> {
    const res = await fetch(`/api/admin/teams/${teamId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, trigger_type: 'manual' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Run failed');
    return json.data?.status === 'completed' ? 'completed' : 'failed';
  }

  async function handleRunScenario(teamId: string, task: string, scenarioId: string) {
    setScenarioRunningId(scenarioId);
    try {
      const status = await runScenario(teamId, task, scenarioId);
      // Update lastRunStatus for custom scenarios
      const stored = JSON.parse(localStorage.getItem('sim_scenarios') ?? '[]') as CustomScenario[];
      const updated = stored.map(s => s.id === scenarioId ? { ...s, lastRunStatus: status } : s);
      localStorage.setItem('sim_scenarios', JSON.stringify(updated));
      setCustomScenarios(updated);
      queryClient.invalidateQueries({ queryKey: ['team-runs'] });
    } catch {
      // run failed
    } finally {
      setScenarioRunningId(null);
    }
  }

  async function runAll() {
    const allItems = [
      ...BUILT_IN_SCENARIOS.map(s => {
        const team = resolveTeam(s.teamMatch);
        return team ? { id: s.id, name: s.name, teamId: team.id, task: s.task } : null;
      }).filter(Boolean),
      ...customScenarios.map(s => ({ id: s.id, name: s.name, teamId: s.teamId, task: s.task })),
    ] as Array<{ id: string; name: string; teamId: string; task: string }>;

    if (allItems.length === 0) return;

    stopRef.current = false;
    setRunAllProgress(allItems.map(s => ({ id: s.id, name: s.name, status: 'pending' as const })));

    for (const item of allItems) {
      if (stopRef.current) break;
      setRunAllProgress(prev =>
        prev?.map(p => p.id === item.id ? { ...p, status: 'running' as const } : p) ?? null
      );
      try {
        const res = await fetch(`/api/admin/teams/${item.teamId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: item.task, trigger_type: 'manual' }),
        });
        const ok = res.ok;
        setRunAllProgress(prev =>
          prev?.map(p => p.id === item.id ? { ...p, status: ok ? 'done' : 'failed' } : p) ?? null
        );
      } catch {
        setRunAllProgress(prev =>
          prev?.map(p => p.id === item.id ? { ...p, status: 'failed' as const } : p) ?? null
        );
      }
    }
    queryClient.invalidateQueries({ queryKey: ['team-runs'] });
  }

  function deleteScenario(id: string) {
    const updated = customScenarios.filter(s => s.id !== id);
    localStorage.setItem('sim_scenarios', JSON.stringify(updated));
    setCustomScenarios(updated);
  }

  function clearCustom() {
    if (!confirm('Clear all custom scenarios?')) return;
    localStorage.removeItem('sim_scenarios');
    setCustomScenarios([]);
  }

  // Group built-ins by team
  const builtInByTeam: Record<string, typeof BUILT_IN_SCENARIOS[number][]> = {};
  BUILT_IN_SCENARIOS.forEach(s => {
    if (!builtInByTeam[s.teamMatch]) builtInByTeam[s.teamMatch] = [];
    builtInByTeam[s.teamMatch].push(s);
  });

  const isRunAllActive = runAllProgress?.some(p => p.status === 'running') ?? false;

  return (
    <div className={styles.scenariosTab}>
      <div className={styles.scenariosToolbar}>
        <button
          className={styles.runAllBtn}
          onClick={runAll}
          disabled={isRunAllActive || scenarioRunningId !== null}
        >
          <Play size={13} /> Run All
        </button>
        {customScenarios.length > 0 && (
          <button className={styles.clearBtn} onClick={clearCustom}>
            <Trash2 size={13} /> Clear Custom
          </button>
        )}
      </div>

      {/* Run All progress panel */}
      {runAllProgress && (
        <div className={styles.runAllProgress}>
          <div className={styles.progressHeader}>
            Run All Progress
            <button
              className={styles.closeProgressBtn}
              onClick={() => { stopRef.current = true; setRunAllProgress(null); }}
            >
              {isRunAllActive ? 'Stop' : 'Close'}
            </button>
          </div>
          {runAllProgress.map(p => (
            <div key={p.id} className={styles.progressRow}>
              {p.status === 'pending' && <span className={styles.progressDotGray} />}
              {p.status === 'running' && <Loader2 size={12} className={styles.spin} style={{ color: '#2563eb' }} />}
              {p.status === 'done' && <CheckCircle2 size={12} style={{ color: '#16a34a' }} />}
              {p.status === 'failed' && <XCircle size={12} style={{ color: '#dc2626' }} />}
              <span className={styles.progressName}>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Built-in packs */}
      <div className={styles.scenariosSection}>
        <div className={styles.scenariosSectionLabel}>Built-in</div>
        {Object.entries(builtInByTeam).map(([teamMatch, scenarios]) => {
          const team = resolveTeam(teamMatch);
          return (
            <div key={teamMatch} className={styles.scenarioPack}>
              <div className={styles.packLabel}>
                {teamMatch} Team
                {!team && <span className={styles.noTeamWarning}> — team not found</span>}
              </div>
              <div className={styles.scenarioGrid}>
                {scenarios.map(s => {
                  const isRunning = scenarioRunningId === s.id;
                  return (
                    <div key={s.id} className={styles.scenarioCard}>
                      <div className={styles.scenarioName}>{s.name}</div>
                      <div className={styles.scenarioTask}>{s.task.slice(0, 110)}…</div>
                      <div className={styles.scenarioCardActions}>
                        <button
                          className={styles.scenarioRunBtn}
                          disabled={!team || scenarioRunningId !== null || isRunAllActive}
                          onClick={() => team && handleRunScenario(team.id, s.task, s.id)}
                        >
                          {isRunning
                            ? <><Loader2 size={12} className={styles.spin} /> Running…</>
                            : <><Play size={12} /> Run</>
                          }
                        </button>
                        <button
                          className={styles.scenarioLoadBtn}
                          disabled={!team}
                          onClick={() => team && onLoadScenario(team.id, s.task)}
                          title="Load into Run tab"
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom scenarios */}
      <div className={styles.scenariosSection}>
        <div className={styles.scenariosSectionLabel}>Custom</div>
        {customScenarios.length === 0 ? (
          <div className={styles.empty}>
            No custom scenarios yet — run a task and click &ldquo;Save as Scenario&rdquo;
          </div>
        ) : (
          <div className={styles.scenarioGrid}>
            {customScenarios.map(s => {
              const isRunning = scenarioRunningId === s.id;
              return (
                <div key={s.id} className={styles.scenarioCard}>
                  <div className={styles.scenarioCardTop}>
                    <span className={styles.scenarioName}>{s.name}</span>
                    {s.lastRunStatus && (
                      <span
                        className={styles.lastRunDot}
                        style={{ background: s.lastRunStatus === 'completed' ? '#16a34a' : '#dc2626' }}
                        title={`Last run: ${s.lastRunStatus}`}
                      />
                    )}
                  </div>
                  <div className={styles.scenarioTeamLabel}>{s.teamName}</div>
                  <div className={styles.scenarioTask}>{s.task.slice(0, 110)}…</div>
                  <div className={styles.scenarioCardActions}>
                    <button
                      className={styles.scenarioRunBtn}
                      disabled={scenarioRunningId !== null || isRunAllActive}
                      onClick={() => handleRunScenario(s.teamId, s.task, s.id)}
                    >
                      {isRunning
                        ? <><Loader2 size={12} className={styles.spin} /> Running…</>
                        : <><Play size={12} /> Run</>
                      }
                    </button>
                    <button
                      className={styles.scenarioLoadBtn}
                      onClick={() => onLoadScenario(s.teamId, s.task)}
                      title="Load into Run tab"
                    >
                      <ArrowRight size={12} />
                    </button>
                    <button
                      className={styles.scenarioDeleteBtn}
                      onClick={() => deleteScenario(s.id)}
                      title="Delete scenario"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main SimulationPanel ──────────────────────────────────────────────────────

export function SimulationPanel() {
  const [subTab, setSubTab] = useState<SubTab>('run');
  const [preloadTeamId, setPreloadTeamId] = useState('');
  const [preloadTask, setPreloadTask] = useState('');
  const [runKey, setRunKey] = useState(0);

  const { data: runs = [], isFetching: runsFetching, refetch: refetchRuns } = useQuery({
    queryKey: ['team-runs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/teams/runs');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load runs');
      return json.data as TeamRun[];
    },
    staleTime: 15_000,
    refetchOnMount: 'always' as const,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const res = await fetch('/api/admin/teams');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load teams');
      return json.data as AgentTeam[];
    },
    staleTime: 60_000,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

  const handleLoadScenario = (teamId: string, task: string) => {
    setPreloadTeamId(teamId);
    setPreloadTask(task);
    setRunKey(k => k + 1);
    setSubTab('run');
  };

  const SUB_TABS: { id: SubTab; icon: React.ReactNode; label: string }[] = [
    { id: 'run', icon: <Play size={13} />, label: 'Run' },
    { id: 'output', icon: <History size={13} />, label: 'Output' },
    { id: 'scenarios', icon: <BookOpen size={13} />, label: 'Scenarios' },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.tabBar}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${subTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {subTab === 'run' && (
          <RunSubTab
            key={runKey}
            teams={teams}
            onRunComplete={() => refetchRuns()}
            initialTeamId={preloadTeamId}
            initialTask={preloadTask}
          />
        )}
        {subTab === 'output' && (
          <OutputSubTab
            runs={runs}
            isFetching={runsFetching}
            refetch={refetchRuns}
            teams={teams}
          />
        )}
        {subTab === 'scenarios' && (
          <ScenariosSubTab
            teams={teams}
            onLoadScenario={handleLoadScenario}
          />
        )}
      </div>
    </div>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function SimulationSidebar() {
  return (
    <>
      <HubWidgetCard title="Simulation Help">
        <div className={styles.tipsList}>
          <p>Use <strong>Run</strong> to execute a team with a custom task and review the output.</p>
          <p><strong>Output</strong> shows historical run results with status and timing.</p>
          <p><strong>Scenarios</strong> let you save and replay common tasks for consistency.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Simulation Tips">
        <div className={styles.tipsList}>
          <p>Test supervisor teams with ambiguous tasks to verify specialist routing.</p>
          <p>Compare pipeline vs swarm patterns on the same task to find the best fit.</p>
          <p>Save successful runs as scenarios for regression testing after config changes.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}
