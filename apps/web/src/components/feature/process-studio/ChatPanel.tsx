'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Zap, GripVertical, RotateCcw } from 'lucide-react';
import { useProcessStudioStore } from './store';
import type { ChatMessage, ProcessNode, ProcessEdge } from './types';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
  onApplyMutation: (
    nodes: ProcessNode[],
    edges: ProcessEdge[],
    description: string
  ) => void;
}

const SUGGESTIONS = [
  'Add a step',
  'Remove a step',
  'Reorder steps',
  'Add approval gate',
  'Describe this workflow',
];

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 500;

export function ChatPanel({ nodes, edges, onApplyMutation }: ChatPanelProps) {
  const {
    chatMessages,
    addChatMessage,
    isChatLoading,
    setChatLoading,
  } = useProcessStudioStore();

  const [input, setInput] = useState('');
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isChatLoading) return;

      setInput('');

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      addChatMessage(userMsg);
      setChatLoading(true);

      try {
        const res = await fetch('/api/process-studio/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            currentWorkflow: { nodes, edges },
            chatHistory: chatMessages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = await res.json();

        if (!data.success) {
          addChatMessage({
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: data.error || 'Something went wrong. Try again.',
            timestamp: new Date(),
          });
          return;
        }

        const { response, mutation } = data.data;

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          mutation: mutation
            ? {
                type: mutation.type,
                before: { nodes, edges },
                after: { nodes: mutation.nodes, edges: mutation.edges },
                description: mutation.description,
              }
            : undefined,
        };
        addChatMessage(assistantMsg);

        // Apply the mutation to the canvas
        if (mutation?.nodes && mutation?.edges) {
          onApplyMutation(
            mutation.nodes as ProcessNode[],
            mutation.edges as ProcessEdge[],
            mutation.description || 'Chat edit'
          );
        }
      } catch {
        addChatMessage({
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Failed to connect to AI service. Please try again.',
          timestamp: new Date(),
        });
      } finally {
        setChatLoading(false);
      }
    },
    [nodes, edges, chatMessages, isChatLoading, addChatMessage, setChatLoading, onApplyMutation]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage]
  );

  // Resize handler
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      // Dragging left edge: moving left = wider panel
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

  const hasMessages = chatMessages.length > 0;

  return (
    <div className={styles.panel} style={{ width: panelWidth }}>
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <GripVertical size={12} />
      </div>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <MessageSquare size={14} />
          Process Assistant
        </div>
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
      </div>

      {!hasMessages ? (
        <div className={styles.emptyState}>
          <MessageSquare size={28} style={{ color: 'var(--color-text-tertiary)' }} />
          <div className={styles.emptyTitle}>Ask me anything</div>
          <div className={styles.emptyDescription}>
            Describe changes to your workflow in natural language. I can add, remove, modify, or reorder steps.
          </div>
        </div>
      ) : (
        <div className={styles.messages} role="log" aria-live="polite">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${
                msg.role === 'user'
                  ? styles.userMessage
                  : msg.role === 'assistant'
                    ? styles.assistantMessage
                    : styles.systemMessage
              }`}
            >
              {msg.content}
              {msg.mutation && (
                <div className={styles.mutationBadge}>
                  <Zap size={10} />
                  {msg.mutation.description}
                </div>
              )}
            </div>
          ))}
          {isChatLoading && (
            <div className={styles.typingIndicator}>
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className={styles.suggestionChip}
            onClick={() => handleSuggestion(s)}
            disabled={isChatLoading}
          >
            {s}
          </button>
        ))}
      </div>

      <form className={styles.inputArea} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.textInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a change..."
          rows={1}
          disabled={isChatLoading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!input.trim() || isChatLoading}
          title="Send (Enter)"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
