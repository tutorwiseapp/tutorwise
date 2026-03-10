'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Brain, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
}

interface RunHistory {
  id: string;
  input_prompt: string;
  output_text: string | null;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function fetchAgentBySlug(slug: string): Promise<SpecialistAgent | null> {
  const res = await fetch(`/api/admin/agents?status=active`);
  const json = await res.json() as { success: boolean; data: SpecialistAgent[] };
  if (!json.success) throw new Error('Failed to load agents');
  return json.data.find((a) => a.slug === slug) ?? null;
}

async function fetchRunHistory(agentId: string): Promise<RunHistory[]> {
  const res = await fetch(`/api/admin/agents/${agentId}/runs`);
  const json = await res.json() as { success: boolean; data: RunHistory[] };
  if (!json.success) throw new Error('Failed to load run history');
  return json.data;
}

export default function AgentChatPage() {
  const { slug } = useParams() as { slug: string };
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: agent, isLoading: agentLoading, error: agentError } = useQuery({
    queryKey: ['admin-agent', slug],
    queryFn: () => fetchAgentBySlug(slug),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: runs = [], isFetching: runsFetching, refetch: refetchRuns } = useQuery({
    queryKey: ['admin-agent-runs', agent?.id],
    queryFn: () => fetchRunHistory(agent!.id),
    enabled: !!agent?.id,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming || !agent) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    let assistantContent = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6)) as { type: string; data: { content?: string } };
              if (event.type === 'chunk' && event.data.content) {
                assistantContent += event.data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } finally {
      setStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['admin-agent-runs', agent.id] });
    }
  };

  if (agentLoading) {
    return <div className={styles.loading}>Loading agent…</div>;
  }

  if (agentError || !agent) {
    return (
      <div className={styles.loading}>
        Agent not found.{' '}
        <Link href="/admin/conductor?tab=agents" style={{ color: '#a78bfa' }}>
          Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.chatColumn}>
        <div className={styles.chatHeader}>
          <Link href="/admin/conductor?tab=agents" className={styles.backLink}>
            <ArrowLeft size={16} /> Agents
          </Link>
          <div className={styles.agentInfo}>
            <Brain size={20} />
            <div>
              <div className={styles.agentName}>{agent.name}</div>
              <div className={styles.agentRole}>{agent.role} · {agent.department}</div>
            </div>
          </div>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.emptyChat}>
              <Brain size={32} />
              <p>Chat with {agent.name}</p>
              <p className={styles.emptySub}>{agent.description}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
              <div className={styles.messageContent}>{msg.content || (streaming && i === messages.length - 1 ? '…' : '')}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Ask ${agent.name} something…`}
            rows={2}
            disabled={streaming}
          />
          <button
            className={styles.sendBtn}
            onClick={send}
            disabled={streaming || !input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className={styles.historyColumn}>
        <div className={styles.historyTitle}>
          Run History
          <button
            className={styles.refreshRunsBtn}
            onClick={() => refetchRuns()}
            disabled={runsFetching}
            title="Refresh"
          >
            <RefreshCw size={12} className={runsFetching ? styles.spinning : undefined} />
          </button>
        </div>
        {runs.length === 0 ? (
          <div className={styles.historyEmpty}>No runs yet</div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className={styles.runCard}>
              <button
                className={styles.runHeader}
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
              >
                <span className={styles.runPrompt}>{run.input_prompt.slice(0, 60)}{run.input_prompt.length > 60 ? '…' : ''}</span>
                <span className={styles.runMeta}>
                  {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : '—'}
                  {expandedRun === run.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>
              {expandedRun === run.id && run.output_text && (
                <div className={styles.runOutput}>{run.output_text}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
