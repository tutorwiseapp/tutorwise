'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, TrendingUp, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Layers, BarChart2, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import styles from './MiningPanel.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkflowProcess {
  id: string;
  name: string;
  execution_mode: 'design' | 'shadow' | 'live';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function fmtPct(value: unknown): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Analytics Section ────────────────────────────────────────────────────────

function AnalyticsSection({ data, loading }: { data: any; loading: boolean }) {
  if (loading && !data) {
    return <div className={styles.loading}>Loading analytics…</div>;
  }
  if (!data) {
    return (
      <div className={styles.empty}>
        <BarChart2 size={32} className={styles.emptyIcon} />
        <span>No analytics data available yet.</span>
        <span className={styles.emptyHint}>Analytics populate after the first execution run.</span>
      </div>
    );
  }

  const summary = data.summary ?? {};
  const paths: any[] = data.paths ?? [];
  const nodes: any[] = data.cycleTimeByNode ?? [];
  const patterns: any[] = data.patterns ?? [];
  const completedPct = summary.total > 0 ? (summary.completed / summary.total * 100) : null;
  const fastestDays = summary.fastestHours != null ? summary.fastestHours / 24 : null;

  const patternTypeColor: Record<string, string> = {
    rejection_cluster: styles.chipRed,
    bottleneck: styles.chipAmber,
    path_frequency: styles.chipBlue,
    anomaly: styles.chipPurple,
  };

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Total Runs" value={fmt(summary.total)} />
        <StatCard label="Completed" value={completedPct != null ? fmtPct(completedPct) : '—'} sub="% of all runs" />
        <StatCard label="Avg Cycle Time" value={summary.avgCycleDays != null ? `${Number(summary.avgCycleDays).toFixed(1)}d` : '—'} />
        <StatCard label="Fastest Run" value={fastestDays != null ? `${Number(fastestDays).toFixed(1)}d` : '—'} />
        <StatCard label="Slowest Run" value={summary.slowestDays != null ? `${Number(summary.slowestDays).toFixed(1)}d` : '—'} />
      </div>

      {paths.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Execution Paths</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className={styles.mono}>{p.path}</td>
                    <td>{fmt(p.count)}</td>
                    <td>{fmtPct(p.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {nodes.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Cycle Time per Node</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Avg Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n: any, i: number) => (
                  <tr key={i}>
                    <td>{n.nodeLabel ?? n.nodeId}</td>
                    <td>{n.avgHours != null ? Number(n.avgHours).toFixed(1) : '—'}</td>
                    <td>
                      {n.isBottleneck && (
                        <span className={styles.bottleneckBadge}>Bottleneck</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {patterns.length > 0 && (
        <>
          <h4 className={styles.subHeading}>AI Patterns</h4>
          <div className={styles.patternList}>
            {patterns.map((p: any, i: number) => (
              <div key={i} className={styles.patternRow}>
                <span className={`${styles.chip} ${patternTypeColor[p.type] ?? styles.chipBlue}`}>
                  {p.type?.replace(/_/g, ' ')}
                </span>
                <span className={styles.patternSummary}>{p.summary}</span>
                <div className={styles.confidenceWrap}>
                  <div className={styles.confidenceBar}>
                    <div
                      className={styles.confidenceFill}
                      style={{ width: `${Math.min(100, Math.max(0, Number(p.confidence ?? 0) * 100))}%` }}
                    />
                  </div>
                  <span className={styles.confidenceLabel}>
                    {p.confidence != null ? `${Math.round(Number(p.confidence) * 100)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Conformance Section ──────────────────────────────────────────────────────

function ConformanceSection({
  data,
  loading,
  onMarkExpected,
  markPending,
}: {
  data: any;
  loading: boolean;
  onMarkExpected: (deviationId: string) => void;
  markPending: boolean;
}) {
  if (loading && !data) {
    return <div className={styles.loading}>Loading conformance data…</div>;
  }
  if (!data) {
    return (
      <div className={styles.empty}>
        <Shield size={32} className={styles.emptyIcon} />
        <span>No conformance data available yet.</span>
        <span className={styles.emptyHint}>Conformance data populates after executions complete.</span>
      </div>
    );
  }

  const conformanceRate: number = data.conformanceRate ?? 0;
  const conformantCount: number = data.conformant ?? 0;
  const deviatedCount: number = data.deviated ?? 0;
  const expectedPathsCount: number = data.expectedPathCount ?? 0;
  const byType: Record<string, number> = data.byType ?? {};
  const deviations: any[] = data.deviations ?? [];

  return (
    <div>
      <div className={styles.conformanceRateWrap}>
        <div className={styles.conformanceRate}>
          {fmtPct(conformanceRate)} Conformant
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, conformanceRate))}%` }}
          />
        </div>
        <div className={styles.chipRow}>
          <span className={`${styles.chip} ${styles.chipGreen}`}>Conformant: {fmt(conformantCount)}</span>
          <span className={`${styles.chip} ${styles.chipRed}`}>Deviated: {fmt(deviatedCount)}</span>
          <span className={`${styles.chip} ${styles.chipBlue}`}>Expected Paths: {fmt(expectedPathsCount)}</span>
        </div>
      </div>

      {Object.keys(byType).length > 0 && (
        <>
          <h4 className={styles.subHeading}>By Deviation Type</h4>
          <div className={styles.statGrid}>
            {Object.entries(byType).map(([type, count]) => (
              <StatCard key={type} label={type.replace(/_/g, ' ')} value={fmt(count)} />
            ))}
          </div>
        </>
      )}

      {deviations.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle size={28} className={styles.emptyIcon} style={{ color: '#059669' }} />
          <span>No deviations found — process is fully conformant</span>
        </div>
      ) : (
        <>
          <h4 className={styles.subHeading}>Deviations</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Exec ID</th>
                  <th>Node</th>
                  <th>Type</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deviations.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className={styles.mono}>{String(d.executionId ?? '').slice(0, 8)}</td>
                    <td>{d.nodeId ?? '—'}</td>
                    <td>
                      <span className={`${styles.chip} ${styles.chipAmber}`}>
                        {(d.type ?? '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {d.detectedAt
                        ? new Date(d.detectedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      {d.isExpectedPath ? (
                        <span className={`${styles.chip} ${styles.chipGreen}`}>Expected</span>
                      ) : d.id == null ? (
                        <button className={styles.markExpectedBtnDisabled} disabled title="Not yet persisted by cron">
                          Mark as Expected
                        </button>
                      ) : (
                        <button
                          className={styles.markExpectedBtn}
                          disabled={markPending}
                          onClick={() => onMarkExpected(d.id)}
                        >
                          Mark as Expected
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shadow Section ────────────────────────────────────────────────────────────

function ShadowSection({
  data,
  loading,
  onPromote,
  promotePending,
}: {
  data: any;
  loading: boolean;
  onPromote: () => void;
  promotePending: boolean;
}) {
  if (loading && !data) {
    return <div className={styles.loading}>Loading shadow comparison data…</div>;
  }
  if (!data) {
    return (
      <div className={styles.empty}>
        <Layers size={32} className={styles.emptyIcon} />
        <span>No shadow comparison data available yet.</span>
        <span className={styles.emptyHint}>Enable shadow mode and run executions to see comparison data.</span>
      </div>
    );
  }

  const live = data.live ?? {};
  const shadow = data.shadow ?? {};
  const divergenceRate: number = data.divergenceRate ?? 0;
  const divergences: any[] = (data.divergences ?? []).slice(0, 10);
  const checklist: any[] = data.goLiveChecklist ?? [];
  const readyToPromote: boolean = data.readyToPromote ?? false;

  let divergenceClass = styles.chipGreen;
  if (divergenceRate > 10) divergenceClass = styles.chipRed;
  else if (divergenceRate >= 5) divergenceClass = styles.chipAmber;

  return (
    <div>
      <div className={styles.twoCol}>
        <div>
          <h4 className={styles.subHeading}>Live Executions</h4>
          <div className={styles.statGrid}>
            <StatCard label="Total" value={fmt(live.total)} />
            <StatCard label="Completed" value={fmt(live.completed)} />
            <StatCard label="Human Intervened" value={fmt(live.humanIntervened)} />
            <StatCard label="Avg Duration" value={live.avgDurationDays != null ? `${Number(live.avgDurationDays).toFixed(1)}d` : '—'} />
          </div>
        </div>
        <div>
          <h4 className={styles.subHeading}>Shadow Executions</h4>
          <div className={styles.statGrid}>
            <StatCard label="Total" value={fmt(shadow.total)} />
            <StatCard label="Completed" value={fmt(shadow.completed)} />
            <StatCard label="Would Have Intervened" value={fmt(shadow.wouldHaveIntervened)} />
            <StatCard label="Avg Duration" value={shadow.avgDurationDays != null ? `${Number(shadow.avgDurationDays).toFixed(1)}d` : '—'} />
          </div>
        </div>
      </div>

      <div className={styles.divergenceRateRow}>
        <span className={styles.divergenceRateLabel}>Divergence Rate</span>
        <span className={`${styles.divergenceRate} ${divergenceClass}`}>
          {fmtPct(divergenceRate)}
        </span>
      </div>

      {divergences.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Recent Divergences</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Exec ID</th>
                  <th>Divergence</th>
                </tr>
              </thead>
              <tbody>
                {divergences.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className={styles.mono}>{String(d.executionId ?? d.exec_id ?? '').slice(0, 8)}</td>
                    <td className={styles.divergenceJson}>
                      {typeof d.divergence === 'string'
                        ? d.divergence.slice(0, 120)
                        : JSON.stringify(d.divergence ?? {}).slice(0, 120)}
                      {JSON.stringify(d.divergence ?? '').length > 120 && '…'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {checklist.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Go-Live Checklist</h4>
          <div className={styles.checklistWrap}>
            {checklist.map((item: any, i: number) => (
              <div key={i} className={styles.checklistItem}>
                {item.pass ? (
                  <CheckCircle size={15} className={styles.checklistPass} />
                ) : (
                  <XCircle size={15} className={styles.checklistFail} />
                )}
                <span className={styles.checklistLabel}>{item.label}</span>
                {item.value != null && (
                  <span className={styles.checklistValue}>{String(item.value)}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.promoteRow}>
        {!readyToPromote && (
          <div className={styles.promoteHint}>
            <AlertTriangle size={14} />
            Complete all checklist items to enable promotion.
          </div>
        )}
        <button
          className={readyToPromote && !promotePending ? styles.promoteBtn : styles.promoteBtnDisabled}
          disabled={!readyToPromote || promotePending}
          onClick={onPromote}
        >
          <TrendingUp size={14} />
          {promotePending ? 'Promoting…' : 'Promote to Live'}
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function MiningPanel() {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'conformance' | 'shadow'>('analytics');
  const queryClient = useQueryClient();

  // Process list
  const processesQuery = useQuery({
    queryKey: ['workflow', 'processes'],
    queryFn: async () => {
      const res = await fetch('/api/admin/workflow/processes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json.data ?? json) as WorkflowProcess[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const processes: WorkflowProcess[] = processesQuery.data ?? [];

  // Sub-tab queries — all gated on selectedProcessId
  const analyticsQuery = useQuery({
    queryKey: ['mining', 'analytics', selectedProcessId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/conductor/workflows/${selectedProcessId}/analytics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!selectedProcessId && activeSubTab === 'analytics',
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const conformanceQuery = useQuery({
    queryKey: ['mining', 'conformance', selectedProcessId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/conductor/workflows/${selectedProcessId}/conformance`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!selectedProcessId && activeSubTab === 'conformance',
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const shadowQuery = useQuery({
    queryKey: ['mining', 'shadow', selectedProcessId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/conductor/workflows/${selectedProcessId}/shadow`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!selectedProcessId && activeSubTab === 'shadow',
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mark deviation as expected
  const markExpectedMutation = useMutation({
    mutationFn: async ({ deviationId }: { deviationId: string }) => {
      const res = await fetch(`/api/admin/conductor/workflows/${selectedProcessId}/conformance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviationId, markAsExpected: true }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Deviation marked as expected path');
      queryClient.invalidateQueries({ queryKey: ['mining', 'conformance', selectedProcessId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to mark deviation');
    },
  });

  // Promote to live
  const promoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/conductor/workflows/${selectedProcessId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Process promoted to live');
      queryClient.invalidateQueries({ queryKey: ['workflow', 'processes'] });
      queryClient.invalidateQueries({ queryKey: ['mining', 'shadow', selectedProcessId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Promotion failed');
    },
  });

  // Active query for error/refresh UI
  const activeQuery =
    activeSubTab === 'analytics' ? analyticsQuery :
    activeSubTab === 'conformance' ? conformanceQuery :
    shadowQuery;

  return (
    <div className={styles.panel}>
      {/* Header row: title + process selector */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <GitBranch size={16} />
          Process Mining
        </h2>
        <div className={styles.headerRight}>
          {selectedProcessId && activeQuery.dataUpdatedAt > 0 && (
            <span className={styles.lastFetched}>
              Updated {new Date(activeQuery.dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          {selectedProcessId && (
            <button
              className={styles.refreshBtn}
              onClick={() => activeQuery.refetch()}
              disabled={activeQuery.isFetching}
              title="Refresh"
            >
              <RefreshCw size={14} className={activeQuery.isFetching ? styles.spinning : undefined} />
            </button>
          )}
          <select
            className={styles.select}
            value={selectedProcessId ?? ''}
            onChange={(e) => {
              setSelectedProcessId(e.target.value || null);
              setActiveSubTab('analytics');
            }}
          >
            <option value="">Select a process…</option>
            {processes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.execution_mode !== 'live' ? ` (${p.execution_mode})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedProcessId && (
        <div className={styles.empty}>
          <GitBranch size={32} className={styles.emptyIcon} />
          <span>Select a process above to view mining analytics</span>
          <span className={styles.emptyHint}>
            Analytics, conformance checking, and shadow comparison are available for each workflow process.
          </span>
        </div>
      )}

      {selectedProcessId && (
        <>
          {/* Sub-tab bar */}
          <div className={styles.subTabBar}>
            <button
              className={`${styles.subTab} ${activeSubTab === 'analytics' ? styles.subTabActive : ''}`}
              onClick={() => setActiveSubTab('analytics')}
            >
              <BarChart2 size={13} />
              Analytics
            </button>
            <button
              className={`${styles.subTab} ${activeSubTab === 'conformance' ? styles.subTabActive : ''}`}
              onClick={() => setActiveSubTab('conformance')}
            >
              <Shield size={13} />
              Conformance
            </button>
            <button
              className={`${styles.subTab} ${activeSubTab === 'shadow' ? styles.subTabActive : ''}`}
              onClick={() => setActiveSubTab('shadow')}
            >
              <Layers size={13} />
              Shadow
            </button>
          </div>

          {/* Error banner */}
          {activeQuery.error && (
            <div className={styles.error}>
              {activeQuery.error instanceof Error
                ? activeQuery.error.message
                : 'Failed to load data'}
            </div>
          )}

          {/* Section content */}
          <div className={styles.sectionContent}>
            {activeSubTab === 'analytics' && (
              <AnalyticsSection
                data={analyticsQuery.data}
                loading={analyticsQuery.isFetching}
              />
            )}
            {activeSubTab === 'conformance' && (
              <ConformanceSection
                data={conformanceQuery.data}
                loading={conformanceQuery.isFetching}
                onMarkExpected={(deviationId) =>
                  markExpectedMutation.mutate({ deviationId })
                }
                markPending={markExpectedMutation.isPending}
              />
            )}
            {activeSubTab === 'shadow' && (
              <ShadowSection
                data={shadowQuery.data}
                loading={shadowQuery.isFetching}
                onPromote={() => promoteMutation.mutate()}
                promotePending={promoteMutation.isPending}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
