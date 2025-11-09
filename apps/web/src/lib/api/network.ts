/**
 * Network API utilities
 * Handles connection fetching and management
 */

import { createClient } from '@/utils/supabase/client';
import type { Connection } from '@/app/components/network/ConnectionCard';

/**
 * Get all connections for the current user
 */
export async function getMyConnections(): Promise<Connection[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('connections')
    .select(`
      id,
      requester_id,
      receiver_id,
      status,
      message,
      created_at,
      requester:requester_id(id, full_name, email, avatar_url, bio),
      receiver:receiver_id(id, full_name, email, avatar_url, bio)
    `)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map the Supabase response to our Connection type (requester and receiver are single objects, not arrays)
  const mappedConnections: Connection[] = (data || []).map((conn: any) => ({
    id: conn.id,
    requester_id: conn.requester_id,
    receiver_id: conn.receiver_id,
    status: conn.status as 'pending' | 'accepted' | 'rejected',
    message: conn.message,
    created_at: conn.created_at,
    requester: Array.isArray(conn.requester) ? conn.requester[0] : conn.requester,
    receiver: Array.isArray(conn.receiver) ? conn.receiver[0] : conn.receiver,
  }));

  return mappedConnections;
}

/**
 * Accept a connection request
 */
export async function acceptConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('connections')
    .update({ status: 'accepted' })
    .eq('id', connectionId);

  if (error) throw error;
}

/**
 * Reject a connection request
 */
export async function rejectConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('connections')
    .update({ status: 'rejected' })
    .eq('id', connectionId);

  if (error) throw error;
}

/**
 * Remove a connection
 */
export async function removeConnection(connectionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId);

  if (error) throw error;
}
