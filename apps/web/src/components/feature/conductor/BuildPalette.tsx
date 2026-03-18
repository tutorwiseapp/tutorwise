'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Building2, Users, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedSelect } from '@/components/ui/forms';
import { HubComplexModal } from '@/components/hub/modal';
import { BuildAgentModal } from './BuildAgentModal';
import type { BuildLevel } from './build-store';
import styles from './BuildPalette.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpecialistAgentSummary {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  built_in?: boolean;
}

// ── Department colors (match TeamCanvas) ──────────────────────────────────────

const DEPARTMENT_COLORS: Record<string, string> = {
  Development:  '#8b5cf6',
  Quality:      '#f59e0b',
  Security:     '#ef4444',
  Marketing:    '#ec4899',
  Analytics:    '#3b82f6',
  Planning:     '#14b8a6',
  Engineering:  '#6366f1',
  Strategy:     '#7c3aed',
  Management:   '#0891b2',
  Operations:   '#14b8a6',
  Finance:      '#10b981',
  HR:           '#f97316',
  Legal:        '#64748b',
  Product:      '#6366f1',
  Sales:        '#0ea5e9',
  Support:      '#84cc16',
};

// Known departments available in the New Agent dropdown
export const KNOWN_DEPARTMENTS = Object.keys(DEPARTMENT_COLORS);

const FALLBACK_PALETTE = [
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b',
  '#ec4899', '#6366f1', '#ef4444', '#10b981',
];

export function getDeptColor(department: string, index: number): string {
  return DEPARTMENT_COLORS[department] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Space modal body ───────────────────────────────────────────────────────────

function SpaceModalBody({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: toSlug(name) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to create space');
      return json;
    },
    onSuccess: () => {
      toast.success('Space created');
      qc.invalidateQueries({ queryKey: ['build-spaces'] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        style={{ fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontFamily: 'inherit' }}
        placeholder="Space name (e.g. Go-To-Market)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && mutation.mutate()}
        autoFocus
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onDone} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          style={{ height: 34, padding: '0 18px', border: 'none', borderRadius: 8, background: name.trim() ? '#006C67' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
        >
          {mutation.isPending ? 'Creating…' : 'Create Space'}
        </button>
      </div>
    </div>
  );
}

// ── Team modal body ────────────────────────────────────────────────────────────

function TeamModalBody({ spaceId, onDone }: { spaceId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<'supervisor' | 'pipeline' | 'swarm'>('supervisor');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: toSlug(name), pattern, space_id: spaceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to create team');
      return json;
    },
    onSuccess: () => {
      toast.success('Team created');
      qc.invalidateQueries({ queryKey: ['build-teams'] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        style={{ fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontFamily: 'inherit' }}
        placeholder="Team name (e.g. DevOps Team)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && mutation.mutate()}
        autoFocus
      />
      <UnifiedSelect
        value={pattern}
        onChange={(v) => setPattern(v as typeof pattern)}
        options={[
          { value: 'supervisor', label: 'Supervisor — one agent routes tasks' },
          { value: 'pipeline',   label: 'Pipeline — sequential task chain' },
          { value: 'swarm',      label: 'Swarm — dynamic agent routing' },
        ]}
        size="md"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onDone} style={{ height: 34, padding: '0 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          style={{ height: 34, padding: '0 18px', border: 'none', borderRadius: 8, background: name.trim() ? '#006C67' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
        >
          {mutation.isPending ? 'Creating…' : 'Create Team'}
        </button>
      </div>
    </div>
  );
}

// ── Nav item types ────────────────────────────────────────────────────────────

export interface NavSpace {
  id: string;
  name: string;
  color: string;
  teamCount?: number;
}

export interface NavTeam {
  id: string;
  name: string;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  agentCount?: number;
}

const PATTERN_COLORS: Record<string, string> = {
  supervisor: '#7c3aed',
  pipeline:   '#0891b2',
  swarm:      '#d97706',
};

// ── BuildPalette ──────────────────────────────────────────────────────────────

interface BuildPaletteProps {
  level: BuildLevel;
  spaceId: string | null;
  spaceName: string | null;
  teamName: string | null;
  navSpaces?: NavSpace[];
  navTeams?: NavTeam[];
  selectedId?: string | null;
  onNavClick?: (id: string, name: string) => void;
  onNavDrillIn?: (id: string, name: string) => void;
  onAddAgentToCanvas?: (agent: SpecialistAgentSummary) => void;
  triggerCreate?: boolean;
  onTriggerCreateHandled?: () => void;
}

export function BuildPalette({ level, spaceId, spaceName, teamName, navSpaces, navTeams, selectedId, onNavClick, onNavDrillIn, onAddAgentToCanvas, triggerCreate, onTriggerCreateHandled }: BuildPaletteProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showTeamModal,  setShowTeamModal]  = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  // Open the correct modal when toolbar "New" button fires
  useEffect(() => {
    if (!triggerCreate) return;
    setCollapsed(false);
    if (level === 0) setShowSpaceModal(true);
    if (level === 1) setShowTeamModal(true);
    if (level === 2) setShowAgentModal(true);
    onTriggerCreateHandled?.();
  }, [triggerCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear modals when drilling between levels (fixes persistence bug)
  useEffect(() => {
    setShowSpaceModal(false);
    setShowTeamModal(false);
    setShowAgentModal(false);
  }, [level]);

  const { data: agents } = useQuery<SpecialistAgentSummary[]>({
    queryKey: ['build-agents-palette'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to fetch agents');
      return (json.data as SpecialistAgentSummary[]).filter((a) => a.status === 'active');
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const grouped = (agents ?? []).reduce<Record<string, SpecialistAgentSummary[]>>((acc, agent) => {
    const dept = agent.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(agent);
    return acc;
  }, {});

  const handleDragStart = (e: React.DragEvent, agent: SpecialistAgentSummary) => {
    if (level !== 2) { e.preventDefault(); return; }
    e.dataTransfer.setData('application/build-agent-slug', agent.slug);
    e.dataTransfer.setData('application/build-agent-name', agent.name);
    e.dataTransfer.setData('application/build-agent-dept', agent.department);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const titleText =
    level === 0 ? 'Spaces' :
    level === 1 ? (spaceName ?? 'Teams') :
    (teamName ?? 'Agents');

  if (collapsed) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.collapseBtn} onClick={() => setCollapsed(false)} title="Expand panel">
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.palette}>
      {/* Header */}
      <div className={styles.paletteHeader}>
        <div className={styles.paletteTitleGroup}>
          <span className={styles.paletteTitle}>{titleText}</span>
          <span className={styles.paletteSubtitle}>
            {level === 2 ? 'click or drag to add' : 'click to drill in'}
          </span>
        </div>
        <button className={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Collapse">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Modals — portalled to document.body, no z-index conflicts */}
      <HubComplexModal
        isOpen={showSpaceModal}
        onClose={() => setShowSpaceModal(false)}
        title="New Space"
        subtitle="Spaces group related teams and agents"
        size="sm"
      >
        <SpaceModalBody onDone={() => setShowSpaceModal(false)} />
      </HubComplexModal>

      <HubComplexModal
        isOpen={showTeamModal && !!spaceId}
        onClose={() => setShowTeamModal(false)}
        title="New Team"
        subtitle="Teams coordinate groups of specialist agents"
        size="sm"
      >
        {spaceId && <TeamModalBody spaceId={spaceId} onDone={() => setShowTeamModal(false)} />}
      </HubComplexModal>

      <BuildAgentModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onCreated={onAddAgentToCanvas}
      />

      <div className={styles.paletteBody}>
        {/* Level 0: Space navigator */}
        {level === 0 && (
          <>
            <div className={styles.group}>
              <div className={styles.groupLabel}>Spaces</div>
              {(navSpaces ?? []).length === 0 && <div className={styles.emptyHint}>No spaces found.</div>}
            </div>
            {(navSpaces ?? []).map((space) => (
              <div
                key={space.id}
                className={`${styles.navItem} ${selectedId === space.id ? styles.navItemSelected : ''}`}
                onClick={() => onNavClick?.(space.id, space.name)}
                onDoubleClick={() => onNavDrillIn?.(space.id, space.name)}
                title={`Click to view properties · double-click to open ${space.name}`}
              >
                <Building2 size={14} className={styles.navIcon} style={{ color: space.color || '#6b7280', flexShrink: 0 }} />
                <div className={styles.navBody}>
                  <div className={styles.navName}>{space.name}</div>
                  <div className={styles.navMeta}>
                    <span className={styles.navCount}>
                      {space.teamCount ?? 0} team{(space.teamCount ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight size={12} className={styles.navDrillHint} />
              </div>
            ))}
          </>
        )}

        {/* Level 1: Team navigator */}
        {level === 1 && (
          <>
            <div className={styles.group}>
              <div className={styles.groupLabel}>Teams</div>
              {(navTeams ?? []).length === 0 && <div className={styles.emptyHint}>No teams in this space.</div>}
            </div>
            {(navTeams ?? []).map((team) => (
              <div
                key={team.id}
                className={`${styles.navItem} ${selectedId === team.id ? styles.navItemSelected : ''}`}
                onClick={() => onNavClick?.(team.id, team.name)}
                onDoubleClick={() => onNavDrillIn?.(team.id, team.name)}
                title={`Click to view properties · double-click to open ${team.name}`}
              >
                <Users size={14} className={styles.navIcon} style={{ color: PATTERN_COLORS[team.pattern] ?? '#6b7280', flexShrink: 0 }} />
                <div className={styles.navBody}>
                  <div className={styles.navName}>{team.name}</div>
                  <div className={styles.navMeta}>
                    <span className={styles.navCount}>
                      {team.pattern} · {team.agentCount ?? 0} agent{(team.agentCount ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight size={12} className={styles.navDrillHint} />
              </div>
            ))}
          </>
        )}

        {/* Level 2: draggable agent palette */}
        {level === 2 && (
          <>
            {(agents ?? []).length === 0 && (
              <div className={styles.emptyHint}>No agents available.</div>
            )}
            {Object.entries(grouped).map(([dept, deptAgents]) => (
              <div key={dept} className={styles.group}>
                <div className={styles.groupLabel}>{dept}</div>
                {deptAgents.map((agent, i) => (
                  <div
                    key={agent.slug}
                    className={styles.paletteItem}
                    draggable
                    onDragStart={(e) => handleDragStart(e, agent)}
                    title={`${agent.name} — ${agent.role}`}
                  >
                    <Bot
                      size={14}
                      className={styles.navIcon}
                      style={{ color: getDeptColor(agent.department, i), flexShrink: 0 }}
                    />
                    <div className={styles.navBody}>
                      <div className={styles.itemName}>{agent.name}</div>
                      <div className={styles.itemRole}>{agent.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
