'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Target, CheckCircle, XCircle, TrendingUp, AlertTriangle, Wand2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
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
        <UnifiedSelect
          value={selectedTier}
          onChange={(v) => setSelectedTier(v as AutonomyTier)}
          options={TIER_OPTIONS.map((t) => ({ value: t, label: TIER_CONFIG[t].label }))}
          disabled={isBusy}
          size="sm"
        />
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

// ── Prompt Variants Section ───────────────────────────────────────────────────

interface PromptVariant {
  id: string;
  agent_slug: string;
  proposed_instructions: string;
  rationale: string;
  failure_pattern: string | null;
  quality_delta_pct: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  specialist_agents: { name: string; role: string; category: string };
}

function PromptVariantCard({ variant }: { variant: PromptVariant }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const actionMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      const res = await fetch(`/api/admin/conductor/prompt-variants/${variant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_data, action) => {
      toast.success(action === 'approve' ? 'Prompt variant applied to agent' : 'Proposal rejected');
      queryClient.invalidateQueries({ queryKey: ['prompt-variants'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Action failed'),
  });

  return (
    <div className={styles.processCard}>
      <div className={styles.processCardHeader}>
        <Bot size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
        <span className={styles.processName}>{variant.specialist_agents?.name ?? variant.agent_slug}</span>
        <span className={styles.processMode} style={{ marginLeft: 'auto' }}>
          {variant.specialist_agents?.category}
        </span>
        {variant.quality_delta_pct != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', padding: '1px 7px', borderRadius: 10, background: 'rgba(5,150,105,0.1)' }}>
            +{variant.quality_delta_pct}% expected
          </span>
        )}
      </div>

      {variant.failure_pattern && (
        <div style={{ fontSize: 11, color: '#b45309', padding: '4px 8px', background: 'rgba(217,119,6,0.08)', borderRadius: 4, margin: '4px 0' }}>
          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
          {variant.failure_pattern}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 6px' }}>
        {variant.rationale}
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 6 }}
        type="button"
      >
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {expanded ? 'Hide' : 'Show'} proposed instructions
      </button>

      {expanded && (
        <pre style={{ fontSize: 11, background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)', marginBottom: 8, maxHeight: 200, overflow: 'auto' }}>
          {variant.proposed_instructions}
        </pre>
      )}

      <div className={styles.proposalActions}>
        <button
          className={styles.approveBtn}
          onClick={() => actionMutation.mutate('approve')}
          disabled={actionMutation.isPending}
          type="button"
        >
          <CheckCircle size={12} /> Apply to agent
        </button>
        <button
          className={styles.rejectBtn}
          onClick={() => actionMutation.mutate('reject')}
          disabled={actionMutation.isPending}
          type="button"
        >
          <XCircle size={12} /> Reject
        </button>
      </div>
    </div>
  );
}

function PromptVariantsSection() {
  const { data: resp, isFetching } = useQuery<{ success: boolean; data: PromptVariant[] }>({
    queryKey: ['prompt-variants'],
    queryFn: () => fetch('/api/admin/conductor/prompt-variants?status=pending').then(r => r.json()),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });

  const variants = resp?.data ?? [];

  return (
    <div className={styles.panel} style={{ marginTop: 16 }}>
      <div className={styles.toolbar}>
        <h3 className={styles.toolbarTitle}>
          <Wand2 size={15} />
          Prompt Optimisation Proposals
          {variants.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.12)', color: '#4338ca', fontSize: 11, fontWeight: 700 }}>
              {variants.length} pending
            </span>
          )}
        </h3>
      </div>
      <div className={styles.body}>
        {isFetching && variants.length === 0 && (
          <div className={styles.loading}>Loading proposals…</div>
        )}
        {!isFetching && variants.length === 0 && (
          <div className={styles.empty}>
            <Wand2 size={28} className={styles.emptyIcon} />
            <span>No pending proposals.</span>
            <span className={styles.emptyHint}>The autonomy-calibrator generates these weekly based on agent quality data.</span>
          </div>
        )}
        {variants.map(v => <PromptVariantCard key={v.id} variant={v} />)}
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
    refetchOnWindowFocus: true,
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
      <PromptVariantsSection />
    </div>
  );
}
