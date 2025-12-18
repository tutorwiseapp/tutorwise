/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages - WhatsApp-style messaging interface
 * Created: 2025-12-05
 * Specification: Clean 2-pane split layout (30% conversations / 70% chat thread)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getConversations } from '@/lib/api/messages';
import { useAblyPresenceBroadcast } from '@/app/hooks/useAblyPresence';
import ConversationList from '@/app/components/feature/messages/ConversationList';
import ChatThread from '@/app/components/feature/messages/ChatThread';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import InboxStatsWidget from '@/app/components/feature/messages/InboxStatsWidget';
import MessageHelpWidget from '@/app/components/feature/messages/MessageHelpWidget';
import MessageTipWidget from '@/app/components/feature/messages/MessageTipWidget';
import MessageVideoWidget from '@/app/components/feature/messages/MessageVideoWidget';
import type { HubTab } from '@/app/components/hub/layout';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

type FilterTab = 'all' | 'unread' | 'archived';
type SortOption = 'recent' | 'name' | 'unread';

export default function MessagesPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hasShownError, setHasShownError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Always broadcast presence (users are always reachable for messages)
  useAblyPresenceBroadcast(profile?.id || '', !!profile);

  // Fetch conversations
  // isLoading is true only on first fetch; isFetching is true on all fetches
  const {
    data: conversations = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: getConversations,
    enabled: !!profile?.id, // Wait for profile to load before fetching
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false, // Real-time updates via Ably instead
    refetchOnMount: false, // Real-time updates via Ably instead
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

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    // 1. Filter by tab
    let filtered = conversations;
    switch (activeTab) {
      case 'unread':
        filtered = conversations.filter(conv => conv.unreadCount > 0);
        break;
      case 'archived':
        filtered = [];
        break;
      case 'all':
      default:
        filtered = conversations;
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.otherUser.full_name?.toLowerCase().includes(query) ||
        conv.lastMessage?.content?.toLowerCase().includes(query)
      );
    }

    // 3. Sort conversations
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.otherUser.full_name || '').localeCompare(b.otherUser.full_name || '');
        case 'unread':
          return b.unreadCount - a.unreadCount;
        case 'recent':
        default:
          const aTime = a.lastMessage?.timestamp || 0;
          const bTime = b.lastMessage?.timestamp || 0;
          return bTime - aTime;
      }
    });

    return sorted;
  }, [conversations, activeTab, searchQuery, sortBy]);

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
    // Only switch to thread view on mobile (max-width: 768px)
    if (window.innerWidth <= 768) {
      setIsMobileThreadView(true);
    }
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

  // Filter controls for header
  const filterControls = (
    <div className={filterStyles.filtersContainer}>
      <input
        type="search"
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={filterStyles.searchInput}
      />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className={filterStyles.filterSelect}
      >
        <option value="recent">Most Recent</option>
        <option value="name">Name (A-Z)</option>
        <option value="unread">Unread First</option>
      </select>
    </div>
  );

  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={
          <HubHeader
            title="Messages"
            filters={filterControls}
          />
        }
        sidebar={
          <HubSidebar>
            <InboxStatsWidget unreadCount={0} activeChats={0} archivedCount={0} />
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
      header={
        <HubHeader
          title="Messages"
          filters={filterControls}
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={(tabId) => setActiveTab(tabId as FilterTab)} />}
      sidebar={
        <HubSidebar>
          <InboxStatsWidget
            unreadCount={totalUnread}
            activeChats={activeChats}
            archivedCount={0}
          />
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
          <ConversationList
            conversations={filteredConversations}
            currentUserId={profile.id}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat thread pane (70%) */}
        <div className={`${styles.threadPane} ${isMobileThreadView ? styles.threadPaneMobile : ''}`}>
          {selectedConversation ? (
            <ChatThread
              currentUserId={profile.id}
              otherUser={selectedConversation.otherUser}
              onBack={handleBack}
            />
          ) : (
            <div className={styles.noSelection}>
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
