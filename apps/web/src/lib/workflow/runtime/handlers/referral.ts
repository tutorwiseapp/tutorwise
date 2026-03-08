/**
 * Referral handlers:
 *
 * referral.attribute
 *   Checks if the booking was referred and creates a referrals record.
 *   Reads referral metadata from the booking itself (agent_id, referral_source).
 *   Context inputs:  { booking_id: string }
 *   Context outputs: { referral_id, referral_status, was_referred }
 *
 * referral.update_status
 *   Updates referrals.status → 'Converted' once the booking is complete.
 *   Context inputs:  { booking_id: string, referral_id?: string }
 *   Context outputs: { status, updated }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// referral.attribute
// Checks the booking for agent_id / referral metadata and creates a referral record.
// Unlike the /api/referrals/attribute route (which reads cookies), this handler
// reads referral data from the booking record directly via service role.
// ---------------------------------------------------------------------------

export async function handleReferralAttribute(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('referral.attribute: booking_id required in context');

  const supabase = createServiceRoleClient();

  // Fetch booking with agent/referral info
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, client_id, tutor_id, agent_id, booking_type, listing_id')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`referral.attribute: booking ${bookingId} not found — ${bookingError?.message}`);
  }

  // If no agent, this booking was not referred
  if (!booking.agent_id) {
    console.log(`[referral.attribute] Booking ${bookingId} has no agent_id — not a referral`);
    return { referral_id: null, referral_status: null, was_referred: false };
  }

  // Check if referral record already exists for this booking
  const { data: existing } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('booking_id', bookingId)
    .single();

  if (existing) {
    console.log(`[referral.attribute] Referral ${existing.id} already exists for booking ${bookingId}`);
    return { referral_id: existing.id, referral_status: existing.status, was_referred: true };
  }

  // Create referral record
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .insert({
      agent_id: booking.agent_id,
      referred_profile_id: booking.client_id,
      booking_id: bookingId,
      status: 'Signed Up',
      referral_source: `booking:${booking.booking_type ?? 'direct'}`,
    })
    .select('id, status')
    .single();

  if (referralError || !referral) {
    throw new Error(`referral.attribute: failed to create referral — ${referralError?.message}`);
  }

  console.log(`[referral.attribute] Referral ${referral.id} created for booking ${bookingId} (agent: ${booking.agent_id})`);

  return {
    referral_id: referral.id as string,
    referral_status: referral.status as string,
    was_referred: true,
  };
}

// ---------------------------------------------------------------------------
// referral.update_status
// Updates referrals.status → 'Converted' once the booking lifecycle completes.
// Called at the end of the booking workflow after commission is recorded.
// ---------------------------------------------------------------------------

export async function handleReferralUpdateStatus(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  const referralId = context.referral_id as string | undefined;

  if (!bookingId && !referralId) {
    throw new Error('referral.update_status: booking_id or referral_id required');
  }

  const supabase = createServiceRoleClient();

  // Look up referral by referral_id or booking_id
  const query = supabase.from('referrals').select('id, status');
  const { data: referral, error } = referralId
    ? await query.eq('id', referralId).single()
    : await query.eq('booking_id', bookingId!).single();

  if (error || !referral) {
    // No referral for this booking — silently pass
    console.log(`[referral.update_status] No referral found for booking ${bookingId} — skipping`);
    return { status: null, updated: false };
  }

  if (referral.status === 'Converted') {
    return { status: 'Converted', updated: false };
  }

  const { error: updateError } = await supabase
    .from('referrals')
    .update({ status: 'Converted' })
    .eq('id', referral.id);

  if (updateError) {
    throw new Error(`referral.update_status: failed to update referral ${referral.id} — ${updateError.message}`);
  }

  console.log(`[referral.update_status] Referral ${referral.id} → Converted (booking: ${bookingId})`);

  return { status: 'Converted', updated: true, referral_id: referral.id };
}
