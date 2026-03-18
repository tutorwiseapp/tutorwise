'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutTemplate,
  X,
  Loader2,
  ArrowRight,
  Pencil,
  Trash2,
  Plus,
  Save,
  FolderOpen,
  FileText,
} from 'lucide-react';
import type { WorkflowProcessTemplate, WorkflowProcess, ProcessNode, ProcessEdge } from './types';
import styles from './TemplateSelector.module.css';

type ActiveTab = 'templates' | 'processes';

interface TemplateSelectorProps {
  onSelect: (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    name: string,
    description: string
  ) => void;
  onLoadProcess: (process: WorkflowProcess) => void;
  currentNodes?: ProcessNode[];
  currentEdges?: ProcessEdge[];
  currentName?: string;
  currentDescription?: string;
}

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple',
  medium: 'Medium',
  advanced: 'Advanced',
};

/** Category display order — lower number appears first */
const CATEGORY_ORDER: Record<string, number> = {
  onboarding: 0,
  listings: 1,
  bookings: 2,
  referrals: 3,
  financials: 4,
  reviews: 5,
};

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  complexity: string;
  tags: string;
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  description: '',
  category: 'general',
  complexity: 'simple',
  tags: '',
};

export function TemplateSelector({
  onSelect,
  onLoadProcess,
  currentNodes,
  currentEdges,
  currentName,
  currentDescription,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('templates');
  const [templates, setTemplates] = useState<WorkflowProcessTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // My Processes tab state
  const [processes, setProcesses] = useState<WorkflowProcess[]>([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [processesError, setProcessesError] = useState<string | null>(null);
  const [loadingProcessId, setLoadingProcessId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/workflow/templates');
      const data = await res.json();
      if (data.success) {
        const sorted = (data.data as WorkflowProcessTemplate[]).sort((a, b) => {
          const orderA = CATEGORY_ORDER[a.category] ?? 99;
          const orderB = CATEGORY_ORDER[b.category] ?? 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        setTemplates(sorted);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProcesses = useCallback(async () => {
    setProcessesLoading(true);
    setProcessesError(null);
    try {
      const res = await fetch('/api/admin/workflow/processes');
      const data = await res.json();
      if (data.success) {
        setProcesses(data.data);
      } else {
        setProcessesError(data.error || 'Failed to load processes');
      }
    } catch {
      setProcessesError('Failed to load processes');
    } finally {
      setProcessesLoading(false);
    }
  }, []);

  const handleLoadProcess = useCallback(async (process: WorkflowProcess) => {
    setLoadingProcessId(process.id);
    try {
      const res = await fetch(`/api/admin/workflow/processes/${process.id}`);
      const data = await res.json();
      if (data.success) {
        onLoadProcess(data.data as WorkflowProcess);
        setIsOpen(false);
      } else {
        setProcessesError(data.error || 'Failed to load process');
      }
    } catch {
      setProcessesError('Failed to load process');
    } finally {
      setLoadingProcessId(null);
    }
  }, [onLoadProcess]);

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, templates.length, fetchTemplates]);

  useEffect(() => {
    if (isOpen && activeTab === 'processes') {
      fetchProcesses();
    }
  }, [isOpen, activeTab, fetchProcesses]);

  const handleSelect = useCallback(
    (template: WorkflowProcessTemplate) => {
      if (isManageMode) return;
      onSelect(
        template.nodes,
        template.edges,
        template.name,
        template.description || ''
      );
      setIsOpen(false);
    },
    [onSelect, isManageMode]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsManageMode(false);
    setEditingId(null);
    setShowCreateForm(false);
    setFormData(EMPTY_FORM);
    setProcessesError(null);
  }, []);

  const handleEdit = useCallback((template: WorkflowProcessTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || 'general',
      complexity: template.complexity || 'simple',
      tags: (template.tags || []).join(', '),
    });
    setShowCreateForm(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Delete template "${name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/workflow/templates/${id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setTemplates((prev) => prev.filter((t) => t.id !== id));
        } else {
          alert(data.error || 'Failed to delete template');
        }
      } catch {
        alert('Failed to delete template');
      }
    },
    []
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !formData.name.trim()) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/workflow/templates/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          complexity: formData.complexity,
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? data.data : t))
        );
        setEditingId(null);
        setFormData(EMPTY_FORM);
      } else {
        alert(data.error || 'Failed to update template');
      }
    } catch {
      alert('Failed to update template');
    } finally {
      setIsSavingTemplate(false);
    }
  }, [editingId, formData]);

  const handleCreateTemplate = useCallback(async () => {
    if (!formData.name.trim()) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/workflow/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          complexity: formData.complexity,
          nodes: currentNodes || [],
          edges: currentEdges || [],
          preview_steps: (currentNodes || [])
            .filter((n) => n.data?.label)
            .map((n) => n.data.label)
            .slice(0, 6),
          tags: formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => [...prev, data.data]);
        setShowCreateForm(false);
        setFormData(EMPTY_FORM);
      } else {
        alert(data.error || 'Failed to create template');
      }
    } catch {
      alert('Failed to create template');
    } finally {
      setIsSavingTemplate(false);
    }
  }, [formData, currentNodes, currentEdges]);

  const handleSaveCurrentAsTemplate = useCallback(() => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormData({
      name: currentName || 'Untitled Template',
      description: currentDescription || '',
      category: 'general',
      complexity: 'simple',
      tags: '',
    });
  }, [currentName, currentDescription]);

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

  const renderForm = () => (
    <div className={styles.formContainer}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Name</label>
        <input
          className={styles.formInput}
          value={formData.name}
          onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          placeholder="Template name"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Description</label>
        <input
          className={styles.formInput}
          value={formData.description}
          onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder="Brief description"
        />
      </div>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Category</label>
          <input
            className={styles.formInput}
            value={formData.category}
            onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
            placeholder="general"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Complexity</label>
          <select
            className={styles.formSelect}
            value={formData.complexity}
            onChange={(e) => setFormData((f) => ({ ...f, complexity: e.target.value }))}
          >
            <option value="simple">Simple</option>
            <option value="medium">Medium</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Tags (comma-separated)</label>
        <input
          className={styles.formInput}
          value={formData.tags}
          onChange={(e) => setFormData((f) => ({ ...f, tags: e.target.value }))}
          placeholder="tag1, tag2, tag3"
        />
      </div>
      <div className={styles.formActions}>
        <button
          className={styles.formSaveButton}
          onClick={editingId ? handleSaveEdit : handleCreateTemplate}
          disabled={isSavingTemplate || !formData.name.trim()}
        >
          <Save size={14} />
          {isSavingTemplate ? 'Saving...' : editingId ? 'Update' : 'Create'}
        </button>
        <button
          className={styles.formCancelButton}
          onClick={() => {
            setEditingId(null);
            setShowCreateForm(false);
            setFormData(EMPTY_FORM);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Template Selector"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <LayoutTemplate size={18} />
            <span>Open Process</span>
          </div>
          <div className={styles.headerActions}>
            {activeTab === 'templates' && (
              <button
                className={`${styles.manageButton} ${isManageMode ? styles.manageActive : ''}`}
                onClick={() => {
                  setIsManageMode(!isManageMode);
                  setEditingId(null);
                  setShowCreateForm(false);
                  setFormData(EMPTY_FORM);
                }}
                title={isManageMode ? 'Exit manage mode' : 'Manage templates'}
              >
                <Pencil size={14} />
                {isManageMode ? 'Done' : 'Manage'}
              </button>
            )}
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'processes' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('processes'); setIsManageMode(false); }}
          >
            <FolderOpen size={14} /> My Processes
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <LayoutTemplate size={14} /> Templates
          </button>
        </div>

        {/* My Processes tab */}
        {activeTab === 'processes' && (
          <div className={styles.templateGrid}>
            {processesLoading && (
              <div className={styles.loadingState}>
                <Loader2 size={24} className={styles.spinner} />
                <span>Loading saved processes...</span>
              </div>
            )}
            {processesError && (
              <div className={styles.errorState}>
                <span>{processesError}</span>
                <button className={styles.retryButton} onClick={fetchProcesses}>Try again</button>
              </div>
            )}
            {!processesLoading && !processesError && processes.map((p) => (
              <button
                key={p.id}
                className={styles.templateCard}
                onClick={() => handleLoadProcess(p)}
                disabled={loadingProcessId !== null}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardName}>
                    {loadingProcessId === p.id
                      ? <Loader2 size={13} className={styles.spinner} />
                      : <FileText size={13} style={{ color: 'var(--color-primary, #006C67)' }} />
                    }
                    {' '}{p.name}
                  </span>
                  <span className={`${styles.complexityBadge} ${styles[p.execution_mode === 'live' ? 'simple' : p.execution_mode === 'shadow' ? 'medium' : 'advanced']}`}>
                    {p.execution_mode}
                  </span>
                </div>
                {p.description && <p className={styles.cardDescription}>{p.description}</p>}
                <p className={styles.cardDescription} style={{ color: 'var(--color-text-tertiary)' }}>
                  {p.category} · Updated {new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </button>
            ))}
            {!processesLoading && !processesError && processes.length === 0 && (
              <div className={styles.emptyState}>No saved processes yet. Create one and save it to see it here.</div>
            )}
          </div>
        )}

        {/* Templates tab */}
        {activeTab === 'templates' && (
          <>
            <p className={styles.modalSubtitle}>
              {isManageMode
                ? 'Edit, delete, or create templates.'
                : 'Choose a template to get started quickly. You can customise it after loading.'}
            </p>

            {isManageMode && (
              <div className={styles.manageActions}>
                <button
                  className={styles.createButton}
                  onClick={() => {
                    setShowCreateForm(true);
                    setEditingId(null);
                    setFormData(EMPTY_FORM);
                  }}
                >
                  <Plus size={14} /> New Template
                </button>
                {currentNodes && currentNodes.length > 0 && (
                  <button
                    className={styles.createButton}
                    onClick={handleSaveCurrentAsTemplate}
                  >
                    <Save size={14} /> Save Current as Template
                  </button>
                )}
              </div>
            )}

            {(showCreateForm || editingId) && renderForm()}

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
                  <div key={template.id} className={styles.templateCardWrapper}>
                    <button
                      className={styles.templateCard}
                      onClick={() => handleSelect(template)}
                      disabled={isManageMode}
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
                    {isManageMode && (
                      <div className={styles.cardActions}>
                        <button
                          className={styles.cardActionButton}
                          onClick={() => handleEdit(template)}
                          title="Edit template metadata"
                        >
                          <Pencil size={12} />
                        </button>
                        {!template.is_system && (
                          <button
                            className={`${styles.cardActionButton} ${styles.cardActionDanger}`}
                            onClick={() => handleDelete(template.id, template.name)}
                            title="Delete template"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {!isLoading && !error && templates.length === 0 && (
                <div className={styles.emptyState}>No templates available.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
