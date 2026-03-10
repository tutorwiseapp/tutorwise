'use client';

import { useState } from 'react';
import { Terminal, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import styles from './ExecutionCommandBar.module.css';
import type { IntentResult } from '@/lib/conductor/IntentDetector';

interface ExecutionCommandBarProps {
  onResult?: (message: string) => void;
  /** Phase 4B: Navigation callbacks for intent routing */
  onNavigateToAgent?: (slug: string, prompt?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutionCommandBar({ onResult, onNavigateToAgent, onNavigateToTab }: ExecutionCommandBarProps) {
  const [command, setCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState<{ processId: string; processName: string; prompt: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isRunning) return;

    setIsRunning(true);
    setLastMessage(null);
    setConfirmTrigger(null);

    try {
      // Phase 4B: Classify intent before routing
      const classifyRes = await fetch('/api/admin/conductor/classify-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command }),
      });

      if (classifyRes.ok) {
        const { data: intent } = await classifyRes.json() as { data: IntentResult };

        if (intent.confidence >= 0.7) {
          if (intent.intent === 'query_agent' && intent.target_agent_slug) {
            // Route to agent chat
            onNavigateToAgent?.(intent.target_agent_slug, intent.prompt ?? command);
            setLastMessage(`Routing to ${intent.target_agent_slug} agent…`);
            setCommand('');
            return;
          }

          if (intent.intent === 'trigger_workflow' && intent.target_process_id) {
            // Show inline workflow trigger confirmation
            setConfirmTrigger({
              processId: intent.target_process_id,
              processName: intent.target_process_id, // Will show ID until we have name
              prompt: intent.prompt ?? command,
            });
            setCommand('');
            return;
          }

          if (intent.intent === 'view_analytics') {
            onNavigateToTab?.('intelligence');
            setLastMessage(`Opening ${intent.analytics_tab ?? 'intelligence'} view…`);
            setCommand('');
            return;
          }
        }
      }

      // Fallback: general command → original execute/command handler
      const res = await fetch('/api/admin/workflow/execute/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      const msg = data.result?.message ?? data.error ?? 'No response';
      setLastMessage(msg);
      onResult?.(msg);
      setCommand('');
    } catch {
      setLastMessage('Failed to send command');
    } finally {
      setIsRunning(false);
    }
  };

  const handleWorkflowTrigger = async () => {
    if (!confirmTrigger) return;
    setIsRunning(true);
    try {
      const res = await fetch('/api/admin/process-studio/execute/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: confirmTrigger.processId, context: {} }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastMessage(`Workflow started: ${data.executionId ?? 'ok'}`);
        onResult?.(`Workflow started: ${data.executionId ?? 'ok'}`);
      } else {
        setLastMessage(data.error ?? 'Failed to start workflow');
      }
    } catch {
      setLastMessage('Failed to trigger workflow');
    } finally {
      setIsRunning(false);
      setConfirmTrigger(null);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Terminal size={14} className={styles.icon} />
        <input
          className={styles.input}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='e.g. "Show at-risk tutors" or "Run commission payout" or "Show referral analytics"'
          disabled={isRunning}
        />
        <button className={styles.submitButton} type="submit" disabled={isRunning || !command.trim()}>
          {isRunning ? <Loader2 size={14} className={styles.spinner} /> : <ArrowRight size={14} />}
        </button>
      </form>

      {/* Workflow trigger confirmation */}
      {confirmTrigger && (
        <div className={styles.confirm}>
          <AlertCircle size={13} />
          <span>Run &quot;{confirmTrigger.processName}&quot; workflow now?</span>
          <button className={styles.confirmYes} onClick={handleWorkflowTrigger} disabled={isRunning}>
            {isRunning ? 'Starting…' : 'Run'}
          </button>
          <button className={styles.confirmNo} onClick={() => setConfirmTrigger(null)}>
            Cancel
          </button>
        </div>
      )}

      {lastMessage && <p className={styles.result}>{lastMessage}</p>}
    </div>
  );
}
