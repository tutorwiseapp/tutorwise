'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import styles from './ApprovalDrawer.module.css';

export interface WorkflowTask {
  id: string;
  execution_id: string;
  node_id: string;
  name: string;
  type: string;
  handler: string | null;
  completion_mode: string;
  status: string;
  assigned_role: string | null;
  result_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
}

interface ApprovalDrawerProps {
  task: WorkflowTask;
  executionId: string;
  executionContext: Record<string, unknown>;
  onClose: () => void;
  onDecision: (decision: 'approve' | 'reject') => void;
}

export function ApprovalDrawer({
  task,
  executionId,
  executionContext,
  onClose,
  onDecision,
}: ApprovalDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiRec, setAiRec] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Fetch AI recommendation when drawer opens
  useEffect(() => {
    setIsLoadingAi(true);
    fetch('/api/admin/workflow/execute/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: `I need an approval recommendation for the task "${task.name}". Context: ${JSON.stringify(executionContext)}. Should I approve or reject this? Give a brief 1-2 sentence recommendation.`,
      }),
    })
      .then((r) => r.json())
      .then((d) => setAiRec(d.result?.message ?? null))
      .catch(() => setAiRec(null))
      .finally(() => setIsLoadingAi(false));
  }, [task.name, executionContext]);

  const handleDecision = useCallback(
    async (decision: 'approve' | 'reject') => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/admin/workflow/execute/${executionId}/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            result_data: { decision, task_id: task.id, decided_at: new Date().toISOString() },
          }),
        });
        if (res.ok) {
          onDecision(decision);
        }
      } catch {
        // let user retry
      } finally {
        setIsSubmitting(false);
      }
    },
    [executionId, task.id, onDecision]
  );

  const contextEntries = Object.entries(executionContext).filter(
    ([k]) => !k.startsWith('_')
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerLabel}>HITL Approval Required</p>
            <h2 className={styles.drawerTitle}>{task.name}</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* AI Recommendation */}
        <div className={styles.aiSection}>
          <div className={styles.aiLabel}>
            <Sparkles size={13} />
            AI Recommendation
          </div>
          {isLoadingAi ? (
            <div className={styles.aiLoading}>
              <Loader2 size={14} className={styles.spinner} /> Analysing context…
            </div>
          ) : (
            <p className={styles.aiText}>{aiRec ?? 'No recommendation available.'}</p>
          )}
        </div>

        {/* Execution Context */}
        {contextEntries.length > 0 && (
          <div className={styles.contextSection}>
            <p className={styles.sectionLabel}>Execution Context</p>
            <dl className={styles.contextList}>
              {contextEntries.map(([key, value]) => (
                <div key={key} className={styles.contextRow}>
                  <dt className={styles.contextKey}>{key}</dt>
                  <dd className={styles.contextValue}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.approveButton}
            onClick={() => handleDecision('approve')}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={14} className={styles.spinner} /> : <CheckCircle size={14} />}
            Approve
          </button>
          <button
            className={styles.rejectButton}
            onClick={() => handleDecision('reject')}
            disabled={isSubmitting}
          >
            <XCircle size={14} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
