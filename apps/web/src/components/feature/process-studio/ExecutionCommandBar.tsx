'use client';

import { useState } from 'react';
import { Terminal, Loader2, ArrowRight } from 'lucide-react';
import styles from './ExecutionCommandBar.module.css';

interface ExecutionCommandBarProps {
  onResult?: (message: string) => void;
}

export function ExecutionCommandBar({ onResult }: ExecutionCommandBarProps) {
  const [command, setCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isRunning) return;

    setIsRunning(true);
    setLastMessage(null);
    try {
      const res = await fetch('/api/admin/process-studio/execute/command', {
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

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Terminal size={14} className={styles.icon} />
        <input
          className={styles.input}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='e.g. "Show all paused executions" or "Cancel the failed Tutor Approval run"'
          disabled={isRunning}
        />
        <button className={styles.submitButton} type="submit" disabled={isRunning || !command.trim()}>
          {isRunning ? <Loader2 size={14} className={styles.spinner} /> : <ArrowRight size={14} />}
        </button>
      </form>
      {lastMessage && <p className={styles.result}>{lastMessage}</p>}
    </div>
  );
}
