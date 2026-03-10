'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, CheckCircle, XCircle, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './TierCalibrationPanel.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

type AutonomyTier = 'supervised' | 'semi-autonomous' | 'autonomous';

interface AutonomyProposal {
  type: string;            // e.g. "expand_scope"
  accuracy_pct: number;
  reason?: string;
}

interface AutonomyConfig {
  id: string;
  current_tier: AutonomyTier;
  accuracy_computed: number | null;
  outcome_count: number | null;
  threshold: number | null;
  proposal: AutonomyProposal | null;
  suggested_proposal: AutonomyProposal | null;
  workflow_processes: {
    id: string;
    name: string;
    execution_mode: string;
  };
}

// ── Tier display config ───────────────────────────────────────────────────────

const TIER_CONFIG: Record<AutonomyTier, { label: string; bg: string }> = {
  supervised:       { label: 'Supervised',       bg: '#6b7280' },
  'semi-autonomous':{ label: 'Semi-Autonomous',  bg: '#d97706' },
  autonomous:       { label: 'Autonomous',        bg: '#059669' },
};

const TIER_OPTIONS: AutonomyTier[] = ['supervised', 'semi-autonomous', 'autonomous'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

// ── Tier Badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: AutonomyTier }) {
  const cfg = TIER_CONFIG[tier] ?? { label: tier, bg: '#6b7280' };
  return (
    <span className={styles.tierBadge} style={{ background: cfg.bg }}>
      <Target size={10} />
      {cfg.label}
    </span>
  );
}

// ── Process Card ──────────────────────────────────────────────────────────────

function ProcessCard({ config }: { config: AutonomyConfig }) {
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<AutonomyTier>(config.current_tier);

  const proposal = config.proposal ?? config.suggested_proposal;
  const processId = config.workflow_processes?.id;

  // ── Action mutation (approve / reject / set_tier) ──────────────────────────

  const actionMutation = useMutation({
    mutationFn: async (body: { action: string; tier?: string }) => {
      const res = await fetch(`/api/admin/conductor/autonomy/${processId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      if (variables.action === 'approve') toast.success('Proposal approved');
      else if (variables.action === 'reject') toast.success('Proposal rejected');
      else toast.success('Tier updated');
      queryClient.invalidateQueries({ queryKey: ['autonomy-configs'] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    },
  });

  const isBusy = actionMutation.isPending;

  return (
    <div className={styles.processCard}>
      {/* Header */}
      <div className={styles.processCardHeader}>
        <span className={styles.processName}>
          {config.workflow_processes?.name ?? 'Unknown Process'}
        </span>
        <span className={styles.processMode}>
          {config.workflow_processes?.execution_mode ?? '—'}
        </span>
        <TierBadge tier={config.current_tier} />
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{fmtPct(config.accuracy_computed)}</span>
          <span className={styles.statLabel}>Accuracy</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{fmt(config.outcome_count)}</span>
          <span className={styles.statLabel}>Outcomes</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{fmtPct(config.threshold)}</span>
          <span className={styles.statLabel}>Threshold</span>
        </div>
      </div>

      {/* Proposal banner */}
      {proposal && (
        <div className={styles.proposalBanner}>
          <span className={styles.proposalText}>
            <AlertTriangle size={14} />
            AI proposes: {proposal.type.replace(/_/g, ' ')}
            {proposal.accuracy_pct != null && ` (${Number(proposal.accuracy_pct).toFixed(1)}% accuracy)`}
            {proposal.reason && ` — ${proposal.reason}`}
          </span>
          <div className={styles.proposalActions}>
            <button
              className={styles.approveBtn}
              onClick={() => actionMutation.mutate({ action: 'approve' })}
              disabled={isBusy}
              type="button"
            >
              <CheckCircle size={12} />
              Approve
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => actionMutation.mutate({ action: 'reject' })}
              disabled={isBusy}
              type="button"
            >
              <XCircle size={12} />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Manual tier change */}
      <div className={styles.tierControls}>
        <span className={styles.tierControlLabel}>Manual tier:</span>
        <select
          className={styles.tierSelect}
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value as AutonomyTier)}
          disabled={isBusy}
        >
          {TIER_OPTIONS.map((t) => (
            <option key={t} value={t}>{TIER_CONFIG[t].label}</option>
          ))}
        </select>
        <button
          className={styles.applyBtn}
          onClick={() => actionMutation.mutate({ action: 'set_tier', tier: selectedTier })}
          disabled={isBusy || selectedTier === config.current_tier}
          type="button"
        >
          <TrendingUp size={12} />
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function TierCalibrationPanel() {
  const { data: configs = [], isFetching, error, refetch } = useQuery<AutonomyConfig[]>({
    queryKey: ['autonomy-configs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/conductor/autonomy');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 3 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const proposalCount = configs.filter(
    (c) => c.proposal != null || c.suggested_proposal != null
  ).length;

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <h3 className={styles.toolbarTitle}>
          <Target size={15} />
          Autonomy Tier Calibration
          {proposalCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '1px 8px', borderRadius: 10,
              background: 'rgba(217,119,6,0.12)', color: '#b45309',
              fontSize: 11, fontWeight: 700,
            }}>
              <AlertTriangle size={10} />
              {proposalCount} proposal{proposalCount > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <button
          className={styles.refreshBtn}
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh"
        >
          <RefreshCw size={14} className={isFetching ? styles.spinning : undefined} />
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {error && (
          <div className={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load autonomy configs'}
          </div>
        )}

        {isFetching && configs.length === 0 && (
          <div className={styles.loading}>Loading autonomy configurations…</div>
        )}

        {!isFetching && !error && configs.length === 0 && (
          <div className={styles.empty}>
            <Target size={32} className={styles.emptyIcon} />
            <span>No autonomy configurations found.</span>
            <span className={styles.emptyHint}>Configurations are created per workflow process.</span>
          </div>
        )}

        {configs.map((config) => (
          <ProcessCard key={config.id} config={config} />
        ))}
      </div>
    </div>
  );
}
