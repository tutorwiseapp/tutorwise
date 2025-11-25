/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages Hub - 2-Way Chat with Split-Pane Layout
 * Created: 2025-11-08
 * Updated: 2025-11-24 - Complete rewrite with Split-Pane layout and new components
 * Specification: Real-time chat with Split-Pane design (30% List / 70% Thread)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations, type Conversation } from '@/lib/api/messages';
import { useAblyPresenceBroadcast } from '@/app/hooks/useAblyPresence';
import ConversationList from '@/app/components/messages/ConversationList';
import ChatThread from '@/app/components/messages/ChatThread';
import ContextualSidebar from '@/app/components/layout/sidebars/ContextualSidebar';
import InboxStatsWidget from '@/app/components/messages/InboxStatsWidget';
import AvailabilityWidget from '@/app/components/messages/AvailabilityWidget';
import ChatContextWidget from '@/app/components/messages/ChatContextWidget';
import styles from './page.module.css';

type FilterTab = 'all' | 'unread' | 'archived';

export default function MessagesPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hasShownError, setHasShownError] = useState(false);

  // Broadcast current user's presence
  useAblyPresenceBroadcast(profile?.id || '', !!profile);

  // React Query: Fetch conversations with 30s polling
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile && !profileLoading,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: false, // Prevent flashing on window focus
  });

  // Show error banner only once to prevent flashing
  useEffect(() => {
    if (error && !hasShownError) {
      setHasShownError(true);
    } else if (!error && hasShownError) {
      setHasShownError(false);
    }
  }, [error, hasShownError]);

  // Filter conversations based on active tab
  const filteredConversations = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return conversations.filter(conv => conv.unreadCount > 0);
      case 'archived':
        return []; // TODO: Add archived conversations support
      case 'all':
      default:
        return conversations;
    }
  }, [conversations, activeTab]);

  // Find selected conversation
  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  // Calculate stats for InboxStatsWidget
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const activeChats = conversations.length;

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsMobileThreadView(true);
  };

  // Handle back button (mobile)
  const handleBack = () => {
    setIsMobileThreadView(false);
  };

  // Reset mobile view when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileThreadView(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (profileLoading || isLoading) {
    return (
      <>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Messages</h1>
            <p className={styles.subtitle}>Loading conversations...</p>
          </div>
        </div>
        <ContextualSidebar>
          <InboxStatsWidget unreadCount={0} activeChats={0} archivedCount={0} />
          {profile && <AvailabilityWidget currentUserId={profile.id} />}
        </ContextualSidebar>
      </>
    );
  }

  // Note: We show error as a subtle banner, but don't prevent the rest of the UI from rendering

  if (!profile) {
    return null;
  }

  return (
    <>
      {/* Page Header */}
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>Chat with your connections in real-time</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${activeTab === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterTab} ${activeTab === 'unread' ? styles.filterTabActive : ''}`}
          onClick={() => setActiveTab('unread')}
        >
          Unread
          {totalUnread > 0 && (
            <span className={styles.tabBadge}>{totalUnread}</span>
          )}
        </button>
        <button
          className={`${styles.filterTab} ${activeTab === 'archived' ? styles.filterTabActive : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived
        </button>
      </div>

      {/* Main Content: Split-Pane Layout */}
      <div className={styles.splitPane}>
        {/* Left Pane: Conversation List (30%) */}
        <div
          className={`${styles.leftPane} ${
            isMobileThreadView ? styles.leftPaneHidden : ''
          }`}
        >
          <ConversationList
            conversations={filteredConversations}
            currentUserId={profile.id}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            hasError={hasShownError}
          />
        </div>

        {/* Right Pane: Chat Thread (70%) */}
        <div
          className={`${styles.rightPane} ${
            isMobileThreadView ? styles.rightPaneFullscreen : ''
          }`}
        >
          {selectedConversation ? (
            <ChatThread
              currentUserId={profile.id}
              otherUser={selectedConversation.otherUser}
              onBack={isMobileThreadView ? handleBack : undefined}
            />
          ) : (
            <div className={styles.noSelection}>
              <p className={styles.noSelectionText}>
                Select a conversation to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contextual Sidebar (Right Column) */}
      <ContextualSidebar>
        {selectedConversation ? (
          <ChatContextWidget otherUser={selectedConversation.otherUser} />
        ) : (
          <>
            <InboxStatsWidget
              unreadCount={totalUnread}
              activeChats={activeChats}
              archivedCount={0}
            />
            <AvailabilityWidget currentUserId={profile.id} />
          </>
        )}
      </ContextualSidebar>
    </>
  );
}
