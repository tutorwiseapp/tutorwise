'use client';

/**
 * Sage Chat Component
 *
 * Main chat interface for Sage AI tutor.
 * Integrated with Hub architecture for the /sage page.
 *
 * @module components/feature/sage/SageChat
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './SageChat.module.css';
import { useSageChat, type SageMessage as SageMessageType, type SageSubject, type SageLevel } from './useSageChat';
import SageMarkdown from './SageMarkdown';

// --- Types ---

interface SageChatProps {
  subject?: SageSubject;
  level?: SageLevel;
  autoStart?: boolean;
  streaming?: boolean;
  className?: string;
  onSessionStart?: () => void;
}

// --- Component ---

export default function SageChat({
  subject,
  level,
  autoStart = false,
  streaming = true,
  className,
  onSessionStart,
}: SageChatProps) {
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
  } = useSageChat({
    autoStart,
    streaming,
    subject,
    level,
    onError: (err) => console.error('[SageChat] Error:', err),
    onSessionStart: () => onSessionStart?.(),
  });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when session starts
  useEffect(() => {
    if (session) {
      inputRef.current?.focus();
    }
  }, [session]);

  // Handle message submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || isLoading) return;

    const message = inputValue;
    setInputValue('');

    // Start session first if not already started
    if (!session) {
      await startSession({ subject, level });
    }
    await sendMessage(message);
  }, [inputValue, isSending, isLoading, session, startSession, sendMessage, subject, level]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    if (!session) {
      await startSession({ subject, level });
    }
    sendMessage(suggestion);
  }, [session, startSession, sendMessage, subject, level]);

  // Handle Enter key (submit on Enter, new line on Shift+Enter)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Handle feedback submission
  const handleFeedback = useCallback(async (messageId: string, rating: 1 | -1) => {
    try {
      await fetch('/api/sage/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          sessionId: session?.sessionId,
          rating,
          context: {
            persona: session?.persona,
            subject: session?.subject,
          },
        }),
      });
    } catch (err) {
      console.error('[SageChat] Feedback error:', err);
    }
  }, [session]);

  // Default suggestions for empty state
  const defaultSuggestions = subject
    ? getSubjectSuggestions(subject)
    : ['What should I study today?', 'Help me with homework', 'Explain a concept'];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className={`${styles.chat} ${className || ''}`}>
      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>!</span>
          <span className={styles.errorText}>{error}</span>
          <button onClick={clearError} className={styles.errorDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {/* Messages container */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <span>Starting your session...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>Ready to Learn</h3>
            <p className={styles.emptyText}>
              {subject
                ? `Ask me anything about ${subject}.`
                : 'Ask a question or pick a suggestion below to start.'}
            </p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                onFeedback={handleFeedback}
              />
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

      {/* Input form */}
      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sage a question..."
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

// --- Message Bubble Sub-component ---

interface MessageBubbleProps {
  message: SageMessageType;
  isLast: boolean;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
}

function MessageBubble({ message, isLast: _isLast, onFeedback }: MessageBubbleProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.isLoading && message.content.length > 0;

  const handleFeedback = async (rating: 1 | -1) => {
    if (feedbackGiven) return;
    await onFeedback?.(message.id, rating);
    setFeedbackGiven(rating);
  };

  // Loading state (no content yet)
  if (message.isLoading && message.content.length === 0) {
    return (
      <div className={`${styles.message} ${styles.messageReceived}`}>
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

  // System message
  if (isSystem) {
    return (
      <div className={styles.systemMessage}>
        {message.content}
      </div>
    );
  }

  const showFeedback = !isUser && !message.isLoading && onFeedback;

  return (
    <div className={`${styles.message} ${isUser ? styles.messageSent : styles.messageReceived}`}>
      {!isUser && (
        <div className={styles.messageAvatar}>
          <span>S</span>
        </div>
      )}
      <div className={styles.messageWrapper}>
        <div className={`${styles.messageContent} ${isStreaming ? styles.streaming : ''}`}>
          {isUser ? (
            message.content
          ) : (
            <SageMarkdown content={message.content} />
          )}
          {isStreaming && <span className={styles.streamingCursor} />}
        </div>
        <div className={styles.messageFooter}>
          {!message.isLoading && (
            <span className={styles.messageTimestamp}>
              {formatTime(message.timestamp)}
            </span>
          )}
          {showFeedback && (
            <div className={styles.feedbackButtons}>
              <button
                className={`${styles.feedbackButton} ${feedbackGiven === 1 ? styles.feedbackActive : ''}`}
                onClick={() => handleFeedback(1)}
                disabled={feedbackGiven !== null}
                aria-label="Helpful"
                title="This was helpful"
              >
                Yes
              </button>
              <button
                className={`${styles.feedbackButton} ${feedbackGiven === -1 ? styles.feedbackActive : ''}`}
                onClick={() => handleFeedback(-1)}
                disabled={feedbackGiven !== null}
                aria-label="Not helpful"
                title="This was not helpful"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getSubjectSuggestions(subject: SageSubject): string[] {
  switch (subject) {
    case 'maths':
      return ['Solve a problem step-by-step', 'Explain algebra', 'Practice fractions', 'Help with geometry'];
    case 'english':
      return ['Check my writing', 'Grammar rules', 'Essay structure', 'Improve vocabulary'];
    case 'science':
      return ['Explain a concept', 'Balance equations', 'Physics formulas', 'Biology revision'];
    default:
      return ['Study techniques', 'Exam preparation', 'Time management', 'Note-taking tips'];
  }
}

export { SageChat };
