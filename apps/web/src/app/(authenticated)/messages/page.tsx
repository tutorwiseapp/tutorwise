/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages inbox page - Real-time chat with Ably
 * Created: 2025-11-08
 * Updated: 2025-11-09 - Migrated to React Query for robust data fetching
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations, markConversationRead, Conversation } from '@/lib/api/messages';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import ChatWidget from '@/app/components/network/ChatWidget';
import MessagesSkeleton from '@/app/components/messages/MessagesSkeleton';
import MessagesError from '@/app/components/messages/MessagesError';
import InboxStatsWidget from '@/app/components/messages/InboxStatsWidget';
import AvailabilityWidget from '@/app/components/messages/AvailabilityWidget';
import toast from 'react-hot-toast';
import styles from './page.module.css';

type TabType = 'all' | 'unread';

export default function MessagesPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // React Query: Fetch conversations with automatic retry, caching, and background refetch
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile && !profileLoading,
    staleTime: 1 * 60 * 1000, // 1 minute (messages change frequently)
    gcTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markConversationRead,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', profile?.id] });
      const previousConversations = queryClient.getQueryData(['conversations', profile?.id]);

      queryClient.setQueryData(['conversations', profile?.id], (old: Conversation[] = []) =>
        old.map((conv) =>
          conv.otherUser.id === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );

      return { previousConversations };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(['conversations', profile?.id], context?.previousConversations);
      toast.error('Failed to mark conversation as read');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', profile?.id] });
    },
  });

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);

    if (conversation.unreadCount > 0) {
      markReadMutation.mutate(conversation.otherUser.id);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (activeTab === 'unread') {
        return conv.unreadCount > 0;
      }
      return true;
    });
  }, [conversations, activeTab]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  }, [conversations]);

  // Show loading state
  if (profileLoading || isLoading) {
    return (
      <>
        <MessagesSkeleton />
        <ContextualSidebar>
          <InboxStatsWidget unreadCount={0} activeChats={0} archivedCount={0} />
          <AvailabilityWidget />
        </ContextualSidebar>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <MessagesError error={error as Error} onRetry={() => refetch()} />
        <ContextualSidebar>
          <InboxStatsWidget unreadCount={0} activeChats={0} archivedCount={0} />
          <AvailabilityWidget />
        </ContextualSidebar>
      </>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>
            Chat with your connections in real-time
          </p>
        </div>

        <div className={styles.filterTabs}>
          <button
            onClick={() => setActiveTab('all')}
            className={`${styles.filterTab} ${
              activeTab === 'all' ? styles.filterTabActive : ''
            }`}
          >
            All Conversations ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`${styles.filterTab} ${
              activeTab === 'unread' ? styles.filterTabActive : ''
            }`}
          >
            Unread ({totalUnread})
          </button>
        </div>

        {filteredConversations.length === 0 ? (
          <div className={styles.emptyState}>
            {activeTab === 'all' ? (
              <>
                <div className={styles.emptyIcon}>💬</div>
                <h3 className={styles.emptyTitle}>No messages yet</h3>
                <p className={styles.emptyText}>
                  Start a conversation by visiting your{' '}
                  <a href="/network" className={styles.emptyLink}>
                    Network
                  </a>{' '}
                  and messaging a connection.
                </p>
              </>
            ) : (
              <>
                <div className={styles.emptyIcon}>✅</div>
                <h3 className={styles.emptyTitle}>All caught up!</h3>
                <p className={styles.emptyText}>
                  You have no unread messages.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={styles.conversationsList}>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`${styles.conversationCard} ${
                  selectedConversation?.id === conversation.id
                    ? styles.conversationCardActive
                    : ''
                }`}
              >
                <div className={styles.conversationAvatar}>
                  {conversation.otherUser.avatar_url ? (
                    <img
                      src={conversation.otherUser.avatar_url}
                      alt={conversation.otherUser.full_name || 'User'}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {conversation.otherUser.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  {conversation.unreadCount > 0 && (
                    <div className={styles.unreadBadge}>
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>

                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <h3 className={styles.conversationName}>
                      {conversation.otherUser.full_name || 'Unknown User'}
                    </h3>
                    {conversation.lastMessage && (
                      <span className={styles.conversationTime}>
                        {formatTime(conversation.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>

                  {conversation.lastMessage && (
                    <p
                      className={`${styles.conversationPreview} ${
                        !conversation.lastMessage.read && conversation.unreadCount > 0
                          ? styles.conversationPreviewUnread
                          : ''
                      }`}
                    >
                      {conversation.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ContextualSidebar>
        <InboxStatsWidget
          unreadCount={totalUnread}
          activeChats={conversations.length}
          archivedCount={0}
        />
        <AvailabilityWidget />
      </ContextualSidebar>
    </>
  );
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
