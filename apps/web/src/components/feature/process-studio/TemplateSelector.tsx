'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutTemplate, X, Loader2, ArrowRight } from 'lucide-react';
import type { WorkflowProcessTemplate, ProcessNode, ProcessEdge } from './types';
import styles from './TemplateSelector.module.css';

interface TemplateSelectorProps {
  onSelect: (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    name: string,
    description: string
  ) => void;
}

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple',
  medium: 'Medium',
  advanced: 'Advanced',
};

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkflowProcessTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/process-studio/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, templates.length, fetchTemplates]);

  const handleSelect = useCallback(
    (template: WorkflowProcessTemplate) => {
      onSelect(
        template.nodes,
        template.edges,
        template.name,
        template.description || ''
      );
      setIsOpen(false);
    },
    [onSelect]
  );

  if (!isOpen) {
    return (
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(true)}
        title="Start from a template"
      >
        <LayoutTemplate size={16} />
        Templates
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Template Selector"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <LayoutTemplate size={18} />
            <span>Process Templates</span>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className={styles.modalSubtitle}>
          Choose a template to get started quickly. You can customise it after loading.
        </p>

        <div className={styles.templateGrid}>
          {isLoading && (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Loading templates...</span>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <span>{error}</span>
              <button className={styles.retryButton} onClick={fetchTemplates}>
                Try again
              </button>
            </div>
          )}

          {!isLoading &&
            !error &&
            templates.map((template) => (
              <button
                key={template.id}
                className={styles.templateCard}
                onClick={() => handleSelect(template)}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>{template.name}</span>
                  <span
                    className={`${styles.complexityBadge} ${styles[template.complexity]}`}
                  >
                    {COMPLEXITY_LABELS[template.complexity] || template.complexity}
                  </span>
                </div>
                {template.description && (
                  <p className={styles.cardDescription}>{template.description}</p>
                )}
                {template.preview_steps && template.preview_steps.length > 0 && (
                  <div className={styles.previewSteps}>
                    {template.preview_steps.map((step, i) => (
                      <span key={i} className={styles.stepChip}>
                        {i > 0 && <ArrowRight size={10} className={styles.stepArrow} />}
                        {step}
                      </span>
                    ))}
                  </div>
                )}
                {template.tags && template.tags.length > 0 && (
                  <div className={styles.tags}>
                    {template.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}

          {!isLoading && !error && templates.length === 0 && (
            <div className={styles.emptyState}>No templates available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
