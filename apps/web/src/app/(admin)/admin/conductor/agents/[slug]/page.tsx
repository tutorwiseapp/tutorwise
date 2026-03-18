'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Send, Brain, ChevronDown, ChevronUp,
  RefreshCw, Trash2, BookOpen, Layers, Settings,
} from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';
import { AgentConfigModal } from '@/components/feature/conductor/AgentConfigModal';

interface AgentConfig {
  tools?: string[];
  skills?: string[];
  instructions?: string;
  system_prompt_template?: string;
  [key: string]: unknown;
}

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  category: string;
  description: string | null;
  config: AgentConfig;
  seed_config?: AgentConfig | null;
  status: 'active' | 'inactive';
  built_in: boolean;
}

interface RunHistory {
  id: string;
  input_prompt: string;
  output_text: string | null;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface MemoryEpisode {
  id: string;
  task_summary: string;
  outcome_summary: string;
  outcome_type: string;
  entities: string[] | null;
  was_acted_on: boolean | null;
  created_at: string;
}

interface MemoryFact {
  id: string;
  subject: string;
  relation: string;
  object: string;
  context: string | null;
  confidence: number;
  valid_until: string | null;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type RightTab = 'runs' | 'memory';

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

async function fetchMemory(agentId: string): Promise<{ episodes: MemoryEpisode[]; facts: MemoryFact[] }> {
  const res = await fetch(`/api/admin/agents/${agentId}/memory`);
  const json = await res.json() as { success: boolean; data: { episodes: MemoryEpisode[]; facts: MemoryFact[] } };
  if (!json.success) throw new Error('Failed to load memory');
  return json.data;
}

const OUTCOME_COLORS: Record<string, string> = {
  escalation: '#ef4444',
  alert:       '#f97316',
  recommendation: '#3b82f6',
  synthesis:   '#a78bfa',
  analysis:    '#6b7280',
};

export default function AgentChatPage() {
  const { slug } = useParams() as { slug: string };
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('runs');
  const [showConfigModal, setShowConfigModal] = useState(false);
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

  const { data: memory, isFetching: memoryFetching, refetch: refetchMemory } = useQuery({
    queryKey: ['admin-agent-memory', agent?.id],
    queryFn: () => fetchMemory(agent!.id),
    enabled: !!agent?.id && rightTab === 'memory',
    staleTime: 60_000,
    retry: false,
  });

  const deleteEpisodeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const res = await fetch(
        `/api/admin/agents/${agent!.id}/memory?type=episode&recordId=${episodeId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-agent-memory', agent?.id] }),
  });

  const deleteFactMutation = useMutation({
    mutationFn: async (factId: string) => {
      const res = await fetch(
        `/api/admin/agents/${agent!.id}/memory?type=fact&recordId=${factId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-agent-memory', agent?.id] }),
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
        <Link href="/admin/conductor?tab=registry" style={{ color: '#a78bfa' }}>
          Back to Agents
        </Link>
      </div>
    );
  }

  const episodes = memory?.episodes ?? [];
  const facts = memory?.facts ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.chatColumn}>
        <div className={styles.chatHeader}>
          <Link href="/admin/conductor?tab=registry" className={styles.backLink}>
            <ArrowLeft size={16} /> Agents
          </Link>
          <div className={styles.agentInfo}>
            <Brain size={20} />
            <div>
              <div className={styles.agentName}>{agent.name}</div>
              <div className={styles.agentRole}>{agent.role} · {agent.category}</div>
            </div>
          </div>
          <button
            className={styles.configBtn}
            onClick={() => setShowConfigModal(true)}
            title="Configure agent"
          >
            <Settings size={14} /> Configure
          </button>
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

      {/* ── Right column ── */}
      <div className={styles.historyColumn}>
        {/* Tab switcher */}
        <div className={styles.rightTabs}>
          <button
            className={`${styles.rightTab} ${rightTab === 'runs' ? styles.rightTabActive : ''}`}
            onClick={() => setRightTab('runs')}
          >
            <Layers size={12} /> Runs
          </button>
          <button
            className={`${styles.rightTab} ${rightTab === 'memory' ? styles.rightTabActive : ''}`}
            onClick={() => setRightTab('memory')}
          >
            <BookOpen size={12} /> Memory
          </button>
          <button
            className={styles.refreshRunsBtn}
            onClick={() => rightTab === 'runs' ? refetchRuns() : refetchMemory()}
            disabled={rightTab === 'runs' ? runsFetching : memoryFetching}
            title="Refresh"
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={12} className={(rightTab === 'runs' ? runsFetching : memoryFetching) ? styles.spinning : undefined} />
          </button>
        </div>

        {/* ── Runs tab ── */}
        {rightTab === 'runs' && (
          <div className={styles.columnContent}>
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
        )}

        {/* ── Memory tab ── */}
        {rightTab === 'memory' && (
          <div className={styles.columnContent}>
          <div className={styles.memoryTab}>
            {/* Episodes */}
            <div className={styles.memorySection}>
              <div className={styles.memorySectionLabel}>
                Episodes
                <span className={styles.memoryCount}>{episodes.length}</span>
              </div>
              {episodes.length === 0 ? (
                <div className={styles.historyEmpty}>No episodes yet</div>
              ) : (
                episodes.map((ep) => (
                  <div key={ep.id} className={styles.episodeCard}>
                    <button
                      className={styles.episodeHeader}
                      onClick={() => setExpandedEpisode(expandedEpisode === ep.id ? null : ep.id)}
                    >
                      <span
                        className={styles.outcomeTag}
                        style={{ background: OUTCOME_COLORS[ep.outcome_type] ?? '#6b7280' }}
                      >
                        {ep.outcome_type}
                      </span>
                      <span className={styles.episodeSummary}>
                        {ep.task_summary.slice(0, 55)}{ep.task_summary.length > 55 ? '…' : ''}
                      </span>
                      <span className={styles.episodeMeta}>
                        {new Date(ep.created_at).toLocaleDateString()}
                        {expandedEpisode === ep.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </span>
                    </button>
                    {expandedEpisode === ep.id && (
                      <div className={styles.episodeBody}>
                        <div className={styles.episodeField}>
                          <span className={styles.episodeFieldLabel}>Task</span>
                          <span className={styles.episodeFieldValue}>{ep.task_summary}</span>
                        </div>
                        <div className={styles.episodeField}>
                          <span className={styles.episodeFieldLabel}>Outcome</span>
                          <span className={styles.episodeFieldValue}>{ep.outcome_summary}</span>
                        </div>
                        {ep.entities && ep.entities.length > 0 && (
                          <div className={styles.entityTags}>
                            {ep.entities.map((e) => (
                              <span key={e} className={styles.entityTag}>{e}</span>
                            ))}
                          </div>
                        )}
                        {ep.was_acted_on !== null && (
                          <div className={styles.actedOn}>
                            {ep.was_acted_on ? '✓ acted on' : '✗ not acted on'}
                          </div>
                        )}
                        <button
                          className={styles.memoryDeleteBtn}
                          onClick={() => {
                            if (confirm('Delete this episode?')) deleteEpisodeMutation.mutate(ep.id);
                          }}
                          disabled={deleteEpisodeMutation.isPending}
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Facts */}
            <div className={styles.memorySection}>
              <div className={styles.memorySectionLabel}>
                Active Facts
                <span className={styles.memoryCount}>{facts.length}</span>
              </div>
              {facts.length === 0 ? (
                <div className={styles.historyEmpty}>No active facts yet</div>
              ) : (
                facts.map((fact) => (
                  <div key={fact.id} className={styles.factCard}>
                    <div className={styles.factTriple}>
                      <span className={styles.factSubject}>{fact.subject}</span>
                      <span className={styles.factRelation}>{fact.relation}</span>
                      <span className={styles.factObject}>{fact.object}</span>
                    </div>
                    {fact.context && (
                      <div className={styles.factContext}>{fact.context}</div>
                    )}
                    <div className={styles.factFooter}>
                      <span className={styles.factConfidence}>
                        {Math.round(fact.confidence * 100)}% confidence
                      </span>
                      <button
                        className={styles.factInvalidateBtn}
                        onClick={() => {
                          if (confirm('Invalidate this fact?')) deleteFactMutation.mutate(fact.id);
                        }}
                        disabled={deleteFactMutation.isPending}
                        title="Invalidate fact"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        )}
      </div>

      {showConfigModal && (
        <AgentConfigModal
          mode="edit"
          agent={agent as SpecialistAgent & { config: AgentConfig }}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
