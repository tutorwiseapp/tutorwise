/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages Hub - 2-Way Chat with Split-Pane Layout
 * Created: 2025-11-08
 * Updated: 2025-12-03 - Migrated to Hub Layout Architecture (Phase 2 migration complete)
 * Specification: Real-time chat with Split-Pane design (30% List / 70% Thread)
 * Change History:
 * C003 - 2025-12-03 : Migrated to HubPageLayout with custom split-pane content
 * C002 - 2025-11-24 : Complete rewrite with Split-Pane layout and new components
 * C001 - 2025-11-08 : Initial creation
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations, type Conversation } from '@/lib/api/messages';
import { useAblyPresenceBroadcast } from '@/app/hooks/useAblyPresence';
import ConversationList from '@/app/components/feature/messages/ConversationList';
import ChatThread from '@/app/components/feature/messages/ChatThread';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import InboxStatsWidget from '@/app/components/feature/messages/InboxStatsWidget';
import AvailabilityWidget from '@/app/components/feature/messages/AvailabilityWidget';
import ChatContextWidget from '@/app/components/feature/messages/ChatContextWidget';
import MessageHelpWidget from '@/app/components/feature/messages/MessageHelpWidget';
import MessageTipWidget from '@/app/components/feature/messages/MessageTipWidget';
import MessageVideoWidget from '@/app/components/feature/messages/MessageVideoWidget';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import type { HubTab } from '@/app/components/hub/layout';
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

  // React Query: Fetch conversations (real-time updates via Ably, no polling needed)
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile && !profileLoading,
    staleTime: Infinity, // Keep data fresh indefinitely (Ably handles real-time updates)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount if data exists
    refetchOnReconnect: false, // Prevent refetch on reconnect
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

  // Prepare tabs data
  const tabs: HubTab[] = [
    { id: 'all', label: 'All', active: activeTab === 'all' },
    { id: 'unread', label: 'Unread', count: totalUnread, active: activeTab === 'unread' },
    { id: 'archived', label: 'Archived', active: activeTab === 'archived' },
  ];

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
      <HubPageLayout
        header={<HubHeader title="Messages" />}
        sidebar={
          <HubSidebar>
            <InboxStatsWidget unreadCount={0} activeChats={0} archivedCount={0} />
            {profile && <AvailabilityWidget currentUserId={profile.id} />}
            <MessageHelpWidget />
            <MessageTipWidget />
            <MessageVideoWidget />
          </HubSidebar>
        }
      >
        <p className={styles.loading}>Loading conversations...</p>
      </HubPageLayout>
    );
  }

  // Note: We show error as a subtle banner, but don't prevent the rest of the UI from rendering

  if (!profile) {
    return null;
  }

  return (
    <HubPageLayout
      header={<HubHeader title="Messages" />}
      tabs={
        <HubTabs
          tabs={tabs}
          onTabChange={(tabId) => setActiveTab(tabId as FilterTab)}
        />
      }
      sidebar={
        <HubSidebar>
          {selectedConversation ? (
            <>
              <ChatContextWidget otherUser={selectedConversation.otherUser} />
              <InboxStatsWidget
                unreadCount={totalUnread}
                activeChats={activeChats}
                archivedCount={0}
              />
              <MessageHelpWidget />
              <MessageTipWidget />
              <MessageVideoWidget />
            </>
          ) : (
            <>
              <InboxStatsWidget
                unreadCount={totalUnread}
                activeChats={activeChats}
                archivedCount={0}
              />
              <MessageHelpWidget />
              <MessageTipWidget />
              <MessageVideoWidget />
            </>
          )}
        </HubSidebar>
      }
    >
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
            <HubEmptyState
              title="No conversation selected"
              description="Select a conversation to start chatting"
            />
          )}
        </div>
      </div>
    </HubPageLayout>
  );
}
