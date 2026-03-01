'use client';

import { useCallback } from 'react';
import { Save, Undo2, Redo2, Trash2 } from 'lucide-react';
import { useProcessStudioStore } from './store';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onSave: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  nodeCount: number;
  edgeCount: number;
}

export function Toolbar({
  onSave,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  nodeCount,
  edgeCount,
}: ToolbarProps) {
  const { processName, setProcessName, isDirty, lastSavedAt } =
    useProcessStudioStore();

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setProcessName(e.target.value);
    },
    [setProcessName]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSave();
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      }
    },
    [onSave, onUndo, onRedo]
  );

  const saveStatusText = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? `Saved ${lastSavedAt.toLocaleTimeString()}`
        : '';

  return (
    <div className={styles.toolbar} onKeyDown={handleKeyDown}>
      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={onSave}
          disabled={isSaving}
          title="Save (Ctrl+S)"
        >
          <Save size={14} /> Save
        </button>
        <button
          className={styles.button}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} /> Undo
        </button>
        <button
          className={styles.button}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} /> Redo
        </button>
        <button
          className={`${styles.button} ${styles.danger}`}
          onClick={onClear}
          title="Clear canvas"
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <div className={styles.metadata}>
        <input
          className={styles.nameInput}
          value={processName}
          onChange={handleNameChange}
          placeholder="Process name"
          aria-label="Process name"
        />
        <span className={styles.stats}>
          {nodeCount} steps · {edgeCount} connections
        </span>
        {saveStatusText && (
          <span
            className={`${styles.saveStatus} ${isDirty ? styles.unsaved : ''}`}
          >
            {saveStatusText}
          </span>
        )}
      </div>
    </div>
  );
}
