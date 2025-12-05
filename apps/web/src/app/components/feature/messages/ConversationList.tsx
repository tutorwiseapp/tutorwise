/**
 * Filename: apps/web/src/app/components/messages/ConversationList.tsx
 * Purpose: Conversation list component for Messages Hub with HubDetailCard
 * Created: 2025-11-24
 * Updated: 2025-12-05 - Migrated to HubDetailCard standard (consistent with BookingCard/WiselistCard)
 */

'use client';

import React from 'react';
import type { Conversation } from '@/lib/api/messages';
import HubDetailCard from '@/app/components/hub/content/HubDetailCard/HubDetailCard';
import getProfileImageUrl from '@/lib/utils/image';
import { useAblyPresence } from '@/app/hooks/useAblyPresence';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (userId: string) => void;
  hasError?: boolean;
}

export default function ConversationList({
  conversations,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  hasError = false,
}: ConversationListProps) {
  return (
    <>
      {/* Error Banner (if error) */}
      {hasError && (
        <div className={styles.errorBanner}>
          <p>⚠️ Unable to load conversations</p>
        </div>
      )}

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyTitle}>No conversations yet</h3>
          <p className={styles.emptyText}>
            Start a conversation from your Network connections to see them here.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              isSelected={conversation.id === selectedConversationId}
              onSelect={onSelectConversation}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ConversationListItemProps {
  conversation: Conversation;
  currentUserId: string;
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

function ConversationListItem({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
}: ConversationListItemProps) {
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Get image properties
  const avatarUrl = otherUser.avatar_url
    ? getProfileImageUrl({
        id: otherUser.id,
        avatar_url: otherUser.avatar_url,
      })
    : null;
  const fallbackChar = otherUser.full_name?.charAt(0).toUpperCase() || '?';

  // Build title
  const title = otherUser.full_name || 'Unknown User';

  // Build status
  const status = isOnline
    ? { label: 'Online', variant: 'success' as const }
    : { label: 'Offline', variant: 'neutral' as const };

  // Build description (last message preview)
  const description = conversation.lastMessage?.content || 'No messages yet';

  // Format last message timestamp
  const lastMessageTime = conversation.lastMessage
    ? formatTimestamp(conversation.lastMessage.timestamp)
    : 'No messages';

  // Build details grid - 3x3 grid for balance with 160px avatar
  const details = [
    // Row 1: Last Message, Status, Unread
    { label: 'Last Message', value: lastMessageTime },
    { label: 'Status', value: isOnline ? 'Online' : 'Offline' },
    { label: 'Unread', value: conversation.unreadCount > 0 ? `${conversation.unreadCount}` : '0' },
    // Row 2: User ID (full width)
    { label: 'User ID', value: otherUser.id.substring(0, 8), fullWidth: true },
    // Empty fields for grid balance
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
  ];

  // Unread badge display (only if unread > 0)
  const unreadBadge = conversation.unreadCount > 0 ? (
    <span className={styles.unreadBadge}>{conversation.unreadCount}</span>
  ) : undefined;

  return (
    <div
      className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
      onClick={() => onSelect(conversation.id)}
    >
      <HubDetailCard
        image={{
          src: avatarUrl,
          alt: title,
          fallbackChar: fallbackChar,
        }}
        title={title}
        status={status}
        description={description}
        details={details}
      />
      {/* Display unread badge if exists */}
      {unreadBadge && <div className={styles.unreadBadgeOverlay}>{unreadBadge}</div>}
    </div>
  );
}
