'use client';

/**
 * useSageStuckDetector
 *
 * Detects when a student may be stuck by tracking window-level inactivity.
 * Fires an auto-observe at High threshold so Sage can proactively review the
 * student's whiteboard work.
 *
 * Idle thresholds:
 *   - Low    >30s  (subtle — no action)
 *   - Medium >75s  (show probing message in Sage panel)
 *   - High   >150s (auto-trigger canvas observe)
 *
 * @module components/feature/virtualspace/hooks/useSageStuckDetector
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type StuckLevel = 'none' | 'low' | 'medium' | 'high';

export interface UseSageStuckDetectorReturn {
  stuckLevel: StuckLevel;
  idleSeconds: number;
  resetIdleTimer: () => void;
  resetEraseCount: () => void;
}

// Thresholds from design §6: Low >25s / Medium >60s / High >120s
const THRESHOLDS: Record<Exclude<StuckLevel, 'none'>, number> = {
  low: 25,
  medium: 60,
  high: 120,
};

// Activity events that reset the idle timer
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'pointerdown', 'wheel', 'touchstart'] as const;

export function useSageStuckDetector(
  enabled: boolean,
  /** Count of confirmed erase-pattern cycles (each +1 boosts stuck level by one tier) */
  eraseSignalCount = 0,
): UseSageStuckDetectorReturn {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const [internalEraseCount, setInternalEraseCount] = useState(0);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleSeconds(0);
  }, []);

  const resetEraseCount = useCallback(() => {
    setInternalEraseCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIdleSeconds(0);
      return;
    }

    // Reset on enable
    lastActivityRef.current = Date.now();
    setIdleSeconds(0);

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // Poll every 5 seconds — low frequency, minimal overhead
    const tick = setInterval(() => {
      const idle = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(idle);
    }, 5000);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      clearInterval(tick);
    };
  }, [enabled]);

  // Erase pattern boosts the stuck level by one tier (design §6: "repeated erase+redraw → Medium")
  const totalEraseBoost = eraseSignalCount + internalEraseCount;
  const idleLevel: StuckLevel =
    idleSeconds >= THRESHOLDS.high   ? 'high'   :
    idleSeconds >= THRESHOLDS.medium ? 'medium' :
    idleSeconds >= THRESHOLDS.low    ? 'low'    :
    'none';

  const LEVELS: StuckLevel[] = ['none', 'low', 'medium', 'high'];
  const boostedIdx = Math.min(
    LEVELS.indexOf(idleLevel) + (totalEraseBoost >= 2 ? 1 : 0),
    LEVELS.length - 1,
  );
  const stuckLevel = LEVELS[boostedIdx];

  return { stuckLevel, idleSeconds, resetIdleTimer, resetEraseCount };
}
