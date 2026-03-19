'use client';

/**
 * useSageVirtualSpace
 *
 * Manages Sage state within a VirtualSpace session.
 *
 * Phase 1: activation, streaming ([CANVAS] block parsing), quota display, deactivation.
 * Phase 3: canvas observation (snapshotFnRef), stuck auto-observe.
 * Phase 4: behaviour profiles via Ably presence + draw-channel activity tracking,
 *           awareness loop (10s tick, paused when tab hidden), canvas event logging.
 * Phase 5: session drive state (calibration → activation → loop → consolidation → wrap-up),
 *           auto-calibration on first activation, session recap on deactivate.
 *
 * @module components/feature/virtualspace/hooks/useSageVirtualSpace
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type React from 'react';
import type * as Ably from 'ably';
import { parseStreamingBuffer } from '../canvas/canvasBlockParser';
import type { SageCanvasShapeSpec } from '../canvas/canvasBlockParser';

export type { SageCanvasShapeSpec };

// ── Types ──────────────────────────────────────────────────────────────────

export type SageVirtualSpaceProfile = 'tutor' | 'copilot' | 'wingman' | 'observer';

export type DrivePhase =
  | 'calibration'
  | 'activation'
  | 'loop'
  | 'consolidation'
  | 'wrap-up';

export interface SessionRecap {
  topicsCovered: string[];
  misconceptionsLogged: string[];
  masteryDelta: number;
  timeSpent: number;          // minutes
  strongMoments: string[];
  suggestedNextSteps: string[];
  lessonPlanPrompt?: string;
}

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
  /** Called whenever Sage requests a shape to be drawn on the canvas. */
  dispatchShape?: (shape: SageCanvasShapeSpec) => void;
  /** Ref to a function that captures the whiteboard as a base64 PNG. Populated by SageCanvasWriter. */
  snapshotFnRef?: React.MutableRefObject<(() => Promise<string | null>) | null>;
  // Phase 4 additions — presence + awareness loop
  /** Ably Realtime client for presence monitoring (draw channel). */
  ablyClient?: Ably.Realtime;
  /** Ably draw channel name (same as passed to EmbeddedWhiteboard). */
  channelName?: string;
  /** User ID of the human tutor (from booking context). Used to detect Co-pilot / Wingman profile. */
  tutorId?: string;
  /** Subject inferred from booking context (pre-computed in VirtualSpaceClient). */
  subject?: string;
  /** Level inferred from booking context. */
  level?: string;
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
  isObserving: boolean;
  sageSessionId: string | null;
  error: string | null;
  drivePhase: DrivePhase | null;
  sessionRecap: SessionRecap | null;

  // Actions
  activate: () => Promise<void>;
  deactivate: () => void;
  sendMessage: (text: string) => Promise<void>;
  observe: (trigger?: 'manual' | 'stuck') => Promise<void>;
  clearError: () => void;
  clearRecap: () => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Thresholds for profile computation (design §4)
const TUTOR_ACTIVE_THRESHOLD_MS  = 90 * 1000;  // < 90s → co-pilot
const TUTOR_WINGMAN_THRESHOLD_MS = 3 * 60 * 1000; // 90s–3min → wingman; > 3min → tutor

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSageVirtualSpace(options: UseSageVirtualSpaceOptions): UseSageVirtualSpaceReturn {
  const {
    sessionId, currentUserId, dispatchShape, snapshotFnRef,
    ablyClient, channelName, tutorId,
  } = options;

  // ── Core state ─────────────────────────────────────────────────────────
  const [isActive, setIsActive]           = useState(false);
  const [isActivating, setIsActivating]   = useState(false);
  const [profile, setProfile]             = useState<SageVirtualSpaceProfile | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [messages, setMessages]           = useState<SageMessage[]>([]);
  const [isStreaming, setIsStreaming]     = useState(false);
  const [isObserving, setIsObserving]     = useState(false);
  const [sageSessionId, setSageSessionId] = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  // Phase 5
  const [drivePhase, setDrivePhase]       = useState<DrivePhase | null>(null);
  const [sessionRecap, setSessionRecap]   = useState<SessionRecap | null>(null);

  // ── Stable refs ─────────────────────────────────────────────────────────
  const sageSessionIdRef   = useRef<string | null>(null);
  const messagesRef        = useRef<SageMessage[]>([]);
  const dispatchShapeRef   = useRef(dispatchShape);
  const profileRef         = useRef<SageVirtualSpaceProfile | null>(null);
  const activatedAtRef     = useRef<number | null>(null);

  // Phase 4: presence/activity tracking
  const tutorLastActiveRef    = useRef<number | null>(null); // timestamp of tutor's last draw msg
  const tutorPresentRef       = useRef(false);
  const ablyPresenceRef       = useRef<Ably.RealtimeChannel | null>(null);
  const ablyActivitySubRef    = useRef<Ably.RealtimeChannel | null>(null);
  // H1: student activity tracking (for Observer profile — student idle < 25s)
  const studentLastActiveRef  = useRef<number>(Date.now());

  useEffect(() => { dispatchShapeRef.current = dispatchShape; }, [dispatchShape]);

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

  const updateProfile = useCallback((p: SageVirtualSpaceProfile) => {
    profileRef.current = p;
    setProfile(p);
  }, []);

  // ── Phase 4: Compute profile from presence signals ──────────────────────
  const recomputeProfile = useCallback(() => {
    if (!isActive || !tutorId) return; // no tutor context → stay tutor
    const now = Date.now();
    const tutorPresent = tutorPresentRef.current;
    const tutorLastActive = tutorLastActiveRef.current;

    let newProfile: SageVirtualSpaceProfile;
    if (!tutorPresent || tutorLastActive === null) {
      // Tutor not in the room
      newProfile = 'tutor';
    } else {
      const idleMs = now - tutorLastActive;
      if (idleMs < TUTOR_ACTIVE_THRESHOLD_MS) {
        newProfile = 'copilot';
      } else if (idleMs < TUTOR_WINGMAN_THRESHOLD_MS) {
        newProfile = 'wingman';
      } else {
        newProfile = 'tutor';
      }
    }

    // H1: Observer sub-state — student actively working (< 25s idle) in Tutor/Wingman context.
    // Sage watches silently and does not intervene while the student is making progress.
    const STUDENT_ACTIVE_THRESHOLD_MS = 25_000;
    const studentIdleMs = now - studentLastActiveRef.current;
    if (
      (newProfile === 'tutor' || newProfile === 'wingman') &&
      studentIdleMs < STUDENT_ACTIVE_THRESHOLD_MS
    ) {
      newProfile = 'observer';
    }

    if (newProfile !== profileRef.current) {
      // Log profile transition (fire-and-forget)
      const currentSageSessionId = sageSessionIdRef.current;
      if (currentSageSessionId) {
        fetch('/api/sage/virtualspace/canvas-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sageSessionId: currentSageSessionId,
            virtualspaceSessionId: sessionId,
            eventType: 'profile_transition',
            fromProfile: profileRef.current,
            toProfile: newProfile,
          }),
        }).catch(() => {}); // fire-and-forget
      }
      updateProfile(newProfile);
    }
  }, [isActive, tutorId, sessionId, updateProfile]);

  // ── Phase 4: Ably presence + activity subscription ──────────────────────
  useEffect(() => {
    if (!isActive || !ablyClient || !channelName || !tutorId) return;

    const drawChannel = ablyClient.channels.get(channelName);
    ablyPresenceRef.current   = drawChannel;
    ablyActivitySubRef.current = drawChannel;

    // Enter presence so others see us
    drawChannel.presence.enter({ userId: currentUserId }).catch(() => {});

    // Track tutor presence
    const handlePresenceEnter = (member: Ably.PresenceMessage) => {
      if (member.clientId === tutorId) {
        tutorPresentRef.current = true;
        if (tutorLastActiveRef.current === null) {
          tutorLastActiveRef.current = Date.now();
        }
        recomputeProfile();
      }
    };
    const handlePresenceLeave = (member: Ably.PresenceMessage) => {
      if (member.clientId === tutorId) {
        tutorPresentRef.current  = false;
        tutorLastActiveRef.current = null;
        recomputeProfile();
      }
    };

    drawChannel.presence.subscribe('enter', handlePresenceEnter);
    drawChannel.presence.subscribe('leave', handlePresenceLeave);

    // Seed current presence state
    drawChannel.presence.get().then(members => {
      const tutorPresent = members.some(m => m.clientId === tutorId);
      tutorPresentRef.current = tutorPresent;
      if (tutorPresent && tutorLastActiveRef.current === null) {
        tutorLastActiveRef.current = Date.now();
      }
      recomputeProfile();
    }).catch(() => {});

    // Track tutor draw activity (update last-active timestamp)
    // Also track student activity for Observer profile (H1 fix)
    const handleDraw = (message: Ably.Message) => {
      if (message.clientId === tutorId) {
        tutorLastActiveRef.current = Date.now();
      } else {
        // Non-tutor draw → student activity (resets Observer sub-state)
        studentLastActiveRef.current = Date.now();
      }
      recomputeProfile();
    };
    drawChannel.subscribe('draw', handleDraw);

    return () => {
      drawChannel.presence.unsubscribe('enter', handlePresenceEnter);
      drawChannel.presence.unsubscribe('leave', handlePresenceLeave);
      drawChannel.presence.leave().catch(() => {});
      drawChannel.unsubscribe('draw', handleDraw);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ablyClient, channelName, tutorId]);

  // ── Phase 4: Awareness loop — 10s tick ──────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const tick = () => {
      // M2: pause if tab hidden
      if (document.hidden) return;
      // M2: pause in observer profile — student is actively working, no action needed.
      // Still recompute every 25s worth of ticks so we transition back promptly when
      // student goes idle. Allow every 3rd tick through (≈ 30s cadence in observer mode).
      if (profileRef.current === 'observer') {
        const studentIdleMs = Date.now() - studentLastActiveRef.current;
        if (studentIdleMs < 25_000) return; // still within observer window — skip
      }
      recomputeProfile();
    };

    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [isActive, recomputeProfile]);

  // ── Phase 5: Fire auto-calibration after activation (Tutor profile) ─────
  useEffect(() => {
    if (!isActive) return;

    // Calibration is only relevant in Tutor profile (solo student session)
    if (profile !== 'tutor') return;

    // Only calibrate if there's exactly one message (the greeting)
    if (messagesRef.current.length !== 1) return;

    // Fire after a brief pause so the panel renders first
    const timer = setTimeout(() => {
      // Still one message and tutor profile → inject calibration message
      if (messagesRef.current.length !== 1 || profileRef.current !== 'tutor') return;

      const sageSessionIdNow = sageSessionIdRef.current;
      if (!sageSessionIdNow) return;

      const calibrationMsg: SageMessage = {
        id: `msg_calibration_${Date.now()}`,
        role: 'assistant',
        content: "What would you like to work on today? Tell me the topic and I'll guide you through it — or just share what's on your whiteboard.",
        timestamp: new Date(),
      };
      updateMessages(prev => [...prev, calibrationMsg]);
      setDrivePhase('calibration');
    }, 3_000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, profile]);

  // Advance drive phase when student sends first message (calibration → activation)
  useEffect(() => {
    if (drivePhase !== 'calibration') return;
    const userMessages = messagesRef.current.filter(m => m.role === 'user');
    if (userMessages.length >= 1) {
      setDrivePhase('activation');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, drivePhase]);

  // Advance drive phase: activation → loop after first Sage response post-calibration
  useEffect(() => {
    if (drivePhase !== 'activation') return;
    const assistantMessages = messagesRef.current.filter(m => m.role === 'assistant' && !m.isLoading);
    if (assistantMessages.length >= 3) { // greeting + calibration + first substantive response
      setDrivePhase('loop');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, drivePhase]);

  // H2: loop → consolidation after 8 non-loading assistant messages (sustained practice)
  useEffect(() => {
    if (drivePhase !== 'loop') return;
    const assistantMessages = messagesRef.current.filter(m => m.role === 'assistant' && !m.isLoading);
    if (assistantMessages.length >= 8) {
      setDrivePhase('consolidation');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, drivePhase]);

  // H2: consolidation → wrap-up after 2 more exchanges (student confirms done or continues briefly)
  useEffect(() => {
    if (drivePhase !== 'consolidation') return;
    const assistantMessages = messagesRef.current.filter(m => m.role === 'assistant' && !m.isLoading);
    if (assistantMessages.length >= 11) {
      setDrivePhase('wrap-up');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, drivePhase]);

  // ── Canvas event logging helper ─────────────────────────────────────────
  const logCanvasEvent = useCallback((
    eventType: string,
    extra: Record<string, unknown> = {},
  ) => {
    const currentSageSessionId = sageSessionIdRef.current;
    if (!currentSageSessionId) return;
    fetch('/api/sage/virtualspace/canvas-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sageSessionId: currentSageSessionId,
        virtualspaceSessionId: sessionId,
        eventType,
        ...extra,
      }),
    }).catch(() => {}); // fire-and-forget
  }, [sessionId]);

  // ── Activate ───────────────────────────────────────────────────────────
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
          const quotaMsg: SageMessage = {
            id: `msg_quota_${Date.now()}`,
            role: 'assistant',
            content: "You've used your free Sage sessions. Subscribe to Sage Pro to continue learning with AI support on your whiteboard.",
            timestamp: new Date(),
          };
          updateMessages(() => [quotaMsg]);
          setIsActive(true);
          return;
        }
        throw new Error(data.error || 'Failed to activate Sage');
      }

      updateSageSessionId(data.sageSessionId);
      updateProfile(data.profile ?? 'tutor');
      setQuotaRemaining(data.quotaRemaining ?? null);
      setQuotaExhausted(false);
      setIsActive(true);
      activatedAtRef.current = Date.now();

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
  }, [isActivating, isActive, sessionId, updateSageSessionId, updateProfile, updateMessages]);

  // ── Deactivate (Phase 5: calls API for recap) ──────────────────────────
  const deactivate = useCallback((): void => {
    const currentSageSessionId = sageSessionIdRef.current;

    // Fire deactivate API (fire-and-forget — recap arrives asynchronously)
    if (currentSageSessionId) {
      const timeSpentMinutes = activatedAtRef.current
        ? Math.round((Date.now() - activatedAtRef.current) / 60000)
        : 0;

      fetch('/api/sage/virtualspace/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sageSessionId: currentSageSessionId,
          sessionId,
          timeSpentMinutes,
        }),
      })
        .then(async res => {
          if (!res.ok) return;
          const data = await res.json().catch(() => ({}));
          if (data.recap) {
            setSessionRecap(data.recap as SessionRecap);
          }
        })
        .catch(() => {}); // fail silently
    }

    setIsActive(false);
    updateProfile('tutor' as SageVirtualSpaceProfile);
    updateMessages(() => []);
    updateSageSessionId(null);
    setQuotaExhausted(false);
    setError(null);
    setIsStreaming(false);
    setIsObserving(false);
    setDrivePhase(null);
    activatedAtRef.current = null;
    tutorLastActiveRef.current = null;
    tutorPresentRef.current = false;
    studentLastActiveRef.current = Date.now(); // reset so next session starts fresh
  }, [sessionId, updateMessages, updateSageSessionId, updateProfile]);

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string): Promise<void> => {
    const currentSageSessionId = sageSessionIdRef.current;
    if (!currentSageSessionId || !text.trim() || isStreaming || quotaExhausted) return;

    const trimmedText = text.trim();
    setError(null);

    const userMsg: SageMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: new Date(),
    };

    const streamingMsgId = `msg_sage_${Date.now()}`;
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
        throw new Error((errData as { error?: string }).error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let sseBuffer = '';
      let eventType = '';
      let rawBuffer = '';
      let dispatchedCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(line.slice(6)) as Record<string, unknown>;
            } catch {
              continue;
            }

            switch (eventType) {
              case 'chunk': {
                rawBuffer += (data.content as string) ?? '';
                const { displayText, shapes } = parseStreamingBuffer(rawBuffer);
                for (let i = dispatchedCount; i < shapes.length; i++) {
                  dispatchShapeRef.current?.(shapes[i]);
                  logCanvasEvent('stamp', { shapeType: shapes[i].type });
                }
                dispatchedCount = shapes.length;
                updateMessages(prev =>
                  prev.map(m =>
                    m.id === streamingMsgId
                      ? { ...m, content: displayText, isLoading: true }
                      : m
                  )
                );
                break;
              }

              case 'done': {
                const { displayText: finalDisplay, shapes: finalShapes } =
                  parseStreamingBuffer(rawBuffer);
                for (let i = dispatchedCount; i < finalShapes.length; i++) {
                  dispatchShapeRef.current?.(finalShapes[i]);
                  logCanvasEvent('stamp', { shapeType: finalShapes[i].type });
                }

                const rl = data.rateLimit as { remaining?: number } | undefined;
                if (rl?.remaining !== undefined) {
                  setQuotaRemaining(rl.remaining);
                  if (rl.remaining <= 0) setQuotaExhausted(true);
                }

                updateMessages(prev =>
                  prev.map(m =>
                    m.id === streamingMsgId
                      ? {
                          ...m,
                          id: (data.id as string) ?? streamingMsgId,
                          content: finalDisplay,
                          timestamp: new Date((data.timestamp as string) ?? Date.now()),
                          isLoading: false,
                        }
                      : m
                  )
                );
                break;
              }

              case 'error':
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
      updateMessages(prev => prev.filter(m => m.id !== streamingMsgId));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, quotaExhausted, updateMessages, logCanvasEvent]);

  // ── Observe ────────────────────────────────────────────────────────────
  const observe = useCallback(async (trigger: 'manual' | 'stuck' = 'manual'): Promise<void> => {
    const currentSageSessionId = sageSessionIdRef.current;
    if (!currentSageSessionId || isStreaming || isObserving || quotaExhausted) return;

    setIsObserving(true);
    setError(null);

    let canvasSnapshot: string | null = null;
    try {
      canvasSnapshot = (await snapshotFnRef?.current?.()) ?? null;
    } catch {
      // non-fatal
    }

    const observingMsgId = `msg_obs_${Date.now()}`;
    const observingMsg: SageMessage = {
      id: observingMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    updateMessages(prev => [...prev, observingMsg]);

    // Log observe event
    logCanvasEvent('observe', { observationTrigger: trigger });

    try {
      const response = await fetch('/api/sage/virtualspace/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sageSessionId: currentSageSessionId,
          canvasSnapshot,
          trigger,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || 'Observation failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let sseBuffer = '';
      let eventType = '';
      let rawBuffer = '';
      let dispatchedCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(line.slice(6)) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (eventType === 'chunk') {
              rawBuffer += (data.content as string) ?? '';
              const { displayText, shapes } = parseStreamingBuffer(rawBuffer);
              for (let i = dispatchedCount; i < shapes.length; i++) {
                dispatchShapeRef.current?.(shapes[i]);
                logCanvasEvent('stamp', { shapeType: shapes[i].type });
              }
              dispatchedCount = shapes.length;
              updateMessages(prev =>
                prev.map(m =>
                  m.id === observingMsgId
                    ? { ...m, content: displayText, isLoading: true }
                    : m
                )
              );
            } else if (eventType === 'done') {
              const { displayText: finalDisplay, shapes: finalShapes } =
                parseStreamingBuffer(rawBuffer);
              for (let i = dispatchedCount; i < finalShapes.length; i++) {
                dispatchShapeRef.current?.(finalShapes[i]);
                logCanvasEvent('stamp', { shapeType: finalShapes[i].type });
              }

              updateMessages(prev =>
                prev.map(m =>
                  m.id === observingMsgId
                    ? {
                        ...m,
                        id: (data.id as string) ?? observingMsgId,
                        content: finalDisplay,
                        timestamp: new Date((data.timestamp as string) ?? Date.now()),
                        isLoading: false,
                      }
                    : m
                )
              );
            } else if (eventType === 'error') {
              throw new Error((data.error as string) ?? 'Observation stream error');
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Canvas observation failed';
      setError(msg);
      updateMessages(prev => prev.filter(m => m.id !== observingMsgId));
    } finally {
      setIsObserving(false);
    }
  }, [isStreaming, isObserving, quotaExhausted, snapshotFnRef, updateMessages, logCanvasEvent]);

  const clearError  = useCallback((): void => { setError(null); }, []);
  const clearRecap  = useCallback((): void => { setSessionRecap(null); }, []);

  return {
    isActive,
    isActivating,
    profile,
    quotaRemaining,
    quotaExhausted,
    messages,
    isStreaming,
    isObserving,
    sageSessionId,
    error,
    drivePhase,
    sessionRecap,
    activate,
    deactivate,
    sendMessage,
    observe,
    clearError,
    clearRecap,
  };
}

export default useSageVirtualSpace;
