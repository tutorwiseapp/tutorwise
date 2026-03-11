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

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Plus, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Loader2, RefreshCw, FlaskConical,
} from 'lucide-react';
import { UnifiedSelect } from '@/app/components/ui/forms';
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

// ── StatsBar ──────────────────────────────────────────────────────────────────

function StatsBar({ cases }: { cases: EvalTestCase[] }) {
  const ran = cases.filter(c => c.lastPassed !== null);
  const passed = ran.filter(c => c.lastPassed === true).length;
  const rate = ran.length ? Math.round((passed / ran.length) * 100) : null;
  const rateColor = rate == null ? '#9ca3af' : rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className={styles.statsBar}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{cases.length}</div>
        <div className={styles.statLabel}>Test cases</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue} style={{ color: rateColor }}>
          {rate != null ? `${rate}%` : '—'}
        </div>
        <div className={styles.statLabel}>Pass rate</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{passed}</div>
        <div className={styles.statLabel}>Passing</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{ran.length - passed}</div>
        <div className={styles.statLabel}>Failing</div>
      </div>
    </div>
  );
}

// ── AddCaseForm ───────────────────────────────────────────────────────────────

interface AddCaseFormProps {
  onAdd: (tc: EvalTestCase) => void;
  onCancel: () => void;
}

function AddCaseForm({ onAdd, onCancel }: AddCaseFormProps) {
  const [name, setName] = useState('');
  const [inputTask, setInputTask] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !inputTask.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      inputTask: inputTask.trim(),
      expectedKeywords: keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean),
      lastOutput: null,
      lastPassed: null,
      lastRunAt: null,
      lastDurationMs: null,
    });
  };

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <div className={styles.addFormTitle}>New test case</div>
      <div className={styles.addFormGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.textInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Returns booking metrics"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Expected keywords <span className={styles.labelHint}>(comma-separated, all must appear)</span></label>
          <input
            className={styles.textInput}
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="e.g. booking, conversion, trend"
          />
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Input task</label>
        <textarea
          className={styles.textarea}
          value={inputTask}
          onChange={e => setInputTask(e.target.value)}
          placeholder="The prompt / task you want to test against…"
          rows={3}
          required
        />
      </div>
      <div className={styles.addFormActions}>
        <button type="submit" className={styles.addSubmitBtn} disabled={!name.trim() || !inputTask.trim()}>
          <Plus size={13} /> Add test case
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── TestCaseRow ────────────────────────────────────────────────────────────────

interface TestCaseRowProps {
  tc: EvalTestCase;
  running: boolean;
  onRun: (tc: EvalTestCase) => void;
  onDelete: (id: string) => void;
}

function TestCaseRow({ tc, running, onRun, onDelete }: TestCaseRowProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    running ? <Loader2 size={13} className={styles.spin} style={{ color: '#2563eb' }} /> :
    tc.lastPassed === true ? <CheckCircle2 size={13} style={{ color: '#16a34a' }} /> :
    tc.lastPassed === false ? <XCircle size={13} style={{ color: '#dc2626' }} /> :
    <span className={styles.notRunDot} />;

  return (
    <>
      <div className={styles.caseRow} onClick={() => tc.lastOutput && setExpanded(e => !e)}>
        <span className={styles.caseStatus}>{statusIcon}</span>
        <span className={styles.caseName}>{tc.name}</span>
        <span className={styles.caseKeywords}>
          {tc.expectedKeywords.length > 0
            ? tc.expectedKeywords.slice(0, 3).join(', ') + (tc.expectedKeywords.length > 3 ? '…' : '')
            : <span className={styles.noKeywords}>any output</span>
          }
        </span>
        <span className={styles.caseDuration}>{fmtDuration(tc.lastDurationMs)}</span>
        <span className={styles.caseTime}>{timeAgo(tc.lastRunAt)}</span>
        <span className={styles.caseActions} onClick={e => e.stopPropagation()}>
          {tc.lastOutput && (
            <button
              className={styles.expandBtn}
              onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              title={expanded ? 'Collapse' : 'View output'}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
          <button
            className={styles.runCaseBtn}
            onClick={() => onRun(tc)}
            disabled={running}
            title="Run this test case"
          >
            {running ? <Loader2 size={12} className={styles.spin} /> : <Play size={12} />}
          </button>
          <button
            className={styles.deleteCaseBtn}
            onClick={() => { if (confirm(`Delete "${tc.name}"?`)) onDelete(tc.id); }}
            title="Delete test case"
          >
            <Trash2 size={12} />
          </button>
        </span>
      </div>

      {expanded && tc.lastOutput && (
        <div className={styles.caseExpanded}>
          {tc.expectedKeywords.length > 0 && (
            <div className={styles.keywordChecks}>
              {tc.expectedKeywords.map(kw => {
                const found = tc.lastOutput!.toLowerCase().includes(kw.toLowerCase().trim());
                return (
                  <span key={kw} className={`${styles.kwCheck} ${found ? styles.kwFound : styles.kwMissing}`}>
                    {found ? '✓' : '✗'} {kw}
                  </span>
                );
              })}
            </div>
          )}
          <div className={styles.outputText}>{tc.lastOutput}</div>
        </div>
      )}
    </>
  );
}

// ── Main EvalPanel ─────────────────────────────────────────────────────────────

export function EvalPanel() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [cases, setCases] = useState<EvalTestCase[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [runAllActive, setRunAllActive] = useState(false);
  const stopRef = useRef(false);

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

  // Load cases from localStorage whenever the selected agent changes
  const handleAgentChange = (id: string) => {
    setSelectedAgentId(id);
    setCases(loadCases(agents.find(a => a.id === id)?.slug ?? ''));
    setShowAddForm(false);
  };

  const persistCases = (slug: string, updated: EvalTestCase[]) => {
    saveCases(slug, updated);
    setCases(updated);
  };

  const handleAddCase = (tc: EvalTestCase) => {
    if (!selectedAgent) return;
    const updated = [...cases, tc];
    persistCases(selectedAgent.slug, updated);
    setShowAddForm(false);
  };

  const handleDeleteCase = (id: string) => {
    if (!selectedAgent) return;
    persistCases(selectedAgent.slug, cases.filter(c => c.id !== id));
  };

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

  return (
    <div className={styles.container}>
      <StatsBar cases={cases} />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.agentPickerWrap}>
          <UnifiedSelect
            options={agents.map(a => ({ value: a.id, label: `${a.name} — ${a.role}` }))}
            value={selectedAgentId}
            onChange={v => handleAgentChange(String(v))}
            placeholder="Select an agent to test…"
            size="md"
          />
        </div>
        <div className={styles.toolbarActions}>
          {cases.length > 0 && (
            <>
              <button
                className={styles.runAllBtn}
                onClick={runAllActive ? () => { stopRef.current = true; } : handleRunAll}
                disabled={!selectedAgent}
              >
                {runAllActive
                  ? <><Loader2 size={13} className={styles.spin} /> Stop</>
                  : <><Play size={13} /> Run All ({cases.length})</>
                }
              </button>
              <button
                className={styles.clearBtn}
                onClick={handleClearResults}
                disabled={!selectedAgent || runAllActive}
                title="Clear all results"
              >
                <RefreshCw size={13} />
              </button>
            </>
          )}
          <button
            className={styles.addBtn}
            onClick={() => setShowAddForm(f => !f)}
            disabled={!selectedAgent}
          >
            <Plus size={13} /> Add Test
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && selectedAgent && (
        <AddCaseForm onAdd={handleAddCase} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Content */}
      <div className={styles.content}>
        {!selectedAgent ? (
          <div className={styles.empty}>
            <FlaskConical size={28} />
            <p>Select an agent above to run evaluations</p>
          </div>
        ) : cases.length === 0 ? (
          <div className={styles.empty}>
            <FlaskConical size={28} />
            <p>No test cases yet for <strong>{selectedAgent.name}</strong></p>
            <p className={styles.emptySub}>Add a test case to start evaluating prompt quality</p>
            <button className={styles.addBtnLarge} onClick={() => setShowAddForm(true)}>
              <Plus size={14} /> Add first test case
            </button>
          </div>
        ) : (
          <div className={styles.caseTable}>
            <div className={styles.caseHeader}>
              <span className={styles.caseStatus} />
              <span className={styles.caseName}>Test</span>
              <span className={styles.caseKeywords}>Keywords</span>
              <span className={styles.caseDuration}>Duration</span>
              <span className={styles.caseTime}>Last run</span>
              <span className={styles.caseActions} />
            </div>
            {cases.map(tc => (
              <TestCaseRow
                key={tc.id}
                tc={tc}
                running={runningIds.has(tc.id)}
                onRun={handleRunOne}
                onDelete={handleDeleteCase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
