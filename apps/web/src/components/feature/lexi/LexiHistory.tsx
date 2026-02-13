'use client';

/**
 * Lexi History Component
 *
 * Displays conversation history with list and detail views.
 * Users can browse past conversations and view full message history.
 *
 * @module components/feature/lexi/LexiHistory
 */

import React, { useCallback } from 'react';
import styles from './LexiHistory.module.css';
import { useLexiHistory, type LexiConversation, type ConversationWithMessages } from './useLexiHistory';
import LexiMarkdown from './LexiMarkdown';

// --- Types ---

interface LexiHistoryProps {
  onClose?: () => void;
  onStartNewChat?: () => void;
  className?: string;
}

// --- Component ---

export default function LexiHistory({ onClose, onStartNewChat, className }: LexiHistoryProps) {
  const {
    conversations,
    selectedConversation,
    isLoading,
    isLoadingConversation,
    error,
    hasMore,
    fetchMoreConversations,
    selectConversation,
    clearSelection,
    refresh,
  } = useLexiHistory({ autoFetch: true, limit: 20 });

  // Handle conversation click
  const handleConversationClick = useCallback((id: string) => {
    selectConversation(id);
  }, [selectConversation]);

  // Handle back to list
  const handleBack = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div className={`${styles.history} ${className || ''}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {selectedConversation ? (
            <button className={styles.backButton} onClick={handleBack} aria-label="Back to list">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className={styles.avatar}>
              <span className={styles.avatarIcon}>L</span>
            </div>
          )}
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>
              {selectedConversation ? 'Conversation' : 'Chat History'}
            </h2>
            <span className={styles.subtitle}>
              {selectedConversation
                ? formatDate(selectedConversation.started_at)
                : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!selectedConversation && (
            <button className={styles.refreshButton} onClick={refresh} aria-label="Refresh">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1.5 3V7.5H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16.5 15V10.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.045 11.25A6.75 6.75 0 0111.25 3.045L13.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.955 6.75A6.75 6.75 0 016.75 14.955L4.5 12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {onClose && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={refresh} className={styles.errorRetry}>Retry</button>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {selectedConversation ? (
          <ConversationDetail
            conversation={selectedConversation}
            isLoading={isLoadingConversation}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            hasMore={hasMore}
            onSelect={handleConversationClick}
            onLoadMore={fetchMoreConversations}
          />
        )}
      </div>

      {/* Footer with new chat button */}
      {!selectedConversation && onStartNewChat && (
        <div className={styles.footer}>
          <button className={styles.newChatButton} onClick={onStartNewChat}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3.75V14.25M3.75 9H14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Conversation
          </button>
        </div>
      )}
    </div>
  );
}

// --- Conversation List Sub-component ---

interface ConversationListProps {
  conversations: LexiConversation[];
  isLoading: boolean;
  hasMore: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
}

function ConversationList({ conversations, isLoading, hasMore, onSelect, onLoadMore }: ConversationListProps) {
  if (isLoading && conversations.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <span>Loading conversations...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 12C8 9.79086 9.79086 8 12 8H36C38.2091 8 40 9.79086 40 12V32C40 34.2091 38.2091 36 36 36H18L10 44V36H12C9.79086 36 8 34.2091 8 32V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 18H32M16 24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className={styles.emptyText}>No conversations yet</p>
        <p className={styles.emptySubtext}>Start a chat with Lexi to see your history here</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {conversations.map(conversation => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          onClick={() => onSelect(conversation.id)}
        />
      ))}
      {hasMore && (
        <button
          className={styles.loadMoreButton}
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}

// --- Conversation Item Sub-component ---

interface ConversationItemProps {
  conversation: LexiConversation;
  onClick: () => void;
}

function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const personaLabel = getPersonaLabel(conversation.persona);
  const statusClass = conversation.status === 'active' ? styles.statusActive : styles.statusEnded;

  return (
    <button className={styles.conversationItem} onClick={onClick}>
      <div className={styles.conversationHeader}>
        <span className={`${styles.personaBadge} ${getPersonaClass(conversation.persona)}`}>
          {personaLabel}
        </span>
        <span className={`${styles.status} ${statusClass}`}>
          {conversation.status === 'active' ? 'Active' : 'Ended'}
        </span>
      </div>
      <div className={styles.conversationMeta}>
        <span className={styles.date}>{formatRelativeDate(conversation.started_at)}</span>
        <span className={styles.separator}>·</span>
        <span className={styles.messageCount}>
          {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
        </span>
      </div>
      {conversation.summary && (
        <p className={styles.summary}>{conversation.summary}</p>
      )}
      <div className={styles.conversationFooter}>
        <span className={styles.provider}>{conversation.provider}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.chevron}>
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

// --- Conversation Detail Sub-component ---

interface ConversationDetailProps {
  conversation: ConversationWithMessages;
  isLoading: boolean;
}

function ConversationDetail({ conversation, isLoading }: ConversationDetailProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <span>Loading messages...</span>
      </div>
    );
  }

  return (
    <div className={styles.detail}>
      {/* Conversation info */}
      <div className={styles.detailInfo}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Persona</span>
          <span className={`${styles.personaBadge} ${getPersonaClass(conversation.persona)}`}>
            {getPersonaLabel(conversation.persona)}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Started</span>
          <span className={styles.infoValue}>{formatDateTime(conversation.started_at)}</span>
        </div>
        {conversation.ended_at && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ended</span>
            <span className={styles.infoValue}>{formatDateTime(conversation.ended_at)}</span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Messages</span>
          <span className={styles.infoValue}>{conversation.message_count}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Provider</span>
          <span className={styles.infoValue}>{conversation.provider}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {conversation.messages.map(message => (
          <div
            key={message.id}
            className={`${styles.message} ${message.role === 'user' ? styles.messageSent : styles.messageReceived}`}
          >
            <div className={styles.messageContent}>
              {message.role === 'user' ? (
                message.content
              ) : (
                <LexiMarkdown content={message.content} />
              )}
            </div>
            <div className={styles.messageMeta}>
              <span className={styles.messageTime}>{formatTime(message.created_at)}</span>
              {message.feedback_rating !== null && message.feedback_rating !== 0 && (
                <span className={`${styles.feedback} ${message.feedback_rating === 1 ? styles.feedbackPositive : styles.feedbackNegative}`}>
                  {message.feedback_rating === 1 ? '👍' : '👎'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Helper Functions ---

function getPersonaLabel(persona: string): string {
  const labels: Record<string, string> = {
    student: 'Student',
    tutor: 'Tutor',
    client: 'Parent',
    agent: 'Agent',
    organisation: 'Organisation',
  };
  return labels[persona] || persona;
}

function getPersonaClass(persona: string): string {
  const classes: Record<string, string> = {
    student: styles.personaStudent,
    tutor: styles.personaTutor,
    client: styles.personaClient,
    agent: styles.personaAgent,
    organisation: styles.personaOrg,
  };
  return classes[persona] || '';
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return formatDate(dateStr);
  }
}

export { LexiHistory };
