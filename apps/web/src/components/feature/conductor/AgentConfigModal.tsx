'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Stamp } from 'lucide-react';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import styles from './AgentConfigModal.module.css';

/* ── Types ── */

interface AgentConfig {
  tools?: string[];
  skills?: string[];
  instructions?: string;
  system_prompt_template?: string;
  [key: string]: unknown;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  config: AgentConfig;
  seed_config?: AgentConfig | null;
  status: 'active' | 'inactive';
  built_in: boolean;
}

interface AnalystTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  built_in: boolean;
  status: string;
}

interface AgentConfigModalProps {
  mode: 'create' | 'edit';
  agent?: SpecialistAgent | null;
  onClose: () => void;
}

const DEPARTMENTS = ['Engineering', 'Marketing', 'Operations', 'Analytics', 'Security', 'Product', 'Content'] as const;
const CATEGORIES = ['all', 'analytics', 'actions', 'notifications'] as const;

/* ── Component ── */

export function AgentConfigModal({ mode, agent, onClose }: AgentConfigModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState(agent?.name ?? '');
  const [slug, setSlug] = useState(agent?.slug ?? '');
  const [role, setRole] = useState(agent?.role ?? '');
  const [department, setDepartment] = useState(agent?.department ?? 'Engineering');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [instructions, setInstructions] = useState((agent?.config?.instructions as string) ?? '');
  const [selectedTools, setSelectedTools] = useState<string[]>(agent?.config?.tools ?? []);

  // Tool picker state
  const [toolSearch, setToolSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<'accept_seed' | 'reset_seed' | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name (create mode only)
  useEffect(() => {
    if (mode === 'create' && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [mode, name]);

  // Fetch available tools
  const { data: allTools = [] } = useQuery({
    queryKey: ['admin-tools'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tools');
      const json = await res.json() as { success: boolean; data: AnalystTool[] };
      if (!json.success) throw new Error('Failed to load tools');
      return json.data;
    },
    staleTime: 5 * 60_000,
  });

  // Seed tools (for built-in agents only)
  const seedTools = useMemo<string[]>(() => {
    if (!agent?.built_in || !agent.seed_config) return [];
    return agent.seed_config.tools ?? [];
  }, [agent]);

  // Filtered tools
  const filteredTools = useMemo(() => {
    let tools = allTools.filter(t => t.status === 'active');
    if (categoryFilter !== 'all') {
      tools = tools.filter(t => t.category === categoryFilter);
    }
    if (toolSearch.trim()) {
      const q = toolSearch.toLowerCase();
      tools = tools.filter(t =>
        t.slug.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    // Selected tools first
    return tools.sort((a, b) => {
      const aSelected = selectedTools.includes(a.slug) ? 0 : 1;
      const bSelected = selectedTools.includes(b.slug) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [allTools, categoryFilter, toolSearch, selectedTools]);

  // Seed diff indicators
  const getToolSeedStatus = (toolSlug: string): 'seed' | 'added' | 'removed' | null => {
    if (!agent?.built_in || !agent.seed_config) return null;
    const inSeed = seedTools.includes(toolSlug);
    const inSelected = selectedTools.includes(toolSlug);
    if (inSeed && inSelected) return 'seed';
    if (!inSeed && inSelected) return 'added';
    if (inSeed && !inSelected) return 'removed';
    return null;
  };

  const removedSeedTools = seedTools.filter(s => !selectedTools.includes(s));

  // Toggle tool
  const toggleTool = (toolSlug: string) => {
    setSelectedTools(prev =>
      prev.includes(toolSlug) ? prev.filter(s => s !== toolSlug) : [...prev, toolSlug]
    );
  };

  // Build config object preserving existing fields
  const buildConfig = (): AgentConfig => {
    const base: AgentConfig = agent?.config ? { ...agent.config } : {};
    base.tools = selectedTools;
    if (instructions.trim()) {
      base.instructions = instructions.trim();
    } else {
      delete base.instructions;
    }
    return base;
  };

  // Save / Create mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const config = buildConfig();

      if (mode === 'create') {
        if (!slug || !name || !role) throw new Error('Name, slug, and role are required');
        const res = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, name, role, department, description: description || null, config }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to create agent');
        return json;
      } else {
        if (!agent) throw new Error('No agent to update');
        const res = await fetch(`/api/admin/agents/${agent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role, department, description: description || null, config }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to update agent');
        return json;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  // Seed actions
  const seedMutation = useMutation({
    mutationFn: async (action: 'accept_seed' | 'reset_seed') => {
      setError(null);
      if (!agent) throw new Error('No agent');
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to ${action}`);
      return json;
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      if (action === 'reset_seed') {
        setSelectedTools(seedTools);
      }
      setConfirmAction(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setConfirmAction(null);
    },
  });

  const isPending = saveMutation.isPending || seedMutation.isPending;
  const canSave = mode === 'create' ? (name.trim() && slug.trim() && role.trim()) : true;

  const footerContent = (
    <div className={styles.footerInner}>
      {mode === 'edit' && agent?.built_in && (
        <div className={styles.seedActions}>
          <button className={styles.seedBtn} onClick={() => setConfirmAction('reset_seed')} disabled={isPending} title="Reset tools to seed defaults">
            <RotateCcw size={14} /> Reset to Default
          </button>
          <button className={styles.seedBtn} onClick={() => setConfirmAction('accept_seed')} disabled={isPending} title="Accept current config as new seed">
            <Stamp size={14} /> Accept as New Seed
          </button>
        </div>
      )}
      <div className={styles.footerSpacer} />
      <button className={styles.cancelBtn} onClick={onClose} disabled={isPending}>Cancel</button>
      <button className={styles.saveBtn} onClick={() => saveMutation.mutate()} disabled={isPending || !canSave}>
        {isPending ? 'Saving...' : mode === 'create' ? 'Create Agent' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <>
      <HubComplexModal
        isOpen={true}
        onClose={onClose}
        title={mode === 'create' ? 'New Agent' : `Configure ${agent?.name}`}
        size="lg"
        footer={footerContent}
        isLoading={isPending}
        loadingText="Saving changes..."
        closeOnOverlayClick={!isPending}
      >
        <div className={styles.body}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Identity fields */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Name *</label>
              <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Market Intelligence" disabled={isPending} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Slug</label>
              <input className={styles.input} value={slug} onChange={e => setSlug(e.target.value)} placeholder="market-intelligence" disabled={mode === 'edit' || isPending} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Role *</label>
              <input className={styles.input} value={role} onChange={e => setRole(e.target.value)} placeholder="Market Intelligence Analyst" disabled={isPending} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Department</label>
              <UnifiedSelect
                options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                value={department}
                onChange={v => setDepartment(String(v))}
                disabled={isPending}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this agent does..." disabled={isPending} />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Custom Instructions</label>
            <textarea className={styles.textarea} value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} placeholder="Additional instructions for the agent's system prompt..." disabled={isPending} />
          </div>

          {/* Tools section */}
          <div className={styles.toolsSection}>
            <div className={styles.toolsSectionHeader}>
              <div className={styles.toolsLabel}>
                Tools
                <span className={styles.toolsCount}>{selectedTools.length} selected</span>
              </div>
              {removedSeedTools.length > 0 && (
                <span className={styles.removedSummary}>
                  {removedSeedTools.length} seed tool{removedSeedTools.length > 1 ? 's' : ''} removed
                </span>
              )}
            </div>

            <input
              className={styles.toolsSearch}
              value={toolSearch}
              onChange={e => setToolSearch(e.target.value)}
              placeholder="Search tools..."
              disabled={isPending}
            />

            <div className={styles.categoryChips}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={categoryFilter === cat ? styles.categoryChipActive : styles.categoryChip}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.toolsList}>
              {filteredTools.length === 0 ? (
                <div className={styles.toolsEmpty}>No tools match your search</div>
              ) : (
                filteredTools.map(tool => {
                  const seedStatus = getToolSeedStatus(tool.slug);
                  return (
                    <label key={tool.slug} className={styles.toolRow}>
                      <input
                        type="checkbox"
                        className={styles.toolCheckbox}
                        checked={selectedTools.includes(tool.slug)}
                        onChange={() => toggleTool(tool.slug)}
                        disabled={isPending}
                      />
                      <div className={styles.toolInfo}>
                        <span className={styles.toolSlug}>{tool.slug}</span>
                        <span className={styles.toolDesc}>{tool.description}</span>
                      </div>
                      <div className={styles.toolBadges}>
                        <span className={styles.toolCategoryBadge}>{tool.category}</span>
                        {seedStatus === 'seed' && <span className={styles.seedOriginal}>seed</span>}
                        {seedStatus === 'added' && <span className={styles.seedAdded}>added</span>}
                      </div>
                    </label>
                  );
                })
              )}
              {/* Show removed seed tools that are currently hidden by filters */}
              {removedSeedTools.map(slug => {
                const tool = allTools.find(t => t.slug === slug);
                if (!tool) return null;
                if (filteredTools.some(t => t.slug === slug)) return null;
                return (
                  <label key={slug} className={styles.toolRow} style={{ opacity: 0.6 }}>
                    <input
                      type="checkbox"
                      className={styles.toolCheckbox}
                      checked={false}
                      onChange={() => toggleTool(slug)}
                      disabled={isPending}
                    />
                    <div className={styles.toolInfo}>
                      <span className={styles.toolSlug}>{slug}</span>
                      <span className={styles.toolDesc}>{tool.description}</span>
                    </div>
                    <div className={styles.toolBadges}>
                      <span className={styles.toolCategoryBadge}>{tool.category}</span>
                      <span className={styles.seedRemoved}>removed</span>
                    </div>
                  </label>
                );
              })}
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
              ? 'This will set the current configuration as the new default for this agent. Future resets will restore to this configuration.'
              : 'This will restore the agent\'s tools and configuration to the last accepted seed. Any changes since then will be lost.'}
          </div>
        </HubComplexModal>
      )}
    </>
  );
}
