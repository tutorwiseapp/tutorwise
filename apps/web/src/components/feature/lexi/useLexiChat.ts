'use client';

/**
 * Lexi Chat Hook
 *
 * Custom hook for managing Lexi chat state and interactions.
 * Uses react-query for session management with proper loading states.
 * Handles message sending with streaming support.
 *
 * @module components/feature/lexi/useLexiChat
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { responseCache } from '@lexi/services/response-cache';

// --- Types ---

export interface LexiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: {
    persona?: string;
    intent?: string;
  };
}

export interface LexiSession {
  sessionId: string;
  persona: string;
  greeting: string;
  capabilities: string[];
  expiresAt: string;
}

export interface UseLexiChatOptions {
  autoStart?: boolean;
  streaming?: boolean; // Enable streaming responses via SSE
  activeRole?: string; // Current active role from UserProfileContext
  onError?: (error: string) => void;
  onSessionStart?: (session: LexiSession) => void;
  onSessionEnd?: () => void;
}

export interface UseLexiChatReturn {
  // State
  messages: LexiMessage[];
  session: LexiSession | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  suggestions: string[];

  // Actions
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

// --- API Functions ---

async function createSession(activeRole?: string): Promise<LexiSession> {
  const response = await fetch('/api/lexi/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeRole }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start session');
  }

  return response.json();
}

async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/lexi/session?sessionId=${sessionId}`, {
    method: 'DELETE',
  });
}

// --- Hook Implementation ---

export function useLexiChat(options: UseLexiChatOptions = {}): UseLexiChatReturn {
  const { autoStart = false, streaming = true, activeRole, onError, onSessionStart, onSessionEnd } = options;

  // Local state for messages and session
  const [messages, setMessages] = useState<LexiMessage[]>([]);
  const [session, setSession] = useState<LexiSession | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const sessionRef = useRef<LexiSession | null>(null);
  const hasAutoStarted = useRef(false);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Session start mutation with retry logic
  const startSessionMutation = useMutation({
    mutationFn: () => createSession(activeRole),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onSuccess: (sessionData) => {
      setSession(sessionData);
      sessionRef.current = sessionData; // Sync ref immediately for use in callbacks
      setError(null);

      // Add greeting message
      const greetingMessage: LexiMessage = {
        id: `msg_greeting_${Date.now()}`,
        role: 'assistant',
        content: sessionData.greeting,
        timestamp: new Date(),
        metadata: { persona: sessionData.persona },
      };
      setMessages([greetingMessage]);

      // Set initial suggestions based on persona
      setSuggestions(getInitialSuggestions(sessionData.persona));

      onSessionStart?.(sessionData);
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      onError?.(errorMessage);
    },
  });

  // Session end mutation
  const endSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSettled: () => {
      setSession(null);
      sessionRef.current = null;
      setMessages([]);
      setSuggestions([]);
      setError(null);
      onSessionEnd?.();
    },
  });

  // Auto-start session if enabled (only once)
  useEffect(() => {
    if (autoStart && !session && !hasAutoStarted.current && !startSessionMutation.isPending) {
      hasAutoStarted.current = true;
      startSessionMutation.mutate();
    }
  }, [autoStart, session, startSessionMutation]);

  // Reset auto-start flag when autoStart changes to false
  useEffect(() => {
    if (!autoStart) {
      hasAutoStarted.current = false;
    }
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        // Fire and forget - don't await
        fetch(`/api/lexi/session?sessionId=${sessionRef.current.sessionId}`, {
          method: 'DELETE',
        }).catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, []);

  /**
   * Start a new Lexi session
   */
  const startSession = useCallback(async (): Promise<void> => {
    setError(null);
    await startSessionMutation.mutateAsync();
  }, [startSessionMutation]);

  /**
   * End the current session
   */
  const endSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    await endSessionMutation.mutateAsync(session.sessionId);
  }, [session, endSessionMutation]);

  /**
   * Send a message to Lexi (with streaming support and offline caching)
   */
  const sendMessage = useCallback(async (messageText: string) => {
    // Use ref to avoid stale closure when session was just created in handleSubmit
    const currentSession = sessionRef.current;
    if (!currentSession || !messageText.trim()) return;

    const trimmedMessage = messageText.trim();
    setIsSending(true);
    setError(null);

    // Add user message immediately
    const userMessage: LexiMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    // Check cache for common responses first
    const cachedResponse = responseCache.get(trimmedMessage);
    if (cachedResponse) {
      const cachedMessage: LexiMessage = {
        id: `msg_cached_${Date.now()}`,
        role: 'assistant',
        content: cachedResponse.content,
        timestamp: new Date(),
        metadata: { intent: 'cached' },
      };
      setMessages(prev => [...prev, userMessage, cachedMessage]);
      if (cachedResponse.suggestions) {
        setSuggestions(cachedResponse.suggestions);
      }
      setIsSending(false);
      return;
    }

    // Add loading/streaming message for assistant
    const streamingMsgId = `msg_streaming_${Date.now()}`;
    const streamingMessage: LexiMessage = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);

    try {
      if (streaming) {
        // Use SSE streaming endpoint
        await sendMessageStreaming(currentSession, trimmedMessage, streamingMsgId, setMessages, setSuggestions);
      } else {
        // Use regular endpoint
        await sendMessageRegular(currentSession, trimmedMessage, streamingMsgId, setMessages, setSuggestions);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);

      // Remove streaming message on error
      setMessages(prev => prev.filter(msg => msg.id !== streamingMsgId));
    } finally {
      setIsSending(false);
    }
  }, [streaming, onError]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    session,
    isLoading: startSessionMutation.isPending,
    isSending,
    error,
    suggestions,
    startSession,
    endSession,
    sendMessage,
    clearMessages,
    clearError,
  };
}

// --- Helper Functions ---

/**
 * Send message with streaming response (SSE)
 */
async function sendMessageStreaming(
  session: LexiSession,
  message: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<LexiMessage[]>>,
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>
): Promise<void> {
  const response = await fetch('/api/lexi/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send message');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  let messageMetadata: LexiMessage['metadata'];
  let finalMsgId = msgId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7);
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        switch (eventType) {
          case 'start':
            finalMsgId = data.messageId || msgId;
            break;

          case 'chunk':
            accumulatedContent += data.content;
            // Update message with accumulated content (streaming effect)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === msgId
                  ? { ...msg, content: accumulatedContent, isLoading: true }
                  : msg
              )
            );
            break;

          case 'done':
            messageMetadata = data.metadata;
            finalMsgId = data.id || finalMsgId;
            // Final update - remove loading state
            setMessages(prev =>
              prev.map(msg =>
                msg.id === msgId
                  ? {
                      ...msg,
                      id: finalMsgId,
                      content: accumulatedContent,
                      timestamp: new Date(data.timestamp),
                      metadata: messageMetadata,
                      isLoading: false,
                    }
                  : msg
              )
            );
            // Update suggestions
            if (data.suggestions && data.suggestions.length > 0) {
              setSuggestions(data.suggestions);
            }
            break;

          case 'error':
            throw new Error(data.error || 'Stream error');
        }
      }
    }
  }
}

/**
 * Send message with regular response (non-streaming)
 */
async function sendMessageRegular(
  session: LexiSession,
  message: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<LexiMessage[]>>,
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>
): Promise<void> {
  const response = await fetch('/api/lexi/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send message');
  }

  const data = await response.json();

  // Replace loading message with actual response
  const assistantMessage: LexiMessage = {
    id: data.response.id,
    role: 'assistant',
    content: data.response.content,
    timestamp: new Date(data.response.timestamp),
    metadata: data.response.metadata,
    isLoading: false,
  };

  setMessages(prev =>
    prev.map(msg =>
      msg.id === msgId ? assistantMessage : msg
    )
  );

  // Update suggestions
  if (data.suggestions && data.suggestions.length > 0) {
    setSuggestions(data.suggestions);
  }
}

function getInitialSuggestions(persona: string): string[] {
  switch (persona) {
    case 'student':
      return ['Help with homework', 'Show my progress', 'Upcoming lessons'];
    case 'tutor':
      return ["Today's schedule", 'View earnings', 'Student progress'];
    case 'client':
      return ['Find a tutor', 'View bookings', "My child's progress"];
    case 'agent':
      return ['Support queue', 'User lookup', 'Booking issues'];
    case 'organisation':
      return ['Dashboard', 'Analytics', 'Manage users'];
    default:
      return ['How can you help?', 'What can I do?'];
  }
}

export default useLexiChat;
