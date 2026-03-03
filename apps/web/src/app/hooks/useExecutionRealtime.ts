'use client';

/**
 * useExecutionRealtime — Phase 2: Real-Time Execution Monitoring
 *
 * Subscribes to Supabase Realtime `postgres_changes` on `workflow_tasks`.
 * Fires callbacks when tasks are inserted or updated, enabling live
 * node-status colouring on the ExecutionCanvas.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface WorkflowTaskUpdate {
  id: string;
  execution_id: string;
  node_id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'skipped';
  completion_mode: string;
  result_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
}

export interface UseExecutionRealtimeOptions {
  executionId?: string;
  onTaskUpdated?: (task: WorkflowTaskUpdate) => void;
  enabled?: boolean;
}

export function useExecutionRealtime({
  executionId,
  onTaskUpdated,
  enabled = true,
}: UseExecutionRealtimeOptions) {
  const onTaskUpdatedRef = useRef(onTaskUpdated);

  useEffect(() => {
    onTaskUpdatedRef.current = onTaskUpdated;
  }, [onTaskUpdated]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const filter = executionId
      ? `execution_id=eq.${executionId}`
      : undefined;

    channel = supabase
      .channel(`execution-tasks-${executionId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_tasks',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          onTaskUpdatedRef.current?.(payload.new as WorkflowTaskUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workflow_tasks',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          onTaskUpdatedRef.current?.(payload.new as WorkflowTaskUpdate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, executionId]);
}
