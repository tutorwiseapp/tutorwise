'use client';

import { useCallback, useRef } from 'react';
import { Save, Undo2, Redo2, Trash2, FilePlus, FileDown, FileUp, Maximize2 } from 'lucide-react';
import { ProcessBrowser } from './ProcessBrowser';
import type { WorkflowProcess } from './types';
import { useWorkflowStore } from './store';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onSave: () => void;
  onClear: () => void;
  onNew: () => void;
  onExportPDF: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onLoadProcess: (process: WorkflowProcess) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFullscreen?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  nodeCount: number;
  edgeCount: number;
}

export function Toolbar({
  onSave,
  onClear,
  onNew,
  onExportPDF,
  onExportJSON,
  onImportJSON,
  onLoadProcess,
  onUndo,
  onRedo,
  onFullscreen,
  canUndo,
  canRedo,
  isSaving,
  nodeCount,
  edgeCount,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { processName, setProcessName, isDirty, lastSavedAt, autoSaveStatus } =
    useWorkflowStore();

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImportJSON(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onImportJSON]
  );

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

  const saveStatusText = autoSaveStatus === 'saving' || isSaving
    ? 'Saving...'
    : autoSaveStatus === 'error'
      ? 'Save failed'
      : isDirty
        ? 'Unsaved changes'
        : lastSavedAt
          ? `Saved ${lastSavedAt.toLocaleTimeString()}`
          : '';

  const saveStatusClass = autoSaveStatus === 'saving' || isSaving
    ? styles.statusSaving
    : autoSaveStatus === 'error'
      ? styles.statusError
      : isDirty
        ? styles.unsaved
        : styles.statusSaved;

  return (
    <div className={styles.toolbar} onKeyDown={handleKeyDown}>
      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={onNew}
          title="New process"
        >
          <FilePlus size={14} /> New
        </button>
        <ProcessBrowser onLoad={onLoadProcess} />
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
          onClick={onExportPDF}
          title="Export as PDF"
        >
          <FileDown size={14} /> PDF
        </button>
        <button
          className={styles.button}
          onClick={onExportJSON}
          title="Export as JSON"
        >
          <FileDown size={14} /> JSON
        </button>
        <button
          className={styles.button}
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON file"
        >
          <FileUp size={14} /> Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
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
        {onFullscreen && (
          <button
            className={styles.button}
            onClick={onFullscreen}
            title="Fullscreen mode"
          >
            <Maximize2 size={14} /> Fullscreen
          </button>
        )}
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
          <span className={`${styles.saveStatus} ${saveStatusClass}`}>
            <span className={styles.statusDot} />
            {saveStatusText}
          </span>
        )}
      </div>
    </div>
  );
}
