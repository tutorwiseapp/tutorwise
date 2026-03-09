'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, MousePointerClick, ExternalLink } from 'lucide-react';
import { useWorkflowStore } from './store';
import { PROCESS_STEP_TYPES, NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData, ProcessStepType, ProcessNode, ProcessEdge } from './types';
import { HANDLER_SCHEMAS, HANDLER_NAMES, getHandlerSchema } from '@/lib/workflow/handler-schema';
import styles from './PropertiesDrawer.module.css';

interface PropertiesDrawerProps {
  node: ProcessNode | null;
  edges: ProcessEdge[];
  onUpdateNode: (id: string, data: Partial<ProcessStepData>) => void;
  onUpdateEdge: (id: string, data: { label?: string }) => void;
  onDeleteNode: (id: string) => void;
}

type DrawerTab = 'basic' | 'handler';

export function PropertiesDrawer({
  node,
  edges,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
}: PropertiesDrawerProps) {
  const { closeDrawer } = useWorkflowStore();
  const [localData, setLocalData] = useState<ProcessStepData | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>('basic');

  useEffect(() => {
    if (node) {
      setLocalData({ ...node.data });
    } else {
      setLocalData(null);
    }
  }, [node]);

  const handleFieldChange = useCallback(
    (field: keyof ProcessStepData, value: string | string[] | ProcessStepType | number | undefined | Record<string, unknown>) => {
      if (!node || !localData) return;
      const updated = { ...localData, [field]: value };
      setLocalData(updated as ProcessStepData);
      onUpdateNode(node.id, { [field]: value } as Partial<ProcessStepData>);
    },
    [node, localData, onUpdateNode]
  );

  const handleDelete = useCallback(() => {
    if (!node) return;
    if (node.data.type === 'trigger' || node.data.type === 'end') return;
    const confirmed = window.confirm(
      `Delete "${node.data.label}"? This cannot be undone.`
    );
    if (confirmed) {
      onDeleteNode(node.id);
      closeDrawer();
    }
  }, [node, onDeleteNode, closeDrawer]);

  const handleCriteriaChange = useCallback(
    (index: number, value: string) => {
      if (!localData) return;
      const criteria = [...(localData.completionCriteria || [])];
      criteria[index] = value;
      handleFieldChange('completionCriteria', criteria);
    },
    [localData, handleFieldChange]
  );

  const addCriteria = useCallback(() => {
    if (!localData) return;
    const criteria = [...(localData.completionCriteria || []), ''];
    handleFieldChange('completionCriteria', criteria);
  }, [localData, handleFieldChange]);

  const removeCriteria = useCallback(
    (index: number) => {
      if (!localData) return;
      const criteria = (localData.completionCriteria || []).filter(
        (_, i) => i !== index
      );
      handleFieldChange('completionCriteria', criteria);
    },
    [localData, handleFieldChange]
  );

  // --- Handler Config ---
  const handleHandlerChange = useCallback(
    (handlerName: string) => {
      if (!node) return;
      handleFieldChange('handler', handlerName || undefined);
      // Reset handler_config when handler changes
      handleFieldChange('handler_config', handlerName ? {} : undefined);
    },
    [node, handleFieldChange]
  );

  const handleConfigFieldChange = useCallback(
    (key: string, value: string | number | boolean) => {
      if (!node || !localData) return;
      const currentConfig = (localData.handler_config as Record<string, unknown>) || {};
      handleFieldChange('handler_config', { ...currentConfig, [key]: value });
    },
    [node, localData, handleFieldChange]
  );

  // --- Condition Edge Labels ---
  const conditionEdges = node?.data.type === 'condition'
    ? {
        yes: edges.find((e) => e.source === node.id && e.sourceHandle === 'yes'),
        no: edges.find((e) => e.source === node.id && e.sourceHandle === 'no'),
      }
    : null;

  if (!node || !localData) {
    return (
      <div className={styles.drawer} role="complementary" aria-label="Node properties">
        <div className={styles.header}>
          <h3 className={styles.title}>Properties</h3>
        </div>
        <div className={styles.emptyState}>
          <MousePointerClick size={28} style={{ color: 'var(--color-text-tertiary)' }} />
          <div className={styles.emptyTitle}>No node selected</div>
          <div className={styles.emptyDescription}>
            Click on a node in the canvas to view and edit its properties.
          </div>
        </div>
      </div>
    );
  }

  const canDelete =
    node.data.type !== 'trigger' && node.data.type !== 'end';
  const TypeIcon = NODE_TYPE_CONFIG[localData.type].icon;
  const schema = localData.handler ? getHandlerSchema(localData.handler) : null;
  const handlerConfig = (localData.handler_config as Record<string, unknown>) || {};

  return (
    <div className={styles.drawer} role="complementary" aria-label="Node properties">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <TypeIcon size={18} /> {localData.label || 'Node Properties'}
        </h3>
        <button
          className={styles.closeButton}
          onClick={() => { closeDrawer(); }}
          aria-label="Deselect node"
          title="Deselect node"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'basic' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'handler' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('handler')}
        >
          Handler Config
        </button>
      </div>

      {activeTab === 'basic' && (
        <div className={styles.content}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-label">
              Label
            </label>
            <input
              id="ps-label"
              className={styles.input}
              value={localData.label}
              onChange={(e) => handleFieldChange('label', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-type">
              Type
            </label>
            <select
              id="ps-type"
              className={styles.select}
              value={localData.type}
              onChange={(e) =>
                handleFieldChange('type', e.target.value as ProcessStepType)
              }
            >
              {PROCESS_STEP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {NODE_TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-description">
              Description
            </label>
            <textarea
              id="ps-description"
              className={styles.textarea}
              value={localData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-objective">
              Objective
            </label>
            <input
              id="ps-objective"
              className={styles.input}
              value={localData.objective || ''}
              onChange={(e) => handleFieldChange('objective', e.target.value)}
              placeholder="Goal of this step"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Completion Criteria</label>
            {(localData.completionCriteria || []).map((c, i) => (
              <div key={i} className={styles.listItem}>
                <input
                  className={styles.input}
                  value={c}
                  onChange={(e) => handleCriteriaChange(i, e.target.value)}
                  placeholder={`Criteria ${i + 1}`}
                />
                <button
                  className={styles.removeButton}
                  onClick={() => removeCriteria(i)}
                  aria-label={`Remove criteria ${i + 1}`}
                >
                  <Minus size={14} />
                </button>
              </div>
            ))}
            <button className={styles.addButton} onClick={addCriteria}>
              <Plus size={12} /> Add criteria
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-assignee">
              Assignee
            </label>
            <input
              id="ps-assignee"
              className={styles.input}
              value={localData.assignee || ''}
              onChange={(e) => handleFieldChange('assignee', e.target.value)}
              placeholder="Role or person"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-duration">
              Estimated Duration
            </label>
            <input
              id="ps-duration"
              className={styles.input}
              value={localData.estimatedDuration || ''}
              onChange={(e) =>
                handleFieldChange('estimatedDuration', e.target.value)
              }
              placeholder="e.g., 2 hours"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-status">
              Status
            </label>
            <select
              id="ps-status"
              className={styles.select}
              value={localData.status || ''}
              onChange={(e) => {
                const v = e.target.value;
                handleFieldChange('status', v === '' ? undefined : v as ProcessStepData['status']);
              }}
            >
              <option value="">— None —</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-url">
              <ExternalLink size={12} style={{ display: 'inline', marginRight: 4 }} />
              External URL
            </label>
            <input
              id="ps-url"
              className={styles.input}
              value={localData.externalUrl || ''}
              onChange={(e) => handleFieldChange('externalUrl', e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-template-name">
              Linked Template
            </label>
            <input
              id="ps-template-name"
              className={styles.input}
              value={localData.templateName || ''}
              onChange={(e) => handleFieldChange('templateName', e.target.value)}
              placeholder="Template name to drill into"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-step-count">
              Step Count
            </label>
            <input
              id="ps-step-count"
              className={styles.input}
              value={localData.stepCount ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                handleFieldChange('stepCount', isNaN(v) ? undefined : v);
              }}
              placeholder="Number of steps"
              type="number"
              min={1}
            />
          </div>

          {/* Agent / Team configuration */}
          {(localData.type === 'agent' || localData.type === 'team') && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldGroupTitle}>
                {localData.type === 'agent' ? 'Agent Configuration' : 'Team Configuration'}
              </div>

              {localData.type === 'agent' && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ps-agent-slug">Agent Slug</label>
                  <input
                    id="ps-agent-slug"
                    className={styles.input}
                    value={localData.agentSlug || ''}
                    onChange={(e) => handleFieldChange('agentSlug', e.target.value)}
                    placeholder="e.g., analyst"
                  />
                </div>
              )}

              {localData.type === 'team' && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="ps-team-slug">Team Slug</label>
                    <input
                      id="ps-team-slug"
                      className={styles.input}
                      value={localData.teamSlug || ''}
                      onChange={(e) => handleFieldChange('teamSlug', e.target.value)}
                      placeholder="e.g., cas-team"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="ps-team-pattern">Pattern</label>
                    <select
                      id="ps-team-pattern"
                      className={styles.select}
                      value={localData.teamPattern || 'supervisor'}
                      onChange={(e) => handleFieldChange('teamPattern', e.target.value as ProcessStepData['teamPattern'])}
                    >
                      <option value="supervisor">Supervisor</option>
                      <option value="pipeline">Pipeline</option>
                      <option value="swarm">Swarm</option>
                    </select>
                  </div>
                </>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="ps-prompt-template">Prompt Template</label>
                <textarea
                  id="ps-prompt-template"
                  className={styles.textarea}
                  value={localData.promptTemplate || ''}
                  onChange={(e) => handleFieldChange('promptTemplate', e.target.value)}
                  placeholder="Use {{context.field}} for dynamic values"
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="ps-output-field">Output Field</label>
                <input
                  id="ps-output-field"
                  className={styles.input}
                  value={localData.outputField || ''}
                  onChange={(e) => handleFieldChange('outputField', e.target.value)}
                  placeholder="e.g., agent_analysis"
                />
              </div>
            </div>
          )}

          {/* Condition edge labels */}
          {localData.type === 'condition' && (
            <div className={styles.fieldGroup}>
              <div className={styles.fieldGroupTitle}>Branch Labels</div>
              <div className={styles.field}>
                <label className={styles.label}>Yes branch label</label>
                <input
                  className={styles.input}
                  value={conditionEdges?.yes?.data?.label || ''}
                  onChange={(e) => {
                    if (conditionEdges?.yes) {
                      onUpdateEdge(conditionEdges.yes.id, { label: e.target.value });
                    }
                  }}
                  placeholder="e.g., Approved"
                  disabled={!conditionEdges?.yes}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>No branch label</label>
                <input
                  className={styles.input}
                  value={conditionEdges?.no?.data?.label || ''}
                  onChange={(e) => {
                    if (conditionEdges?.no) {
                      onUpdateEdge(conditionEdges.no.id, { label: e.target.value });
                    }
                  }}
                  placeholder="e.g., Rejected"
                  disabled={!conditionEdges?.no}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'handler' && (
        <div className={styles.content}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ps-handler">
              Handler
            </label>
            <select
              id="ps-handler"
              className={styles.select}
              value={localData.handler || ''}
              onChange={(e) => handleHandlerChange(e.target.value)}
            >
              <option value="">— None —</option>
              {HANDLER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {HANDLER_SCHEMAS[name]?.label ?? name}
                </option>
              ))}
            </select>
            {schema && (
              <p className={styles.handlerDesc}>{schema.description}</p>
            )}
          </div>

          {schema && schema.fields.map((field) => (
            <div key={field.key} className={styles.field}>
              <label className={styles.label} htmlFor={`handler-${field.key}`}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  id={`handler-${field.key}`}
                  className={styles.select}
                  value={String(handlerConfig[field.key] ?? field.defaultValue ?? '')}
                  onChange={(e) => handleConfigFieldChange(field.key, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <select
                  id={`handler-${field.key}`}
                  className={styles.select}
                  value={String(handlerConfig[field.key] ?? field.defaultValue ?? 'false')}
                  onChange={(e) => handleConfigFieldChange(field.key, e.target.value === 'true')}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={`handler-${field.key}`}
                  className={styles.textarea}
                  value={String(handlerConfig[field.key] ?? field.defaultValue ?? '')}
                  onChange={(e) => handleConfigFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : field.type === 'json' ? (
                <textarea
                  id={`handler-${field.key}`}
                  className={styles.textarea}
                  value={
                    typeof handlerConfig[field.key] === 'object'
                      ? JSON.stringify(handlerConfig[field.key], null, 2)
                      : String(handlerConfig[field.key] ?? field.defaultValue ?? '{}')
                  }
                  onChange={(e) => {
                    try {
                      handleConfigFieldChange(field.key, JSON.parse(e.target.value));
                    } catch {
                      handleConfigFieldChange(field.key, e.target.value);
                    }
                  }}
                  placeholder={field.placeholder ?? '{ "key": "value" }'}
                  rows={5}
                  spellCheck={false}
                />
              ) : (
                <input
                  id={`handler-${field.key}`}
                  className={styles.input}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(handlerConfig[field.key] ?? field.defaultValue ?? '')}
                  onChange={(e) =>
                    handleConfigFieldChange(
                      field.key,
                      field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}

          {!localData.handler && (
            <div className={styles.handlerEmpty}>
              Select a handler to configure execution behaviour for this node.
            </div>
          )}
        </div>
      )}

      {canDelete && (
        <div className={styles.footer}>
          <button className={styles.deleteButton} onClick={handleDelete}>
            <Trash2 size={14} /> Delete Step
          </button>
        </div>
      )}
    </div>
  );
}
