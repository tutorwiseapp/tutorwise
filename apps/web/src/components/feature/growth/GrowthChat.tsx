'use client';

/**
 * Growth Chat Component
 *
 * Main chat interface for the Growth Agent business advisor.
 * Mirrors SageChat pattern — integrated with Hub architecture for /growth page.
 *
 * @module components/feature/growth/GrowthChat
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './GrowthChat.module.css';
import { useGrowthChat, type GrowthMessage } from './useGrowthChat';

interface GrowthChatProps {
  autoStart?: boolean;
  streaming?: boolean;
  className?: string;
  onSessionStart?: () => void;
}

export default function GrowthChat({
  autoStart = false,
  streaming = true,
  className,
  onSessionStart,
}: GrowthChatProps) {
  const {
    messages,
    session,
    isLoading,
    isSending,
    error,
    suggestions,
    startSession,
    sendMessage,
    clearError,
  } = useGrowthChat({
    autoStart,
    streaming,
    onError: (err) => console.error('[GrowthChat] Error:', err),
    onSessionStart: () => onSessionStart?.(),
  });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (session) {
      inputRef.current?.focus();
      // Scroll back to top so the header remains visible after focus() scrolls page to input
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        const scrollContainer = document.querySelector('[data-scroll-container]') as HTMLElement | null;
        if (scrollContainer) scrollContainer.scrollTop = 0;
      });
    }
  }, [session]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || isLoading) return;

    const message = inputValue;
    setInputValue('');

    if (!session) await startSession();
    await sendMessage(message);
  }, [inputValue, isSending, isLoading, session, startSession, sendMessage]);

  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    if (!session) await startSession();
    sendMessage(suggestion);
  }, [session, startSession, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  const displaySuggestions = suggestions.length > 0
    ? suggestions
    : ['How can I increase my income?', 'Should I create an AI Tutor?', 'Help me grow my business'];

  return (
    <div className={`${styles.chat} ${className || ''}`}>
      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>!</span>
          <span className={styles.errorText}>{error}</span>
          <button onClick={clearError} className={styles.errorDismiss}>Dismiss</button>
        </div>
      )}

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <span>Loading your Growth advisor...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>Ready to Grow</h3>
            <p className={styles.emptyText}>Ask me anything about growing your tutoring income, business strategy, or referrals.</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestions */}
      {displaySuggestions.length > 0 && !isSending && (
        <div className={styles.suggestions}>
          {displaySuggestions.slice(0, 4).map((suggestion, index) => (
            <button
              key={index}
              className={styles.suggestionChip}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Growth anything about your business..."
          className={styles.input}
          disabled={isSending || isLoading}
          rows={1}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputValue.trim() || isSending || isLoading}
          aria-label="Send message"
        >
          {isSending ? (
            <span className={styles.sendingDots}>
              <span />
              <span />
              <span />
            </span>
          ) : (
            <span>Send</span>
          )}
        </button>
      </form>
    </div>
  );
}

// --- Message Bubble ---

function MessageBubble({ message }: { message: GrowthMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.isLoading && message.content.length > 0;

  if (message.isLoading && message.content.length === 0) {
    return (
      <div className={`${styles.message} ${styles.messageReceived}`}>
        <div className={styles.messageAvatar}>G</div>
        <div className={styles.messageContent}>
          <div className={styles.typingIndicator}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return <div className={styles.systemMessage}>{message.content}</div>;
  }

  return (
    <div className={`${styles.message} ${isUser ? styles.messageSent : styles.messageReceived}`}>
      {!isUser && <div className={styles.messageAvatar}>G</div>}
      <div className={styles.messageWrapper}>
        <div className={styles.messageContent}>
          {message.content}
          {isStreaming && <span className={styles.streamingCursor} />}
        </div>
        <div className={styles.messageFooter}>
          <span className={styles.messageTimestamp}>
            {message.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
