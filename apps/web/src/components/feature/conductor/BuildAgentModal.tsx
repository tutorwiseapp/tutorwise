'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { HubComplexModal } from '@/components/hub/modal';
import { UnifiedSelect } from '@/components/ui/forms';
import { KNOWN_DEPARTMENTS, type SpecialistAgentSummary } from './BuildPalette';
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
}

// ── Component ──────────────────────────────────────────────────────────────────

export function BuildAgentModal({ isOpen, onClose, onCreated }: BuildAgentModalProps) {
  const qc = useQueryClient();

  const [name,        setName]        = useState('');
  const [role,        setRole]        = useState('Specialist');
  const [department,  setDepartment]  = useState('Engineering');
  const [description, setDescription] = useState('');
  const [maxTasks,    setMaxTasks]    = useState(5);
  const [strategy,    setStrategy]    = useState('hybrid');
  const [skills,      setSkills]      = useState<string[]>([]);
  const [skillInput,  setSkillInput]  = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

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
          department,
          description: description.trim() || undefined,
          config: {
            tools: selectedTools,
            skills,
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
    setName(''); setRole('Specialist'); setDepartment('Engineering');
    setDescription(''); setMaxTasks(5); setStrategy('hybrid');
    setSkills([]); setSkillInput(''); setSelectedTools([]);
    onClose();
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput('');
  }

  function toggleTool(toolSlug: string) {
    setSelectedTools((prev) =>
      prev.includes(toolSlug) ? prev.filter((s) => s !== toolSlug) : [...prev, toolSlug]
    );
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

        {/* Role + Department */}
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
            <label className={styles.label}>Department</label>
            <UnifiedSelect
              value={department}
              onChange={(v) => setDepartment(v as string)}
              options={KNOWN_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              size="md"
            />
          </div>
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

        {/* Skills */}
        <div className={styles.fullRow}>
          <label className={styles.label}>Skills</label>
          <div className={styles.skillRow}>
            <input
              className={styles.input}
              placeholder="Add a skill (e.g. Data Analysis, Email Processing)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            />
            <button
              className={styles.addBtn}
              onClick={addSkill}
              type="button"
              disabled={!skillInput.trim()}
              title="Add skill"
            >
              <Plus size={14} />
            </button>
          </div>
          {skills.length > 0 && (
            <div className={styles.chips}>
              {skills.map((skill) => (
                <span key={skill} className={styles.chip}>
                  {skill}
                  <button
                    className={styles.chipRemove}
                    onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                    type="button"
                    aria-label={`Remove ${skill}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tools */}
        <div className={styles.fullRow}>
          <div className={styles.toolsHeader}>
            <label className={styles.label}>Available Tools</label>
            {selectedTools.length > 0 && (
              <span className={styles.toolsBadge}>{selectedTools.length} selected</span>
            )}
          </div>
          <div className={styles.toolsGrid}>
            {tools.map((tool) => {
              const selected = selectedTools.includes(tool.slug);
              return (
                <button
                  key={tool.slug}
                  className={`${styles.toolChip} ${selected ? styles.toolChipOn : ''}`}
                  onClick={() => toggleTool(tool.slug)}
                  type="button"
                  title={tool.description}
                >
                  {tool.name}
                </button>
              );
            })}
            {tools.length === 0 && (
              <span className={styles.toolsEmpty}>Loading tools…</span>
            )}
          </div>
        </div>

      </div>
    </HubComplexModal>
  );
}
