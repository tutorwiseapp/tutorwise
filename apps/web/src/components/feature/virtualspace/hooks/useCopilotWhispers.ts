'use client';

/**
 * useCopilotWhispers
 *
 * Manages the co-pilot whisper queue for a human tutor in a VirtualSpace session.
 * Only active when Sage is in Co-pilot profile and the current user is the tutor.
 *
 * Phase 6 responsibilities:
 * - Subscribes to the private Ably channel `sage:copilot:{sessionId}:{tutorId}`
 *   for disconnect recovery (whispers published by the awareness loop arrive here)
 * - Generates whispers from the awareness loop (calling POST /api/sage/virtualspace/copilot)
 * - Manages the whisper queue (add, dismiss, accept)
 * - Tracks dismissed count for Sage quiet-period logic
 * - On Ably reconnect: fetches pending whispers from the API
 *
 * M1 fix: accepts `tutorLastActiveAtRef` (a ref to the last-active timestamp) instead of
 * a computed `tutorLastActiveMs` number so the interval closure always reads the live value.
 *
 * @module components/feature/virtualspace/hooks/useCopilotWhispers
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type * as Ably from 'ably';
import type { SageVirtualSpaceProfile } from './useSageVirtualSpace';
import type { SageMessage } from './useSageVirtualSpace';

export interface CopilotWhisper {
  id: string;
  urgency: 'low' | 'medium' | 'high';
  message: string;
  action: {
    type: 'stamp';
    shape: { type: string; props?: Record<string, unknown> };
  } | null;
}

interface UseCopilotWhispersOptions {
  ablyClient?: Ably.Realtime;
  sessionId: string;
  sageSessionId: string | null;
  currentUserId: string;
  tutorId?: string;
  profile: SageVirtualSpaceProfile | null;
  isActive: boolean;
  isStreaming: boolean;
  stuckSignal: 'none' | 'low' | 'medium' | 'high';
  messages: SageMessage[];
  /** M1 fix: ref to the tutor's last-active timestamp (epoch ms, 0 if no activity yet).
   *  Using a ref avoids the stale-closure / interval-reset problem that occurred when
   *  a computed `Date.now() - ref.current` was passed as a prop and included in deps. */
  tutorLastActiveAtRef: MutableRefObject<number>;
}

export interface UseCopilotWhispersReturn {
  whispers: CopilotWhisper[];
  dismissWhisper: (id: string) => Promise<void>;
  acceptWhisper: (id: string) => Promise<{ shape: CopilotWhisper['action'] } | null>;
}

const COPILOT_INTERVAL_MS = 30_000; // generate at most one whisper per 30s

export function useCopilotWhispers({
  ablyClient,
  sessionId,
  sageSessionId,
  currentUserId,
  tutorId,
  profile,
  isActive,
  isStreaming,
  stuckSignal,
  messages,
  tutorLastActiveAtRef,
}: UseCopilotWhispersOptions): UseCopilotWhispersReturn {
  const [whispers, setWhispers] = useState<CopilotWhisper[]>([]);

  const lastWhisperAtRef    = useRef<number>(0);
  const dismissedCountRef   = useRef<number>(0);
  const messagesRef         = useRef(messages);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const isTutor = currentUserId === tutorId;
  const isCopilot = profile === 'copilot' && isActive && isTutor && !!sageSessionId;

  // ── Subscribe to private Ably channel for disconnect recovery ───────────
  useEffect(() => {
    if (!ablyClient || !isCopilot || !tutorId) return;

    const channelName = `sage:copilot:${sessionId}:${tutorId}`;
    const channel = ablyClient.channels.get(channelName);

    const handleWhisper = (msg: Ably.Message) => {
      const whisper = msg.data as CopilotWhisper;
      if (!whisper?.id) return;
      setWhispers(prev => {
        if (prev.some(w => w.id === whisper.id)) return prev; // dedup
        return [...prev, whisper];
      });
    };

    channel.subscribe('whisper', handleWhisper);

    // On attach, fetch pending whispers from API (reconnect recovery)
    channel.on('attached', async () => {
      if (!sageSessionId) return;
      try {
        const res = await fetch(
          `/api/sage/virtualspace/copilot/pending?sessionId=${sessionId}&sageSessionId=${sageSessionId}`
        );
        if (!res.ok) return;
        const { whispers: pending } = (await res.json()) as { whispers: CopilotWhisper[] };
        if (!Array.isArray(pending) || !pending.length) return;
        setWhispers(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newOnes = pending.filter(w => !existingIds.has(w.id));
          return [...prev, ...newOnes];
        });
      } catch {
        // non-fatal
      }
    });

    return () => {
      channel.unsubscribe('whisper', handleWhisper);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCopilot, ablyClient, sessionId, tutorId]);

  // ── Awareness loop whisper generation ───────────────────────────────────
  useEffect(() => {
    if (!isCopilot || isStreaming) return;

    const tryGenerateWhisper = async () => {
      if (document.hidden) return;
      if (Date.now() - lastWhisperAtRef.current < COPILOT_INTERVAL_MS) return;
      if (!sageSessionId) return;

      const conversationHistory = messagesRef.current
        .filter(m => !m.isLoading)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      try {
        // M1 fix: read the live value from the ref at call time — not a stale closure
        const tutorLastActiveMs = tutorLastActiveAtRef.current > 0
          ? Date.now() - tutorLastActiveAtRef.current
          : Number.MAX_SAFE_INTEGER; // no recorded activity → treat as "very long ago"

        const res = await fetch('/api/sage/virtualspace/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sageSessionId,
            sessionId,
            stuckSignal,
            conversationHistory,
            tutorLastActiveMs,
            dismissedCount: dismissedCountRef.current,
          }),
        });

        if (res.status === 204) return; // quiet period
        if (!res.ok) return;

        const { whisper } = (await res.json()) as { whisper?: CopilotWhisper };
        if (!whisper?.id) return;

        lastWhisperAtRef.current = Date.now();

        // Add to local queue
        setWhispers(prev => {
          if (prev.some(w => w.id === whisper.id)) return prev;
          return [...prev, whisper];
        });

        // Publish to private Ably channel for disconnect persistence
        if (ablyClient && tutorId) {
          ablyClient.channels
            .get(`sage:copilot:${sessionId}:${tutorId}`)
            .publish('whisper', whisper)
            .catch(() => {});
        }
      } catch {
        // non-fatal
      }
    };

    const id = setInterval(tryGenerateWhisper, COPILOT_INTERVAL_MS);
    return () => clearInterval(id);
  // tutorLastActiveAtRef is a stable ref — intentionally excluded from deps (M1 fix)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCopilot, isStreaming, sageSessionId, sessionId, stuckSignal, ablyClient, tutorId]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const dismissWhisper = useCallback(async (id: string) => {
    setWhispers(prev => prev.filter(w => w.id !== id));
    dismissedCountRef.current += 1;

    if (sageSessionId) {
      fetch('/api/sage/virtualspace/canvas-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sageSessionId,
          virtualspaceSessionId: sessionId,
          eventType: 'copilot_dismissed',
          shapeData: { whisperId: id },
        }),
      }).catch(() => {});
    }
  }, [sageSessionId, sessionId]);

  const acceptWhisper = useCallback(async (id: string): Promise<{ shape: CopilotWhisper['action'] } | null> => {
    const whisper = whispers.find(w => w.id === id);
    if (!whisper) return null;

    setWhispers(prev => prev.filter(w => w.id !== id));
    dismissedCountRef.current = 0; // reset after accept

    if (sageSessionId) {
      await fetch('/api/sage/virtualspace/copilot/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sageSessionId,
          sessionId,
          whisperId: id,
          shape: whisper.action?.shape ?? null,
        }),
      }).catch(() => {});
    }

    return whisper.action ? { shape: whisper.action } : null;
  }, [whispers, sageSessionId, sessionId]);

  return { whispers, dismissWhisper, acceptWhisper };
}
