'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderOpen, X, Loader2, Trash2, FileText } from 'lucide-react';
import type { WorkflowProcess } from './types';
import styles from './ProcessBrowser.module.css';

interface ProcessBrowserProps {
  onLoad: (process: WorkflowProcess) => void;
}

export function ProcessBrowser({ onLoad }: ProcessBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processes, setProcesses] = useState<WorkflowProcess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/process-studio/processes');
      const data = await res.json();
      if (data.success) {
        setProcesses(data.data);
      } else {
        setError(data.error || 'Failed to load processes');
      }
    } catch {
      setError('Failed to load processes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProcesses();
    }
  }, [isOpen, fetchProcesses]);

  const handleLoad = useCallback(
    (process: WorkflowProcess) => {
      onLoad(process);
      setIsOpen(false);
    },
    [onLoad]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const confirmed = window.confirm(
        'Delete this process? This cannot be undone.'
      );
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/admin/process-studio/processes/${id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setProcesses((prev) => prev.filter((p) => p.id !== id));
        }
      } catch {
        // Silently fail — user can retry
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!isOpen) {
    return (
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(true)}
        title="Open saved process"
      >
        <FolderOpen size={16} />
        Open
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Open Process"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <FolderOpen size={18} />
            <span>Saved Processes</span>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.processList}>
          {isLoading && (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Loading processes...</span>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <span>{error}</span>
              <button className={styles.retryButton} onClick={fetchProcesses}>
                Try again
              </button>
            </div>
          )}

          {!isLoading &&
            !error &&
            processes.map((process) => (
              <button
                key={process.id}
                className={styles.processCard}
                onClick={() => handleLoad(process)}
              >
                <FileText size={20} style={{ flexShrink: 0, color: 'var(--color-primary, #006C67)' }} />
                <div className={styles.processInfo}>
                  <div className={styles.processName}>{process.name}</div>
                  {process.description && (
                    <div className={styles.processDescription}>
                      {process.description}
                    </div>
                  )}
                  <div className={styles.processMeta}>
                    <span>{process.category}</span>
                    <span>Updated {formatDate(process.updated_at)}</span>
                  </div>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDelete(e, process.id)}
                  title="Delete process"
                  aria-label={`Delete ${process.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}

          {!isLoading && !error && processes.length === 0 && (
            <div className={styles.emptyState}>
              No saved processes yet. Create one and save it to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
