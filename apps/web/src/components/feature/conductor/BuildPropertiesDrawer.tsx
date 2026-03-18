'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, RefreshCw, MousePointerClick } from 'lucide-react';
import { UnifiedSelect } from '@/components/ui/forms';
import { useBuildStore } from './build-store';
import type { SkillCategory } from '@/app/api/admin/skill-categories/route';
import styles from './BuildPropertiesDrawer.module.css';

const DOMAIN_ORDER = ['human', 'ai', 'enterprise', 'education', 'workspace'];
const DOMAIN_LABELS: Record<string, string> = { human: 'Human', ai: 'AI', enterprise: 'Enterprise', education: 'Education', workspace: 'Workspace' };

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
}

export interface TeamData {
  id: string;
  name: string;
  description: string | null;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  coordinator_slug: string | null;
  status: string;
  space_id?: string | null;
}

export interface AgentData {
  id: string;
  slug: string;
  name: string;
  role: string;
  category: string;
  sub_category: string | null;
  description: string | null;
  status: string;
}

// ── Shared form props ──────────────────────────────────────────────────────────

interface FormSharedProps {
  saveTrigger: number;
  onStateChange: (isPending: boolean, canSave: boolean) => void;
  onSaved: () => void;
}

// ── Color swatches ─────────────────────────────────────────────────────────────

const SPACE_COLORS = [
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b',
  '#ec4899', '#6366f1', '#ef4444', '#10b981',
  '#6b7280', '#0891b2',
];

// ── Space form ─────────────────────────────────────────────────────────────────

function SpaceForm({ data, saveTrigger, onStateChange, onSaved }: { data: SpaceData } & FormSharedProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description ?? '');
  const [color, setColor] = useState(data.color || SPACE_COLORS[0]);
  const prevTrigger = useRef(saveTrigger);

  useEffect(() => {
    setName(data.name);
    setDescription(data.description ?? '');
    setColor(data.color || SPACE_COLORS[0]);
  }, [data.id, data.name, data.description, data.color]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/spaces/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to save');
      return json;
    },
    onSuccess: () => {
      toast.success('Space saved');
      qc.invalidateQueries({ queryKey: ['build-spaces'] });
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  useEffect(() => { onStateChange(mutation.isPending, !!name.trim()); }, [mutation.isPending, name]);

  useEffect(() => {
    if (saveTrigger === prevTrigger.current) return;
    prevTrigger.current = saveTrigger;
    if (name.trim()) mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveTrigger]);

  return (
    <div className={styles.content}>
      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Color</label>
        <div className={styles.colorRow}>
          {SPACE_COLORS.map((c) => (
            <div
              key={c}
              className={styles.colorSwatch}
              style={{ background: c, border: color === c ? '2px solid #111827' : '2px solid transparent', boxShadow: color === c ? '0 0 0 1px #111827' : 'none' }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Team form ──────────────────────────────────────────────────────────────────

function TeamForm({ data, saveTrigger, onStateChange, onSaved }: { data: TeamData } & FormSharedProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(data.name);
  const [description, setDescription] = useState(data.description ?? '');
  const [pattern, setPattern] = useState<TeamData['pattern']>(data.pattern);
  const [spaceId, setSpaceId] = useState<string>(data.space_id ?? '');
  const prevTrigger = useRef(saveTrigger);

  const { data: spaces = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['build-spaces-select'],
    queryFn: async () => {
      const res = await fetch('/api/admin/spaces?status=active');
      const json = await res.json();
      if (!json.success) return [];
      return json.data as { id: string; name: string }[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setName(data.name);
    setDescription(data.description ?? '');
    setPattern(data.pattern);
    setSpaceId(data.space_id ?? '');
  }, [data.id, data.name, data.description, data.pattern, data.space_id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/teams/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          pattern,
          space_id: spaceId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to save');
      return json;
    },
    onSuccess: () => {
      toast.success('Team saved');
      qc.invalidateQueries({ queryKey: ['build-teams'] });
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  useEffect(() => { onStateChange(mutation.isPending, !!name.trim()); }, [mutation.isPending, name]);

  useEffect(() => {
    if (saveTrigger === prevTrigger.current) return;
    prevTrigger.current = saveTrigger;
    if (name.trim()) mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveTrigger]);

  return (
    <div className={styles.content}>
      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Pattern</label>
        <UnifiedSelect
          value={pattern}
          onChange={(v) => setPattern(v as TeamData['pattern'])}
          options={[
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'pipeline',   label: 'Pipeline' },
            { value: 'swarm',      label: 'Swarm' },
          ]}
          size="sm"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Space</label>
        <UnifiedSelect
          value={spaceId}
          onChange={(v) => setSpaceId(v as string)}
          placeholder="Unassigned"
          options={[
            { value: '', label: 'Unassigned' },
            ...spaces.map((s) => ({ value: s.id, label: s.name })),
          ]}
          size="sm"
        />
      </div>
    </div>
  );
}

// ── Agent form ─────────────────────────────────────────────────────────────────

function AgentForm({ data, saveTrigger, onStateChange, onSaved }: { data: AgentData } & FormSharedProps) {
  const qc = useQueryClient();
  const [name,        setName]        = useState(data.name);
  const [role,        setRole]        = useState(data.role);
  const [category,    setCategory]    = useState(data.category);
  const [subCategory, setSubCategory] = useState(data.sub_category ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const prevTrigger = useRef(saveTrigger);

  useEffect(() => {
    setName(data.name);
    setRole(data.role);
    setCategory(data.category);
    setSubCategory(data.sub_category ?? '');
    setDescription(data.description ?? '');
  }, [data.id, data.name, data.role, data.category, data.sub_category, data.description]);

  const { data: skillCategories = [] } = useQuery<SkillCategory[]>({
    queryKey: ['skill-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/skill-categories');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 30 * 60_000,
  });

  const categoryOptions = useMemo(() => {
    const topLevel = skillCategories.filter((c) => !c.parent_slug);
    const grouped: Record<string, SkillCategory[]> = {};
    for (const cat of topLevel) {
      if (!grouped[cat.domain]) grouped[cat.domain] = [];
      grouped[cat.domain].push(cat);
    }
    const opts: { value: string; label: string }[] = [];
    for (const domain of DOMAIN_ORDER) {
      for (const cat of grouped[domain] ?? []) {
        opts.push({ value: cat.slug, label: `${DOMAIN_LABELS[domain]} · ${cat.label}` });
      }
    }
    return opts.length > 0 ? opts : [{ value: 'engineering', label: 'Human · Engineering' }];
  }, [skillCategories]);

  const subCategoryOptions = useMemo(() =>
    skillCategories
      .filter((c) => c.parent_slug === category)
      .map((c) => ({ value: c.slug, label: c.label })),
  [skillCategories, category]);

  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setSubCategory('');
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/agents/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          category: category.trim(),
          sub_category: subCategory || null,
          description: description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to save');
      return json;
    },
    onSuccess: () => {
      toast.success('Agent saved');
      qc.invalidateQueries({ queryKey: ['build-agents-palette'] });
      qc.invalidateQueries({ queryKey: ['build-agents'] });
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Save failed'),
  });

  useEffect(() => { onStateChange(mutation.isPending, !!name.trim()); }, [mutation.isPending, name]);

  useEffect(() => {
    if (saveTrigger === prevTrigger.current) return;
    prevTrigger.current = saveTrigger;
    if (name.trim()) mutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveTrigger]);

  return (
    <div className={styles.content}>
      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Role</label>
        <input className={styles.input} value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Category</label>
        <UnifiedSelect
          options={categoryOptions}
          value={category}
          onChange={(v) => handleCategoryChange(String(v))}
          size="sm"
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Sub-category</label>
        <UnifiedSelect
          options={[{ value: '', label: 'General' }, ...subCategoryOptions]}
          value={subCategory}
          onChange={(v) => setSubCategory(String(v))}
          placeholder={subCategoryOptions.length > 0 ? 'Select subject…' : 'No sub-categories'}
          size="sm"
          disabled={subCategoryOptions.length === 0}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────────────────────────

interface BuildPropertiesDrawerProps {
  spaceData?: SpaceData;
  teamData?: TeamData;
  agentData?: AgentData;
  onClose: () => void;
  onSaved?: () => void;
}

export function BuildPropertiesDrawer({ spaceData, teamData, agentData, onSaved }: BuildPropertiesDrawerProps) {
  const { selectedNodeType } = useBuildStore();
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [formState, setFormState] = useState({ isPending: false, canSave: false });

  const handleStateChange = (isPending: boolean, canSave: boolean) => setFormState({ isPending, canSave });

  return (
    <div className={styles.drawer} role="complementary" aria-label="Node properties">
      <div className={styles.header}>
        <h3 className={styles.title}>Properties</h3>
        {selectedNodeType && (
          <button
            className={styles.headerSaveBtn}
            onClick={() => setSaveTrigger((t) => t + 1)}
            disabled={!formState.canSave || formState.isPending}
            title="Save"
          >
            {formState.isPending
              ? <RefreshCw size={15} className={styles.spinning} />
              : <Save size={15} />}
          </button>
        )}
      </div>

      {!selectedNodeType && (
        <div className={styles.emptyState}>
          <MousePointerClick size={28} style={{ color: 'var(--color-text-tertiary, #9ca3af)' }} />
          <div className={styles.emptyTitle}>No node selected</div>
          <div className={styles.emptyDescription}>
            Click on a node in the canvas to view and edit its properties.
          </div>
        </div>
      )}

      {selectedNodeType === 'space' && spaceData && (
        <SpaceForm data={spaceData} saveTrigger={saveTrigger} onStateChange={handleStateChange} onSaved={() => onSaved?.()} />
      )}
      {selectedNodeType === 'team' && teamData && (
        <TeamForm data={teamData} saveTrigger={saveTrigger} onStateChange={handleStateChange} onSaved={() => onSaved?.()} />
      )}
      {selectedNodeType === 'agent' && agentData && (
        <AgentForm data={agentData} saveTrigger={saveTrigger} onStateChange={handleStateChange} onSaved={() => onSaved?.()} />
      )}
    </div>
  );
}
