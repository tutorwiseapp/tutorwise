/**
 * Filename: apps/web/src/app/(authenticated)/wisechat/page.tsx
 * Purpose: WiseChat - WhatsApp-style messaging interface
 * Created: 2025-12-05
 * Specification: Clean 2-pane split layout (30% conversations / 70% chat thread)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations, type Conversation } from '@/lib/api/messages';
import { useAblyPresenceBroadcast } from '@/app/hooks/useAblyPresence';
import WiseChatConversationList from '@/app/components/feature/wisechat/WiseChatConversationList';
import WiseChatThread from '@/app/components/feature/wisechat/WiseChatThread';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import InboxStatsWidget from '@/app/components/feature/messages/InboxStatsWidget';
import AvailabilityWidget from '@/app/components/feature/messages/AvailabilityWidget';
import ChatContextWidget from '@/app/components/feature/messages/ChatContextWidget';
import MessageHelpWidget from '@/app/components/feature/messages/MessageHelpWidget';
import MessageTipWidget from '@/app/components/feature/messages/MessageTipWidget';
import MessageVideoWidget from '@/app/components/feature/messages/MessageVideoWidget';
import type { HubTab } from '@/app/components/hub/layout';
import styles from './page.module.css';

type FilterTab = 'all' | 'unread' | 'archived';

export default function WiseChatPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hasShownError, setHasShownError] = useState(false);

  // Broadcast current user's presence
  useAblyPresenceBroadcast(profile?.id || '', !!profile);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile && !profileLoading,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Show error banner only once
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
        return [];
      case 'all':
      default:
        return conversations;
    }
  }, [conversations, activeTab]);

  // Find selected conversation
  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  // Calculate stats
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const activeChats = conversations.length;

  // Prepare tabs
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
        header={<HubHeader title="WiseChat" subtitle="Real-time messaging" />}
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

  if (!profile) {
    return null;
  }

  return (
    <HubPageLayout
      header={<HubHeader title="WiseChat" subtitle="Real-time messaging" />}
      tabs={<HubTabs tabs={tabs} onTabChange={(tabId) => setActiveTab(tabId as FilterTab)} />}
      sidebar={
        <HubSidebar>
          <InboxStatsWidget
            unreadCount={totalUnread}
            activeChats={activeChats}
            archivedCount={0}
          />
          {selectedConversation && (
            <ChatContextWidget
              otherUser={selectedConversation.otherUser}
            />
          )}
          <AvailabilityWidget currentUserId={profile.id} />
          <MessageHelpWidget />
          <MessageTipWidget />
          <MessageVideoWidget />
        </HubSidebar>
      }
    >
      {/* Error banner */}
      {hasShownError && error && (
        <div className={styles.errorBanner}>
          ⚠️ Unable to load conversations. Some features may be limited.
        </div>
      )}

      {/* Split-pane layout */}
      <div className={styles.splitPane}>
        {/* Conversation list pane (30%) */}
        <div className={`${styles.listPane} ${isMobileThreadView ? styles.listPaneHidden : ''}`}>
          <WiseChatConversationList
            conversations={filteredConversations}
            currentUserId={profile.id}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat thread pane (70%) */}
        <div className={`${styles.threadPane} ${isMobileThreadView ? styles.threadPaneMobile : ''}`}>
          {selectedConversation ? (
            <WiseChatThread
              currentUserId={profile.id}
              otherUser={selectedConversation.otherUser}
              onBack={handleBack}
            />
          ) : (
            <div className={styles.noSelection}>
              <div className={styles.noSelectionIcon}>💬</div>
              <h3 className={styles.noSelectionTitle}>No conversation selected</h3>
              <p className={styles.noSelectionText}>
                Select a conversation from the list to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </HubPageLayout>
  );
}
