'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { useProcessStudioStore } from './store';
import { PROCESS_STEP_TYPES, NODE_TYPE_CONFIG } from './types';
import type { ProcessStepData, ProcessStepType, ProcessNode } from './types';
import styles from './PropertiesDrawer.module.css';

interface PropertiesDrawerProps {
  node: ProcessNode | null;
  onUpdateNode: (id: string, data: Partial<ProcessStepData>) => void;
  onDeleteNode: (id: string) => void;
}

export function PropertiesDrawer({
  node,
  onUpdateNode,
  onDeleteNode,
}: PropertiesDrawerProps) {
  const { isDrawerOpen, closeDrawer } = useProcessStudioStore();
  const [localData, setLocalData] = useState<ProcessStepData | null>(null);

  useEffect(() => {
    if (node) {
      setLocalData({ ...node.data });
    }
  }, [node]);

  const handleFieldChange = useCallback(
    (field: keyof ProcessStepData, value: string | string[] | ProcessStepType) => {
      if (!node || !localData) return;
      const updated = { ...localData, [field]: value };
      setLocalData(updated);
      onUpdateNode(node.id, { [field]: value });
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

  if (!isDrawerOpen || !node || !localData) return null;

  const canDelete =
    node.data.type !== 'trigger' && node.data.type !== 'end';
  const TypeIcon = NODE_TYPE_CONFIG[localData.type].icon;

  return (
    <div className={styles.drawer} role="complementary" aria-label="Node properties">
      <div className={styles.header}>
        <h3 className={styles.title}>
          <TypeIcon size={18} /> {localData.label || 'Node Properties'}
        </h3>
        <button
          className={styles.closeButton}
          onClick={closeDrawer}
          aria-label="Close properties"
        >
          <X size={18} />
        </button>
      </div>

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
      </div>

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
