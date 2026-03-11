'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCenter,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Layers, Users, Plus, RefreshCw, Trash2, X, Check, ChevronDown, GripVertical } from 'lucide-react';
import { useDiscoveryStore } from '@/components/feature/workflow/discovery-store';
import { UnifiedSelect } from '@/app/components/ui/forms';
import styles from './SpacesPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentSpace {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  status: 'active' | 'inactive';
  built_in: boolean;
  updated_at: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: Array<{ id: string }>;
  status: 'active' | 'inactive';
  built_in: boolean;
  space_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#6366f1', '#ec4899', '#14b8a6', '#3b82f6',
  '#f59e0b', '#ef4444', '#8b5cf6', '#10b981',
];

const PATTERN_LABELS: Record<string, string> = {
  supervisor: 'Supervisor',
  pipeline:   'Pipeline',
  swarm:      'Swarm',
};

// ─── Draggable Team Card ───────────────────────────────────────────────────────

interface TeamCardProps {
  team: AgentTeam;
  onRemove?: () => void;
  removingDisabled?: boolean;
  spaces?: AgentSpace[];
  onAssign?: (spaceId: string) => void;
  onNavigate?: (slug: string) => void;
  overlay?: boolean;
}

function TeamCard({ team, onRemove, removingDisabled, spaces, onAssign, onNavigate, overlay = false }: TeamCardProps) {
  const [assignValue, setAssignValue] = useState('');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: team.id,
    data: { team },
    disabled: overlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.teamCard} ${isDragging ? styles.dragging : ''} ${overlay ? styles.draggingOverlay : ''}`}
    >
      <div className={styles.teamCardHeader}>
        <button className={styles.dragHandle} {...listeners} {...attributes} title="Drag to move">
          <GripVertical size={14} />
        </button>
        <div className={styles.teamMeta}>
          <span className={`${styles.statusDot} ${team.status === 'active' ? styles.active : styles.inactive}`} />
          {onNavigate ? (
            <button className={styles.teamNameBtn} onClick={() => onNavigate(team.slug)}>{team.name}</button>
          ) : (
            <span className={styles.teamName}>{team.name}</span>
          )}
          {team.built_in && <span className={styles.builtInBadge}>built-in</span>}
          <span className={styles.patternBadge}>{PATTERN_LABELS[team.pattern]}</span>
        </div>
        {onRemove && (
          <button
            className={styles.removeBtn}
            onClick={onRemove}
            disabled={removingDisabled}
            title="Remove from space"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {team.description && (
        <p className={styles.teamDesc}>{team.description}</p>
      )}

      <div className={styles.teamFooter}>
        <span>{team.nodes.length} agents</span>
        {spaces && onAssign && (
          <UnifiedSelect
            value={assignValue}
            placeholder="Move to space…"
            disabled={removingDisabled}
            onChange={(v) => { setAssignValue(''); if (v) onAssign(v as string); }}
            options={(spaces ?? []).map((s) => ({ value: s.id, label: s.name }))}
            size="xs"
          />
        )}
      </div>
    </div>
  );
}

// ─── Droppable Lane ────────────────────────────────────────────────────────────

function DroppableLane({ id, children, empty }: { id: string; children: React.ReactNode; empty?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.teamGrid} ${isOver ? styles.dropOver : ''} ${empty && isOver ? styles.dropOverEmpty : ''}`}
    >
      {children}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SpacesPanel() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addTeamValues, setAddTeamValues] = useState<Record<string, string>>({});
  const [activeTeam, setActiveTeam] = useState<AgentTeam | null>(null);
  const navigateToTeam = useDiscoveryStore((s) => s.navigateToTeam);

  const [newName,  setNewName]  = useState('');
  const [newDesc,  setNewDesc]  = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    if (showCreateForm) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [showCreateForm]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: spaces = [], isFetching: loadingSpaces, refetch: refetchAll } = useQuery({
    queryKey: ['admin-spaces'],
    queryFn: async () => {
      const res = await fetch('/api/admin/spaces?status=active');
      const json = await res.json() as { success: boolean; data: AgentSpace[] };
      if (!json.success) throw new Error('Failed to load spaces');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: async () => {
      const res = await fetch('/api/admin/teams');
      const json = await res.json() as { success: boolean; data: AgentTeam[] };
      if (!json.success) throw new Error('Failed to load teams');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const loading = loadingSpaces;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createSpaceMutation = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error('Name required');
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name: newName.trim(), description: newDesc.trim() || null, color: newColor }),
      });
      const json = await res.json() as { success: boolean };
      if (!json.success) throw new Error('Failed to create space');
    },
    onSuccess: () => {
      setNewName(''); setNewDesc(''); setNewColor(COLOR_PALETTE[0]);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-spaces'] });
    },
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: async (space: AgentSpace) => {
      if (!confirm(`Deactivate space "${space.name}"? Teams will become unassigned.`)) throw new Error('cancelled');
      await fetch(`/api/admin/spaces/${space.id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-spaces'] }),
  });

  const assignTeamMutation = useMutation({
    mutationFn: async ({ teamId, spaceId }: { teamId: string; spaceId: string | null }) => {
      await fetch(`/api/admin/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: spaceId }),
      });
    },
    onMutate: async ({ teamId, spaceId }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-teams'] });
      const prev = queryClient.getQueryData<AgentTeam[]>(['admin-teams']);
      queryClient.setQueryData<AgentTeam[]>(['admin-teams'], (old = []) =>
        old.map((t) => t.id === teamId ? { ...t, space_id: spaceId } : t)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-teams'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-teams'] }),
  });

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    const team = teams.find((t) => t.id === active.id);
    if (team) setActiveTeam(team);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTeam(null);
    if (!over) return;
    const teamId = active.id as string;
    const team   = teams.find((t) => t.id === teamId);
    if (!team) return;

    const targetSpaceId = over.id === 'unassigned' ? null : (over.id as string);
    if (team.space_id === targetSpaceId) return;
    assignTeamMutation.mutate({ teamId, spaceId: targetSpaceId });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeTeams     = teams.filter((t) => t.status === 'active');
  const teamsForSpace   = (id: string) => activeTeams.filter((t) => t.space_id === id);
  const unassignedTeams = activeTeams.filter((t) => !t.space_id);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && spaces.length === 0) {
    return (
      <div className={styles.loading}>
        <RefreshCw size={16} /> Loading spaces…
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Layers size={18} />
            <span>Agent Spaces</span>
            <span className={styles.badge}>{spaces.length}</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={() => refetchAll()} title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button className={styles.addBtn} onClick={() => setShowCreateForm((v) => !v)}>
              <Plus size={14} /> New Space
            </button>
          </div>
        </div>

        {/* ── Create form ── */}
        {showCreateForm && (
          <div className={styles.createForm}>
            <div className={styles.colorRow}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${newColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                  title={c}
                />
              ))}
            </div>
            <input
              ref={nameInputRef}
              className={styles.formInput}
              placeholder="Space name (e.g. Go to Market)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSpaceMutation.mutate()}
            />
            <input
              className={styles.formInput}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreateForm(false)}>
                <X size={13} /> Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={() => createSpaceMutation.mutate()}
                disabled={createSpaceMutation.isPending || !newName.trim()}
              >
                <Check size={13} /> {createSpaceMutation.isPending ? 'Creating…' : 'Create Space'}
              </button>
            </div>
          </div>
        )}

        {/* ── Space swimlanes ── */}
        <div className={styles.swimlanes}>
          {spaces.map((space) => {
            const spaceTeams     = teamsForSpace(space.id);
            const availableTeams = unassignedTeams;

            return (
              <div key={space.id} className={styles.swimlane}>

                {/* Lane header */}
                <div className={styles.laneHeader} style={{ '--lane-color': space.color } as React.CSSProperties}>
                  <div className={styles.laneMeta}>
                    <span className={styles.colorDot} style={{ background: space.color }} />
                    <span className={styles.laneName}>{space.name}</span>
                    {space.built_in && <span className={styles.builtInBadge}>built-in</span>}
                    <span className={styles.teamCount}>
                      <Users size={11} />
                      {spaceTeams.length} {spaceTeams.length === 1 ? 'team' : 'teams'}
                    </span>
                  </div>
                  <div className={styles.laneActions}>
                    {availableTeams.length > 0 && (
                      <UnifiedSelect
                        value={addTeamValues[space.id] ?? ''}
                        placeholder="+ Add team"
                        onChange={(v) => {
                          setAddTeamValues((prev) => ({ ...prev, [space.id]: '' }));
                          if (v) assignTeamMutation.mutate({ teamId: v as string, spaceId: space.id });
                        }}
                        options={availableTeams.map((t) => ({ value: t.id, label: t.name }))}
                        size="xs"
                      />
                    )}
                    {!space.built_in && (
                      <button
                        className={styles.laneDeleteBtn}
                        onClick={() => deleteSpaceMutation.mutate(space)}
                        title="Deactivate space"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {space.description && (
                  <p className={styles.laneDesc}>{space.description}</p>
                )}

                {/* Droppable team grid */}
                <DroppableLane id={space.id} empty={spaceTeams.length === 0}>
                  {spaceTeams.length === 0 ? (
                    <p className={styles.emptyLane}>Drop a team here or use "+ Add team" above.</p>
                  ) : (
                    spaceTeams.map((team) => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        onRemove={() => assignTeamMutation.mutate({ teamId: team.id, spaceId: null })}
                        removingDisabled={assignTeamMutation.isPending}
                        spaces={spaces.filter((s) => s.id !== space.id)}
                        onAssign={(sid) => assignTeamMutation.mutate({ teamId: team.id, spaceId: sid })}
                        onNavigate={navigateToTeam}
                      />
                    ))
                  )}
                </DroppableLane>
              </div>
            );
          })}
        </div>

        {/* ── Unassigned teams ── */}
        {unassignedTeams.length > 0 && (
          <div className={styles.unassignedSection}>
            <div className={styles.unassignedHeader}>
              <Users size={14} />
              <span>Unassigned Teams</span>
              <span className={styles.badge}>{unassignedTeams.length}</span>
            </div>
            <DroppableLane id="unassigned">
              {unassignedTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  spaces={spaces}
                  onAssign={(sid) => assignTeamMutation.mutate({ teamId: team.id, spaceId: sid })}
                  removingDisabled={assignTeamMutation.isPending}
                  onNavigate={navigateToTeam}
                />
              ))}
            </DroppableLane>
          </div>
        )}
      </div>

      {/* ── Drag overlay (ghost card) ── */}
      <DragOverlay dropAnimation={null}>
        {activeTeam ? (
          <TeamCard team={activeTeam} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
