'use client';

/**
 * Growth Chat Hook
 *
 * Custom hook for managing Growth Agent chat state and interactions.
 * Mirrors the useSageChat pattern.
 *
 * @module components/feature/growth/useGrowthChat
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

// --- Types ---

export type GrowthUserRole = 'tutor' | 'agent' | 'client' | 'organisation';

export interface GrowthMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: {
    role?: string;
    provider?: string;
  };
}

export interface GrowthSession {
  sessionId: string;
  role: GrowthUserRole;
  greeting: string;
  suggestions: string[];
  expiresAt: string;
}

export interface UseGrowthChatOptions {
  autoStart?: boolean;
  streaming?: boolean;
  onError?: (error: string) => void;
  onSessionStart?: (session: GrowthSession) => void;
}

export interface UseGrowthChatReturn {
  messages: GrowthMessage[];
  session: GrowthSession | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  suggestions: string[];
  startSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearError: () => void;
}

// --- API Functions ---

async function createSession(): Promise<GrowthSession> {
  const response = await fetch('/api/growth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start session');
  }

  return response.json();
}

// --- Hook ---

export function useGrowthChat(options: UseGrowthChatOptions = {}): UseGrowthChatReturn {
  const {
    autoStart = false,
    streaming = true,
    onError,
    onSessionStart,
  } = options;

  const [messages, setMessages] = useState<GrowthMessage[]>([]);
  const [session, setSession] = useState<GrowthSession | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<GrowthSession | null>(null);
  const hasAutoStarted = useRef(false);

  useEffect(() => { sessionRef.current = session; }, [session]);

  const startSessionMutation = useMutation({
    mutationFn: createSession,
    retry: 1,
    retryDelay: 1000,
    onMutate: () => { setIsStarting(true); setError(null); },
    onSuccess: (sessionData) => {
      setSession(sessionData);
      const greetingMessage: GrowthMessage = {
        id: `msg_greeting_${Date.now()}`,
        role: 'assistant',
        content: sessionData.greeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
      setSuggestions(sessionData.suggestions || []);
      setIsStarting(false);
      onSessionStart?.(sessionData);
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      setError(errorMessage);
      setIsStarting(false);
      onError?.(errorMessage);
    },
  });

  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startSessionMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        fetch(`/api/growth/session?sessionId=${sessionRef.current.sessionId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    };
  }, []);

  const startSession = useCallback(async (): Promise<void> => {
    setError(null);
    await startSessionMutation.mutateAsync();
  }, [startSessionMutation]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!session || !messageText.trim()) return;

    const trimmedMessage = messageText.trim();
    setIsSending(true);
    setError(null);

    const userMessage: GrowthMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    const streamingMsgId = `msg_streaming_${Date.now()}`;
    const streamingMessage: GrowthMessage = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);

    try {
      const conversationHistory = messages
        .filter(msg => msg.role !== 'system' && !msg.isLoading)
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      if (streaming) {
        await sendMessageStreaming(session, trimmedMessage, streamingMsgId, setMessages, setSuggestions, conversationHistory);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);
      setMessages(prev => prev.filter(msg => msg.id !== streamingMsgId));
    } finally {
      setIsSending(false);
    }
  }, [session, streaming, messages, onError]);

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    session,
    isLoading: isStarting,
    isSending,
    error,
    suggestions,
    startSession,
    sendMessage,
    clearError,
  };
}

// --- Streaming helper ---

async function sendMessageStreaming(
  session: GrowthSession,
  message: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<GrowthMessage[]>>,
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const response = await fetch('/api/growth/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message,
      role: session.role,
      conversationHistory,
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
  let finalMsgId = msgId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

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
            setMessages(prev =>
              prev.map(msg =>
                msg.id === msgId
                  ? { ...msg, content: accumulatedContent, isLoading: true }
                  : msg
              )
            );
            break;

          case 'done':
            finalMsgId = data.id || finalMsgId;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === msgId
                  ? {
                      ...msg,
                      id: finalMsgId,
                      content: accumulatedContent,
                      timestamp: new Date(data.timestamp),
                      metadata: data.metadata,
                      isLoading: false,
                    }
                  : msg
              )
            );
            if (data.suggestions?.length > 0) setSuggestions(data.suggestions);
            break;

          case 'error':
            if (data.recoverable) {
              console.warn('[GrowthChat] Provider error (recovering):', data.error);
              break;
            }
            throw new Error(data.error || 'Stream error');
        }
      }
    }
  }
}

export default useGrowthChat;
