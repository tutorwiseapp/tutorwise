/**
 * Network API utilities
 * Handles connection fetching and management
 * Updated v4.6: Now uses profile_graph table instead of connections
 */

import { createClient } from '@/utils/supabase/client';
import type { Connection } from '@/app/components/network/ConnectionCard';

/**
 * Get all connections for the current user
 * v4.6: Queries profile_graph table with relationship_type='SOCIAL'
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
 * v4.6: Updates profile_graph status to ACTIVE
 */
export async function acceptConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profile_graph')
    .update({ status: 'ACTIVE' })
    .eq('id', connectionId)
    .eq('relationship_type', 'SOCIAL');

  if (error) throw error;
}

/**
 * Reject a connection request
 * v4.6: Updates profile_graph status to BLOCKED
 */
export async function rejectConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profile_graph')
    .update({ status: 'BLOCKED' })
    .eq('id', connectionId)
    .eq('relationship_type', 'SOCIAL');

  if (error) throw error;
}

/**
 * Remove a connection
 * v4.6: Deletes from profile_graph
 */
export async function removeConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profile_graph')
    .delete()
    .eq('id', connectionId)
    .eq('relationship_type', 'SOCIAL');

  if (error) throw error;
}
