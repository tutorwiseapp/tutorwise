'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './ExecutionModeToggle.module.css';

type ExecutionMode = 'design' | 'shadow' | 'live';

interface ExecutionModeToggleProps {
  processId: string;
  processName: string;
  currentMode: ExecutionMode;
  onModeChanged: (newMode: ExecutionMode) => void;
}

const MODE_LABELS: Record<ExecutionMode, string> = {
  design: 'Design',
  shadow: 'Shadow',
  live: 'Live',
};

const NEXT_MODE: Record<ExecutionMode, ExecutionMode> = {
  design: 'shadow',
  shadow: 'live',
  live: 'shadow',
};

const ACTION_LABEL: Record<ExecutionMode, string> = {
  design: 'Go Shadow',
  shadow: 'Go Live',
  live: 'Back to Shadow',
};

export function ExecutionModeToggle({
  processId,
  processName,
  currentMode,
  onModeChanged,
}: ExecutionModeToggleProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    const nextMode = NEXT_MODE[currentMode];
    const isGoingLive = nextMode === 'live';

    if (isGoingLive) {
      const confirmed = window.confirm(
        `Switch "${processName}" to live mode?\n\nThe engine will handle all new executions. Make sure shadow executions show 0 divergences before proceeding.`
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/workflow/processes/${processId}/execution-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = await res.json();
      if (data.mode) {
        onModeChanged(data.mode as ExecutionMode);
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <span className={`${styles.badge} ${styles[currentMode]}`}>
        {MODE_LABELS[currentMode]}
      </span>
      <button
        className={`${styles.toggleButton} ${currentMode === 'live' ? styles.dangerButton : ''}`}
        onClick={handleToggle}
        disabled={isSaving}
        title={`Switch to ${NEXT_MODE[currentMode]} mode`}
      >
        {isSaving ? <Loader2 size={11} className={styles.spinner} /> : null}
        {ACTION_LABEL[currentMode]}
      </button>
    </div>
  );
}
