/**
 * Filename: AIAgentViewTracker.tsx
 * Purpose: Client component to track AI agent profile views
 * Created: 2026-03-03
 *
 * Copied from ProfileViewTracker.tsx, calls /api/ai-agents/[id]/track-view.
 * Silently increments view_count on ai_agents via RPC.
 */
'use client';

import { useEffect, useRef } from 'react';

interface AIAgentViewTrackerProps {
  agentId: string;
}

export function AIAgentViewTracker({ agentId }: AIAgentViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      try {
        await fetch(`/api/ai-agents/${agentId}/track-view`, { method: 'POST' });
      } catch {
        // Silently fail — don't disrupt user experience
      }
    };

    const timeoutId = setTimeout(trackView, 1000);
    return () => clearTimeout(timeoutId);
  }, [agentId]);

  return null;
}
