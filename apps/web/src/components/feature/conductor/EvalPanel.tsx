'use client';

/**
 * EvalPanel — DSPy-inspired prompt evaluation for specialist agents.
 *
 * Test cases are stored in localStorage (no migration needed).
 * Each test case has an input task + expected keyword assertions.
 * Evaluation calls the existing /api/admin/agents/[id]/run endpoint.
 *
 * Pass criteria: ALL expected keywords found in output (case-insensitive).
 * If no keywords defined: passes if agent completes without error.
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Plus,
  Loader2, RefreshCw, FlaskConical,
} from 'lucide-react';
import { HubDataTable } from '@/components/hub/data';
import type { Column, Filter } from '@/components/hub/data';
import VerticalDotsMenu from '@/components/ui/actions/VerticalDotsMenu';
import type { MenuAction } from '@/components/ui/actions/VerticalDotsMenu';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import Modal from '@/components/ui/feedback/Modal';
import { HubWidgetCard } from '@/components/hub/content';
import styles from './EvalPanel.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
}

interface EvalTestCase {
  id: string;
  name: string;
  inputTask: string;
  expectedKeywords: string[];
  lastOutput: string | null;
  lastPassed: boolean | null;
  lastRunAt: string | null;
  lastDurationMs: number | null;
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const storageKey = (slug: string) => `eval_cases_${slug}`;

function loadCases(slug: string): EvalTestCase[] {
  if (typeof window === 'undefined' || !slug) return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(slug)) ?? '[]');
  } catch {
    return [];
  }
}

function saveCases(slug: string, cases: EvalTestCase[]) {
  localStorage.setItem(storageKey(slug), JSON.stringify(cases));
}

// ── Pass/fail logic ────────────────────────────────────────────────────────────

function evaluate(output: string, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const lower = output.toLowerCase();
  return keywords.every(kw => lower.includes(kw.toLowerCase().trim()));
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Main EvalPanel ─────────────────────────────────────────────────────────────

export function EvalPanel() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [cases, setCases] = useState<EvalTestCase[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [runAllActive, setRunAllActive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const stopRef = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<EvalTestCase | null>(null);
  const [formName, setFormName] = useState('');
  const [formInputTask, setFormInputTask] = useState('');
  const [formKeywords, setFormKeywords] = useState('');

  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents'],
    queryFn: async () => {
      const res = await fetch('/api/admin/agents');
      const json = await res.json() as { success: boolean; data: SpecialistAgent[] };
      if (!json.success) throw new Error('Failed to load agents');
      return json.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always' as const,
    refetchOnWindowFocus: true,
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;

  const handleAgentChange = (id: string) => {
    setSelectedAgentId(id);
    setCases(loadCases(agents.find(a => a.id === id)?.slug ?? ''));
    setExpandedId(null);
    setSearchQuery('');
  };

  const persistCases = (slug: string, updated: EvalTestCase[]) => {
    saveCases(slug, updated);
    setCases(updated);
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openAddModal = useCallback(() => {
    setEditingCase(null);
    setFormName('');
    setFormInputTask('');
    setFormKeywords('');
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((tc: EvalTestCase) => {
    setEditingCase(tc);
    setFormName(tc.name);
    setFormInputTask(tc.inputTask);
    setFormKeywords(tc.expectedKeywords.join(', '));
    setModalOpen(true);
  }, []);

  const handleModalSave = useCallback(() => {
    if (!selectedAgent || !formName.trim() || !formInputTask.trim()) return;
    const keywords = formKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    if (editingCase) {
      const updated = cases.map(c =>
        c.id === editingCase.id
          ? { ...c, name: formName.trim(), inputTask: formInputTask.trim(), expectedKeywords: keywords }
          : c
      );
      persistCases(selectedAgent.slug, updated);
    } else {
      const newCase: EvalTestCase = {
        id: crypto.randomUUID(),
        name: formName.trim(),
        inputTask: formInputTask.trim(),
        expectedKeywords: keywords,
        lastOutput: null,
        lastPassed: null,
        lastRunAt: null,
        lastDurationMs: null,
      };
      persistCases(selectedAgent.slug, [...cases, newCase]);
    }
    setModalOpen(false);
  }, [selectedAgent, formName, formInputTask, formKeywords, editingCase, cases]);

  const handleDeleteCase = (id: string) => {
    if (!selectedAgent) return;
    persistCases(selectedAgent.slug, cases.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // ── Run logic ──────────────────────────────────────────────────────────────

  const runCase = async (tc: EvalTestCase): Promise<EvalTestCase> => {
    if (!selectedAgent) return tc;
    const start = Date.now();
    try {
      const res = await fetch(`/api/admin/agents/${selectedAgent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: tc.inputTask }),
      });
      const json = await res.json() as { success: boolean; data: { output_text: string; status: string; duration_ms: number } };
      const output = json.data?.output_text ?? '';
      const passed = json.success && evaluate(output, tc.expectedKeywords);
      return {
        ...tc,
        lastOutput: output,
        lastPassed: passed,
        lastRunAt: new Date().toISOString(),
        lastDurationMs: json.data?.duration_ms ?? (Date.now() - start),
      };
    } catch {
      return {
        ...tc,
        lastOutput: 'Run failed',
        lastPassed: false,
        lastRunAt: new Date().toISOString(),
        lastDurationMs: Date.now() - start,
      };
    }
  };

  const handleRunOne = async (tc: EvalTestCase) => {
    if (!selectedAgent || runningIds.has(tc.id)) return;
    setRunningIds(prev => new Set([...prev, tc.id]));
    const updated = await runCase(tc);
    setCases(prev => {
      const next = prev.map(c => c.id === tc.id ? updated : c);
      saveCases(selectedAgent.slug, next);
      return next;
    });
    setRunningIds(prev => { const s = new Set(prev); s.delete(tc.id); return s; });
  };

  const handleRunAll = async () => {
    if (!selectedAgent || !cases.length || runAllActive) return;
    stopRef.current = false;
    setRunAllActive(true);
    let current = [...cases];
    for (const tc of current) {
      if (stopRef.current) break;
      setRunningIds(prev => new Set([...prev, tc.id]));
      const updated = await runCase(tc);
      current = current.map(c => c.id === tc.id ? updated : c);
      setCases([...current]);
      saveCases(selectedAgent.slug, current);
      setRunningIds(prev => { const s = new Set(prev); s.delete(tc.id); return s; });
    }
    setRunAllActive(false);
  };

  const handleClearResults = () => {
    if (!selectedAgent) return;
    const cleared = cases.map(c => ({
      ...c,
      lastOutput: null,
      lastPassed: null,
      lastRunAt: null,
      lastDurationMs: null,
    }));
    persistCases(selectedAgent.slug, cleared);
  };

  // ── Filter: agent picker as a toolbar filter ──────────────────────────────

  const agentFilter: Filter[] = useMemo(() => [
    {
      key: 'agent_id',
      label: 'All Agents',
      options: agents.map(a => ({ value: a.id, label: `${a.name} — ${a.role}` })),
    },
  ], [agents]);

  const handleFilterChange = useCallback((key: string, value: string | string[]) => {
    if (key === 'agent_id') {
      handleAgentChange(String(value));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  // ── Filtered data (client-side search) ────────────────────────────────────

  const filteredCases = useMemo(() => {
    if (!searchQuery) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.inputTask.toLowerCase().includes(q) ||
      c.expectedKeywords.some(kw => kw.toLowerCase().includes(q))
    );
  }, [cases, searchQuery]);

  // ── Columns ────────────────────────────────────────────────────────────────

  const evalColumns: Column<EvalTestCase>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Test Case',
      render: (row) => <span className={styles.caseName}>{row.name}</span>,
    },
    {
      key: 'inputTask',
      label: 'Input Task',
      hideOnMobile: true,
      render: (row) => (
        <span className={styles.caseTask}>{row.inputTask.length > 60 ? row.inputTask.slice(0, 60) + '…' : row.inputTask}</span>
      ),
    },
    {
      key: 'keywords',
      label: 'Keywords',
      width: '120px',
      hideOnMobile: true,
      render: (row) => (
        <span className={styles.caseKeywords}>
          {row.expectedKeywords.length > 0
            ? `${row.expectedKeywords.length} keyword${row.expectedKeywords.length > 1 ? 's' : ''}`
            : <span className={styles.noKeywords}>any</span>
          }
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (row) => {
        const running = runningIds.has(row.id);
        if (running) return <Loader2 size={14} className={styles.spin} style={{ color: '#2563eb' }} />;
        if (row.lastPassed === true) return <StatusBadge variant="active" label="pass" size="xs" />;
        if (row.lastPassed === false) return <StatusBadge variant="error" label="fail" size="xs" />;
        return <StatusBadge variant="neutral" label="not run" size="xs" shape="rect" />;
      },
    },
    {
      key: 'lastRun',
      label: 'Last Run',
      width: '100px',
      hideOnMobile: true,
      render: (row) => <span className={styles.caseTime}>{timeAgo(row.lastRunAt)}</span>,
    },
    {
      key: 'duration',
      label: 'Duration',
      width: '90px',
      hideOnMobile: true,
      render: (row) => <span className={styles.caseDuration}>{fmtDuration(row.lastDurationMs)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '80px',
      render: (row) => {
        const running = runningIds.has(row.id);
        const actions: MenuAction[] = [
          {
            label: running ? 'Running…' : 'Run',
            onClick: () => handleRunOne(row),
            disabled: running,
          },
          {
            label: 'Edit',
            onClick: () => openEditModal(row),
          },
          ...(row.lastOutput ? [{
            label: 'View Output',
            onClick: () => setExpandedId(prev => prev === row.id ? null : row.id),
          }] : []),
          {
            label: 'Delete',
            variant: 'danger' as const,
            onClick: () => { if (confirm(`Delete "${row.name}"?`)) handleDeleteCase(row.id); },
          },
        ];
        return <VerticalDotsMenu actions={actions} />;
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [runningIds, expandedId, openEditModal]);

  // ── Toolbar actions (right side of table toolbar) ─────────────────────────

  const toolbarActions = useMemo(() => (
    <div className={styles.toolbarActions}>
      {selectedAgent && cases.length > 0 && (
        <>
          <button
            className={styles.clearBtn}
            onClick={handleClearResults}
            disabled={runAllActive}
            title="Clear all results"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className={styles.runAllBtn}
            onClick={runAllActive ? () => { stopRef.current = true; } : handleRunAll}
          >
            {runAllActive
              ? <><Loader2 size={13} className={styles.spin} /> Stop</>
              : <><Play size={13} /> Run All</>
            }
          </button>
        </>
      )}
      <button
        className={styles.addBtn}
        onClick={openAddModal}
        disabled={!selectedAgent}
      >
        <Plus size={13} /> Add Test
      </button>
    </div>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [cases.length, selectedAgent, runAllActive, openAddModal]);

  // ── Empty state ───────────────────────────────────────────────────────────

  const emptyState = useMemo(() => {
    if (!selectedAgent) {
      return (
        <div className={styles.empty}>
          <FlaskConical size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Select an agent to begin</p>
          <p className={styles.emptyDesc}>Choose an agent from the dropdown above to manage and run evaluations.</p>
        </div>
      );
    }
    return (
      <div className={styles.empty}>
        <FlaskConical size={32} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No test cases yet</p>
        <p className={styles.emptyDesc}>Add test cases for <strong>{selectedAgent.name}</strong> to evaluate prompt quality.</p>
        <button className={styles.addBtnLarge} onClick={openAddModal}>
          <Plus size={14} /> Add first test case
        </button>
      </div>
    );
  }, [selectedAgent, openAddModal]);

  return (
    <div className={styles.panel}>
      <div className={styles.content}>
        <HubDataTable<EvalTestCase>
          columns={evalColumns}
          data={filteredCases}
          getRowId={(row) => row.id}
          filters={agentFilter}
          onFilterChange={handleFilterChange}
          onSearch={setSearchQuery}
          searchPlaceholder="Search test cases…"
          toolbarActions={toolbarActions}
          emptyState={emptyState}
        />

        {expandedId && (() => {
          const tc = cases.find(c => c.id === expandedId);
          if (!tc?.lastOutput) return null;
          return (
            <div className={styles.caseExpanded}>
              {tc.expectedKeywords.length > 0 && (
                <div className={styles.keywordChecks}>
                  {tc.expectedKeywords.map(kw => {
                    const found = tc.lastOutput!.toLowerCase().includes(kw.toLowerCase().trim());
                    return (
                      <span key={kw} className={`${styles.kwCheck} ${found ? styles.kwFound : styles.kwMissing}`}>
                        {found ? '\u2713' : '\u2717'} {kw}
                      </span>
                    );
                  })}
                </div>
              )}
              <div className={styles.outputText}>{tc.lastOutput}</div>
            </div>
          );
        })()}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCase ? `Edit: ${editingCase.name}` : 'New Test Case'}
      >
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.textInput}
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Returns booking metrics"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Expected Keywords
              <span className={styles.labelHint}> — comma-separated, all must appear in output</span>
            </label>
            <input
              className={styles.textInput}
              value={formKeywords}
              onChange={e => setFormKeywords(e.target.value)}
              placeholder="e.g. booking, conversion, trend"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Input Task</label>
            <textarea
              className={styles.textarea}
              value={formInputTask}
              onChange={e => setFormInputTask(e.target.value)}
              placeholder="The prompt / task you want to test against…"
              rows={4}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleModalSave}
              disabled={!formName.trim() || !formInputTask.trim()}
            >
              {editingCase ? 'Save Changes' : 'Add Test Case'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- Sidebar (rendered at page level by Conductor) ---

export function EvalSidebar() {
  return (
    <>
      <HubWidgetCard title="Eval Help">
        <div className={styles.tipsList}>
          <p>Create <strong>test cases</strong> with input prompts and expected keywords to validate agent behaviour.</p>
          <p>Select an <strong>agent</strong> and run all cases to see pass/fail results.</p>
          <p>Keyword checks are case-insensitive substring matches against agent output.</p>
        </div>
      </HubWidgetCard>
      <HubWidgetCard title="Eval Tips">
        <div className={styles.tipsList}>
          <p>Start with 3-5 core test cases per agent covering happy path and edge cases.</p>
          <p>Use specific keywords rather than generic ones for more meaningful pass/fail signals.</p>
          <p>Re-run evals after prompt or tool changes to catch regressions early.</p>
        </div>
      </HubWidgetCard>
    </>
  );
}
