'use client';

/**
 * AI Tutor Session Page
 *
 * Live chat interface for AI tutor sessions.
 * Features:
 * - Real-time messaging
 * - Session timer (1 hour countdown)
 * - Escalation to human tutor
 * - Post-session review
 * - Upsell to human tutor
 *
 * @module app/(authenticated)/ai-agents/[id]/session/[sessionId]/page
 */

import { use, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAIAgentChat } from '@/app/components/feature/ai-agents/session/useAIAgentChat';
import LexiMarkdown from '@/components/feature/lexi/LexiMarkdown';
import SessionTimer from '@/app/components/feature/ai-agents/session/SessionTimer';
import ReviewModal from '@/app/components/feature/ai-agents/session/ReviewModal';
import styles from './AIAgentSession.module.css';

interface PageProps {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
}

export default function AIAgentSessionPage({ params }: PageProps) {
  const { id: aiAgentId, sessionId } = use(params);
  const router = useRouter();

  const [inputValue, setInputValue] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEscalationConfirm, setShowEscalationConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    session,
    isLoading,
    isSending,
    error,
    timeRemaining,
    sendMessage,
    endSession,
    escalateToHuman,
    clearError,
  } = useAIAgentChat({
    sessionId,
    onSessionEnd: () => {
      // Show review modal when session ends
      setShowReviewModal(true);
    },
    onError: (err) => console.error('[AIAgentSession] Error:', err),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle message submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || isLoading) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  }, [inputValue, isSending, isLoading, sendMessage]);

  // Handle end session
  const handleEndSession = useCallback(async () => {
    await endSession();
  }, [endSession]);

  // Handle escalation
  const handleEscalate = useCallback(async () => {
    setShowEscalationConfirm(false);
    await escalateToHuman();
  }, [escalateToHuman]);

  // Handle review submission
  const handleReviewSubmit = useCallback(async (rating: number, reviewText: string) => {
    try {
      await fetch(`/api/ai-agents/${aiAgentId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          rating,
          review_text: reviewText,
        }),
      });

      setShowReviewModal(false);
      router.push(`/ai-agents/${aiAgentId}`);
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  }, [aiAgentId, sessionId, router]);

  // Handle skip review
  const handleSkipReview = useCallback(() => {
    setShowReviewModal(false);
    router.push(`/ai-agents/${aiAgentId}`);
  }, [aiAgentId, router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span>Session not found</span>
        </div>
      </div>
    );
  }

  const isSessionActive = session.status === 'active';

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{session.ai_tutors.display_name}</h1>
          <span className={styles.subtitle}>{session.ai_tutors.subject}</span>
        </div>

        {isSessionActive && timeRemaining !== null && (
          <SessionTimer timeRemaining={timeRemaining} />
        )}

        {isSessionActive && (
          <button
            className={styles.endButton}
            onClick={handleEndSession}
          >
            End Session
          </button>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
          <button onClick={clearError} className={styles.errorDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Messages container */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🤖</div>
            <p className={styles.emptyText}>Start chatting with {session.ai_tutors.display_name}</p>
            <p className={styles.emptySubtext}>Ask any questions about {session.ai_tutors.subject}</p>
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

      {/* Escalation button */}
      {isSessionActive && messages.length > 0 && (
        <div className={styles.escalationContainer}>
          <button
            className={styles.escalationButton}
            onClick={() => setShowEscalationConfirm(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Need help from a human tutor?
          </button>
        </div>
      )}

      {/* Input form */}
      {isSessionActive && (
        <form className={styles.inputForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className={styles.input}
            disabled={isSending}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputValue.trim() || isSending}
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
      )}

      {/* Session ended message */}
      {!isSessionActive && (
        <div className={styles.sessionEnded}>
          <p className={styles.sessionEndedText}>
            {session.status === 'completed' ? 'Session ended' : 'Session escalated to human tutor'}
          </p>
          <button
            className={styles.backButton}
            onClick={() => router.push(`/ai-agents/${aiAgentId}`)}
          >
            Back to AI Tutor
          </button>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          tutorName={session.ai_tutors.display_name}
          onSubmit={handleReviewSubmit}
          onSkip={handleSkipReview}
        />
      )}

      {/* Escalation Confirmation Modal */}
      {showEscalationConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Request Human Help?</h2>
            <p className={styles.modalText}>
              This will end your AI tutor session and connect you with a human tutor who can provide personalized assistance.
            </p>
            <p className={styles.modalSubtext}>
              Note: Human tutor sessions may have different rates and availability.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowEscalationConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleEscalate}
              >
                Request Human Help
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Message Bubble Component ---

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
    metadata?: {
      sources?: Array<{
        index: number;
        source: string;
        similarity: number;
      }>;
      usedFallback?: boolean;
    };
  };
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isLoading && message.content.length > 0;
  const [showSources, setShowSources] = useState(false);

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

  return (
    <div className={`${styles.message} ${isUser ? styles.messageSent : styles.messageReceived}`}>
      <div className={`${styles.messageContent} ${isStreaming ? styles.streaming : ''}`}>
        {isUser ? (
          message.content
        ) : (
          <LexiMarkdown content={message.content} />
        )}
        {isStreaming && <span className={styles.streamingCursor} />}
      </div>
      <div className={styles.messageFooter}>
        <span className={styles.messageTimestamp}>
          {formatTime(message.timestamp)}
        </span>
        {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
          <button
            className={styles.sourcesButton}
            onClick={() => setShowSources(!showSources)}
          >
            {message.metadata.sources.length} source{message.metadata.sources.length !== 1 ? 's' : ''}
          </button>
        )}
        {!isUser && message.metadata?.usedFallback && (
          <span className={styles.fallbackBadge} title="General knowledge fallback used">
            General knowledge
          </span>
        )}
      </div>
      {showSources && message.metadata?.sources && (
        <div className={styles.sources}>
          {message.metadata.sources.map((source, idx) => (
            <div key={idx} className={styles.source}>
              <span className={styles.sourceIndex}>[{source.index}]</span>
              <span className={styles.sourceName}>{source.source}</span>
              <span className={styles.sourceSimilarity}>
                {Math.round(source.similarity * 100)}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
