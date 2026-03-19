'use client';

/**
 * useSageVirtualSpace
 *
 * Manages Sage state within a VirtualSpace session.
 * Handles activation, messaging, quota display, and deactivation.
 *
 * @module components/feature/virtualspace/hooks/useSageVirtualSpace
 */

import { useState, useCallback, useRef } from 'react';

// --- Types ---

export type SageVirtualSpaceProfile = 'tutor' | 'copilot' | 'wingman' | 'observer';

export interface SageMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface UseSageVirtualSpaceOptions {
  sessionId: string;
  currentUserId: string;
}

export interface UseSageVirtualSpaceReturn {
  // State
  isActive: boolean;
  isActivating: boolean;
  profile: SageVirtualSpaceProfile | null;
  quotaRemaining: number | null;
  quotaExhausted: boolean;
  messages: SageMessage[];
  isStreaming: boolean;
  sageSessionId: string | null;
  error: string | null;

  // Actions
  activate: () => Promise<void>;
  deactivate: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearError: () => void;
}

// --- Hook Implementation ---

export function useSageVirtualSpace(options: UseSageVirtualSpaceOptions): UseSageVirtualSpaceReturn {
  const { sessionId } = options;

  const [isActive, setIsActive] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [profile, setProfile] = useState<SageVirtualSpaceProfile | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sageSessionId, setSageSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep sageSessionId in a ref so sendMessage closure always has latest value
  const sageSessionIdRef = useRef<string | null>(null);
  // Keep messages in a ref for conversation history building
  const messagesRef = useRef<SageMessage[]>([]);

  const updateSageSessionId = useCallback((id: string | null) => {
    sageSessionIdRef.current = id;
    setSageSessionId(id);
  }, []);

  const updateMessages = useCallback((updater: (prev: SageMessage[]) => SageMessage[]) => {
    setMessages(prev => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  /**
   * Activate Sage for this VirtualSpace session.
   * Calls POST /api/sage/virtualspace/activate.
   */
  const activate = useCallback(async (): Promise<void> => {
    if (isActivating || isActive) return;

    setIsActivating(true);
    setError(null);

    try {
      const response = await fetch('/api/sage/virtualspace/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 || data.error === 'quota_exhausted') {
          setQuotaExhausted(true);
          setQuotaRemaining(0);
          setIsActivating(false);
          // Add a system-style message explaining the quota state
          const quotaMsg: SageMessage = {
            id: `msg_quota_${Date.now()}`,
            role: 'assistant',
            content: "You've used your free Sage sessions. Subscribe to Sage Pro to continue learning with AI support on your whiteboard.",
            timestamp: new Date(),
          };
          updateMessages(() => [quotaMsg]);
          setIsActive(true); // Show panel with upgrade prompt
          return;
        }
        throw new Error(data.error || 'Failed to activate Sage');
      }

      updateSageSessionId(data.sageSessionId);
      setProfile(data.profile ?? 'tutor');
      setQuotaRemaining(data.quotaRemaining ?? null);
      setQuotaExhausted(false);
      setIsActive(true);

      // Add a greeting message
      const subjectLabel = data.subject && data.subject !== 'general'
        ? ` for ${capitalize(data.subject)}`
        : '';
      const levelLabel = data.level ? ` (${data.level})` : '';
      const greeting: SageMessage = {
        id: `msg_greeting_${Date.now()}`,
        role: 'assistant',
        content: `Hi! I'm Sage, your AI tutor${subjectLabel}${levelLabel}. I'm here to help — ask me anything, or share what you're working on!`,
        timestamp: new Date(),
      };
      updateMessages(() => [greeting]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to activate Sage';
      setError(msg);
    } finally {
      setIsActivating(false);
    }
  }, [isActivating, isActive, sessionId, updateSageSessionId, updateMessages]);

  /**
   * Deactivate Sage — clears state and closes the panel.
   */
  const deactivate = useCallback((): void => {
    setIsActive(false);
    setProfile(null);
    updateMessages(() => []);
    updateSageSessionId(null);
    setQuotaExhausted(false);
    setError(null);
    setIsStreaming(false);
  }, [updateMessages, updateSageSessionId]);

  /**
   * Send a text message to Sage and stream the response.
   * Calls POST /api/sage/virtualspace/message which proxies to the existing stream route.
   */
  const sendMessage = useCallback(async (text: string): Promise<void> => {
    const currentSageSessionId = sageSessionIdRef.current;
    if (!currentSageSessionId || !text.trim() || isStreaming || quotaExhausted) return;

    const trimmedText = text.trim();
    setError(null);

    // Add user message immediately
    const userMsg: SageMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date(),
    };

    // Add streaming placeholder for assistant
    const streamingMsgId = `msg_streaming_${Date.now()}`;
    const streamingMsg: SageMessage = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    updateMessages(prev => [...prev, userMsg, streamingMsg]);
    setIsStreaming(true);

    try {
      // Build conversation history (exclude loading messages, last 10)
      const conversationHistory = messagesRef.current
        .filter(m => !m.isLoading && m.id !== streamingMsgId)
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await fetch('/api/sage/virtualspace/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sageSessionId: currentSageSessionId,
          message: trimmedText,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let eventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const rawData = line.slice(6);
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(rawData);
            } catch {
              continue;
            }

            switch (eventType) {
              case 'chunk':
                accumulatedContent += (data.content as string) ?? '';
                updateMessages(prev =>
                  prev.map(m =>
                    m.id === streamingMsgId
                      ? { ...m, content: accumulatedContent, isLoading: true }
                      : m
                  )
                );
                break;

              case 'done': {
                const finalId = (data.id as string) ?? streamingMsgId;
                // Update quota remaining from rate limit info
                const rl = data.rateLimit as { remaining?: number } | undefined;
                if (rl?.remaining !== undefined) {
                  setQuotaRemaining(rl.remaining);
                  if (rl.remaining <= 0) {
                    setQuotaExhausted(true);
                  }
                }
                updateMessages(prev =>
                  prev.map(m =>
                    m.id === streamingMsgId
                      ? {
                          ...m,
                          id: finalId,
                          content: accumulatedContent,
                          timestamp: new Date((data.timestamp as string) ?? Date.now()),
                          isLoading: false,
                        }
                      : m
                  )
                );
                break;
              }

              case 'error':
                // Recoverable errors — provider is falling back
                if (!(data.recoverable as boolean)) {
                  throw new Error((data.error as string) ?? 'Stream error');
                }
                break;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
      // Remove the streaming placeholder on error
      updateMessages(prev => prev.filter(m => m.id !== streamingMsgId));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, quotaExhausted, updateMessages]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    isActive,
    isActivating,
    profile,
    quotaRemaining,
    quotaExhausted,
    messages,
    isStreaming,
    sageSessionId,
    error,
    activate,
    deactivate,
    sendMessage,
    clearError,
  };
}

// --- Helpers ---

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default useSageVirtualSpace;
