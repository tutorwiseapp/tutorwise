'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SessionWorkflow } from './types';
import { WorkflowCard } from './WorkflowCard';
import { WorkflowPreviewModal } from './WorkflowPreviewModal';

interface WorkflowSelectorProps {
  onSelect: (workflow: SessionWorkflow) => void;
  onSkip: () => void;
}

const SUBJECTS = [
  { value: '', label: 'All Subjects' },
  { value: 'maths', label: 'Maths' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English' },
  { value: 'any', label: 'Any' },
];

const LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'primary', label: 'Primary' },
  { value: '11+', label: '11+' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'higher', label: 'Higher' },
  { value: 'a-level', label: 'A-Level' },
  { value: 'SEN', label: 'SEN' },
  { value: 'any', label: 'Any' },
];

const AI_LEVELS = [
  { value: '', label: 'Any AI Level' },
  { value: 'full', label: 'Sage Leads' },
  { value: 'hints', label: 'Sage Hints' },
  { value: 'co-teach', label: 'Co-Teach' },
  { value: 'silent', label: 'Sage Silent' },
];

const DURATIONS = [
  { value: '', label: 'Any Duration' },
  { value: '30', label: 'Up to 30 min' },
  { value: '45', label: 'Up to 45 min' },
  { value: '60', label: 'Up to 60 min' },
];

export function WorkflowSelector({ onSelect, onSkip }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<SessionWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewWorkflow, setPreviewWorkflow] = useState<SessionWorkflow | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [aiLevel, setAiLevel] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [senOnly, setSenOnly] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (subject) params.set('subject', subject);
    if (level) params.set('level', level);
    if (aiLevel) params.set('aiInvolvement', aiLevel);
    if (durationMax) params.set('durationMax', durationMax);
    if (senOnly) params.set('senFocus', 'true');

    try {
      const res = await fetch(`/api/virtualspace/workflows?${params}`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [search, subject, level, aiLevel, durationMax, senOnly]);

  useEffect(() => {
    const t = setTimeout(fetchWorkflows, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkflows, search]);

  const hasActiveFilters = subject || level || aiLevel || durationMax || senOnly;

  const clearFilters = () => {
    setSubject('');
    setLevel('');
    setAiLevel('');
    setDurationMax('');
    setSenOnly(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: '#f8fafc',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                🧭 How do you want to learn today?
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Choose a guided session workflow — or skip to open canvas
              </p>
            </div>
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: '1px solid #e2e8f0',
                borderRadius: 8, padding: '8px 16px',
                fontSize: 13, color: '#64748b', cursor: 'pointer',
                fontWeight: 500, whiteSpace: 'nowrap',
              }}
            >
              Skip — Open Canvas
            </button>
          </div>

          {/* Search + filter row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search workflows..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 10px 9px 32px',
                  border: '1px solid #e2e8f0', borderRadius: 8,
                  fontSize: 13, color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: showFilters ? '#006c6710' : 'none',
                border: `1px solid ${showFilters ? '#006c67' : '#e2e8f0'}`,
                borderRadius: 8, padding: '9px 14px',
                fontSize: 13, color: showFilters ? '#006c67' : '#475569',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span style={{
                  background: '#006c67', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  !
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div style={{
              marginTop: 12, padding: '12px 14px',
              background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
              display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            }}>
              <Select value={subject} onChange={setSubject} options={SUBJECTS} />
              <Select value={level} onChange={setLevel} options={LEVELS} />
              <Select value={aiLevel} onChange={setAiLevel} options={AI_LEVELS} />
              <Select value={durationMax} onChange={setDurationMax} options={DURATIONS} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={senOnly} onChange={e => setSenOnly(e.target.checked)} />
                SEN Focus
              </label>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none',
                    fontSize: 12, color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#94a3b8', fontSize: 14 }}>
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <span style={{ fontSize: 32 }}>🔍</span>
            <div style={{ fontSize: 14, color: '#64748b' }}>No workflows match your filters</div>
            <button onClick={clearFilters} style={{ fontSize: 13, color: '#006c67', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {workflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onPreview={setPreviewWorkflow}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewWorkflow && (
        <WorkflowPreviewModal
          workflow={previewWorkflow}
          onClose={() => setPreviewWorkflow(null)}
          onSelect={w => { setPreviewWorkflow(null); onSelect(w); }}
        />
      )}
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 10px', border: '1px solid #e2e8f0',
        borderRadius: 6, fontSize: 12, color: '#475569',
        background: '#fff', cursor: 'pointer',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
