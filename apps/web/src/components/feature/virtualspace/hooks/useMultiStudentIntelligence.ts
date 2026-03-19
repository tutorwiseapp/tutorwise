'use client';

/**
 * useMultiStudentIntelligence  (Phase 8 — R&D)
 *
 * Per-student idle tracking and peer-learning detection for multi-student
 * VirtualSpace sessions. Reads from the tldraw store via shape authorship
 * to build independent stuck signals per student.
 *
 * > **Note:** This is an R&D hook. Peer-learning detection is experimental
 * > and has not been validated in a live tutoring context. Treat outputs as
 * > signals to be weighted conservatively, not as ground truth.
 *
 * @module components/feature/virtualspace/hooks/useMultiStudentIntelligence
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface StudentSignal {
  userId: string;
  displayName: string;
  /** ms since this student last drew on the canvas */
  idleMs: number;
  /** estimated stuck level based on idle time */
  stuckLevel: 'none' | 'low' | 'medium' | 'high';
  /** whether this student appears to be teaching another student */
  isPeerTeaching: boolean;
}

export interface MultiStudentContext {
  /** Per-student signals, keyed by userId */
  signals: Record<string, StudentSignal>;
  /** True when peer teaching is detected anywhere in the session */
  peerTeachingDetected: boolean;
  /** Build context string for Sage system prompt injection */
  buildContextBlock: () => string;
  /** Record a draw event for a participant */
  recordActivity: (userId: string, displayName: string) => void;
}

/** Idle thresholds matching single-student useSageStuckDetector */
const STUCK_LOW_MS    = 60_000;   // 1 min
const STUCK_MEDIUM_MS = 120_000;  // 2 min
const STUCK_HIGH_MS   = 180_000;  // 3 min

/** Peer teaching requires sustained idle from potential learner */
const PEER_TEACH_LEARNER_IDLE_MS = 30_000; // 30s of relative quiet

function computeStuck(idleMs: number): StudentSignal['stuckLevel'] {
  if (idleMs >= STUCK_HIGH_MS)   return 'high';
  if (idleMs >= STUCK_MEDIUM_MS) return 'medium';
  if (idleMs >= STUCK_LOW_MS)    return 'low';
  return 'none';
}

interface StudentRecord {
  displayName: string;
  lastActiveAt: number;
  recentMessageLengths: number[];  // last 5 chat message lengths (teaching language proxy)
}

interface UseMultiStudentOptions {
  /** Participants in the session (excluding the current user if they're the tutor) */
  participants: Array<{ userId: string; displayName: string }>;
  /** Whether Sage is active */
  isActive: boolean;
}

export function useMultiStudentIntelligence({
  participants,
  isActive,
}: UseMultiStudentOptions): MultiStudentContext {
  const [signals, setSignals] = useState<Record<string, StudentSignal>>({});
  const [peerTeachingDetected, setPeerTeachingDetected] = useState(false);
  const recordsRef = useRef<Record<string, StudentRecord>>({});

  // Initialise records for known participants
  useEffect(() => {
    const now = Date.now();
    const records: Record<string, StudentRecord> = {};
    for (const p of participants) {
      records[p.userId] = recordsRef.current[p.userId] ?? {
        displayName: p.displayName,
        lastActiveAt: now,
        recentMessageLengths: [],
      };
    }
    recordsRef.current = records;
  }, [participants]);

  // Polling loop — recompute stuck levels every 10s
  useEffect(() => {
    if (!isActive || participants.length < 2) return;

    const id = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const records = recordsRef.current;
      const newSignals: Record<string, StudentSignal> = {};
      let peerTeach = false;

      const userIds = Object.keys(records);

      for (const uid of userIds) {
        const rec = records[uid];
        const idleMs = now - rec.lastActiveAt;
        const stuckLevel = computeStuck(idleMs);

        // Peer teaching detection (R&D heuristic):
        // A student is tentatively "teaching" if:
        // - Their average recent message length is high (explanatory language)
        // - Another student's idle time is ≥30s (listening/absorbing)
        const avgMsgLen = rec.recentMessageLengths.length
          ? rec.recentMessageLengths.reduce((a, b) => a + b, 0) / rec.recentMessageLengths.length
          : 0;
        const isExplaining = avgMsgLen > 80; // rough proxy for teaching language

        // Check if there's a "learner" (another student with moderate idle)
        const otherLearner = userIds.some(
          other => other !== uid &&
            (now - records[other].lastActiveAt) >= PEER_TEACH_LEARNER_IDLE_MS
        );

        const isPeerTeaching = isExplaining && otherLearner;
        if (isPeerTeaching) peerTeach = true;

        newSignals[uid] = {
          userId: uid,
          displayName: rec.displayName,
          idleMs,
          stuckLevel,
          isPeerTeaching,
        };
      }

      setSignals(newSignals);
      setPeerTeachingDetected(peerTeach);
    }, 10_000);

    return () => clearInterval(id);
  }, [isActive, participants]);

  const recordActivity = useCallback((userId: string, displayName: string) => {
    const records = recordsRef.current;
    records[userId] = {
      ...(records[userId] ?? { recentMessageLengths: [] }),
      displayName,
      lastActiveAt: Date.now(),
    };
  }, []);

  const buildContextBlock = useCallback((): string => {
    const parts: string[] = [];
    const sigList = Object.values(signals);
    if (!sigList.length) return '';

    parts.push('## Multi-Student Session Context');

    for (const sig of sigList) {
      const stuckDesc = sig.stuckLevel === 'none'
        ? 'actively working'
        : `stuck signal: ${sig.stuckLevel}`;
      const teachDesc = sig.isPeerTeaching ? ' (appears to be explaining to another student)' : '';
      parts.push(`- **${sig.displayName}**: ${stuckDesc}${teachDesc}`);
    }

    if (peerTeachingDetected) {
      parts.push('\n**Peer teaching detected** — a student is explaining to another. Step back and let it unfold. Only intervene if the explanation contains a clear misconception.');
    }

    parts.push('\nAddress students by name. Do not broadcast to the group.');

    return parts.join('\n');
  }, [signals, peerTeachingDetected]);

  return { signals, peerTeachingDetected, buildContextBlock, recordActivity };
}
