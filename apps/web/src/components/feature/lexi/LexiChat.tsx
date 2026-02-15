'use client';

/**
 * Lexi Chat Component
 *
 * Main chat interface for Lexi following hub architecture patterns.
 * Uses CSS modules and follows ChatThread structure.
 *
 * Features:
 * - Streaming responses with progressive text display
 * - Error handling with retry support
 * - Rate limiting feedback
 * - Session expiry handling
 * - Network recovery
 *
 * @module components/feature/lexi/LexiChat
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LexiChat.module.css';
import { useLexiChat, type LexiMessage as LexiMessageType } from './useLexiChat';
import LexiMarkdown from './LexiMarkdown';
import { getDeepLink } from '@lexi/utils/deep-links';

// --- Types ---

interface LexiChatProps {
  onClose?: () => void;
  autoStart?: boolean;
  streaming?: boolean;
  className?: string;
}

// Error types for better handling
type ErrorType = 'rate_limit' | 'session_expired' | 'network' | 'unknown';

function parseErrorType(error: string): { type: ErrorType; retryAfter?: number } {
  if (error.includes('Rate limit') || error.includes('Too many')) {
    const match = error.match(/try again in (\d+)/i);
    return { type: 'rate_limit', retryAfter: match ? parseInt(match[1], 10) : 60 };
  }
  if (error.includes('Session') && (error.includes('expired') || error.includes('not found'))) {
    return { type: 'session_expired' };
  }
  if (error.includes('network') || error.includes('Failed to fetch')) {
    return { type: 'network' };
  }
  return { type: 'unknown' };
}

// --- Component ---

export default function LexiChat({ onClose, autoStart = true, streaming = true, className }: LexiChatProps) {
  const router = useRouter();

  const {
    messages,
    session,
    isLoading,
    isSending,
    error,
    suggestions,
    startSession,
    endSession,
    sendMessage,
    clearError,
  } = useLexiChat({
    autoStart,
    streaming,
    onError: (err) => console.error('[LexiChat] Error:', err),
  });

  const [inputValue, setInputValue] = useState('');
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle rate limit countdown
  useEffect(() => {
    if (error) {
      const { type, retryAfter } = parseErrorType(error);
      if (type === 'rate_limit' && retryAfter) {
        setRetryCountdown(retryAfter);
        retryTimerRef.current = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (retryTimerRef.current) clearInterval(retryTimerRef.current);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [error]);

  // Handle session recovery
  const handleSessionRecovery = useCallback(async () => {
    setIsRetrying(true);
    clearError();
    try {
      await startSession();
    } finally {
      setIsRetrying(false);
    }
  }, [clearError, startSession]);

  // Handle retry after network error
  const handleRetry = useCallback(async () => {
    clearError();
    // Re-focus input for user to resend
    inputRef.current?.focus();
  }, [clearError]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [session]);

  // Handle message submit - starts session if needed
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || isLoading) return;

    const message = inputValue;
    setInputValue('');

    // Start session first if not already started
    if (!session) {
      await startSession();
    }
    await sendMessage(message);
  }, [inputValue, isSending, isLoading, session, startSession, sendMessage]);

  // Handle suggestion click - navigate if deep link exists, otherwise send message
  const handleSuggestionClick = useCallback(async (suggestion: string) => {
    const deepLink = getDeepLink(suggestion);
    if (deepLink) {
      // Close chat modal if navigating
      onClose?.();
      router.push(deepLink.href);
    } else {
      // Start session first if not already started
      if (!session) {
        await startSession();
      }
      // Send as message
      sendMessage(suggestion);
    }
  }, [session, startSession, sendMessage, router, onClose]);

  // Handle close - close immediately, cleanup session in background
  const handleClose = useCallback(() => {
    onClose?.();
    // Cleanup session in background (don't block UI)
    endSession().catch(() => {});
  }, [endSession, onClose]);

  // Handle feedback submission
  const handleFeedback = useCallback(async (messageId: string, rating: 1 | -1) => {
    try {
      const response = await fetch('/api/lexi/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          sessionId: session?.sessionId,
          rating,
          context: {
            persona: session?.persona,
          },
        }),
      });

      if (!response.ok) {
        console.error('[LexiChat] Failed to submit feedback');
      }
    } catch (err) {
      console.error('[LexiChat] Feedback error:', err);
    }
  }, [session]);

  // Get persona display name based on user role
  const getPersonaTitle = (persona?: string) => {
    switch (persona) {
      case 'student': return 'Student';
      case 'tutor': return 'Tutor';
      case 'client': return 'Client';
      case 'agent': return 'Agent';
      case 'organisation': return 'Organisation';
      case 'guest': return 'Guest';
      default: return 'AI Assistant';
    }
  };

  // Default suggestions shown before session starts
  const defaultSuggestions = ['How can you help?', 'Find a tutor', 'My schedule'];

  // Use session suggestions if available, otherwise show defaults
  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className={`${styles.chat} ${className || ''}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.avatar}>
            <span className={styles.avatarIcon}>L</span>
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>Lexi</h2>
            <span className={styles.subtitle}>
              {session ? getPersonaTitle(session.persona) : 'AI Assistant'}
            </span>
          </div>
        </div>
        {onClose && (
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </header>

      {/* Error banner with contextual actions */}
      {error && (
        <div className={styles.errorBanner}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>⚠️</span>
            <div className={styles.errorText}>
              {(() => {
                const { type } = parseErrorType(error);
                switch (type) {
                  case 'rate_limit':
                    return (
                      <>
                        <strong>Slow down</strong>
                        <span>
                          {retryCountdown
                            ? `Please wait ${retryCountdown}s before sending another message.`
                            : 'You can try again now.'}
                        </span>
                      </>
                    );
                  case 'session_expired':
                    return (
                      <>
                        <strong>Session expired</strong>
                        <span>Your session has ended. Start a new conversation?</span>
                      </>
                    );
                  case 'network':
                    return (
                      <>
                        <strong>Connection lost</strong>
                        <span>Check your internet connection and try again.</span>
                      </>
                    );
                  default:
                    return <span>{error}</span>;
                }
              })()}
            </div>
          </div>
          <div className={styles.errorActions}>
            {(() => {
              const { type } = parseErrorType(error);
              if (type === 'session_expired') {
                return (
                  <button
                    onClick={handleSessionRecovery}
                    className={styles.errorRetryButton}
                    disabled={isRetrying}
                  >
                    {isRetrying ? 'Starting...' : 'New Session'}
                  </button>
                );
              }
              if (type === 'network') {
                return (
                  <button onClick={handleRetry} className={styles.errorRetryButton}>
                    Retry
                  </button>
                );
              }
              return null;
            })()}
            <button onClick={clearError} className={styles.errorDismiss} aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages container */}
      <div className={styles.messagesContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <span>Starting conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={styles.emptyText}>Start a conversation</p>
            <p className={styles.emptySubtext}>Ask me anything or try a suggestion below</p>
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
          {displaySuggestions.slice(0, 3).map((suggestion, index) => (
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
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          className={styles.input}
          disabled={isSending || isLoading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputValue.trim() || isSending || isLoading}
        >
          {isSending ? (
            <span className={styles.sendingDots}>
              <span />
              <span />
              <span />
            </span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

// --- Message Bubble Sub-component ---

interface MessageBubbleProps {
  message: LexiMessageType;
  isLast: boolean;
  onFeedback?: (messageId: string, rating: 1 | -1) => void;
}

function MessageBubble({ message, isLast: _isLast, onFeedback }: MessageBubbleProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isStreaming = message.isLoading && message.content.length > 0;

  // Handle feedback click
  const handleFeedback = async (rating: 1 | -1) => {
    if (feedbackGiven || feedbackLoading) return;

    setFeedbackLoading(true);
    try {
      await onFeedback?.(message.id, rating);
      setFeedbackGiven(rating);
    } catch {
      // Silently fail - feedback is non-critical
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Loading state (no content yet - show typing indicator)
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
      <div className={`${styles.messageContent} ${isStreaming ? styles.streaming : ''}`}>
        {isUser ? (
          // User messages: plain text
          message.content
        ) : (
          // Assistant messages: render markdown
          <LexiMarkdown content={message.content} />
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
              disabled={feedbackGiven !== null || feedbackLoading}
              aria-label="Helpful"
              title="This was helpful"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M6 10V17M6 10L8.5 6.5C9 5.5 9.5 4 9.5 3C9.5 2 10 1 11 1C12.5 1 13 2.5 13 4V7H16.5C17.5 7 18.5 8 18.5 9C18.5 9.5 18.5 10 18 10.5L16 14.5C15.5 15.5 15 17 13.5 17H6M6 10H3.5C2.5 10 2 10.5 2 11.5V15.5C2 16.5 2.5 17 3.5 17H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className={`${styles.feedbackButton} ${feedbackGiven === -1 ? styles.feedbackActive : ''}`}
              onClick={() => handleFeedback(-1)}
              disabled={feedbackGiven !== null || feedbackLoading}
              aria-label="Not helpful"
              title="This was not helpful"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M14 10V3M14 10L11.5 13.5C11 14.5 10.5 16 10.5 17C10.5 18 10 19 9 19C7.5 19 7 17.5 7 16V13H3.5C2.5 13 1.5 12 1.5 11C1.5 10.5 1.5 10 2 9.5L4 5.5C4.5 4.5 5 3 6.5 3H14M14 10H16.5C17.5 10 18 9.5 18 8.5V4.5C18 3.5 17.5 3 16.5 3H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
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

export { LexiChat };
