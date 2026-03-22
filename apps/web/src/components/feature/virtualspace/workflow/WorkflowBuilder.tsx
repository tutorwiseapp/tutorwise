/**
 * WorkflowBuilder (v1.0)
 *
 * 3-step form for creating/editing a custom workflow.
 * Step 1: Metadata (name, subject, level, duration, Sage mode)
 * Step 2: Phases (add, reorder, delete)
 * Step 3: Per-phase config (name, duration, Sage mode, narrative)
 *
 * Rendered inside WorkflowSelector when user clicks "Create workflow".
 */

'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft, Save, Loader2 } from 'lucide-react';
import type { SessionWorkflow, WorkflowPhase } from './types';
import { LEVEL_LABELS, AI_INVOLVEMENT_LABELS } from './types';
import styles from './WorkflowSelector.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  /** Existing workflow to edit (null = create new) */
  initial?: SessionWorkflow | null;
  onSave: (workflow: SessionWorkflow) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

function blankPhase(): WorkflowPhase {
  return {
    id: nanoid(8),
    name: '',
    icon: '📌',
    durationMins: 10,
    sageMode: 'hints',
    sagePromptTemplate: '',
    canvasActions: [],
    exitConditions: { tutorOverride: true },
    narrative: '',
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export function WorkflowBuilder({ initial, onSave, onCancel }: WorkflowBuilderProps) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? 'maths');
  const [level, setLevel] = useState<SessionWorkflow['level']>(initial?.level ?? 'any');
  const [durationMins, setDurationMins] = useState(initial?.duration_mins ?? 60);
  const [aiInvolvement, setAiInvolvement] = useState<SessionWorkflow['ai_involvement']>(initial?.ai_involvement ?? 'hints');
  const [senFocus, setSenFocus] = useState(initial?.sen_focus ?? false);
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? '');

  // Step 2+3 state
  const [phases, setPhases] = useState<WorkflowPhase[]>(initial?.phases?.length ? initial.phases : [blankPhase()]);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);

  const addPhase = useCallback(() => {
    setPhases(p => [...p, blankPhase()]);
    setEditingPhaseIdx(phases.length); // open the new phase
  }, [phases.length]);

  const removePhase = useCallback((idx: number) => {
    setPhases(p => p.filter((_, i) => i !== idx));
    setEditingPhaseIdx(null);
  }, []);

  const movePhase = useCallback((idx: number, dir: -1 | 1) => {
    setPhases(p => {
      const next = [...p];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return next;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  const updatePhase = useCallback((idx: number, patch: Partial<WorkflowPhase>) => {
    setPhases(p => p.map((ph, i) => i === idx ? { ...ph, ...patch } : ph));
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('Workflow name is required'); setStep(1); return; }
    if (phases.some(p => !p.name.trim())) { setError('All phases must have a name'); setStep(2); return; }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      short_description: shortDescription.trim() || null,
      subject,
      level,
      duration_mins: durationMins,
      ai_involvement: aiInvolvement,
      sen_focus: senFocus,
      phases,
    };

    try {
      const url = initial?.id
        ? `/api/virtualspace/workflows/${initial.id}`
        : '/api/virtualspace/workflows';
      const method = initial?.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      onSave(data.workflow as SessionWorkflow);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [name, shortDescription, subject, level, durationMins, aiInvolvement, senFocus, phases, initial, onSave]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Create workflow"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
            {initial?.id ? 'Edit Workflow' : 'Create Workflow'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Step indicators */}
            {([1, 2, 3] as Step[]).map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                style={{
                  width: 24, height: 24, borderRadius: 99,
                  border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: step === s ? '#006c67' : step > s ? '#006c6730' : '#f1f5f9',
                  color: step === s ? 'white' : step > s ? '#006c67' : '#94a3b8',
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 0 12px', padding: '8px 12px', background: '#fef2f2', color: '#ef4444', borderRadius: 6, fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Metadata ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Workflow name *">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. GCSE Ratio Mastery Sprint"
                style={inputStyle}
              />
            </Field>
            <Field label="Short description">
              <input
                value={shortDescription}
                onChange={e => setShortDescription(e.target.value)}
                placeholder="One-line summary shown in the selector"
                style={inputStyle}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Subject">
                <select value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}>
                  <option value="maths">Maths</option>
                  <option value="science">Science</option>
                  <option value="english">English</option>
                  <option value="any">Any</option>
                </select>
              </Field>
              <Field label="Level">
                <select value={level} onChange={e => setLevel(e.target.value as SessionWorkflow['level'])} style={inputStyle}>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Duration (mins)">
                <input type="number" min={5} max={180} value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} style={inputStyle} />
              </Field>
              <Field label="Sage involvement">
                <select value={aiInvolvement} onChange={e => setAiInvolvement(e.target.value as SessionWorkflow['ai_involvement'])} style={inputStyle}>
                  {Object.entries(AI_INVOLVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={senFocus} onChange={e => setSenFocus(e.target.checked)} />
              SEN/SEND focus (adapts Sage language and pacing)
            </label>
            <button onClick={() => setStep(2)} style={primaryBtn}>Next: Phases →</button>
          </div>
        )}

        {/* ── Step 2: Phase list ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Add and order the phases. Click a phase to configure it.</p>
            {phases.map((ph, i) => (
              <div key={ph.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: editingPhaseIdx === i ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${editingPhaseIdx === i ? '#006c6740' : '#e2e8f0'}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, cursor: 'pointer' }} onClick={() => { setEditingPhaseIdx(i); setStep(3); }}>
                  {i + 1}. {ph.name || <span style={{ color: '#94a3b8' }}>Unnamed phase</span>}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{ph.durationMins}m</span>
                <button onClick={() => movePhase(i, -1)} disabled={i === 0} style={iconBtn}><ChevronUp size={12} /></button>
                <button onClick={() => movePhase(i, 1)} disabled={i === phases.length - 1} style={iconBtn}><ChevronDown size={12} /></button>
                <button onClick={() => removePhase(i)} disabled={phases.length === 1} style={{ ...iconBtn, color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={addPhase} style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Add phase
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setStep(1)} style={secondaryBtn}>← Back</button>
              <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save workflow</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Phase config ── */}
        {step === 3 && editingPhaseIdx !== null && phases[editingPhaseIdx] && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Configuring phase {editingPhaseIdx + 1} of {phases.length}
            </p>
            <Field label="Phase name *">
              <input value={phases[editingPhaseIdx].name} onChange={e => updatePhase(editingPhaseIdx, { name: e.target.value })} placeholder="e.g. Warm-up" style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Duration (mins)">
                <input type="number" min={1} max={60} value={phases[editingPhaseIdx].durationMins} onChange={e => updatePhase(editingPhaseIdx, { durationMins: Number(e.target.value) })} style={inputStyle} />
              </Field>
              <Field label="Sage mode">
                <select value={phases[editingPhaseIdx].sageMode} onChange={e => updatePhase(editingPhaseIdx, { sageMode: e.target.value as WorkflowPhase['sageMode'] })} style={inputStyle}>
                  {Object.entries(AI_INVOLVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Narrative (shown to student)">
              <textarea value={phases[editingPhaseIdx].narrative} onChange={e => updatePhase(editingPhaseIdx, { narrative: e.target.value })} placeholder="What this phase is about..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <Field label="Sage prompt template">
              <textarea value={phases[editingPhaseIdx].sagePromptTemplate} onChange={e => updatePhase(editingPhaseIdx, { sagePromptTemplate: e.target.value })} placeholder="Instructions for Sage during this phase..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={secondaryBtn}>← Phases</button>
              {editingPhaseIdx > 0 && (
                <button onClick={() => setEditingPhaseIdx(i => i! - 1)} style={secondaryBtn}>‹ Prev</button>
              )}
              {editingPhaseIdx < phases.length - 1 && (
                <button onClick={() => setEditingPhaseIdx(i => i! + 1)} style={secondaryBtn}>Next ›</button>
              )}
              <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <><Loader2 size={13} /> Saving…</> : <><Save size={13} /> Save</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  fontSize: 13,
  color: '#1e293b',
  background: 'white',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, sans-serif',
};

const primaryBtn: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 7,
  border: 'none',
  background: '#006c67',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
};

const secondaryBtn: React.CSSProperties = {
  padding: '9px 16px',
  borderRadius: 7,
  border: '1px solid #e2e8f0',
  background: 'white',
  color: '#475569',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
};

const iconBtn: React.CSSProperties = {
  width: 24, height: 24,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
  borderRadius: 4,
};
