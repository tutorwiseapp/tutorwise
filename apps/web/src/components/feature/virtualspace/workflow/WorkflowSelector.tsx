'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, X, Loader2, Search, Clock, Brain, Accessibility,
  Calculator, FlaskConical, BookMarked, Globe, GraduationCap, ChevronRight,
} from 'lucide-react';
import { SessionWorkflow, AI_INVOLVEMENT_LABELS, AI_INVOLVEMENT_COLOURS, LEVEL_LABELS } from './types';
import styles from './WorkflowSelector.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUBJECT_ICONS: Record<string, any> = {
  maths: Calculator,
  science: FlaskConical,
  english: BookMarked,
  any: Globe,
};

function WorkflowIcon({ workflow, size = 20 }: { workflow: SessionWorkflow; size?: number }) {
  const Icon = SUBJECT_ICONS[workflow.subject] ?? GraduationCap;
  return <Icon size={size} color={workflow.theme.colour} />;
}

interface WorkflowSelectorProps {
  onSelect: (workflow: SessionWorkflow) => void;
  onSkip: () => void;
}

export function WorkflowSelector({ onSelect, onSkip }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<SessionWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchWorkflows = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    try {
      const res = await fetch(`/api/virtualspace/workflows?${params}`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch {
      setError('Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchWorkflows(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchWorkflows]);

  return (
    <div className={styles.overlay} onClick={onSkip}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Choose a workflow"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <BookOpen size={18} />
            <span>How do you want to learn today?</span>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.skipButton} onClick={onSkip}>
              Skip — Open Canvas
            </button>
            <button className={styles.closeButton} onClick={onSkip} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <p className={styles.modalSubtitle}>
          Choose a guided session workflow or skip to the open canvas.
        </p>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* List */}
        <div className={styles.workflowList}>
          {loading && (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Loading workflows...</span>
            </div>
          )}

          {error && !loading && (
            <div className={styles.errorState}>
              <span>{error}</span>
              <button className={styles.retryButton} onClick={() => fetchWorkflows(search)}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && workflows.length === 0 && (
            <div className={styles.emptyState}>No workflows match your search.</div>
          )}

          {!loading && !error && workflows.map(workflow => {
            const aiColour = AI_INVOLVEMENT_COLOURS[workflow.ai_involvement] || '#64748b';
            return (
              <button
                key={workflow.id}
                className={styles.workflowCard}
                style={{ '--theme-colour': workflow.theme.colour } as React.CSSProperties}
                onClick={() => onSelect(workflow)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>
                    <WorkflowIcon workflow={workflow} size={20} />
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardName}>{workflow.name}</span>
                    {workflow.short_description && (
                      <p className={styles.cardDescription}>{workflow.short_description}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className={styles.badges}>
                  <span className={styles.badge}>
                    <Clock size={10} />
                    {workflow.duration_mins} min
                  </span>
                  <span className={styles.badge}>
                    {LEVEL_LABELS[workflow.level] || workflow.level}
                  </span>
                  <span className={styles.badge} style={{ background: `${aiColour}15`, color: aiColour }}>
                    <Brain size={10} />
                    {AI_INVOLVEMENT_LABELS[workflow.ai_involvement] || workflow.ai_involvement}
                  </span>
                  {workflow.sen_focus && (
                    <span className={styles.badge} style={{ background: '#10b98115', color: '#10b981' }}>
                      <Accessibility size={10} />
                      SEN
                    </span>
                  )}
                </div>

                {/* Phase arc */}
                <div className={styles.phaseArc}>
                  {workflow.phases.slice(0, 4).map((phase, i) => (
                    <div key={phase.id} className={styles.phaseArcItem}>
                      <span style={{ fontSize: 11, color: '#475569' }}>{phase.name}</span>
                      {i < Math.min(workflow.phases.length - 1, 3) && (
                        <ChevronRight size={10} className={styles.phaseArcArrow} />
                      )}
                    </div>
                  ))}
                  {workflow.phases.length > 4 && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>+{workflow.phases.length - 4} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
