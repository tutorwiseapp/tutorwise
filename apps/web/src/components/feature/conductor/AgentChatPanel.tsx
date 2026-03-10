'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Send, X, GripVertical, RotateCcw } from 'lucide-react';
import styles from './AgentChatPanel.module.css';

interface SpecialistAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatPanelProps {
  agent: SpecialistAgent;
  onClose: () => void;
}

const SUGGESTIONS = [
  'Summarise recent activity',
  'Find at-risk tutors',
  'Analyse booking trends',
  'Top revenue opportunities',
];

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 500;

export function AgentChatPanel({ agent, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  // Reset chat when agent changes
  useEffect(() => {
    setMessages([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [agent.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const prompt = (text ?? input).trim();
    if (!prompt || streaming) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setStreaming(true);

    let assistantContent = '';
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
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
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      setStreaming(false);
    }
  }, [agent.id, input, streaming]);

  // Resize handler — left edge drag, moving left = wider
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.panel} style={{ width: panelWidth }}>
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <GripVertical size={12} />
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Brain size={14} />
          {agent.name}
        </div>
        <div className={styles.headerActions}>
          {panelWidth !== DEFAULT_WIDTH && (
            <button
              className={styles.resetButton}
              onClick={() => setPanelWidth(DEFAULT_WIDTH)}
              aria-label="Reset panel width"
              title="Reset width"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button className={styles.closeButton} onClick={onClose} title="Close" aria-label="Close chat">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages / Empty state */}
      {!hasMessages ? (
        <div className={styles.emptyState}>
          <Brain size={28} style={{ color: 'var(--color-text-tertiary, #9ca3af)' }} />
          <div className={styles.emptyTitle}>Chat with {agent.name}</div>
          <div className={styles.emptyDescription}>
            {agent.description ?? `${agent.role} · ${agent.department}`}
          </div>
        </div>
      ) : (
        <div className={styles.messages} role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
            >
              {msg.content}
            </div>
          ))}
          {streaming && (
            <div className={styles.typingIndicator}>
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestion chips — always visible */}
      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className={styles.suggestionChip}
            onClick={() => send(s)}
            disabled={streaming}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        className={styles.inputArea}
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          ref={inputRef}
          className={styles.textInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Ask ${agent.name} something…`}
          rows={1}
          disabled={streaming}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!input.trim() || streaming}
          title="Send (Enter)"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
