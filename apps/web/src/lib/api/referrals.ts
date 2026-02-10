/**
 * Referrals API utilities
 * Handles referral link generation and tracking
 * Note: This is a simplified implementation matching the actual database schema
 */

import { createClient } from '@/utils/supabase/client';

export interface CreateReferralInput {
  listing_id: string;
  tutor_id: string;
  referral_type: 'listing' | 'tutor' | 'general';
}

export interface Referral {
  id: string;
  agent_id: string; // Updated from referrer_profile_id (migration 051)
  referred_profile_id?: string;
  status: string;
  booking_id?: string;
  transaction_id?: string;
  created_at: string;
  signed_up_at?: string;
  converted_at?: string;
}

/**
 * Create a new referral entry
 * Note: The actual referrals table only tracks agent_id and referred_profile_id (migration 051)
 * For now, we create a minimal entry with just the agent (referrer)
 */
export async function createReferral(_input: CreateReferralInput): Promise<Referral> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Create referral record matching the actual database schema (migration 051)
  // Note: referred_profile_id is null initially (will be set when someone uses the referral)
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      agent_id: user.id, // Updated from referrer_profile_id (migration 051)
      // referred_profile_id will be null initially
      status: 'Referred',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Referral;
}

/**
 * Get all referrals for the current user
 */
export async function getMyReferrals(): Promise<any[]> {
  // Use the API route which handles the complex joins and relationships
  const response = await fetch('/api/referrals');

  if (!response.ok) {
    throw new Error('Failed to fetch referrals');
  }

  const data = await response.json();
  return data.referrals || [];
}

/**
 * Get a single referral by ID
 */
export async function getReferral(id: string): Promise<Referral | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as Referral;
}
