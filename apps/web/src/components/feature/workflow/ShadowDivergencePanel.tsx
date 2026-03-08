'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import styles from './ShadowDivergencePanel.module.css';

interface ShadowExecution {
  id: string;
  started_at: string;
  shadow_divergence: Record<string, unknown> | null;
}

interface ShadowDivergencePanelProps {
  executions: ShadowExecution[];
}

export function ShadowDivergencePanel({ executions }: ShadowDivergencePanelProps) {
  const shadowRuns = executions.filter((e) => e.shadow_divergence !== null);
  const cleanRuns = executions.length - shadowRuns.length;

  if (executions.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Shadow Analysis</span>
        <span className={styles.summary}>
          {executions.length} runs · {cleanRuns} matched · {shadowRuns.length} diverged
        </span>
      </div>
      {shadowRuns.length === 0 ? (
        <div className={styles.clean}>
          <CheckCircle size={14} />
          All {cleanRuns} shadow execution{cleanRuns !== 1 ? 's' : ''} matched expected state
        </div>
      ) : (
        <div className={styles.divergences}>
          {shadowRuns.map((run) => (
            <div key={run.id} className={styles.divergenceRow}>
              <AlertTriangle size={12} className={styles.warnIcon} />
              <span className={styles.runId}>{run.id.slice(0, 8)}</span>
              <span className={styles.divergenceDetail}>
                {JSON.stringify(run.shadow_divergence).slice(0, 80)}…
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
