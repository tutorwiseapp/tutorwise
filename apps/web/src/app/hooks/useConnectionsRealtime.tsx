/**
 * Filename: apps/web/src/app/hooks/useConnectionsRealtime.tsx
 * Purpose: Real-time subscription hook for profile_graph table (SOCIAL relationships)
 * Created: 2025-11-07
 * Updated: 2025-11-12 (v4.6) - Migrated from connections to profile_graph
 */

'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseConnectionsRealtimeOptions {
  userId: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Subscribe to real-time changes in the profile_graph table (SOCIAL relationships)
 * v4.6: Now listens to profile_graph instead of connections
 *
 * @example
 * useConnectionsRealtime({
 *   userId: profile.id,
 *   onInsert: (payload) => {
 *     toast.success('New connection request received!');
 *     fetchConnections(); // Refresh the list
 *   },
 *   onUpdate: (payload) => {
 *     toast.success('Connection status updated');
 *     fetchConnections();
 *   },
 * });
 */
export function useConnectionsRealtime({
  userId,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseConnectionsRealtimeOptions) {
  useEffect(() => {
    if (!enabled || !userId) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Subscribe to profile_graph SOCIAL relationships where user is source or target
      channel = supabase
        .channel(`profile_graph:social:user-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profile_graph',
            filter: `target_profile_id=eq.${userId}`,
          },
          (payload) => {
            // Only trigger for SOCIAL relationships
            if (payload.new && (payload.new as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] New SOCIAL connection (target):', payload);
              onInsert?.(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profile_graph',
            filter: `source_profile_id=eq.${userId}`,
          },
          (payload) => {
            // Only trigger for SOCIAL relationships
            if (payload.new && (payload.new as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] New SOCIAL connection (source):', payload);
              onInsert?.(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profile_graph',
            filter: `target_profile_id=eq.${userId}`,
          },
          (payload) => {
            // Only trigger for SOCIAL relationships
            if (payload.new && (payload.new as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] SOCIAL connection updated (target):', payload);
              onUpdate?.(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profile_graph',
            filter: `source_profile_id=eq.${userId}`,
          },
          (payload) => {
            // Only trigger for SOCIAL relationships
            if (payload.new && (payload.new as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] SOCIAL connection updated (source):', payload);
              onUpdate?.(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'profile_graph',
            filter: `target_profile_id=eq.${userId}`,
          },
          (payload) => {
            // For DELETE, check old record
            if (payload.old && (payload.old as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] SOCIAL connection deleted (target):', payload);
              onDelete?.(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'profile_graph',
            filter: `source_profile_id=eq.${userId}`,
          },
          (payload) => {
            // For DELETE, check old record
            if (payload.old && (payload.old as any).relationship_type === 'SOCIAL') {
              console.log('[realtime] SOCIAL connection deleted (source):', payload);
              onDelete?.(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log('[realtime] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log(`[realtime] Successfully subscribed to profile_graph (SOCIAL) for user ${userId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[realtime] Subscription error');
          } else if (status === 'TIMED_OUT') {
            console.error('[realtime] Subscription timed out');
          }
        });
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log('[realtime] Unsubscribing from profile_graph channel');
        supabase.removeChannel(channel);
      }
    };
  }, [userId, enabled, onInsert, onUpdate, onDelete]);
}

/**
 * Optimistic UI update helper
 * Use this to immediately update the UI before the server confirms
 *
 * @example
 * const [connections, setConnections] = useState<Connection[]>([]);
 *
 * // Optimistic update when accepting a connection
 * const handleAccept = async (connectionId: string) => {
 *   // Optimistic update
 *   setConnections(prev =>
 *     prev.map(conn =>
 *       conn.id === connectionId
 *         ? { ...conn, status: 'accepted' }
 *         : conn
 *     )
 *   );
 *
 *   try {
 *     await supabase
 *       .from('connections')
 *       .update({ status: 'accepted' })
 *       .eq('id', connectionId);
 *   } catch (error) {
 *     // Revert optimistic update on error
 *     fetchConnections();
 *   }
 * };
 */
export function optimisticUpdate<T extends { id: string }>(
  items: T[],
  id: string,
  update: Partial<T>
): T[] {
  return items.map((item) =>
    item.id === id ? { ...item, ...update } : item
  );
}

/**
 * Optimistic delete helper
 */
export function optimisticDelete<T extends { id: string }>(
  items: T[],
  id: string
): T[] {
  return items.filter((item) => item.id !== id);
}

/**
 * Optimistic insert helper
 */
export function optimisticInsert<T>(
  items: T[],
  newItem: T
): T[] {
  return [newItem, ...items];
}
