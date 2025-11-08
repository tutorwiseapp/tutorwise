/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages inbox page - Real-time chat with Ably
 * Created: 2025-11-08
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import ChatWidget from '@/app/components/network/ChatWidget';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    timestamp: number;
    read: boolean;
  } | null;
  unreadCount: number;
}

type TabType = 'all' | 'unread';

export default function MessagesPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    fetchConversations();
  }, [profile?.id]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/network/chat/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('[MessagesPage] Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);

    if (conversation.unreadCount > 0) {
      markConversationAsRead(conversation.otherUser.id);
    }
  };

  const markConversationAsRead = async (userId: string) => {
    try {
      await fetch('/api/network/chat/mark-conversation-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.otherUser.id === userId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error('[MessagesPage] Failed to mark as read:', error);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (activeTab === 'unread') {
      return conv.unreadCount > 0;
    }
    return true;
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (profileLoading || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading messages...</div>
      </div>
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

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
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
        {selectedConversation ? (
          <ChatWidget
            currentUserId={profile.id}
            selectedConnection={{
              id: selectedConversation.id,
              profile: selectedConversation.otherUser,
            }}
            onClose={() => setSelectedConversation(null)}
          />
        ) : (
          <div className={styles.noSelection}>
            <div className={styles.noSelectionIcon}>💬</div>
            <p className={styles.noSelectionText}>
              Select a conversation to start chatting
            </p>
          </div>
        )}
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
