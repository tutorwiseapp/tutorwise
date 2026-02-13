'use client';

/**
 * Lexi Chat Hook
 *
 * Custom hook for managing Lexi chat state and interactions.
 * Handles session management, message sending, and real-time updates.
 *
 * @module components/feature/lexi/useLexiChat
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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

// --- Hook Implementation ---

export function useLexiChat(options: UseLexiChatOptions = {}): UseLexiChatReturn {
  const { autoStart = false, streaming = true, onError, onSessionStart, onSessionEnd } = options;

  // State
  const [messages, setMessages] = useState<LexiMessage[]>([]);
  const [session, setSession] = useState<LexiSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Refs
  const sessionRef = useRef<LexiSession | null>(null);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Auto-start session if enabled
  useEffect(() => {
    if (autoStart && !session) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lexi/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const sessionData: LexiSession = await response.json();
      setSession(sessionData);

      // Add greeting message
      const greetingMessage: LexiMessage = {
        id: `msg_greeting_${Date.now()}`,
        role: 'assistant',
        content: sessionData.greeting,
        timestamp: new Date(),
        metadata: { persona: sessionData.persona },
      };
      setMessages([greetingMessage]);

      // Set initial suggestions based on capabilities
      setSuggestions(getInitialSuggestions(sessionData.persona));

      onSessionStart?.(sessionData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onError, onSessionStart]);

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      await fetch(`/api/lexi/session?sessionId=${session.sessionId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore errors on session end
    } finally {
      setSession(null);
      setMessages([]);
      setSuggestions([]);
      onSessionEnd?.();
    }
  }, [session, onSessionEnd]);

  /**
   * Send a message to Lexi (with streaming support and offline caching)
   */
  const sendMessage = useCallback(async (messageText: string) => {
    if (!session || !messageText.trim()) return;

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
        await sendMessageStreaming(trimmedMessage, streamingMsgId);
      } else {
        // Use regular endpoint
        await sendMessageRegular(trimmedMessage, streamingMsgId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, streaming, onError]);

  /**
   * Send message with streaming response (SSE)
   */
  const sendMessageStreaming = useCallback(async (message: string, msgId: string) => {
    if (!session) return;

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
  }, [session]);

  /**
   * Send message with regular response (non-streaming)
   */
  const sendMessageRegular = useCallback(async (message: string, msgId: string) => {
    if (!session) return;

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
  }, [session]);

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
    isLoading,
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
