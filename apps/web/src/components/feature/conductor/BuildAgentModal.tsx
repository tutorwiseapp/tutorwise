'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { HubComplexModal } from '@/components/hub/modal';
import { UnifiedSelect, UnifiedMultiSelect } from '@/components/ui/forms';
import type { SkillCategory } from '@/app/api/admin/skill-categories/route';
import type { SpecialistAgentSummary } from './BuildPalette';
import styles from './BuildAgentModal.module.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'Director',   label: 'Director' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Specialist', label: 'Specialist' },
  { value: 'Analyst',    label: 'Analyst' },
  { value: 'Reviewer',   label: 'Reviewer' },
  { value: 'Engineer',   label: 'Engineer' },
  { value: 'Developer',  label: 'Developer' },
  { value: 'Tester',     label: 'Tester' },
  { value: 'Security',   label: 'Security' },
  { value: 'Agent',      label: 'Agent' },
];

const STRATEGY_OPTIONS = [
  { value: 'hybrid',     label: 'Hybrid' },
  { value: 'sequential', label: 'Sequential' },
  { value: 'parallel',   label: 'Parallel' },
];

const DOMAIN_ORDER = ['human', 'ai', 'enterprise', 'education', 'workspace'];
const DOMAIN_LABELS: Record<string, string> = {
  human:      'Human',
  ai:         'AI',
  enterprise: 'Enterprise',
  education:  'Education',
  workspace:  'Workspace',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug);
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalystTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
}

export interface BuildAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (agent: SpecialistAgentSummary) => void;
  categoryMap?: Map<string, SkillCategory>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BuildAgentModal({ isOpen, onClose, onCreated, categoryMap }: BuildAgentModalProps) {
  const qc = useQueryClient();

  const [name,           setName]          = useState('');
  const [role,           setRole]          = useState('Specialist');
  const [category,       setCategory]      = useState('engineering');
  const [subCategory,    setSubCategory]   = useState('');
  const [description,    setDescription]   = useState('');
  const [maxTasks,       setMaxTasks]      = useState(5);
  const [strategy,       setStrategy]      = useState('hybrid');
  const [selectedTools,  setSelectedTools] = useState<string[]>([]);

  // Fetch categories from DB (falls back to passed categoryMap)
  const { data: categories = [] } = useQuery<SkillCategory[]>({
    queryKey: ['skill-categories'],
    queryFn: async () => {
      const res = await fetch('/api/admin/skill-categories');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    staleTime: 30 * 60_000,
    enabled: isOpen,
  });

  // Top-level category options grouped by domain
  const categoryOptions = useMemo(() => {
    const source = categories.length > 0
      ? categories
      : categoryMap ? Array.from(categoryMap.values()) : [];

    const topLevel = source.filter((c) => !c.parent_slug);
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
  }, [categories, categoryMap]);

  // Sub-category options — children of the selected category
  const subCategoryOptions = useMemo(() => {
    const source = categories.length > 0
      ? categories
      : categoryMap ? Array.from(categoryMap.values()) : [];
    return source
      .filter((c) => c.parent_slug === category)
      .map((c) => ({ value: c.slug, label: c.label }));
  }, [categories, categoryMap, category]);

  // Reset sub-category when category changes
  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setSubCategory('');
  };

  // Fetch available tools when modal opens
  const { data: tools = [] } = useQuery<AnalystTool[]>({
    queryKey: ['analyst-tools'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tools');
      const json = await res.json();
      return json.success ? json.data : [];
    },
    enabled: isOpen,
    staleTime: 5 * 60_000,
  });

  const slug = toSlug(name);
  const slugValid = name.trim().length >= 2 && isValidSlug(slug);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          role,
          category,
          sub_category: subCategory || undefined,
          description: description.trim() || undefined,
          config: {
            tools: selectedTools,
            max_concurrent_tasks: maxTasks,
            strategy,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to create agent');
      return json.data as SpecialistAgentSummary;
    },
    onSuccess: (agent) => {
      toast.success(`Agent "${agent.name}" created`);
      qc.invalidateQueries({ queryKey: ['build-agents-palette'] });
      qc.invalidateQueries({ queryKey: ['build-agents'] });
      onCreated?.(agent);
      handleClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to create agent'),
  });

  function handleClose() {
    setName(''); setRole('Specialist'); setCategory('engineering');
    setSubCategory(''); setDescription(''); setMaxTasks(5);
    setStrategy('hybrid'); setSelectedTools([]);
    onClose();
  }

  const canCreate = name.trim().length >= 2 && slugValid && !mutation.isPending;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Configure New Agent"
      subtitle="Add a specialist agent to your workspace"
      size="lg"
      isLoading={mutation.isPending}
      loadingText="Creating agent…"
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose} type="button">
            Cancel
          </button>
          <button
            className={styles.createBtn}
            onClick={() => mutation.mutate()}
            disabled={!canCreate}
            type="button"
          >
            <Plus size={14} />
            Create Agent
          </button>
        </div>
      }
    >
      <div className={styles.body}>

        {/* Name */}
        <div className={styles.fullRow}>
          <label className={styles.label}>
            Agent Name <span className={styles.required}>*</span>
          </label>
          <input
            className={styles.input}
            placeholder="e.g. Security Analyst"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {name.trim().length >= 2 && (
            <span className={styles.slugPreview}>
              Slug: <code>{slug || '—'}</code>
              {!slugValid && (
                <span className={styles.slugError}> · needs 3+ chars, no special chars</span>
              )}
            </span>
          )}
        </div>

        {/* Role + Category */}
        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.label}>
              Role <span className={styles.required}>*</span>
            </label>
            <UnifiedSelect
              value={role}
              onChange={(v) => setRole(v as string)}
              options={ROLE_OPTIONS}
              size="md"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <UnifiedSelect
              value={category}
              onChange={(v) => handleCategoryChange(v as string)}
              options={categoryOptions}
              size="md"
            />
          </div>
        </div>

        {/* Sub-category — always visible, enabled only when category has children */}
        <div className={styles.fullRow}>
          <label className={styles.label}>Sub-category</label>
          <UnifiedSelect
            value={subCategory}
            onChange={(v) => setSubCategory(v as string)}
            placeholder={subCategoryOptions.length > 0 ? 'Select subject…' : 'No sub-categories'}
            options={[
              { value: '', label: 'General' },
              ...subCategoryOptions,
            ]}
            size="md"
            disabled={subCategoryOptions.length === 0}
          />
        </div>

        {/* Description */}
        <div className={styles.fullRow}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            placeholder="What does this agent do? How does it collaborate with the team?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Max Tasks + Strategy */}
        <div className={styles.twoCol}>
          <div className={styles.field}>
            <label className={styles.label}>Max Concurrent Tasks</label>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={50}
              value={maxTasks}
              onChange={(e) => setMaxTasks(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Strategy</label>
            <UnifiedSelect
              value={strategy}
              onChange={(v) => setStrategy(v as string)}
              options={STRATEGY_OPTIONS}
              size="md"
            />
          </div>
        </div>

        {/* Tools */}
        <div className={styles.toolsField}>
          <label className={styles.label}>Available Tools</label>
          <UnifiedMultiSelect
            triggerLabel="Available Tools"
            placeholder="Select tools…"
            options={tools.map((t) => ({ value: t.slug, label: t.name }))}
            selectedValues={selectedTools}
            onSelectionChange={setSelectedTools}
            disabled={tools.length === 0}
          />
        </div>

      </div>
    </HubComplexModal>
  );
}
