'use client';

/**
 * useDiscoveryRealtime — Phase 4: Real-Time Discovery
 *
 * Subscribes to Supabase Realtime `postgres_changes` on the
 * `workflow_discovery_results` table. Fires callbacks when new discoveries
 * are inserted or existing ones are updated (e.g. after Pass 2 AI analysis).
 *
 * Pattern mirrors useConnectionsRealtime.tsx.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DiscoveryResult } from '@/lib/process-studio/scanner/types';

export interface UseDiscoveryRealtimeOptions {
  onNewResult?: (result: DiscoveryResult) => void;
  onResultUpdated?: (result: DiscoveryResult) => void;
  enabled?: boolean;
}

export function useDiscoveryRealtime({
  onNewResult,
  onResultUpdated,
  enabled = true,
}: UseDiscoveryRealtimeOptions) {
  // Keep callbacks in refs to avoid re-subscribing when they change
  const onNewResultRef = useRef(onNewResult);
  const onResultUpdatedRef = useRef(onResultUpdated);

  useEffect(() => {
    onNewResultRef.current = onNewResult;
    onResultUpdatedRef.current = onResultUpdated;
  }, [onNewResult, onResultUpdated]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    channel = supabase
      .channel('discovery-results')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'workflow_discovery_results' },
        (payload) => {
          onNewResultRef.current?.(payload.new as DiscoveryResult);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workflow_discovery_results' },
        (payload) => {
          onResultUpdatedRef.current?.(payload.new as DiscoveryResult);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
