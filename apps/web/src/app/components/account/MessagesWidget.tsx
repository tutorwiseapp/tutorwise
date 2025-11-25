/**
 * Filename: apps/web/src/app/components/account/MessagesWidget.tsx
 * Purpose: Messages summary widget for Account Hub sidebar (v4.7)
 * Created: 2025-11-09
 *
 * Features:
 * - Shows unread message count
 * - Displays 2-3 recent conversations
 * - Link to full /messages hub
 * - Integrates with existing Ably Pub/Sub messaging
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations } from '@/lib/api/messages';
import type { Conversation } from '@/lib/api/messages';
import styles from './MessagesWidget.module.css';

export function MessagesWidget() {
  const { profile } = useUserProfile();

  // Fetch conversations (real-time updates via Ably, no polling needed)
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile?.id,
    staleTime: Infinity, // Keep data fresh indefinitely (Ably handles real-time updates)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount if data exists
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });

  // Calculate unread count
  const unreadCount = conversations.filter((conv: Conversation) => conv.lastMessage && !conv.lastMessage.read).length;

  // Get recent conversations (max 3) - only those with messages
  const recentConversations = conversations.filter((conv: Conversation) => conv.lastMessage).slice(0, 3);

  if (isLoading) {
    return (
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <div className={styles.headerLeft}>
            <MessageSquare size={20} className={styles.headerIcon} />
            <h3 className={styles.widgetTitle}>Messages</h3>
          </div>
        </div>
        <div className={styles.loadingState}>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.widgetHeader}>
        <div className={styles.headerLeft}>
          <MessageSquare size={20} className={styles.headerIcon} />
          <h3 className={styles.widgetTitle}>Messages</h3>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
      </div>

      {/* Recent Conversations */}
      {recentConversations.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No messages yet</p>
          <p className={styles.emptySubtext}>
            Connect with tutors, agents, and clients to start conversations
          </p>
        </div>
      ) : (
        <div className={styles.conversationsList}>
          {recentConversations.map((conversation: Conversation) => (
            <Link
              key={conversation.id}
              href={`/messages?userId=${conversation.otherUser.id}`}
              className={styles.conversationItem}
            >
              {/* Avatar */}
              <div className={styles.avatarWrapper}>
                {conversation.otherUser.avatar_url ? (
                  <img
                    src={conversation.otherUser.avatar_url}
                    alt={conversation.otherUser.full_name || 'User'}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {(conversation.otherUser.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                {conversation.lastMessage && !conversation.lastMessage.read && (
                  <div className={styles.unreadIndicator} />
                )}
              </div>

              {/* Content */}
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <span className={styles.userName}>
                    {conversation.otherUser.full_name || 'Unknown User'}
                  </span>
                  <span className={styles.timestamp}>
                    {conversation.lastMessage ? formatTimestamp(conversation.lastMessage.timestamp) : ''}
                  </span>
                </div>
                <p className={`${styles.lastMessage} ${conversation.lastMessage && !conversation.lastMessage.read ? styles.unread : ''}`}>
                  {conversation.lastMessage?.content || ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* View All Link */}
      <Link href="/messages" className={styles.viewAllLink}>
        <span>View all messages</span>
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

/**
 * Format timestamp to relative time (e.g., "2m ago", "1h ago", "3d ago")
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  // More than 7 days: show date
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
