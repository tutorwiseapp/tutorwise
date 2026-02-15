'use client';

/**
 * Sage Chat Hook
 *
 * Custom hook for managing Sage tutoring chat state and interactions.
 * Handles session management, message streaming, and learning context.
 *
 * @module components/feature/sage/useSageChat
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

// --- Types ---

export type SageSubject = 'maths' | 'english' | 'science' | 'general';
export type SageLevel = 'primary' | 'ks3' | 'gcse' | 'a-level' | 'university' | 'adult';
export type SessionGoal = 'homework' | 'exam-prep' | 'concept-review' | 'practice' | 'general';

export interface SageMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  metadata?: {
    persona?: string;
    subject?: string;
    level?: string;
    topic?: string;
  };
}

export interface SageSession {
  sessionId: string;
  persona: string;
  subject?: SageSubject;
  level?: SageLevel;
  greeting: string;
  capabilities: string[];
  expiresAt: string;
}

export interface UseSageChatOptions {
  autoStart?: boolean;
  streaming?: boolean;
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
  /** Initial conversation history from Lexi handoff */
  initialConversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onError?: (error: string) => void;
  onSessionStart?: (session: SageSession) => void;
  onSessionEnd?: () => void;
}

export interface UseSageChatReturn {
  // State
  messages: SageMessage[];
  session: SageSession | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  suggestions: string[];

  // Actions
  startSession: (options?: { subject?: SageSubject; level?: SageLevel; sessionGoal?: SessionGoal }) => Promise<void>;
  endSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  updateContext: (subject?: SageSubject, level?: SageLevel) => void;
}

// --- API Functions ---

async function createSession(options?: {
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
}): Promise<SageSession> {
  const response = await fetch('/api/sage/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start session');
  }

  return response.json();
}

async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`/api/sage/session?sessionId=${sessionId}`, {
    method: 'DELETE',
  });
}

// --- Hook Implementation ---

export function useSageChat(options: UseSageChatOptions = {}): UseSageChatReturn {
  const {
    autoStart = false,
    streaming = true,
    subject: initialSubject,
    level: initialLevel,
    sessionGoal: initialGoal,
    initialConversationHistory,
    onError,
    onSessionStart,
    onSessionEnd,
  } = options;

  // Ref to track initial conversation history (from Lexi handoff)
  const handoffHistoryRef = useRef(initialConversationHistory);

  // Local state
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [session, setSession] = useState<SageSession | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isStarting, setIsStarting] = useState(autoStart); // Start loading immediately if autoStart
  const [error, setError] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState<SageSubject | undefined>(initialSubject);
  const [currentLevel, setCurrentLevel] = useState<SageLevel | undefined>(initialLevel);

  // Refs
  const sessionRef = useRef<SageSession | null>(null);
  const hasAutoStarted = useRef(false);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Session start mutation
  const startSessionMutation = useMutation({
    mutationFn: createSession,
    retry: 1,
    retryDelay: 1000,
    onMutate: () => {
      setIsStarting(true);
      setError(null);
    },
    onSuccess: (sessionData) => {
      setSession(sessionData);

      // Add greeting message
      const greetingMessage: SageMessage = {
        id: `msg_greeting_${Date.now()}`,
        role: 'assistant',
        content: sessionData.greeting,
        timestamp: new Date(),
        metadata: {
          persona: sessionData.persona,
          subject: sessionData.subject,
          level: sessionData.level,
        },
      };
      setMessages([greetingMessage]);

      // Set initial suggestions based on subject
      setSuggestions(getInitialSuggestions(sessionData.subject, sessionData.persona));

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

  // Session end mutation
  const endSessionMutation = useMutation({
    mutationFn: deleteSession,
    onSettled: () => {
      setSession(null);
      setMessages([]);
      setSuggestions([]);
      setError(null);
      onSessionEnd?.();
    },
  });

  // Auto-start session if enabled (run once on mount)
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Start session immediately for instant UX
      startSessionMutation.mutate({
        subject: initialSubject,
        level: initialLevel,
        sessionGoal: initialGoal,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]); // Only depend on autoStart, run once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        fetch(`/api/sage/session?sessionId=${sessionRef.current.sessionId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    };
  }, []);

  /**
   * Start a new Sage session
   */
  const startSession = useCallback(async (sessionOptions?: {
    subject?: SageSubject;
    level?: SageLevel;
    sessionGoal?: SessionGoal;
  }): Promise<void> => {
    setError(null);
    const subject = sessionOptions?.subject || currentSubject;
    const level = sessionOptions?.level || currentLevel;
    setCurrentSubject(subject);
    setCurrentLevel(level);
    await startSessionMutation.mutateAsync({
      subject,
      level,
      sessionGoal: sessionOptions?.sessionGoal || initialGoal,
    });
  }, [startSessionMutation, currentSubject, currentLevel, initialGoal]);

  /**
   * End the current session
   */
  const endSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    await endSessionMutation.mutateAsync(session.sessionId);
  }, [session, endSessionMutation]);

  /**
   * Update learning context
   */
  const updateContext = useCallback((subject?: SageSubject, level?: SageLevel) => {
    if (subject) setCurrentSubject(subject);
    if (level) setCurrentLevel(level);
  }, []);

  /**
   * Send a message to Sage
   */
  const sendMessage = useCallback(async (messageText: string) => {
    if (!session || !messageText.trim()) return;

    const trimmedMessage = messageText.trim();
    setIsSending(true);
    setError(null);

    // Add user message immediately
    const userMessage: SageMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    // Add loading/streaming message for assistant
    const streamingMsgId = `msg_streaming_${Date.now()}`;
    const streamingMessage: SageMessage = {
      id: streamingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);

    try {
      // Build conversation history from current messages + any handoff history
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // Include handoff history (only on first message)
      if (handoffHistoryRef.current && messages.length <= 1) {
        conversationHistory.push(...handoffHistoryRef.current);
      }

      // Include current messages (excluding the loading message we just added)
      messages.forEach(msg => {
        if (msg.role !== 'system' && !msg.isLoading && msg.id !== streamingMsgId) {
          conversationHistory.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      });

      if (streaming) {
        await sendMessageStreaming(session, trimmedMessage, streamingMsgId, setMessages, setSuggestions, conversationHistory);
      } else {
        await sendMessageRegular(session, trimmedMessage, streamingMsgId, setMessages, setSuggestions, conversationHistory);
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
  }, [session, streaming, onError]);

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
    isLoading: isStarting,
    isSending,
    error,
    suggestions,
    startSession,
    endSession,
    sendMessage,
    clearMessages,
    clearError,
    updateContext,
  };
}

// --- Helper Functions ---

/**
 * Send message with streaming response (SSE)
 */
async function sendMessageStreaming(
  session: SageSession,
  message: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<SageMessage[]>>,
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const response = await fetch('/api/sage/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message,
      subject: session.subject,
      level: session.level,
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
  let messageMetadata: SageMessage['metadata'];
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
            messageMetadata = data.metadata;
            finalMsgId = data.id || finalMsgId;
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
            if (data.suggestions?.length > 0) {
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
  session: SageSession,
  message: string,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<SageMessage[]>>,
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const response = await fetch('/api/sage/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      message,
      subject: session.subject,
      level: session.level,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send message');
  }

  const data = await response.json();

  const assistantMessage: SageMessage = {
    id: data.response.id,
    role: 'assistant',
    content: data.response.content,
    timestamp: new Date(data.response.timestamp),
    metadata: data.response.metadata,
    isLoading: false,
  };

  setMessages(prev =>
    prev.map(msg => (msg.id === msgId ? assistantMessage : msg))
  );

  if (data.suggestions?.length > 0) {
    setSuggestions(data.suggestions);
  }
}

/**
 * Get initial suggestions based on subject and persona
 */
function getInitialSuggestions(subject?: SageSubject, persona?: string): string[] {
  if (persona === 'student') {
    switch (subject) {
      case 'maths':
        return ['Help me solve this problem', 'Explain algebra', 'Practice questions'];
      case 'english':
        return ['Check my writing', 'Grammar help', 'Essay structure'];
      case 'science':
        return ['Explain a concept', 'Help with equations', 'Practice quiz'];
      default:
        return ['What should I study?', 'Help with homework', 'Exam tips'];
    }
  }

  if (persona === 'tutor') {
    return ['Create a worksheet', 'Lesson plan ideas', 'Assessment questions'];
  }

  if (persona === 'client') {
    return ["My child's progress", 'How can I help at home?', 'Recommend resources'];
  }

  return ['How can you help me?', 'What subjects do you cover?'];
}

export default useSageChat;
