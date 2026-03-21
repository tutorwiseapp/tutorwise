/**
 * SessionContext
 * Provides real-time session state (chat, raise hand, timer, reactions, follow mode)
 * to all tldraw-rendered components (TopPanel, InFrontOfTheCanvas) via React context.
 *
 * All Ably subscriptions for session events live here so they share one channel.
 */

'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useChannel } from 'ably/react';
import type { RealtimeChannel } from 'ably';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export interface RemoteCursor {
  userId: string;
  displayName: string;
  x: number; // page coordinates
  y: number;
}

export interface SessionContextValue {
  // Channel
  sessionChannel: RealtimeChannel | null;
  currentUserId: string;

  // Chat
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatMessages: ChatMessage[];
  sendChat: (text: string, displayName: string) => void;

  // Raise hand
  raisedHands: Set<string>;
  myHandRaised: boolean;
  toggleRaiseHand: (displayName: string) => void;

  // Timer
  timerOpen: boolean;
  setTimerOpen: (v: boolean) => void;
  timerSeconds: number;
  timerRunning: boolean;
  startTimer: (seconds: number) => void;
  pauseTimer: () => void;
  resetTimer: () => void;

  // Reactions
  reactions: FloatingReaction[];
  sendReaction: (emoji: string) => void;

  // Follow mode
  followMode: boolean;
  isLeader: boolean;
  toggleFollowMode: () => void;

  // Draw lock (tutor can lock student drawing)
  drawLocked: boolean;
  lockDraw: (locked: boolean) => void;

  // Remote cursors
  remoteCursors: RemoteCursor[];
  publishCursor: (x: number, y: number, displayName: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue>({
  sessionChannel: null,
  currentUserId: '',
  chatOpen: false,
  setChatOpen: () => {},
  chatMessages: [],
  sendChat: () => {},
  raisedHands: new Set(),
  myHandRaised: false,
  toggleRaiseHand: () => {},
  timerOpen: false,
  setTimerOpen: () => {},
  timerSeconds: 0,
  timerRunning: false,
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {},
  reactions: [],
  sendReaction: () => {},
  followMode: false,
  isLeader: false,
  toggleFollowMode: () => {},
  drawLocked: false,
  lockDraw: () => {},
  remoteCursors: [],
  publishCursor: () => {},
});

export const useSession = () => useContext(SessionContext);

// ── Provider ───────────────────────────────────────────────────────────────

interface SessionProviderProps {
  channelName: string;
  currentUserId: string;
  children: React.ReactNode;
}

export function SessionProvider({ channelName, currentUserId, children }: SessionProviderProps) {
  // ── Chat ────────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // ── Raise hand ──────────────────────────────────────────────────────────
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const myHandRaised = raisedHands.has(currentUserId);

  // ── Timer ───────────────────────────────────────────────────────────────
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Reactions ────────────────────────────────────────────────────────────
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  // ── Follow mode ─────────────────────────────────────────────────────────
  const [followMode, setFollowMode] = useState(false);
  const [isLeader, setIsLeader] = useState(false);

  // ── Draw lock ────────────────────────────────────────────────────────────
  const [drawLocked, setDrawLocked] = useState(false);

  // ── Remote cursors ───────────────────────────────────────────────────────
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const cursorExpiryRef = useRef<Record<string, NodeJS.Timeout>>({});

  // ── Ably channel ────────────────────────────────────────────────────────
  const { channel } = useChannel(channelName, (message) => {
    switch (message.name) {
      case 'session:chat': {
        const msg = message.data as ChatMessage;
        setChatMessages((prev) => [...prev.slice(-99), msg]); // keep last 100
        break;
      }
      case 'session:raise-hand': {
        const { userId, raised } = message.data as { userId: string; raised: boolean };
        setRaisedHands((prev) => {
          const next = new Set(prev);
          if (raised) next.add(userId);
          else next.delete(userId);
          return next;
        });
        break;
      }
      case 'session:timer': {
        const { action, seconds } = message.data as { action: string; seconds?: number };
        if (action === 'start' && seconds !== undefined) {
          setTimerSeconds(seconds);
          setTimerRunning(true);
          setTimerOpen(true);
        } else if (action === 'pause') {
          setTimerRunning(false);
        } else if (action === 'reset') {
          setTimerRunning(false);
          setTimerSeconds(0);
        }
        break;
      }
      case 'session:reaction': {
        const { emoji } = message.data as { emoji: string };
        const id = `${Date.now()}-${Math.random()}`;
        const x = 20 + Math.random() * 60; // % across screen
        const y = 20 + Math.random() * 60;
        setReactions((prev) => [...prev, { id, emoji, x, y }]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2500);
        break;
      }
      case 'session:draw-lock': {
        const { locked } = message.data as { locked: boolean };
        setDrawLocked(locked);
        break;
      }
      case 'session:homework': {
        const { text, dueDate, tutorName } = message.data as { text: string; dueDate?: string; tutorName?: string };
        const due = dueDate ? ` (due ${new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})` : '';
        toast(`📋 Homework from ${tutorName ?? 'your tutor'}${due}:\n${text}`, {
          duration: 10000,
          style: { maxWidth: 380, whiteSpace: 'pre-wrap' },
        });
        break;
      }
      case 'session:cursor': {
        const { userId, displayName, x, y } = message.data as RemoteCursor;
        if (userId === currentUserId) break; // ignore own cursor
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== userId);
          return [...filtered, { userId, displayName, x, y }];
        });
        // Auto-expire cursor after 3s of inactivity
        if (cursorExpiryRef.current[userId]) clearTimeout(cursorExpiryRef.current[userId]);
        cursorExpiryRef.current[userId] = setTimeout(() => {
          setRemoteCursors((prev) => prev.filter((c) => c.userId !== userId));
          delete cursorExpiryRef.current[userId];
        }, 3000);
        break;
      }
    }
  });

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerSeconds]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const sendChat = useCallback((text: string, displayName: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${currentUserId}`,
      userId: currentUserId,
      displayName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    channel.publish('session:chat', msg);
    // Optimistically add own message
    setChatMessages((prev) => [...prev.slice(-99), msg]);
  }, [channel, currentUserId]);

  const toggleRaiseHand = useCallback((displayName: string) => {
    const raised = !myHandRaised;
    channel.publish('session:raise-hand', { userId: currentUserId, displayName, raised });
    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (raised) next.add(currentUserId);
      else next.delete(currentUserId);
      return next;
    });
  }, [channel, currentUserId, myHandRaised]);

  const startTimer = useCallback((seconds: number) => {
    channel.publish('session:timer', { action: 'start', seconds });
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setTimerOpen(true);
  }, [channel]);

  const pauseTimer = useCallback(() => {
    channel.publish('session:timer', { action: 'pause' });
    setTimerRunning(false);
  }, [channel]);

  const resetTimer = useCallback(() => {
    channel.publish('session:timer', { action: 'reset' });
    setTimerRunning(false);
    setTimerSeconds(0);
  }, [channel]);

  const sendReaction = useCallback((emoji: string) => {
    channel.publish('session:reaction', { emoji, userId: currentUserId });
  }, [channel, currentUserId]);

  const toggleFollowMode = useCallback(() => {
    setFollowMode((v) => !v);
    setIsLeader((v) => !v);
  }, []);

  const lockDraw = useCallback((locked: boolean) => {
    channel.publish('session:draw-lock', { locked });
    setDrawLocked(locked);
  }, [channel]);

  const cursorThrottleRef = useRef<number>(0);
  const publishCursor = useCallback((x: number, y: number, displayName: string) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current < 50) return; // ~20fps
    cursorThrottleRef.current = now;
    channel.publish('session:cursor', { userId: currentUserId, displayName, x, y });
  }, [channel, currentUserId]);

  const value: SessionContextValue = {
    sessionChannel: channel,
    currentUserId,
    chatOpen,
    setChatOpen,
    chatMessages,
    sendChat,
    raisedHands,
    myHandRaised,
    toggleRaiseHand,
    timerOpen,
    setTimerOpen,
    timerSeconds,
    timerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    reactions,
    sendReaction,
    followMode,
    isLeader,
    toggleFollowMode,
    drawLocked,
    lockDraw,
    remoteCursors,
    publishCursor,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
