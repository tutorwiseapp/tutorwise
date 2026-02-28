'use client';

/**
 * AI Tutor Chat Hook
 *
 * Custom hook for managing AI tutor chat sessions.
 * Similar to useLexiChat but adapted for AI tutor sessions.
 *
 * @module components/feature/ai-agents/session/useAIAgentChat
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// --- Types ---

export interface AIAgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: {
    sources?: Array<{
      index: number;
      source: string;
      similarity: number;
      metadata?: any;
    }>;
    usedFallback?: boolean;
  };
}

export interface AIAgentSession {
  id: string;
  ai_tutor_id: string;
  client_id: string;
  status: 'active' | 'completed' | 'escalated';
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  cost_pounds: number | null;
  messages: any[];
  fallback_to_sage_count: number;
  escalated_to_human: boolean;
  ai_tutors: {
    id: string;
    display_name: string;
    subject: string;
    description: string;
    price_per_hour: number;
    owner_id: string;
  };
}

export interface UseAIAgentChatOptions {
  sessionId: string;
  onSessionEnd?: () => void;
  onError?: (error: string) => void;
}

export interface UseAIAgentChatReturn {
  // State
  messages: AIAgentMessage[];
  session: AIAgentSession | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  timeRemaining: number | null; // seconds remaining in session

  // Actions
  sendMessage: (message: string) => Promise<void>;
  endSession: () => Promise<void>;
  escalateToHuman: () => Promise<void>;
  clearError: () => void;
}

// --- Hook Implementation ---

export function useAIAgentChat(options: UseAIAgentChatOptions): UseAIAgentChatReturn {
  const { sessionId, onSessionEnd, onError } = options;

  const [messages, setMessages] = useState<AIAgentMessage[]>([]);
  const [session, setSession] = useState<AIAgentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const sessionRef = useRef<AIAgentSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const updateTimer = () => {
      const startedAt = new Date(session.started_at);
      const now = new Date();
      const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const remainingSeconds = Math.max(0, 3600 - elapsedSeconds); // 1 hour = 3600 seconds

      setTimeRemaining(remainingSeconds);

      // Auto-end session when time expires
      if (remainingSeconds === 0) {
        endSession();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  /**
   * Load session from API
   */
  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/ai-agents/sessions/${sessionId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load session');
      }

      const data = await response.json();
      setSession(data.session);

      // Convert stored messages to AIAgentMessage format
      const convertedMessages: AIAgentMessage[] = (data.session.messages || []).map((msg: any, idx: number) => ({
        id: `msg_${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        metadata: msg.sources ? { sources: msg.sources } : undefined,
      }));

      setMessages(convertedMessages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send a message to AI tutor
   */
  const sendMessage = useCallback(async (messageText: string) => {
    if (!session || !messageText.trim() || isSending) return;

    const trimmedMessage = messageText.trim();
    setIsSending(true);
    setError(null);

    // Add user message immediately
    const userMessage: AIAgentMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    // Add loading message for assistant
    const streamingMsgId = `msg_streaming_${Date.now()}`;
    const streamingMessage: AIAgentMessage = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);

    try {
      const response = await fetch(`/api/ai-agents/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();

      // Replace loading message with actual response
      const assistantMessage: AIAgentMessage = {
        id: data.response.id,
        role: 'assistant',
        content: data.response.content,
        timestamp: new Date(data.response.timestamp),
        metadata: data.response.metadata,
        isLoading: false,
      };

      setMessages(prev =>
        prev.map(msg =>
          msg.id === streamingMsgId ? assistantMessage : msg
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);

      // Remove loading message on error
      setMessages(prev => prev.filter(msg => msg.id !== streamingMsgId));
    } finally {
      setIsSending(false);
    }
  }, [session, sessionId, messages, isSending, onError]);

  /**
   * End the session
   */
  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/ai-agents/sessions/${sessionId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end session');
      }

      const data = await response.json();
      setSession(data.session);
      onSessionEnd?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [session, sessionId, onSessionEnd, onError]);

  /**
   * Escalate to human tutor
   */
  const escalateToHuman = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/ai-agents/sessions/${sessionId}/escalate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to escalate session');
      }

      const data = await response.json();
      setSession(data.session);
      onSessionEnd?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to escalate session';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [session, sessionId, onSessionEnd, onError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    session,
    isLoading,
    isSending,
    error,
    timeRemaining,
    sendMessage,
    endSession,
    escalateToHuman,
    clearError,
  };
}

export default useAIAgentChat;
