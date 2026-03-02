'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Zap } from 'lucide-react';
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

export function ChatPanel({ nodes, edges, onApplyMutation }: ChatPanelProps) {
  const {
    chatMessages,
    addChatMessage,
    isChatLoading,
    setChatLoading,
    toggleChat,
  } = useProcessStudioStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const hasMessages = chatMessages.length > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <MessageSquare size={14} />
          Process Assistant
        </div>
        <button
          className={styles.closeButton}
          onClick={toggleChat}
          aria-label="Close chat"
        >
          <X size={16} />
        </button>
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
