/**
 * Filename: apps/web/src/app/(authenticated)/messages/page.tsx
 * Purpose: Messages - WhatsApp-style messaging interface
 * Created: 2025-12-05
 * Updated: 2026-02-05 - Added URL parameter handling for booking messages integration
 * Updated: 2026-02-06 - Fixed deep link handling: now creates new conversations when user param
 *   points to someone not in conversation list (enables Messages button from BookingCard)
 * Specification: Clean 2-pane split layout (30% conversations / 70% chat thread)
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import styles from './page.module.css';

type FilterTab = 'all' | 'unread' | 'archived';
type SortOption = 'recent' | 'name' | 'unread';

export default function MessagesPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobileThreadView, setIsMobileThreadView] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hasShownError, setHasShownError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // State for starting a new conversation from URL param (e.g., from BookingCard Messages button)
  const [targetUserFromUrl, setTargetUserFromUrl] = useState<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isLoadingTargetUser, setIsLoadingTargetUser] = useState(false);

  // Track if we've processed the URL user parameter (from booking messages integration)
  const hasProcessedUrlUser = useRef(false);

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

  // Auto-select conversation from URL parameter (e.g., from booking messages button)
  // If no conversation exists with that user, fetch their profile to start a new conversation
  useEffect(() => {
    const userIdFromUrl = searchParams.get('user');

    // Only process once and only when conversations are loaded (or empty array after loading)
    if (userIdFromUrl && !isLoading && !hasProcessedUrlUser.current) {
      hasProcessedUrlUser.current = true;

      // Find conversation with the specified user
      const conversation = conversations.find(
        (conv) => conv.otherUser.id === userIdFromUrl
      );

      if (conversation) {
        // Existing conversation found - select it
        setSelectedConversationId(conversation.id);
        setTargetUserFromUrl(null); // Clear any previous target user
        // Switch to thread view on mobile
        if (window.innerWidth <= 768) {
          setIsMobileThreadView(true);
        }
      } else {
        // No existing conversation - fetch user profile to start new conversation
        const fetchTargetUser = async () => {
          setIsLoadingTargetUser(true);
          try {
            const response = await fetch(`/api/profiles/${userIdFromUrl}`);
            if (response.ok) {
              const userData = await response.json();
              setTargetUserFromUrl({
                id: userIdFromUrl,
                full_name: userData.full_name || null,
                avatar_url: userData.avatar_url || null,
              });
              setSelectedConversationId(null); // Clear any selected conversation
              // Switch to thread view on mobile
              if (window.innerWidth <= 768) {
                setIsMobileThreadView(true);
              }
            } else {
              console.error('[Messages] Failed to fetch target user profile');
            }
          } catch (error) {
            console.error('[Messages] Error fetching target user:', error);
          } finally {
            setIsLoadingTargetUser(false);
          }
        };
        fetchTargetUser();
      }
    }
  }, [searchParams, conversations, isLoading]);

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
    setTargetUserFromUrl(null); // Clear URL-based target user when selecting from list
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
      <UnifiedSelect
        value={sortBy}
        onChange={(value) => setSortBy(value as SortOption)}
        options={[
          { value: 'recent', label: 'Most Recent' },
          { value: 'name', label: 'Name (A-Z)' },
          { value: 'unread', label: 'Unread First' }
        ]}
        placeholder="Sort by"
      />
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
            // Existing conversation selected from list
            <ChatThread
              currentUserId={profile.id}
              otherUser={selectedConversation.otherUser}
              onBack={handleBack}
            />
          ) : targetUserFromUrl ? (
            // New conversation from URL param (e.g., from BookingCard Messages button)
            <ChatThread
              currentUserId={profile.id}
              otherUser={targetUserFromUrl}
              onBack={handleBack}
            />
          ) : isLoadingTargetUser ? (
            // Loading target user from URL param
            <div className={styles.noSelection}>
              <p className={styles.noSelectionText}>Loading...</p>
            </div>
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
