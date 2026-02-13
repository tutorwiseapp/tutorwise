'use client';

/**
 * Lexi History Hook
 *
 * Custom hook for fetching and managing Lexi conversation history.
 *
 * @module components/feature/lexi/useLexiHistory
 */

import { useState, useCallback, useEffect } from 'react';

// --- Types ---

export interface LexiConversation {
  id: string;
  session_id: string;
  persona: string;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  message_count: number;
  provider: string;
  summary: string | null;
  status: 'active' | 'ended' | 'archived';
}

export interface LexiHistoryMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  intent_category: string | null;
  intent_action: string | null;
  feedback_rating: -1 | 0 | 1 | null;
  feedback_comment: string | null;
  created_at: string;
}

export interface ConversationWithMessages extends LexiConversation {
  messages: LexiHistoryMessage[];
}

export interface UseLexiHistoryOptions {
  autoFetch?: boolean;
  limit?: number;
  status?: 'active' | 'ended' | 'archived' | 'all';
}

export interface UseLexiHistoryReturn {
  // State
  conversations: LexiConversation[];
  selectedConversation: ConversationWithMessages | null;
  isLoading: boolean;
  isLoadingConversation: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  fetchConversations: () => Promise<void>;
  fetchMoreConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  clearSelection: () => void;
  refresh: () => Promise<void>;
}

// --- Hook Implementation ---

export function useLexiHistory(options: UseLexiHistoryOptions = {}): UseLexiHistoryReturn {
  const { autoFetch = true, limit = 20, status = 'all' } = options;

  // State
  const [conversations, setConversations] = useState<LexiConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch conversations list
   */
  const fetchConversations = useCallback(async (reset = true) => {
    setIsLoading(true);
    setError(null);

    const currentOffset = reset ? 0 : offset;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      if (status !== 'all') {
        params.set('status', status);
      }

      const response = await fetch(`/api/lexi/history?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      const data = await response.json();

      if (reset) {
        setConversations(data.conversations);
        setOffset(limit);
      } else {
        setConversations(prev => [...prev, ...data.conversations]);
        setOffset(prev => prev + limit);
      }

      setHasMore(data.conversations.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, status]);

  /**
   * Fetch more conversations (pagination)
   */
  const fetchMoreConversations = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchConversations(false);
  }, [fetchConversations, hasMore, isLoading]);

  /**
   * Select and load a specific conversation with messages
   */
  const selectConversation = useCallback(async (id: string) => {
    setIsLoadingConversation(true);
    setError(null);

    try {
      const response = await fetch(`/api/lexi/history?id=${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch conversation');
      }

      const data = await response.json();
      setSelectedConversation(data.conversation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversation';
      setError(errorMessage);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  /**
   * Clear selected conversation
   */
  const clearSelection = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  /**
   * Refresh the conversations list
   */
  const refresh = useCallback(async () => {
    await fetchConversations(true);
  }, [fetchConversations]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchConversations(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  return {
    conversations,
    selectedConversation,
    isLoading,
    isLoadingConversation,
    error,
    hasMore,
    fetchConversations: () => fetchConversations(true),
    fetchMoreConversations,
    selectConversation,
    clearSelection,
    refresh,
  };
}

export default useLexiHistory;
