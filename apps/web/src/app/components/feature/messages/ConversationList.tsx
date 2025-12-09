/**
 * Filename: ConversationList.tsx
 * Purpose: WhatsApp-style conversation list for Messages
 * Created: 2025-12-05
 * Specification: Clean, minimal conversation list with avatars, names, previews, and timestamps
 */

'use client';

import React from 'react';
import Image from 'next/image';
import type { Conversation } from '@/lib/api/messages';
import getProfileImageUrl from '@/lib/utils/image';
import { useAblyPresence } from '@/app/hooks/useAblyPresence';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export default function ConversationList({
  conversations,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>💬</div>
        <h3 className={styles.emptyTitle}>No conversations yet</h3>
        <p className={styles.emptyText}>
          Start a conversation from your Network connections to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          currentUserId={currentUserId}
          isSelected={conversation.id === selectedConversationId}
          onSelect={() => onSelectConversation(conversation.id)}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  onSelect: () => void;
}

function ConversationItem({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
}: ConversationItemProps) {
  const otherUser = conversation.otherUser;

  // Track real-time presence status
  const { isOnline } = useAblyPresence(otherUser.id, currentUserId);

  // Format timestamp helper
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    // Show date for older messages
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Get image properties
  const avatarUrl = otherUser.avatar_url
    ? getProfileImageUrl({
        id: otherUser.id,
        avatar_url: otherUser.avatar_url,
        full_name: otherUser.full_name, // Use other user name for initials
      })
    : null;

  const userName = otherUser.full_name || 'Unknown User';
  const lastMessagePreview = conversation.lastMessage?.content || 'No messages yet';
  const lastMessageTime = conversation.lastMessage
    ? formatTimestamp(conversation.lastMessage.timestamp)
    : '';

  return (
    <button
      className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
      onClick={onSelect}
    >
      {/* Avatar with online indicator */}
      <div className={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            className={styles.avatar}
            width={48}
            height={48}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        {isOnline && <div className={styles.onlineIndicator} />}
      </div>

      {/* Conversation info */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{userName}</h3>
          {lastMessageTime && (
            <span className={styles.time}>{lastMessageTime}</span>
          )}
        </div>

        <div className={styles.footer}>
          <p className={`${styles.preview} ${conversation.unreadCount > 0 ? styles.previewUnread : ''}`}>
            {lastMessagePreview}
          </p>
          {conversation.unreadCount > 0 && (
            <div className={styles.unreadBadge}>
              {conversation.unreadCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
