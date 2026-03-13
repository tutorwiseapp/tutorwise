'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Stamp } from 'lucide-react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './TeamConfigModal.module.css';

/* ── Types ── */

interface TeamNode {
  id: string;
  data: { agentSlug: string; [key: string]: unknown };
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: TeamNode[];
  edges: unknown[];
  coordinator_slug: string | null;
  config: Record<string, unknown>;
  seed_config?: {
    nodes?: TeamNode[];
    coordinator_slug?: string | null;
    pattern?: string;
  } | null;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
}

interface Space {
  id: string;
  slug: string;
  name: string;
}

interface TeamConfigModalProps {
  mode: 'create' | 'edit';
  team?: AgentTeam | null;
  onClose: () => void;
}

const PATTERNS = [
  { value: 'supervisor', label: 'Supervisor', desc: 'Parallel specialists, coordinator synthesis' },
  { value: 'pipeline', label: 'Pipeline', desc: 'Sequential execution in order' },
  { value: 'swarm', label: 'Swarm', desc: 'Dynamic routing via NEXT_AGENT' },
] as const;

/* ── Component ── */

export function TeamConfigModal({ mode, team, onClose }: TeamConfigModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState(team?.name ?? '');
  const [slug, setSlug] = useState(team?.slug ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [pattern, setPattern] = useState<'supervisor' | 'pipeline' | 'swarm'>(team?.pattern ?? 'supervisor');
  const [coordinatorSlug, setCoordinatorSlug] = useState(team?.coordinator_slug ?? '');
  const [spaceId, setSpaceId] = useState(team?.space_id ?? '');
  const [selectedAgentSlugs, setSelectedAgentSlugs] = useState<string[]>(
    team?.nodes?.map(n => n.data.agentSlug) ?? []
  );

  // Search & confirm state
  const [agentSearch, setAgentSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<'accept_seed' | 'reset_seed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug
  useEffect(() => {
    if (mode === 'create' && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [mode, name]);

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents');
      const json = await res.json() as { success: boolean; data: SpecialistAgent[] };
      if (!json.success) throw new Error('Failed');
      return json.data;
    },
    staleTime: 5 * 60_000,
  });

  // Fetch spaces
  const { data: spaces = [] } = useQuery({
    queryKey: ['admin-spaces'],
    queryFn: async () => {
      const res = await fetch('/api/admin/spaces');
      const json = await res.json() as { success: boolean; data: Space[] };
      if (!json.success) return [];
      return json.data;
    },
    staleTime: 5 * 60_000,
  });

  // Seed data
  const seedAgentSlugs = useMemo<string[]>(() => {
    if (!team?.built_in || !team.seed_config?.nodes) return [];
    return team.seed_config.nodes.map(n => n.data.agentSlug);
  }, [team]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    let list = agents;
    if (agentSearch.trim()) {
      const q = agentSearch.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const aSelected = selectedAgentSlugs.includes(a.slug) ? 0 : 1;
      const bSelected = selectedAgentSlugs.includes(b.slug) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [agents, agentSearch, selectedAgentSlugs]);

  const getAgentSeedStatus = (agentSlug: string): 'seed' | 'added' | null => {
    if (!team?.built_in || !team.seed_config) return null;
    const inSeed = seedAgentSlugs.includes(agentSlug);
    const inSelected = selectedAgentSlugs.includes(agentSlug);
    if (inSeed && inSelected) return 'seed';
    if (!inSeed && inSelected) return 'added';
    return null;
  };

  const toggleAgent = (agentSlug: string) => {
    setSelectedAgentSlugs(prev =>
      prev.includes(agentSlug) ? prev.filter(s => s !== agentSlug) : [...prev, agentSlug]
    );
  };

  // Build nodes from selected slugs
  const buildNodes = (): TeamNode[] =>
    selectedAgentSlugs.map((slug, i) => ({
      id: `node-${i}`,
      data: { agentSlug: slug },
    }));

  // Save / Create
  const saveMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const nodes = buildNodes();

      if (mode === 'create') {
        if (!slug || !name) throw new Error('Name and slug are required');
        const res = await fetch('/api/admin/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug, name,
            description: description || null,
            pattern,
            nodes,
            coordinator_slug: pattern === 'supervisor' ? (coordinatorSlug || null) : null,
            space_id: spaceId || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to create team');
        return json;
      } else {
        if (!team) throw new Error('No team to update');
        const res = await fetch(`/api/admin/teams/${team.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || null,
            pattern,
            nodes,
            coordinator_slug: pattern === 'supervisor' ? (coordinatorSlug || null) : null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to update team');
        return json;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Seed actions
  const seedMutation = useMutation({
    mutationFn: async (action: 'accept_seed' | 'reset_seed') => {
      setError(null);
      if (!team) throw new Error('No team');
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to ${action}`);
      return json;
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      if (action === 'reset_seed' && team?.seed_config) {
        setSelectedAgentSlugs(seedAgentSlugs);
        if (team.seed_config.pattern) setPattern(team.seed_config.pattern as typeof pattern);
        if (team.seed_config.coordinator_slug !== undefined) setCoordinatorSlug(team.seed_config.coordinator_slug ?? '');
      }
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setConfirmAction(null);
    },
  });

  const isPending = saveMutation.isPending || seedMutation.isPending;
  const canSave = mode === 'create' ? (name.trim() && slug.trim()) : true;

  const footerContent = (
    <div className={styles.footerInner}>
      {mode === 'edit' && team?.built_in && (
        <div className={styles.seedActions}>
          <button className={styles.seedBtn} onClick={() => setConfirmAction('reset_seed')} disabled={isPending}>
            <RotateCcw size={14} /> Reset to Default
          </button>
          <button className={styles.seedBtn} onClick={() => setConfirmAction('accept_seed')} disabled={isPending}>
            <Stamp size={14} /> Accept as New Seed
          </button>
        </div>
      )}
      <div className={styles.footerSpacer} />
      <button className={styles.cancelBtn} onClick={onClose} disabled={isPending}>Cancel</button>
      <button className={styles.saveBtn} onClick={() => saveMutation.mutate()} disabled={isPending || !canSave}>
        {isPending ? 'Saving...' : mode === 'create' ? 'Create Team' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <>
      <HubComplexModal
        isOpen={true}
        onClose={onClose}
        title={mode === 'create' ? 'New Team' : `Configure ${team?.name}`}
        size="xl"
        footer={footerContent}
        isLoading={isPending}
        loadingText="Saving changes..."
        closeOnOverlayClick={!isPending}
      >
        <div className={styles.body}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.leftCol}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Name *</label>
                <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="DevOps Team" disabled={isPending} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Slug</label>
                <input className={styles.input} value={slug} onChange={e => setSlug(e.target.value)} placeholder="devops-team" disabled={mode === 'edit' || isPending} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this team does..." disabled={isPending} />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Space</label>
                <UnifiedSelect
                  options={[{ value: '', label: 'No space' }, ...spaces.map(s => ({ value: s.id, label: s.name }))]}
                  value={spaceId}
                  onChange={v => setSpaceId(String(v))}
                  placeholder="No space"
                  disabled={mode === 'edit' || isPending}
                />
              </div>
              {pattern === 'supervisor' && (
                <div className={styles.field}>
                  <label className={styles.label}>Coordinator</label>
                  <UnifiedSelect
                    options={[{ value: '', label: 'Select coordinator...' }, ...selectedAgentSlugs.map(s => {
                      const a = agents.find(ag => ag.slug === s);
                      return { value: s, label: a?.name ?? s };
                    })]}
                    value={coordinatorSlug}
                    onChange={v => setCoordinatorSlug(String(v))}
                    placeholder="Select coordinator..."
                    disabled={isPending}
                  />
                </div>
              )}
            </div>

            {/* Pattern */}
            <div className={styles.field}>
              <label className={styles.label}>Pattern</label>
              <div className={styles.patternGroup}>
                {PATTERNS.map(p => (
                  <label
                    key={p.value}
                    className={pattern === p.value ? styles.patternOptionActive : styles.patternOption}
                  >
                    <input
                      type="radio"
                      className={styles.patternRadio}
                      name="pattern"
                      value={p.value}
                      checked={pattern === p.value}
                      onChange={() => setPattern(p.value)}
                      disabled={isPending}
                    />
                    <span className={styles.patternName}>{p.label}</span>
                    <span className={styles.patternDesc}>{p.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — agent picker */}
          <div className={styles.rightCol}>
            <div className={styles.agentPickerLabel}>
              Agents
              <span className={styles.agentPickerCount}>{selectedAgentSlugs.length} selected</span>
            </div>

            <input
              className={styles.agentSearch}
              value={agentSearch}
              onChange={e => setAgentSearch(e.target.value)}
              placeholder="Search agents..."
              disabled={isPending}
            />

            <div className={styles.agentList}>
              {filteredAgents.length === 0 ? (
                <div className={styles.agentListEmpty}>No agents match</div>
              ) : (
                filteredAgents.map(agent => {
                  const seedStatus = getAgentSeedStatus(agent.slug);
                  return (
                    <label key={agent.slug} className={styles.agentRow}>
                      <input
                        type="checkbox"
                        className={styles.agentCheckbox}
                        checked={selectedAgentSlugs.includes(agent.slug)}
                        onChange={() => toggleAgent(agent.slug)}
                        disabled={isPending}
                      />
                      <div className={styles.agentRowInfo}>
                        <span className={styles.agentRowName}>{agent.name}</span>
                        <span className={styles.agentRowDept}>{agent.department}</span>
                      </div>
                      <span className={styles.agentRowBadge}>{agent.role.slice(0, 20)}</span>
                      {seedStatus === 'seed' && <span className={styles.seedOriginal}>seed</span>}
                      {seedStatus === 'added' && <span className={styles.seedAdded}>added</span>}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </HubComplexModal>

      {/* Confirmation dialog */}
      {confirmAction && (
        <HubComplexModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          title={confirmAction === 'accept_seed' ? 'Accept as New Seed?' : 'Reset to Default?'}
          size="sm"
          footer={
            <div className={styles.confirmFooter}>
              <button className={styles.cancelBtn} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={styles.saveBtn} onClick={() => seedMutation.mutate(confirmAction)} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          }
        >
          <div className={styles.confirmBody}>
            {confirmAction === 'accept_seed'
              ? 'This will set the current team configuration as the new default. Future resets will restore to this configuration.'
              : 'This will restore the team\'s agents, pattern, and coordinator to the last accepted seed.'}
          </div>
        </HubComplexModal>
      )}
    </>
  );
}
