/**
 * Referrals API utilities
 * Handles referral link generation and tracking
 */

import { createClient } from '@/utils/supabase/client';

export interface CreateReferralInput {
  listing_id: string;
  tutor_id: string;
  referral_type: 'listing' | 'tutor' | 'general';
}

export interface Referral {
  id: string;
  referrer_id: string;
  listing_id?: string;
  tutor_id?: string;
  referral_type: 'listing' | 'tutor' | 'general';
  referral_code: string;
  referral_link: string;
  clicks: number;
  conversions: number;
  earnings: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(userId: string, listingId?: string): string {
  const timestamp = Date.now().toString(36);
  const userPrefix = userId.substring(0, 6);
  const listingPrefix = listingId ? listingId.substring(0, 4) : 'gen';
  return `${userPrefix}-${listingPrefix}-${timestamp}`.toUpperCase();
}

/**
 * Create a new referral link
 */
export async function createReferral(input: CreateReferralInput): Promise<Referral> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Generate referral code
  const referralCode = generateReferralCode(user.id, input.listing_id);

  // Build referral link based on type
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tutorwise.io';
  let referralLink = `${baseUrl}`;

  if (input.referral_type === 'listing' && input.listing_id) {
    referralLink += `/listings/${input.listing_id}?ref=${referralCode}`;
  } else if (input.referral_type === 'tutor' && input.tutor_id) {
    referralLink += `/profile/${input.tutor_id}?ref=${referralCode}`;
  } else {
    referralLink += `?ref=${referralCode}`;
  }

  // Create referral record
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: user.id,
      listing_id: input.listing_id,
      tutor_id: input.tutor_id,
      referral_type: input.referral_type,
      referral_code: referralCode,
      referral_link: referralLink,
      clicks: 0,
      conversions: 0,
      earnings: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Referral;
}

/**
 * Get all referrals for the current user
 */
export async function getMyReferrals(): Promise<Referral[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as Referral[];
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

/**
 * Track a referral click (increment clicks counter)
 */
export async function trackReferralClick(referralCode: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_referral_clicks', {
    code: referralCode,
  });

  if (error) {
    console.error('Failed to track referral click:', error);
    // Don't throw - tracking failures shouldn't break user experience
  }
}

/**
 * Track a referral conversion (increment conversions counter)
 */
export async function trackReferralConversion(referralCode: string, earnings: number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_referral_conversion', {
    code: referralCode,
    amount: earnings,
  });

  if (error) {
    console.error('Failed to track referral conversion:', error);
    // Don't throw - tracking failures shouldn't break user experience
  }
}
