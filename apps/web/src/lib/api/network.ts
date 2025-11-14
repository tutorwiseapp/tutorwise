/**
 * Network API utilities
 * Handles connection fetching and management
 * Updated v5.1: Migrated to server-side API routes with ProfileGraphService
 */

import { createClient } from '@/utils/supabase/client';
import type { Connection } from '@/app/components/network/ConnectionCard';

/**
 * Get all connections for the current user
 * v4.6: Queries profile_graph table with relationship_type='SOCIAL'
 * Note: This function still uses direct Supabase access for read-only operations
 * which is acceptable per v5.1 design. Writes must go through API routes.
 */
export async function getMyConnections(): Promise<Connection[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Query profile_graph for SOCIAL relationships
  const { data, error } = await supabase
    .from('profile_graph')
    .select(`
      id,
      source_profile_id,
      target_profile_id,
      status,
      metadata,
      created_at,
      source:source_profile_id(id, full_name, email, avatar_url, bio),
      target:target_profile_id(id, full_name, email, avatar_url, bio)
    `)
    .eq('relationship_type', 'SOCIAL')
    .or(`source_profile_id.eq.${user.id},target_profile_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map profile_graph records to legacy Connection format for backward compatibility
  const mappedConnections: Connection[] = (data || []).map((link: any) => {
    // Map status: PENDING→pending, ACTIVE→accepted, BLOCKED→rejected
    const legacyStatus =
      link.status === 'PENDING' ? 'pending' :
      link.status === 'ACTIVE' ? 'accepted' :
      'rejected';

    return {
      id: link.id,
      requester_id: link.source_profile_id,
      receiver_id: link.target_profile_id,
      status: legacyStatus as 'pending' | 'accepted' | 'rejected',
      message: link.metadata?.message || undefined,
      created_at: link.created_at,
      requester: Array.isArray(link.source) ? link.source[0] : link.source,
      receiver: Array.isArray(link.target) ? link.target[0] : link.target,
    };
  });

  return mappedConnections;
}

/**
 * Accept a connection request
 * v5.1: Uses server-side API route with ProfileGraphService
 */
export async function acceptConnection(connectionId: string): Promise<void> {
  const response = await fetch('/api/network/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept connection');
  }
}

/**
 * Reject a connection request
 * v5.1: Uses server-side API route with ProfileGraphService
 */
export async function rejectConnection(connectionId: string): Promise<void> {
  const response = await fetch('/api/network/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject connection');
  }
}

/**
 * Remove a connection
 * v5.1: Uses server-side API route with ProfileGraphService
 */
export async function removeConnection(connectionId: string): Promise<void> {
  const response = await fetch('/api/network/remove', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id: connectionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove connection');
  }
}
